// A player's connection dropping mid-match: the match pauses for everyone for the grace period,
// then carries on without them (their wizard stays, marked away); they can rejoin until it ends.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rooms } from '../../server/rooms/state';
import { startTestServer, stopTestServer, TestClient, wait } from './helpers';

const GRACE = 400;
const EMPTY = 600;

beforeEach(() =>
  startTestServer({
    reconnectGraceMs: GRACE,
    emptyRoomMs: EMPTY,
    teamMatches: true,
    startCountdownTicks: 0,
  }),
);
afterEach(stopTestServer);

/** `count` connected clients; the first creates a room, the others join it. Not started. */
async function lobby(count: number, teamSize = 1) {
  const clients = Array.from({ length: count }, () => new TestClient());
  await Promise.all(clients.map((c) => c.open()));
  clients[0].send({ type: 'create' });
  const created = await clients[0].next('created');
  const code = created.code;
  const tokens = [created.resumeToken];
  if (teamSize > 1) {
    clients[0].send({
      type: 'set_options',
      options: {
        mapId: 'ruins',
        teamSize,
        friendlyFire: false,
        deathRule: 'elimination',
        wizardHp: 200,
      },
    });
    await clients[0].next('lobby', 2000, (m) => m.options.teamSize === teamSize);
  }
  const seats = [created.seat];
  for (const c of clients.slice(1)) {
    c.send({ type: 'join', code });
    const joined = await c.next('joined');
    tokens.push(joined.resumeToken);
    seats.push(joined.seat);
  }
  return { clients, code, tokens, seats };
}

/** A running match with everyone in it. */
async function match(count = 2, teamSize = 1) {
  const l = await lobby(count, teamSize);
  l.clients[0].send({ type: 'start_match' });
  await Promise.all(l.clients.map((c) => c.next('start')));
  return l;
}

/** A fresh connection that resumes a seat. */
async function comeBack(code: string, token: string) {
  const c = new TestClient();
  await c.open();
  c.send({ type: 'resume', code, token });
  return c;
}

let inputId = 100;
/** Sends a harmless input and says whether the server accepted it. */
async function accepted(c: TestClient) {
  const id = ++inputId;
  c.send({ type: 'input', action: 'key', key: 'Digit1', down: true, roundId: 1, inputId: id });
  return (await c.next('input_ack', 2000, (m) => m.inputId === id)).accepted;
}

describe('a drop pauses the match for everyone', () => {
  it('tells the others who dropped and for how long, and refuses their inputs meanwhile', async () => {
    const { clients } = await match();
    clients[1].ws.terminate();
    const away = await clients[0].next('peer_away');
    expect(away).toMatchObject({ seat: 1, graceMs: GRACE });
    expect(away.name).toMatch(/\w/);
    expect(await accepted(clients[0])).toBe(false);
  });

  it('a resume inside the grace brings the match back: same seat and place, others told', async () => {
    const { clients, code, tokens } = await match();
    const before = (await clients[1].next('state')).state;
    clients[1].ws.terminate();
    await clients[0].next('peer_away');
    const back = await comeBack(code, tokens[1]);
    const resumed = await back.next('resumed');
    expect(resumed).toMatchObject({ code, roundId: 1, seat: 1, mapId: 'enchanted' });
    expect(resumed.rules.teamSize).toBe(1);
    expect(resumed.loadouts).toHaveLength(2);
    expect(resumed.looks).toHaveLength(2);
    expect(await clients[0].next('peer_back')).toEqual({ type: 'peer_back', seat: 1 });
    const s = (await back.next('state')).state;
    expect(s.you).toMatchObject({ seat: 1, away: false });
    expect(s.you.x).toBeCloseTo(before.you.x, 0);
    expect(await accepted(clients[0])).toBe(true);
    // the grace timer is gone: nothing changes when it would have fired
    await wait(GRACE + 150);
    expect(await accepted(back)).toBe(true);
    expect(clients[0].messages.some((m) => m.type === 'peer_left')).toBe(false);
  });
});

