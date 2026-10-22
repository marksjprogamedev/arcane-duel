import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MatchRunner } from '../../server/match';
import { mapFor, spawnsFor } from '../../shared/maps';
import type { ServerMessage } from '../../shared/protocol';
import { moveKeysToBits, WALK_SPEED } from '../../shared/sim/movement';
import type { Seat } from '../../shared/types';

// Fake timers: the runner's own 60 Hz timer never fires, the tests call step() themselves.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** A running match whose messages are collected per player, stepped by hand. */
function createRunner() {
  const inbox: ServerMessage[][] = [[], []];
  const blocked = new Set<Seat>();
  const runner = new MatchRunner(
    (side, msg) => inbox[side].push(msg),
    (side) => !blocked.has(side),
  );
  runner.start(1, 'enchanted');
  const snapshots = (side: Seat) =>
    inbox[side].flatMap((m) => (m.type === 'state' ? [m.state] : []));
  return { runner, inbox, blocked, snapshots };
}

/** Queues a cosmetic event as if the simulation had just emitted it. */
const emitText = (runner: MatchRunner, x: number) =>
  runner.game.events.push({ type: 'text', x, y: 0, text: 'x', c: '#fff' });

describe('MatchRunner fx delivery', () => {
  it('delivers fx in the next snapshot', () => {
    const { runner, snapshots } = createRunner();
    emitText(runner, 1);
    for (let i = 0; i < 3; i++) runner.step();
    const fx = snapshots(0).flatMap((s) => s.fx);
    expect(fx).toContainEqual(expect.objectContaining({ type: 'text', x: 1 }));
  });

  it('keeps fx for a player whose snapshots were skipped and sends them later', () => {
    const { runner, blocked, snapshots } = createRunner();
    blocked.add(1);
    emitText(runner, 1);
    for (let i = 0; i < 6; i++) runner.step(); // two snapshot slots, both skipped for e
    emitText(runner, 2);
    blocked.delete(1);
    for (let i = 0; i < 3; i++) runner.step();
    const xs = snapshots(1)
      .flatMap((s) => s.fx)
      .filter((f) => f.type === 'text')
      .map((f) => f.x);
    expect(xs).toEqual([1, 2]);
    // the other player was not affected and got each event once
    const forP = snapshots(0)
      .flatMap((s) => s.fx)
      .filter((f) => f.type === 'text');
    expect(forP.map((f) => f.x)).toEqual([1, 2]);
  });
});

describe('MatchRunner move commands', () => {
  it('reports the newest applied move command in each snapshot', () => {
    const { runner, snapshots } = createRunner();
    runner.handleMove(1, { type: 'move', roundId: 1, seq: 3, keys: 8, x: 0, y: 0 });
    for (let i = 0; i < 3; i++) runner.step();
    expect(snapshots(1).at(-1)!.ack).toBe(3);
    expect(snapshots(0).at(-1)!.ack).toBe(0);
  });

  it('applies a repeated seq (early key-change send, then the tick) but never an older one', () => {
    const { runner } = createRunner();
    const right = moveKeysToBits({ KeyD: true });
    runner.handleMove(0, { type: 'move', roundId: 1, seq: 4, keys: right, x: 0, y: 0 });
    runner.handleMove(0, { type: 'move', roundId: 1, seq: 4, keys: 0, x: 0, y: 0 });
    expect(runner.game.input[0].keys).toEqual({});
    runner.handleMove(0, { type: 'move', roundId: 1, seq: 3, keys: right, x: 0, y: 0 });
    expect(runner.game.input[0].keys).toEqual({});
  });

  it('releases movement keys when a player stops sending move commands', () => {
    const { runner } = createRunner();
    const walkRight = moveKeysToBits({ KeyD: true });
    runner.handleMove(0, { type: 'move', roundId: 1, seq: 1, keys: walkRight, x: 0, y: 0 });
    const x0 = runner.game.wizards[0].x;
    for (let i = 0; i < 10; i++) runner.step();
    expect(runner.game.wizards[0].x).toBeGreaterThan(x0); // still walking on the last command
    for (let i = 0; i < 20; i++) runner.step();
    const stoppedAt = runner.game.wizards[0].x;
    for (let i = 0; i < 10; i++) runner.step();
    expect(runner.game.wizards[0].x).toBe(stoppedAt); // timed out: keys released
    expect(stoppedAt - x0).toBeLessThan(17 * WALK_SPEED);
  });
});

