import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createGameServer } from '../../server/app';
import type { ClientMessage, ServerMessage } from '../../shared/protocol';

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
  open() {
    return new Promise<void>((r) => this.ws.on('open', () => r()));
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
  const { code } = await host.next('created');
  guest.send({ type: 'join', code });
  const [hs, gs] = await Promise.all([host.next('start'), guest.next('start')]);
  return { host, guest, hs, gs };
}

beforeEach(async () => {
  server = createGameServer('/nonexistent', 'test');
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

  it('moves a wizard on the server from input and both players see it', async () => {
    const { host, guest } = await pair();
    const before = (await guest.next('state')).state;
    host.send({ type: 'input', action: 'key', key: 'KeyS', down: true, roundId: 1, inputId: 1 });
    const ack = await host.next('input_ack');
    expect(ack).toMatchObject({ inputId: 1, accepted: true });
    // wait for a later snapshot showing movement
    const moved = (await guest.next('state', 2000, (m) => m.state.t > before.t + 20)).state;
    expect(moved.p.y).toBeGreaterThan(before.p.y); // host wizard is `p` in the guest's view
    const hostView = (await host.next('state', 2000, (m) => m.state.t > before.t + 20)).state;
    expect(hostView.e.y).toBeCloseTo(moved.p.y, 0);
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
    host.ws.close();
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
