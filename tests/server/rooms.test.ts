// Pins how rooms behave today (create, join, leave, lobby permissions, rematch, drops), so a
// refactor of server/rooms/ shows up as a failing test. The match itself is in onlineMatch.test.ts.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configureRooms } from '../../server/rooms';
import type { MapId } from '../../shared/maps';
import { ROOM_CODE_LENGTH } from '../../shared/protocol';
import { startTestServer, stopTestServer, TestClient, wait } from './helpers';

const opts = (mapId: MapId, teamSize = 1) => ({
  mapId,
  teamSize,
  friendlyFire: false,
  deathRule: 'elimination' as const,
  wizardHp: 200,
});

const NOT_FOUND = 'Room not found.';

/** A creator and `count - 1` other connected clients, with the room created (nobody joined yet). */
async function room(count: number, teamSize = 1) {
  const clients = Array.from({ length: count }, () => new TestClient());
  await Promise.all(clients.map((c) => c.open()));
  clients[0].send({ type: 'create' });
  const { code } = await clients[0].next('created');
  if (teamSize > 1) {
    clients[0].send({ type: 'set_options', options: opts('ruins', teamSize) });
    await clients[0].next('lobby', 2000, (m) => m.options.teamSize === teamSize);
  }
  return { clients, code };
}

/** Joins every client after the creator; returns the seats they got. */
async function joinAll(clients: TestClient[], code: string) {
  const seats: number[] = [];
  for (const c of clients.slice(1)) {
    c.send({ type: 'join', code });
    seats.push((await c.next('joined')).seat);
  }
  return seats;
}

beforeEach(() =>
  startTestServer({ reconnectGraceMs: 400, teamMatches: true, startCountdownTicks: 0 }),
);
afterEach(() => {
  configureRooms({ startCountdownTicks: 0 });
  return stopTestServer();
});

describe('creating and joining', () => {
  it('answers create with a 6-letter code, a resume token, seat 0 and the default lobby', async () => {
    const c = new TestClient();
    await c.open();
    c.send({ type: 'create' });
    const created = await c.next('created');
    expect(created.code).toMatch(new RegExp(`^[A-Z]{${ROOM_CODE_LENGTH}}$`));
    expect(ROOM_CODE_LENGTH).toBe(6);
    expect(created.resumeToken).toMatch(/^[0-9a-f]{32}$/);
    expect(created.seat).toBe(0);
    expect(await c.next('lobby')).toEqual({
      type: 'lobby',
      options: opts('enchanted', 1),
      seats: [true, false],
      loadouts: [{}, {}],
      looks: [null, null],
      names: ['Player 1', ''],
      guests: [true, false],
      hostSeat: 0,
      spectators: [],
      youSeat: 0,
      youHost: true,
      youToken: created.resumeToken,
    });
  });

  it('seats joiners in order: 1v1 takes seat 1, 2v2 alternates the teams', async () => {
    const duel = await room(2);
    expect(await joinAll(duel.clients, duel.code)).toEqual([1]);
    const teams = await room(4, 2);
    expect(await joinAll(teams.clients, teams.code)).toEqual([2, 1, 3]);
  });

  it('gives a joiner their own resume token, and joins by a lower-case code', async () => {
    const { clients, code } = await room(2);
    clients[1].send({ type: 'join', code: code.toLowerCase() });
    const joined = await clients[1].next('joined');
    expect(joined).toMatchObject({ code, seat: 1 });
    expect(joined.resumeToken).toMatch(/^[0-9a-f]{32}$/);
  });

  it('refuses an unknown code', async () => {
    const { clients } = await room(1);
    clients[0].send({ type: 'join', code: 'ZZZZZZ' });
    expect((await clients[0].next('error')).message).toBe(NOT_FOUND);
  });

  it('seats a joiner to a full room among the spectators, without a seat or token', async () => {
    const { clients, code } = await room(3);
    await joinAll(clients.slice(0, 2), code);
    clients[2].send({ type: 'join', code });
    expect(await clients[2].next('joined')).toMatchObject({ code, seat: null, resumeToken: '' });
    const lobby = await clients[2].next('lobby');
    expect(lobby).toMatchObject({ youSeat: null, youToken: null, seats: [true, true] });
    expect(lobby.spectators).toEqual([{ name: 'Player 3', guest: true, host: false, you: true }]);
    const seen = await clients[0].next('lobby', 2000, (m) => m.spectators.length === 1);
    expect(seen.spectators).toEqual([{ name: 'Player 3', guest: true, host: false, you: false }]);
  });

  it('refuses a join from someone already in that room', async () => {
    const { clients, code } = await room(1);
    clients[0].send({ type: 'join', code });
    expect((await clients[0].next('error')).message).toBe('You are already in that room.');
  });
});

