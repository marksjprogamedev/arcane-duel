// Leaving a match on purpose works like a drop without the pause: the wizard stays, marked away,
// nobody waits, and the leaver cannot come back. The room closes once nobody is connected.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rooms } from '../../server/rooms/state';
import { startTestServer, stopTestServer, TestClient, wait } from './helpers';

beforeEach(() =>
  startTestServer({
    reconnectGraceMs: 400,
    emptyRoomMs: 600,
    teamMatches: true,
    startCountdownTicks: 0,
  }),
);
afterEach(stopTestServer);

async function lobby(count: number, teamSize = 1) {
  const clients = Array.from({ length: count }, () => new TestClient());
  await Promise.all(clients.map((c) => c.open()));
  clients[0].send({ type: 'create' });
  const created = await clients[0].next('created');
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
  for (const c of clients.slice(1)) {
    c.send({ type: 'join', code: created.code });
    tokens.push((await c.next('joined')).resumeToken);
  }
  return { clients, code: created.code, tokens };
}

async function match(count = 2, teamSize = 1) {
  const l = await lobby(count, teamSize);
  l.clients[0].send({ type: 'start_match' });
  await Promise.all(l.clients.map((c) => c.next('start')));
  return l;
}

let inputId = 500;
async function accepted(c: TestClient) {
  const id = ++inputId;
  c.send({ type: 'input', action: 'key', key: 'Digit1', down: true, roundId: 1, inputId: id });
  return (await c.next('input_ack', 2000, (m) => m.inputId === id)).accepted;
}

describe('a guest leaves mid-match', () => {
  it('keeps the room and match running, tells the others, and does not pause', async () => {
    const { clients, code } = await match(3, 2);
    clients[1].send({ type: 'leave' });
    const told = await clients[0].next('peer_left_match');
    expect(told.seat).toBe(2);
    expect(told.name).toMatch(/\w/);
    await clients[2].next('peer_left_match');
    expect(clients[0].messages.some((m) => m.type === 'peer_away' || m.type === 'peer_left')).toBe(
      false,
    );
    expect(rooms.has(code)).toBe(true);
    expect(rooms.get(code)!.runner!.isRunning).toBe(true);
    expect(await accepted(clients[0])).toBe(true); // not paused
  });

  it('leaves the wizard standing, away in snapshots, and it can be hit', async () => {
    const { clients, code } = await match();
    const game = rooms.get(code)!.runner!.game;
    const wizard = game.wizards[1];
    wizard.hp = 100;
    wizard.x = game.wizards[0].x + 100;
    clients[1].send({ type: 'leave' });
    await clients[0].next('peer_left_match');
    const x = wizard.x;
    clients[0].send({ type: 'input', action: 'down', roundId: 1, x: wizard.x, y: wizard.y });
    const hit = await clients[0].next(
      'state',
      3000,
      (m) => m.state.others[0]?.away === true && m.state.others[0].hp < 100,
    );
    expect(hit.state.others[0].seat).toBe(1);
    expect(wizard.x).toBe(x);
  });

  it('cannot come back with the old resume token', async () => {
    const { clients, code, tokens } = await match();
    clients[1].send({ type: 'leave' });
    await clients[0].next('peer_left_match');
    const back = new TestClient();
    await back.open();
    back.send({ type: 'resume', code, token: tokens[1] });
    expect((await back.next('error')).message).toBe('Could not rejoin the match.');
    expect(rooms.get(code)!.resumeTokens).not.toContain(tokens[1]);
  });

  it('can start or join another room afterwards without disturbing the match', async () => {
    const { clients, code } = await match(3, 2);
    clients[1].send({ type: 'leave' });
    await clients[0].next('peer_left_match');
    clients[1].send({ type: 'create' });
    const created = await clients[1].next('created');
    expect(created.code).not.toBe(code);
    expect(rooms.has(code)).toBe(true);

    clients[0].send({ type: 'back_to_lobby' });
    await clients[0].next('lobby');
    expect(clients[1].ws.readyState).toBe(1);
    expect(rooms.has(created.code)).toBe(true); // our new room is intact
  });
});

describe('the room closes when nobody is connected', () => {
  it('closes at once when the last connected player leaves', async () => {
    const { clients, code } = await match();
    clients[1].send({ type: 'leave' });
    await clients[0].next('peer_left_match');
    clients[0].send({ type: 'leave' });
    await wait(100);
    expect(rooms.has(code)).toBe(false);
  });

  it('waits (empty-room timer) if a dropped player could still return', async () => {
    const { clients, code } = await match(3, 2);
    clients[1].ws.terminate();
    await clients[0].next('peer_away');
    clients[0].send({ type: 'leave' });
    clients[2].send({ type: 'leave' });
    await wait(100);
    expect(rooms.has(code)).toBe(true);
    await wait(900);
    expect(rooms.has(code)).toBe(false);
  });
});