describe('after the grace', () => {
  it('play carries on: the others play, the dropped wizard stands marked away and can be killed', async () => {
    const { clients, code } = await match();
    const runner = rooms.get(code)!.runner!;
    clients[1].ws.terminate();
    await clients[0].next('peer_away');
    await wait(GRACE + 100);
    expect(await accepted(clients[0])).toBe(true);
    const seen = (await clients[0].next('state', 2000, (m) => m.state.others[0]?.away === true))
      .state.others[0];
    expect(seen.seat).toBe(1);
    // a stray message from the old socket changes nothing: the wizard stays where it stood
    const wizard = runner.game.wizards[1];
    wizard.hp = 1;
    wizard.x = runner.game.wizards[0].x + 100; // within reach of a spray
    const target = { x: wizard.x, y: wizard.y };
    await wait(100);
    clients[0].send({ type: 'input', action: 'down', roundId: 1, ...target }); // hold fire at it
    expect(await clients[0].next('death_start', 3000)).toMatchObject({ loser: 1, winner: true });
    expect(wizard.hp).toBeLessThanOrEqual(0);
    expect(wizard.x).toBe(target.x);
  });

  it('takes damage like anyone: the hit shows in the snapshot before the kill', async () => {
    const { clients, code } = await match();
    const game = rooms.get(code)!.runner!.game;
    const wizard = game.wizards[1];
    wizard.hp = 100;
    wizard.x = game.wizards[0].x + 100;
    clients[1].ws.terminate();
    await clients[0].next('peer_away');
    await wait(GRACE + 100);
    clients[0].send({ type: 'input', action: 'down', roundId: 1, x: wizard.x, y: wizard.y });
    const hit = await clients[0].next(
      'state',
      3000,
      (m) => m.state.others[0]?.away === true && m.state.others[0].hp < 100,
    );
    expect(hit.state.others[0].hp).toBeLessThan(100);
  });

  it('a resume after the grace gives control back and clears the tag', async () => {
    const { clients, code, tokens } = await match();
    clients[1].ws.terminate();
    await clients[0].next('peer_away');
    await wait(GRACE + 100);
    const back = await comeBack(code, tokens[1]);
    await back.next('resumed');
    expect(await clients[0].next('peer_back')).toMatchObject({ seat: 1 });
    expect(await accepted(back)).toBe(true);
    const s = await back.next('state', 2000, (m) => m.state.you.away === false);
    expect(s.state.you.seat).toBe(1);
    const theirs = await clients[0].next('state', 2000, (m) => m.state.others[0]?.away === false);
    expect(theirs.state.others[0].seat).toBe(1);
  });

  it('keeps the room when the creator is the one who dropped', async () => {
    const { clients, code, tokens } = await match();
    clients[0].ws.terminate();
    await clients[1].next('peer_away');
    await wait(GRACE + 200);
    expect(clients[1].messages.some((m) => m.type === 'peer_left')).toBe(false);
    expect(rooms.has(code)).toBe(true);
    const back = await comeBack(code, tokens[0]);
    expect(await back.next('resumed')).toMatchObject({ seat: 0 });
  });
});

describe('two players away at once (2v2)', () => {
  it('pauses until the last deadline, each with its own countdown, and a resume sees the other', async () => {
    // seats by join order: client 1 sits in seat 2 (enemy), client 2 in seat 1 (teammate)
    const { clients, code, tokens } = await match(4, 2);
    clients[2].ws.terminate();
    const first = await clients[0].next('peer_away');
    await wait(200);
    clients[1].ws.terminate();
    const second = await clients[0].next('peer_away', 2000, (m) => m.seat !== first.seat);
    expect([first.seat, second.seat]).toEqual([1, 2]);
    expect(first.graceMs).toBe(GRACE);
    expect(second.graceMs).toBe(GRACE);
    // the first deadline has passed but the second seat still pauses the match
    await wait(GRACE - 200 + 80);
    expect(await accepted(clients[0])).toBe(false);
    // someone coming back in the meantime is told about the seat that is still away
    const back = await comeBack(code, tokens[2]);
    await back.next('resumed');
    const told = await back.next('peer_away');
    expect(told.seat).toBe(second.seat);
    expect(told.graceMs).toBeGreaterThan(0);
    expect(told.graceMs).toBeLessThanOrEqual(200);
    await wait(250);
    // now the second one's deadline has passed too: play on, the second is away, the first is back
    expect(await accepted(clients[0])).toBe(true);
    const game = rooms.get(code)!.runner!.game;
    expect(game.wizards.map((w) => w.away)).toEqual([false, false, true, false]);
    const s = await clients[0].next('state', 2000, (m) => m.state.others.some((o) => o.seat === 1));
    expect(s.state.others.find((o) => o.seat === 1)?.away).toBe(false);
  });
});

