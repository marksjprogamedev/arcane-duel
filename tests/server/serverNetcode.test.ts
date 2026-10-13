import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createGameServer } from '../../server/app';
import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage } from '../../shared/protocol';
import { moveKeysToBits } from '../../shared/sim/movement';

let server: ReturnType<typeof createGameServer>;
let url: string;
const sockets: TestClient[] = [];

class TestClient {
  ws: WebSocket;
  messages: ServerMessage[] = [];
  private waiters: { match: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] =
    [];

  constructor() {
    this.ws = new WebSocket(url);
    this.ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString()) as ServerMessage;
      this.messages.push(m);
      this.waiters = this.waiters.filter((w) => {
        if (!w.match(m)) return true;
        w.resolve(m);
        return false;
      });
    });
    sockets.push(this);
  }
  /** Connects and says hello, like the real client. */
  open({ hello = true } = {}) {
    return new Promise<void>((r) =>
      this.ws.on('open', () => {
        if (hello) this.send({ type: 'hello', protocolVersion: PROTOCOL_VERSION });
        r();
      }),
    );
  }
  send(m: ClientMessage) {
    this.ws.send(JSON.stringify(m));
  }
  /** Resolves with the next (or an already received, unconsumed) message of this type. */
  next<T extends ServerMessage['type']>(
    type: T,
    timeoutMs = 2000,
    pred: (m: any) => boolean = () => true,
  ) {
    const found = this.messages.find((m) => m.type === type && pred(m));
    if (found) {
      this.messages.splice(this.messages.indexOf(found), 1);
      return Promise.resolve(found as Extract<ServerMessage, { type: T }>);
    }
    return new Promise<Extract<ServerMessage, { type: T }>>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeoutMs);
      this.waiters.push({
        match: (m) => m.type === type && pred(m),
        resolve: (m) => {
          clearTimeout(t);
          this.messages.splice(this.messages.indexOf(m), 1);
          resolve(m as any);
        },
      });
    });
  }
}

async function pair() {
  const host = new TestClient();
  const guest = new TestClient();
  await Promise.all([host.open(), guest.open()]);
  host.send({ type: 'create' });
  const { code, resumeToken: hostToken } = await host.next('created');
  guest.send({ type: 'join', code });
  const { resumeToken: guestToken } = await guest.next('joined');
  const [hs, gs] = await Promise.all([host.next('start'), guest.next('start')]);
  return { host, guest, hs, gs, code, hostToken, guestToken };
}

