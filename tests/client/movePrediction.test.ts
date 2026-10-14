import { describe, expect, it } from 'vitest';
import { MovePredictor } from '../../client/src/net/movePrediction';
import {
  moveKeysFromBits,
  stepMovement,
  WALK_SPEED,
  type MoveKeys,
  type Mover,
} from '../../shared/sim/movement';

const wizardAt = (x: number, y: number): Mover => ({
  x,
  y,
  kx: 0,
  ky: 0,
  freeze: 0,
  prison: 0,
  chill: 0,
  chargeSpell: null,
});

/**
 * A tiny in-process server and network: commands and snapshots each take `delayTicks` to arrive,
 * the server uses the newest command it has (like MatchRunner.handleMove) and sends a snapshot
 * every 3 ticks. Returns the drawn positions, one per tick.
 */
function play(opts: {
  delayTicks: number;
  /** Extra random delay (0..jitterTicks) per message; order is preserved, like TCP. */
  jitterTicks?: number;
  script: (tick: number) => MoveKeys;
  ticks: number;
  /** Lets a test change the server's wizard (knockback, teleport) at a given tick. */
  serverEvent?: (tick: number, w: Mover) => void;
}) {
  const predictor = new MovePredictor();
  const server = wizardAt(400, 300);
  let serverKeys: MoveKeys = {};
  let serverAck = 0;
  const toServer: { at: number; seq: number; keys: number }[] = [];
  const toClient: { at: number; w: Mover; ack: number }[] = [];
  const drawn: { x: number; y: number }[] = [];
  const truth: { x: number; y: number }[] = [];

  let seed = 7;
  const jitter = () => {
    seed = (seed * 16807) % 2147483647;
    return Math.floor((seed / 2147483647) * ((opts.jitterTicks ?? 0) + 1));
  };
  // order-preserving arrival time: never before the message sent ahead of it
  const arrival = (queue: { at: number }[], t: number) =>
    Math.max(t + opts.delayTicks + jitter(), queue.at(-1)?.at ?? 0);

  predictor.reconcile(server, 0);
  for (let t = 0; t < opts.ticks; t++) {
    // client tick
    const cmd = predictor.tick(opts.script(t));
    toServer.push({ at: arrival(toServer, t), ...cmd });
    // server tick: apply arrived commands (newest wins), then simulate
    while (toServer.length && toServer[0].at <= t) {
      const m = toServer.shift()!;
      serverKeys = moveKeysFromBits(m.keys);
      serverAck = m.seq;
    }
    opts.serverEvent?.(t, server);
    stepMovement(server, serverKeys, 1);
    if (t % 3 === 0) toClient.push({ at: arrival(toClient, t), w: { ...server }, ack: serverAck });
    // snapshots arriving at the client
    while (toClient.length && toClient[0].at <= t) {
      const s = toClient.shift()!;
      predictor.reconcile(s.w, s.ack);
    }
    drawn.push(predictor.drawPosition(1, 1000 / 60)!);
    truth.push({ x: server.x, y: server.y });
  }
  return { drawn, truth, predictor };
}

const stepSizes = (path: { x: number; y: number }[]) =>
  path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y));