describe('leaving the lobby', () => {
  it('frees a guest seat, keeps the room, and re-sends the lobby', async () => {
    const { clients, code } = await room(4, 2);
    await joinAll(clients, code);
    clients[1].send({ type: 'leave' }); // seat 2
    const lobby = await clients[0].next('lobby', 2000, (m) => m.seats[3] && !m.seats[2]);
    expect(lobby.seats).toEqual([true, true, false, true]);
    expect((await clients[3].next('lobby', 2000, (m) => m.seats[3] && !m.seats[2])).youSeat).toBe(
      3,
    );
    // the freed seat is the next one filled
    const late = new TestClient();
    await late.open();
    late.send({ type: 'join', code });
    expect((await late.next('joined')).seat).toBe(2);
  });

  it('passes the host to the next in the join queue when the host leaves, and closes once nobody is left', async () => {
    const { clients, code } = await room(3, 2);
    await joinAll(clients, code); // Player 2 sits in seat 2, Player 3 in seat 1
    clients[0].send({ type: 'leave' });
    const first = await clients[1].next('lobby', 2000, (m) => m.youHost);
    expect(first.names).toEqual(['', 'Player 3', 'Player 2', '']);
    expect(first.hostSeat).toBe(2);
    clients[1].send({ type: 'leave' });
    await clients[2].next('lobby', 2000, (m) => m.youHost);
    clients[2].send({ type: 'leave' });
    await wait(100);
    const late = new TestClient();
    await late.open();
    late.send({ type: 'join', code });
    expect((await late.next('error')).message).toBe(NOT_FOUND);
  });

  it('treats a dropped connection in the lobby like leaving (no grace period)', async () => {
    const { clients, code } = await room(2);
    await joinAll(clients, code);
    clients[1].ws.terminate();
    await clients[0].next('lobby', 2000, (m) => !m.seats[1]);
    clients[0].ws.terminate();
    await wait(100);
    const late = new TestClient();
    await late.open();
    late.send({ type: 'join', code });
    expect((await late.next('error')).message).toBe(NOT_FOUND);
  });

  it('hands the old room to the next player when its creator creates another', async () => {
    const { clients, code } = await room(2);
    await joinAll(clients, code);
    clients[0].send({ type: 'create' });
    await clients[1].next('lobby', 2000, (m) => m.youHost);
    expect((await clients[0].next('created')).code).not.toBe(code);
  });
});

describe('who may do what in the lobby', () => {
  it('lets only the host set options and start', async () => {
    const { clients, code } = await room(3, 2);
    await joinAll(clients, code); // seats 0, 2, 1
    for (const guest of clients.slice(1)) {
      guest.send({ type: 'set_options', options: opts('volcano', 2) });
      guest.send({ type: 'start_match' });
    }
    await wait(150);
    for (const cl of clients) {
      expect(cl.messages.some((m) => m.type === 'start')).toBe(false);
      expect(cl.messages.some((m) => m.type === 'lobby' && m.options.mapId === 'volcano')).toBe(
        false,
      );
    }
  });

  it('needs a player on each team to start', async () => {
    const alone = await room(1);
    alone.clients[0].send({ type: 'start_match' });
    const teams = await room(3, 2);
    await joinAll(teams.clients, teams.code); // seats 0, 2, 1
    teams.clients[0].send({ type: 'start_match' });
    await Promise.all(teams.clients.map((c) => c.next('start')));
    await wait(100);
    expect(alone.clients[0].messages.some((m) => m.type === 'start')).toBe(false);
  });
});