beforeEach(async () => {
  server = createGameServer('/nonexistent', 'test', { reconnectGraceMs: 400 });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/ws`;
});

afterEach(async () => {
  for (const s of sockets.splice(0)) s.ws.terminate();
  await new Promise<void>((r) => server.close(() => r()));
});

describe('server-authoritative rooms', () => {
  it('starts both players as clients and streams snapshots to each', async () => {
    const { host, guest, hs, gs } = await pair();
    expect(hs).toMatchObject({ roundId: 1 });
    expect(gs).toMatchObject({ roundId: 1 });
    const a = await host.next('state');
    const b = await guest.next('state');
    expect(a.state.roundId).toBe(1);
    expect(b.state.roundId).toBe(1);
  });

  it('each player sees themselves in the `e` slot, on their own side of the arena', async () => {
    const { host, guest } = await pair();
    const a = (await host.next('state')).state;
    const b = (await guest.next('state')).state;
    // host controls the left wizard, guest the right one
    expect(a.e.x).toBeLessThan(400);
    expect(a.p.x).toBeGreaterThan(400);
    expect(b.e.x).toBeGreaterThan(400);
    expect(b.p.x).toBeLessThan(400);
  });

  it('moves a wizard from move commands, acknowledges them, and both players see it', async () => {
    const { host, guest } = await pair();
    const before = (await guest.next('state')).state;
    const down = moveKeysToBits({ KeyS: true });
    host.send({ type: 'move', roundId: 1, seq: 1, keys: down, x: 400, y: 300 });
    host.send({ type: 'move', roundId: 1, seq: 2, keys: down, x: 400, y: 300 });
    const acked = await host.next('state', 2000, (m) => m.state.ack === 2);
    expect(acked.state.ack).toBe(2);
    // wait for a later snapshot showing movement
    const moved = (await guest.next('state', 2000, (m) => m.state.t > before.t + 20)).state;
    expect(moved.p.y).toBeGreaterThan(before.p.y); // host wizard is `p` in the guest's view
    expect(moved.ack).toBe(0); // the guest sent no move commands
    const hostView = (await host.next('state', 2000, (m) => m.state.t > before.t + 20)).state;
    expect(hostView.e.y).toBeCloseTo(moved.p.y, 0);
  });

  it('ignores old, out-of-order and wrong-round move commands', async () => {
    const { host } = await pair();
    const down = moveKeysToBits({ KeyS: true });
    host.send({ type: 'move', roundId: 1, seq: 5, keys: 0, x: 400, y: 300 });
    host.send({ type: 'move', roundId: 1, seq: 4, keys: down, x: 400, y: 300 }); // older: ignored
    host.send({ type: 'move', roundId: 7, seq: 9, keys: down, x: 400, y: 300 }); // wrong round
    const s0 = (await host.next('state', 2000, (m) => m.state.ack === 5)).state;
    const s1 = (await host.next('state', 2000, (m) => m.state.t > s0.t + 15)).state;
    expect(s1.ack).toBe(5);
    expect(s1.e.y).toBe(s0.e.y); // still standing: the newest command holds no keys
  });

  it('movement keys sent as key events are ignored (move commands own movement)', async () => {
    const { host } = await pair();
    host.send({ type: 'input', action: 'key', key: 'KeyS', down: true, roundId: 1, inputId: 1 });
    expect(await host.next('input_ack')).toMatchObject({ inputId: 1, accepted: true });
    const s0 = (await host.next('state')).state;
    const s1 = (await host.next('state', 2000, (m) => m.state.t > s0.t + 15)).state;
    expect(s1.e.y).toBe(s0.e.y);
  });

  it('rejects inputs for the wrong round', async () => {
    const { host } = await pair();
    host.send({ type: 'input', action: 'key', key: 'KeyD', down: true, roundId: 99, inputId: 5 });
    expect(await host.next('input_ack')).toMatchObject({ inputId: 5, accepted: false });
  });

  it('acknowledges casts and applies damage on the server', async () => {
    const { host, guest } = await pair();
    // load earth, hold and release towards the other wizard; it is out of earth range at the start
    host.send({ type: 'input', action: 'key', key: 'Digit4', down: true, roundId: 1, inputId: 1 });
    host.send({ type: 'input', action: 'down', x: 645, y: 300, roundId: 1, inputId: 2, castId: 7 });
    host.send({ type: 'input', action: 'up', x: 645, y: 300, roundId: 1, inputId: 3, castId: 8 });
    expect(await host.next('cast_ack', 2000, (m) => m.castId === 7)).toMatchObject({
      accepted: true,
    });
    const shotSeen = await guest.next('state', 2000, (m) => m.state.shots.length > 0);
    expect(shotSeen.state.shots[0].k).toBe('EARTH');
    // from the guest's perspective the shot belongs to the opponent `p`
    expect(shotSeen.state.shots[0].owner).toBe('p');
  });

  it("sends cosmetic fx events (not particles) in snapshots, from the receiver's perspective", async () => {
    const { host, guest } = await pair();
    // the host holds fire; the server emits spray events that go into the next snapshots
    host.send({ type: 'input', action: 'down', x: 645, y: 300, roundId: 1, inputId: 1 });
    const forHost = await host.next('state', 2000, (m) =>
      m.state.fx.some((e) => e.type === 'spray'),
    );
    const forGuest = await guest.next('state', 2000, (m) =>
      m.state.fx.some((e) => e.type === 'spray'),
    );
    expect(forHost.state).not.toHaveProperty('particles');
    // the host is simulation wizard `p`; each player sees themselves as `e`
    expect(forHost.state.fx.find((e) => e.type === 'spray')).toMatchObject({
      wizard: 'e',
      castOwner: 'e',
    });
    expect(forGuest.state.fx.find((e) => e.type === 'spray')).toMatchObject({
      wizard: 'p',
      castOwner: 'p',
    });
  });

  it('ignores server-only messages from clients (no spoofed state)', async () => {
    const { host, guest } = await pair();
    host.send({ type: 'state', state: { roundId: 1, p: {}, e: {} } as any });
    host.send({ type: 'finished', winner: true });
    const s = await guest.next('state');
    expect(s.state.p.hp).toBe(200);
    await new Promise((r) => setTimeout(r, 100));
    expect(guest.messages.some((m) => m.type === 'finished')).toBe(false);
  });

  it('tells the remaining player when the opponent leaves', async () => {
    const { host, guest } = await pair();
    host.send({ type: 'leave' });
    await guest.next('peer_left');
  });

  it('runs a rematch with a new round id', async () => {
    const { host, guest } = await pair();
    host.send({ type: 'rematch_ready' });
    guest.send({ type: 'rematch_ready' });
    expect(await host.next('rematch_start')).toMatchObject({ roundId: 2 });
    await guest.next('rematch_start');
    const s = await host.next('state', 2000, (m) => m.state.roundId === 2);
    expect(s.state.e.hp).toBe(200);
  });
});

describe('reconnecting', () => {
  it('pauses the match when a connection drops and closes the room after the grace period', async () => {
    const { host, guest } = await pair();
    host.ws.terminate();
    await guest.next('peer_away');
    // paused: the remaining player's actions are refused
    guest.send({ type: 'input', action: 'key', key: 'Digit1', down: true, roundId: 1, inputId: 3 });
    expect(await guest.next('input_ack')).toMatchObject({ inputId: 3, accepted: false });
    await guest.next('peer_left', 2000);
  });

  it('lets the player take their seat back with the resume token', async () => {
    const { host, guest, code, hostToken } = await pair();
    const before = (await host.next('state')).state;
    host.ws.terminate();
    await guest.next('peer_away');

    const back = new TestClient();
    await back.open();
    back.send({ type: 'resume', code, token: hostToken });
    expect(await back.next('resumed')).toMatchObject({ code, roundId: 1 });
    await guest.next('peer_back');
    // the same match continues, and the returning player is still wizard `p` (left side)
    const s = (await back.next('state')).state;
    expect(s.roundId).toBe(1);
    expect(s.e.x).toBeCloseTo(before.e.x, 0);
    expect(s.e.x).toBeLessThan(400);
    // and can play again
    back.send({ type: 'input', action: 'key', key: 'Digit1', down: true, roundId: 1, inputId: 9 });
    expect(await back.next('input_ack')).toMatchObject({ inputId: 9, accepted: true });
    // the grace timer was cancelled
    await new Promise((r) => setTimeout(r, 600));
    expect(guest.messages.some((m) => m.type === 'peer_left')).toBe(false);
  });

  it('a resume also replaces a connection the server still thinks is alive', async () => {
    const { host, guest, code, guestToken } = await pair();
    const replacement = new TestClient();
    await replacement.open();
    const closed = new Promise((r) => guest.ws.on('close', r));
    replacement.send({ type: 'resume', code, token: guestToken });
    await replacement.next('resumed');
    await closed;
    expect((await replacement.next('state')).state.e.x).toBeGreaterThan(400);
    expect(host.messages.some((m) => m.type === 'peer_left')).toBe(false);
  });

  it('refuses a wrong token', async () => {
    const { code } = await pair();
    const stranger = new TestClient();
    await stranger.open();
    stranger.send({ type: 'resume', code, token: 'not-the-token' });
    expect(await stranger.next('error')).toMatchObject({ message: 'Could not rejoin the match.' });
  });
});

describe('idle connections', () => {
  it('closes a connection that goes silent', async () => {
    await new Promise<void>((r) => server.close(() => r()));
    server = createGameServer('/nonexistent', 'test', { idleTimeoutMs: 200 });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/ws`;
    const silent = new TestClient();
    await silent.open();
    await new Promise((r) => silent.ws.on('close', r));
  });
});