describe('the host leaves mid-match', () => {
  it('the others carry on, and back_to_lobby makes the lowest connected seat the host', async () => {
    const { clients, code, tokens } = await match(3, 2);
    clients[0].send({ type: 'leave' });
    expect((await clients[1].next('peer_left_match')).seat).toBe(0);
    await clients[2].next('peer_left_match');
    expect(rooms.has(code)).toBe(true);
    expect(await accepted(clients[1])).toBe(true);
    clients[2].send({ type: 'back_to_lobby' }); // seat 1 (join order: 0, 2, 1)
    await wait(100);
    const room = rooms.get(code)!;
    expect(room.phase).toBe('lobby');
    // seat 1 was the lowest connected seat: it is the host now, and keeps its seat
    const lobby = await clients[2].next('lobby', 2000, (m) => m.youHost);
    expect(lobby).toMatchObject({ youHost: true, hostSeat: 1 });
    expect(lobby.seats).toEqual([false, true, true, false]);
    expect(room.left.size).toBe(0);
    expect(room.resumeTokens).not.toContain(tokens[0]);
    // the new host can run the lobby: start again
    clients[2].send({ type: 'start_match' });
    expect((await clients[2].next('start')).seat).toBe(1);
    expect((await clients[1].next('start')).seat).toBe(2);
  });

  it('is refused for a creator who only dropped (they can come back), as before', async () => {
    const { clients } = await match();
    clients[0].ws.terminate();
    await clients[1].next('peer_away');
    clients[1].send({ type: 'back_to_lobby' });
    expect((await clients[1].next('error')).message).toMatch(/host is disconnected/);
  });
});

describe('around the lobby and rematches', () => {
  it('lobby phase is unchanged: a guest leaving frees the seat, the creator closes the room', async () => {
    const { clients, code } = await lobby(2);
    clients[1].send({ type: 'leave' });
    await clients[0].next('lobby', 2000, (m) => !m.seats[1]);
    expect(rooms.has(code)).toBe(true);
    const guest = new TestClient();
    await guest.open();
    guest.send({ type: 'join', code });
    await guest.next('joined');
    clients[0].send({ type: 'leave' });
    await guest.next('peer_left');
    expect(rooms.has(code)).toBe(false);
  });

  it('a rematch proceeds with a left player (only connected players are waited for)', async () => {
    const { clients, code } = await match(3, 2);
    clients[1].send({ type: 'leave' });
    await clients[0].next('peer_left_match');
    clients[0].send({ type: 'rematch_ready' });
    clients[2].send({ type: 'rematch_ready' });
    await clients[0].next('rematch_start');
    await clients[2].next('rematch_start');
    expect(clients[1].messages.some((m) => m.type === 'rematch_start')).toBe(false);
    await clients[0].next('state', 2000, (m) => m.state.roundId === 2);
    expect(rooms.get(code)!.runner!.game.wizards[2].away).toBe(true); // still there, still away
    expect(rooms.has(code)).toBe(true);
  });

  it('back_to_lobby frees the left player seat', async () => {
    const { clients, code } = await match(3, 2);
    clients[1].send({ type: 'leave' }); // seat 2
    await clients[0].next('peer_left_match');
    clients[0].send({ type: 'back_to_lobby' });
    const lobby = await clients[0].next(
      'lobby',
      2000,
      (m) => m.seats.filter(Boolean).length === 2 && !m.seats[2],
    );
    expect(lobby.seats[2]).toBe(false);
    expect(rooms.get(code)!.left.size).toBe(0);
  });
});

describe('coming back to your seat by joining with the room code', () => {
  /** A started duel whose two players said who they are (clientId 'a' and 'b'). */
  async function identified() {
    const clients = [new TestClient(), new TestClient()];
    await Promise.all(clients.map((c, i) => c.open({ clientId: i ? 'b' : 'a' })));
    clients[0].send({ type: 'create' });
    const created = await clients[0].next('created');
    clients[1].send({ type: 'join', code: created.code });
    const joined = await clients[1].next('joined');
    clients[0].send({ type: 'start_match' });
    await Promise.all(clients.map((c) => c.next('start')));
    return { clients, code: created.code, oldToken: joined.resumeToken };
  }

  it('gives a player who left their seat back, with a new token, from the same socket', async () => {
    const { clients, code, oldToken } = await identified();
    clients[1].send({ type: 'leave' });
    await clients[0].next('peer_left_match');
    clients[1].messages.length = 0;
    clients[1].send({ type: 'join', code });
    const joined = await clients[1].next('joined');
    expect(joined).toMatchObject({ code, seat: 1 });
    expect(joined.resumeToken).not.toBe(oldToken);
    expect(await clients[1].next('resumed')).toMatchObject({ seat: 1 });
    expect((await clients[1].next('state')).state.you.away).toBe(false);
    await clients[0].next('peer_back');
    expect(rooms.get(code)!.left.size).toBe(0);
    // the old token is dead; the new one works from a fresh connection
    expect(rooms.get(code)!.resumeTokens).not.toContain(oldToken);
  });

  it('gives a dropped player their seat back from a new connection, ending the pause', async () => {
    const { clients, code } = await identified();
    clients[1].ws.terminate();
    await clients[0].next('peer_away');
    const again = new TestClient();
    await again.open({ clientId: 'b' });
    again.send({ type: 'join', code });
    expect(await again.next('joined')).toMatchObject({ seat: 1 });
    expect(await again.next('resumed')).toMatchObject({ seat: 1 });
    await clients[0].next('peer_back');
  });

  it('puts anyone else among the spectators, even into a seat that was left', async () => {
    const { clients, code } = await identified();
    clients[1].send({ type: 'leave' });
    await clients[0].next('peer_left_match');
    const stranger = new TestClient();
    await stranger.open({ clientId: 'someone-else' });
    stranger.send({ type: 'join', code });
    expect(await stranger.next('joined')).toMatchObject({ seat: null, resumeToken: '' });
    expect(await stranger.next('start')).toMatchObject({ spectating: true, seat: 0 });
    expect(rooms.get(code)!.left.has(1)).toBe(true);
  });
});