describe('MatchRunner map', () => {
  it('builds the match on the chosen arena, and a restart can change it', () => {
    const { runner } = createRunner();
    expect(runner.game.map).toBe(mapFor('enchanted'));
    runner.start(2, 'darkcircle');
    expect(runner.game.map).toBe(mapFor('darkcircle'));
    expect(runner.game.wizards[0].x).toBe(spawnsFor(mapFor('darkcircle'))[0].x);
  });

  it('plays on a battleground bigger than the old arena', () => {
    const { runner, snapshots } = createRunner();
    runner.start(3, 'devbattle');
    runner.step();
    expect(runner.game.map.width).toBe(2400);
    expect(runner.game.wizards[1].x).toBe(spawnsFor(mapFor('devbattle'))[1].x);
    // the spawns are far apart, so neither wizard sees the other at the start
    expect(snapshots(0).at(-1)?.others).toHaveLength(0);
    expect(snapshots(1).at(-1)?.others).toHaveLength(0);
    expect(snapshots(1).at(-1)?.you.x).toBeGreaterThan(800);
  });

  it('swaps the sides on a battleground rematch', () => {
    const { runner } = createRunner();
    const ruins = mapFor('ruins');
    runner.start(1, 'ruins');
    expect(runner.game.wizards[0].x).toBe(spawnsFor(ruins)[0].x);
    runner.start(2, 'ruins');
    expect(runner.game.wizards[0].x).toBe(spawnsFor(ruins)[1].x);
    runner.start(2, 'enchanted'); // arenas keep their sides
    expect(runner.game.wizards[0].x).toBe(spawnsFor(mapFor('enchanted'))[0].x);
  });

  it('runs a 2v2: every seat gets its own snapshot with its teammate and not the far-off enemies', () => {
    const inbox: ServerMessage[][] = [[], [], [], []];
    const runner = new MatchRunner((seat, msg) => inbox[seat].push(msg));
    runner.start(1, 'ruins', { teamSize: 2 });
    for (let i = 0; i < 3; i++) runner.step();
    expect(runner.game.wizards).toHaveLength(4);
    for (let seat = 0; seat < 4; seat++) {
      const snap = inbox[seat].flatMap((m) => (m.type === 'state' ? [m.state] : [])).at(-1)!;
      expect(snap.you.seat).toBe(seat);
      // the teammate is a step away; the enemies are across the map, out of sight
      expect(snap.others.map((w) => w.seat)).toEqual([seat < 2 ? 1 - seat : 5 - seat]);
      expect(snap.others[0].team).toBe(snap.you.team);
    }
  });
});

describe('MatchRunner loadouts', () => {
  it('gives each seat its own spell variants', () => {
    const { runner } = createRunner();
    runner.start(2, 'enchanted', {}, [{ FIRE: 'pyro_disc' }, { EARTH: 'pebbles' }]);
    expect(runner.game.input[0].loadout).toEqual({ FIRE: 'pyro_disc' });
    expect(runner.game.input[1].loadout).toEqual({ EARTH: 'pebbles' });
  });

  it('plays the originals when no loadouts are given', () => {
    const { runner } = createRunner();
    expect(runner.game.input.map((i) => i.loadout)).toEqual([{}, {}]);
  });
});

describe('MatchRunner health', () => {
  it('gives every wizard the health the room asked for', () => {
    const { runner } = createRunner();
    runner.start(2, 'enchanted', { teamSize: 1, wizardHp: 1000 });
    expect(runner.game.wizards.map((w) => [w.hp, w.max])).toEqual([
      [1000, 1000],
      [1000, 1000],
    ]);
  });

  it('is 200 by default', () => {
    const { runner } = createRunner();
    expect(runner.game.wizards.map((w) => w.hp)).toEqual([200, 200]);
  });
});

describe('MatchRunner countdown', () => {
  const move = (seq: number) => ({
    type: 'move' as const,
    roundId: 1,
    seq,
    keys: moveKeysToBits({ KeyD: true }),
    x: 0,
    y: 0,
  });

  /** A 1 v 1 that begins after `countdown` ticks, with messages collected per player. */
  function counting(countdown: number) {
    const inbox: ServerMessage[][] = [[], []];
    const runner = new MatchRunner((side, msg) => inbox[side].push(msg));
    runner.start(1, 'enchanted', {}, [], countdown);
    const counts = (side: Seat) =>
      inbox[side].flatMap((m) => (m.type === 'state' ? [m.state.countdown] : []));
    return { runner, inbox, counts };
  }

  it('stands still while it counts down, then plays', () => {
    const { runner, counts } = counting(10);
    runner.handleMove(0, move(1));
    for (let i = 0; i < 10; i++) runner.step();
    expect(runner.game.t).toBe(0);
    expect(runner.game.wizards[0].x).toBe(runner.game.starts[0].x);
    expect(counts(0)[0]).toBe(10);
    expect(counts(0).at(-1)).toBe(0);
    expect(counts(0)).toEqual([...counts(0)].sort((x, y) => y - x)); // only ever counts down
    runner.handleMove(0, move(2));
    runner.step();
    expect(runner.game.t).toBe(1);
  });

  it('refuses inputs until the countdown is over', () => {
    const { runner, inbox } = counting(4);
    const input = {
      type: 'input',
      action: 'key',
      roundId: 1,
      castId: null,
      key: 'Digit1',
      down: true,
      x: 0,
      y: 0,
    } as const;
    runner.handleInput(0, { ...input, inputId: 1 });
    for (let i = 0; i < 4; i++) runner.step();
    runner.handleInput(0, { ...input, inputId: 2 });
    const acks = inbox[0].flatMap((m) => (m.type === 'input_ack' ? [m.accepted] : []));
    expect(acks).toEqual([false, true]);
  });

  it('does not count down when started without one (solo, tests)', () => {
    const { runner, counts } = counting(0);
    runner.step();
    expect(runner.game.t).toBe(1);
    expect(counts(0)).toEqual([0]);
  });

  it('skips empty seats when sending snapshots', () => {
    const inbox: ServerMessage[][] = [[], [], [], []];
    const runner = new MatchRunner((seat, msg) => inbox[seat].push(msg));
    runner.start(1, 'ruins', { teamSize: 2, emptySeats: [3] });
    for (let i = 0; i < 3; i++) runner.step();
    expect(inbox[3]).toHaveLength(0);
    expect(inbox[2].length).toBeGreaterThan(0);
  });
});