describe('MovePredictor', () => {
  it('moves instantly on input, before any snapshot confirms it', () => {
    const p = new MovePredictor();
    p.reconcile(wizardAt(400, 300), 0);
    p.tick({ KeyD: true });
    expect(p.drawPosition(1, 16)).toEqual({ x: 400 + WALK_SPEED, y: 300 });
  });

  it('replays unacknowledged commands on top of the server position', () => {
    const p = new MovePredictor();
    p.reconcile(wizardAt(400, 300), 0);
    for (let i = 0; i < 5; i++) p.tick({ KeyD: true });
    // the server has applied the first two commands
    p.reconcile(wizardAt(400 + 2 * WALK_SPEED, 300), 2);
    expect(p.unacknowledged).toBe(3);
    expect(p.drawPosition(1, 16)!.x).toBeCloseTo(400 + 5 * WALK_SPEED);
  });

  it('with a steady 75 ms each-way delay, walking never rubber-bands', () => {
    const script = (t: number): MoveKeys =>
      t < 40 ? { KeyD: true } : t < 60 ? {} : t < 100 ? { KeyS: true } : {};
    const { drawn, truth } = play({ delayTicks: 5, script, ticks: 160 });
    // each frame moves at most one walking step (no jumps back and forth)
    for (const d of stepSizes(drawn)) expect(d).toBeLessThanOrEqual(WALK_SPEED + 0.01);
    // and once everyone stands still, the drawn wizard sits exactly where the server has it
    expect(drawn.at(-1)!.x).toBeCloseTo(truth.at(-1)!.x, 1);
    expect(drawn.at(-1)!.y).toBeCloseTo(truth.at(-1)!.y, 1);
  });

  it('with a jittery link (~115 ms + up to 33 ms each way), corrections stay small and settle', () => {
    const moves: MoveKeys[] = [{ KeyD: true }, {}, { KeyW: true }, { KeyA: true, KeyS: true }, {}];
    const script = (t: number): MoveKeys => (t < 350 ? moves[Math.floor(t / 25) % 5] : {});
    const { drawn, truth } = play({ delayTicks: 7, jitterTicks: 2, script, ticks: 400 });
    // the newest-command-wins server can drift a tick or two at a key change; the client glides
    // over that instead of snapping, so no frame moves much more than a normal walking step
    expect(Math.max(...stepSizes(drawn))).toBeLessThan(WALK_SPEED * 1.4);
    expect(drawn.at(-1)!.x).toBeCloseTo(truth.at(-1)!.x, 0);
    expect(drawn.at(-1)!.y).toBeCloseTo(truth.at(-1)!.y, 0);
  });

  it('glides (does not jump) to a knockback that only the server knew about', () => {
    const { drawn, truth } = play({
      delayTicks: 4,
      script: () => ({}),
      ticks: 90,
      serverEvent: (t, w) => {
        if (t === 10) w.kx = 19;
      },
    });
    // the push is ~100 px in total, but it never shows up as one big jump
    expect(Math.max(...stepSizes(drawn))).toBeLessThan(25);
    expect(drawn.at(-1)!.x).toBeCloseTo(truth.at(-1)!.x, 1);
  });

  it('jumps straight to a teleport instead of gliding across the arena', () => {
    const { drawn } = play({
      delayTicks: 4,
      script: () => ({}),
      ticks: 30,
      serverEvent: (t, w) => {
        if (t === 5) w.x = 100;
      },
    });
    expect(drawn.at(-1)!.x).toBeCloseTo(100, 1);
    expect(Math.max(...stepSizes(drawn))).toBeGreaterThan(200);
  });

  it('cannot walk while frozen, exactly like the server', () => {
    const p = new MovePredictor();
    p.reconcile({ ...wizardAt(400, 300), freeze: 3 }, 0);
    for (let i = 0; i < 5; i++) p.tick({ KeyD: true });
    // the timer runs down before walking (as on the server): two ticks frozen, then three steps
    expect(p.drawPosition(1, 0)!.x).toBeCloseTo(400 + 3 * WALK_SPEED);
  });

  it('interpolates between ticks for smooth drawing at high refresh rates', () => {
    const p = new MovePredictor();
    p.reconcile(wizardAt(400, 300), 0);
    p.tick({ KeyD: true });
    expect(p.drawPosition(0.5, 0)!.x).toBeCloseTo(400 + WALK_SPEED / 2);
  });
});

describe('MovePredictor while charging a spell', () => {
  it('walks slower while charging, exactly like the simulation', () => {
    const predictor = new MovePredictor();
    predictor.reconcile(wizardAt(400, 300), 0);
    const server = wizardAt(400, 300);
    for (let i = 0; i < 10; i++) {
      predictor.tick({ KeyD: true }, 'EARTH');
      server.chargeSpell = 'EARTH';
      stepMovement(server, { KeyD: true }, 1);
    }
    const drawn = predictor.drawPosition(1, 0)!;
    expect(drawn.x).toBeCloseTo(server.x);
    expect(drawn.x - 400).toBeLessThan(10 * WALK_SPEED);
  });

  it('replays unacknowledged ticks with the charge state each one had', () => {
    const predictor = new MovePredictor();
    predictor.reconcile(wizardAt(400, 300), 0);
    for (let i = 0; i < 5; i++) predictor.tick({ KeyD: true }, 'EARTH');
    for (let i = 0; i < 5; i++) predictor.tick({ KeyD: true }, null);
    const before = predictor.drawPosition(1, 0)!.x;
    // the server has seen nothing yet: replaying from the same start must land in the same place
    predictor.reconcile(wizardAt(400, 300), 0);
    expect(predictor.drawPosition(1, 1000)!.x).toBeCloseTo(before);
  });
});