describe('protocol hygiene', () => {
  it('tells an outdated client (no hello, or an old version) to refresh', async () => {
    const old = new TestClient();
    await old.open({ hello: false });
    old.send({ type: 'create' });
    expect(await old.next('error')).toMatchObject({ reason: 'outdated' });
    const older = new TestClient();
    await older.open({ hello: false });
    older.send({ type: 'hello', protocolVersion: PROTOCOL_VERSION - 1 });
    expect(await older.next('error')).toMatchObject({ reason: 'outdated' });
  });

  it('ignores malformed messages', async () => {
    const { host, guest } = await pair();
    host.ws.send('not json');
    host.ws.send(JSON.stringify({ type: 'input', action: 'explode', roundId: 1, inputId: 1 }));
    host.ws.send(JSON.stringify({ type: 'move', roundId: 1, seq: 'x', keys: 1 }));
    host.ws.send(JSON.stringify({ type: 'join', code: { $ne: null } }));
    host.send({ type: 'input', action: 'key', key: 'Digit1', down: true, roundId: 1, inputId: 2 });
    // only the valid input is acknowledged, and the match is unaffected
    expect(await host.next('input_ack')).toMatchObject({ inputId: 2 });
    expect(host.messages.some((m) => m.type === 'input_ack')).toBe(false);
    expect((await guest.next('state')).state.roundId).toBe(1);
  });

  it('disconnects a client that floods the server', async () => {
    const flood = new TestClient();
    await flood.open();
    const closed = new Promise((r) => flood.ws.on('close', r));
    for (let i = 0; i < 2000; i++) flood.send({ type: 'ping', stamp: i });
    await closed;
  });

  it('reports live numbers at /stats', async () => {
    await pair();
    const base = url.replace('ws://', 'http://').replace('/ws', '');
    const stats = await (await fetch(base + '/stats')).json();
    // rooms from earlier tests may still be in their reconnect grace period
    expect(stats).toMatchObject({ version: 'test', connections: 2 });
    expect(stats.matchesRunning).toBeGreaterThanOrEqual(1);
    expect(stats.rooms).toBeGreaterThanOrEqual(stats.matchesRunning);
    expect(stats.lastSecond).toHaveProperty('tickMsAvg');
  });
});