describe('starting, rematch and back to the lobby', () => {
  it('sends start to everyone with their own seat and the lobby rules', async () => {
    const { clients, code } = await room(3, 2);
    await joinAll(clients, code); // seats 0, 2, 1
    clients[0].send({ type: 'start_match' });
    const starts = await Promise.all(clients.map((c) => c.next('start')));
    expect(starts.map((m) => m.seat)).toEqual([0, 2, 1]);
    for (const m of starts) {
      expect(m).toMatchObject({ roundId: 1, mapId: 'ruins', countdownTicks: 0 });
      expect(m.rules).toMatchObject({ teamSize: 2, emptySeats: [3], friendlyFire: false });
      expect(m.loadouts).toHaveLength(4);
    }
  });

  it('starts the rematch only once everyone is ready, with countdownTicks 0', async () => {
    configureRooms({ startCountdownTicks: 30 });
    const { clients, code } = await room(2);
    await joinAll(clients, code);
    clients[0].send({ type: 'start_match' });
    expect(await clients[0].next('start')).toMatchObject({ countdownTicks: 30 });
    clients[0].send({ type: 'rematch_ready' });
    await wait(100);
    expect(clients[1].messages.some((m) => m.type === 'rematch_start')).toBe(false);
    clients[1].send({ type: 'rematch_ready' });
    const starts = await Promise.all(clients.map((c) => c.next('rematch_start')));
    expect(starts.map((m) => [m.roundId, m.seat, m.countdownTicks])).toEqual([
      [2, 0, 0],
      [2, 1, 0],
    ]);
  });

  it('sends back_to_lobby to everyone as a lobby, with the options kept', async () => {
    const { clients, code } = await room(2);
    clients[0].send({
      type: 'set_options',
      options: { ...opts('volcano', 1), friendlyFire: true },
    });
    await clients[0].next('lobby', 2000, (m) => m.options.mapId === 'volcano');
    await joinAll(clients, code);
    clients[0].send({ type: 'start_match' });
    await Promise.all(clients.map((c) => c.next('start')));
    for (const c of clients) c.messages.length = 0;
    clients[1].send({ type: 'back_to_lobby' });
    for (const [i, c] of clients.entries()) {
      const lobby = await c.next('lobby');
      expect(lobby).toMatchObject({ seats: [true, true], youSeat: i });
      expect(lobby.options).toMatchObject({ mapId: 'volcano', friendlyFire: true });
    }
    // and the creator can start again, as round 2
    clients[0].send({ type: 'start_match' });
    expect(await clients[1].next('start')).toMatchObject({ roundId: 2, mapId: 'volcano' });
  });
});

describe('a player dropping during a match', () => {
  it('tells the others peer_away; a join watches instead, and the room stays open', async () => {
    const { clients, code } = await room(2);
    await joinAll(clients, code);
    clients[0].send({ type: 'start_match' });
    await Promise.all(clients.map((c) => c.next('start')));
    clients[0].ws.terminate();
    await clients[1].next('peer_away');
    // a third client watches, during the grace and after it
    const third = new TestClient();
    await third.open();
    third.send({ type: 'join', code });
    expect(await third.next('joined')).toMatchObject({ seat: null });
    expect(await third.next('start')).toMatchObject({ spectating: true, seat: 1 });
    await wait(600); // past the 400 ms grace: the room is not closed
    expect(clients[1].messages.some((m) => m.type === 'peer_left')).toBe(false);
    third.send({ type: 'join', code });
    expect((await third.next('error')).message).toBe('You are already in that room.');
  });
});

describe('joining a running team match', () => {
  it('watches rather than taking the open seat, and nobody gets a lobby', async () => {
    // a 2v2 started with 3 players; the fourth tries to join mid-match
    const { clients, code } = await room(4, 2);
    await joinAll(clients.slice(0, 3), code);
    clients[0].send({ type: 'start_match' });
    await Promise.all(clients.slice(0, 3).map((c) => c.next('start')));
    for (const c of clients) c.messages.length = 0;
    clients[3].send({ type: 'join', code });
    expect(await clients[3].next('joined')).toMatchObject({ seat: null, resumeToken: '' });
    expect(await clients[3].next('start')).toMatchObject({ spectating: true });
    await wait(150);
    for (const c of clients) expect(c.messages.some((m) => m.type === 'lobby')).toBe(false);
  });
});