describe('related rules', () => {
  it('a join while the match runs watches, even during a drop and with an open seat', async () => {
    // three players in a 2v2: one seat is open
    const { clients, code } = await lobby(3, 2);
    clients[0].send({ type: 'start_match' });
    await Promise.all(clients.map((c) => c.next('start')));
    for (const c of clients) c.messages.length = 0;
    const extra = new TestClient();
    await extra.open();
    extra.send({ type: 'join', code });
    expect(await extra.next('joined')).toMatchObject({ seat: null });
    clients[1].ws.terminate();
    await clients[0].next('peer_away');
    extra.send({ type: 'join', code });
    expect(await extra.next('error')).toMatchObject({ message: 'You are already in that room.' });
    // nobody in the match was sent a lobby
    expect(clients[0].messages.some((m) => m.type === 'lobby')).toBe(false);
  });

  it('a join to a duel mid-drop watches; it does not take the dropped seat', async () => {
    const { clients, code } = await match();
    clients[1].ws.terminate();
    await clients[0].next('peer_away');
    const extra = new TestClient();
    await extra.open();
    extra.send({ type: 'join', code });
    expect(await extra.next('joined')).toMatchObject({ seat: null });
  });

  it('a rematch starts once the connected players are ready, and the away player can still resume', async () => {
    const { clients, code, tokens } = await match();
    clients[1].ws.terminate();
    await clients[0].next('peer_away');
    await wait(GRACE + 100);
    clients[0].send({ type: 'rematch_ready' });
    expect(await clients[0].next('rematch_start')).toMatchObject({ roundId: 2, seat: 0 });
    const back = await comeBack(code, tokens[1]);
    expect(await back.next('resumed')).toMatchObject({ roundId: 2, seat: 1 });
    const s = await back.next('state', 2000, (m) => m.state.roundId === 2);
    expect(s.state.you.away).toBe(false);
  });

  it("going back to the lobby frees an away guest's seat and voids their token", async () => {
    const { clients, code, tokens } = await match();
    clients[1].ws.terminate();
    await clients[0].next('peer_away');
    clients[0].send({ type: 'back_to_lobby' });
    expect(await clients[0].next('lobby')).toMatchObject({ seats: [true, false], youSeat: 0 });
    const old = await comeBack(code, tokens[1]);
    expect(await old.next('error')).toMatchObject({ message: 'Could not rejoin the match.' });
    // the seat is open for a new player, and the old token stays dead through the next match
    const fresh = new TestClient();
    await fresh.open();
    fresh.send({ type: 'join', code });
    await fresh.next('joined');
    clients[0].send({ type: 'start_match' });
    await fresh.next('start');
    const again = await comeBack(code, tokens[1]);
    expect(await again.next('error')).toMatchObject({ message: 'Could not rejoin the match.' });
  });

  it('keeps the lobby for the creator: back_to_lobby is refused while the creator is away', async () => {
    const { clients } = await match();
    clients[0].ws.terminate();
    await clients[1].next('peer_away');
    clients[1].messages.length = 0;
    clients[1].send({ type: 'back_to_lobby' });
    expect((await clients[1].next('error')).message).toMatch(/host is disconnected/);
    await wait(50);
    expect(clients[1].messages.some((m) => m.type === 'lobby')).toBe(false);
  });

  it('closes a room nobody is connected to after the empty timeout', async () => {
    const { clients, code, tokens } = await match();
    clients[0].ws.terminate();
    clients[1].ws.terminate();
    await wait(GRACE + 150);
    expect(rooms.has(code)).toBe(true);
    await wait(EMPTY);
    expect(rooms.has(code)).toBe(false);
    const late = await comeBack(code, tokens[0]);
    expect(await late.next('error')).toMatchObject({ message: 'Could not rejoin the match.' });
  });

  it('does not close the room when someone comes back before the empty timeout', async () => {
    const { clients, code, tokens } = await match();
    clients[0].ws.terminate();
    clients[1].ws.terminate();
    await wait(EMPTY - 200);
    const back = await comeBack(code, tokens[0]);
    await back.next('resumed');
    await wait(400);
    expect(rooms.has(code)).toBe(true);
  });

  it('a socket resuming its own seat in its own room does not close the room', async () => {
    const { clients, code, tokens } = await match();
    clients[1].send({ type: 'resume', code, token: tokens[1] });
    await clients[1].next('resumed');
    expect(rooms.has(code)).toBe(true);
    expect(clients[0].messages.some((m) => m.type === 'peer_left')).toBe(false);
  });
});
