import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MatchRunner } from '../../server/match';
import type { ServerMessage } from '../../shared/protocol';
import { moveKeysToBits, WALK_SPEED } from '../../shared/sim/movement';
import type { WizardId } from '../../shared/types';

// Fake timers: the runner's own 60 Hz timer never fires, the tests call step() themselves.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** A running match whose messages are collected per player, stepped by hand. */
function createRunner() {
  const inbox: Record<WizardId, ServerMessage[]> = { p: [], e: [] };
  const blocked = new Set<WizardId>();
  const runner = new MatchRunner(
    (side, msg) => inbox[side].push(msg),
    (side) => !blocked.has(side),
  );
  runner.start(1);
  const snapshots = (side: WizardId) =>
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
    const fx = snapshots('p').flatMap((s) => s.fx);
    expect(fx).toContainEqual(expect.objectContaining({ type: 'text', x: 1 }));
  });

  it('keeps fx for a player whose snapshots were skipped and sends them later', () => {
    const { runner, blocked, snapshots } = createRunner();
    blocked.add('e');
    emitText(runner, 1);
    for (let i = 0; i < 6; i++) runner.step(); // two snapshot slots, both skipped for e
    emitText(runner, 2);
    blocked.delete('e');
    for (let i = 0; i < 3; i++) runner.step();
    const xs = snapshots('e')
      .flatMap((s) => s.fx)
      .filter((f) => f.type === 'text')
      .map((f) => f.x);
    expect(xs).toEqual([1, 2]);
    // the other player was not affected and got each event once
    const forP = snapshots('p')
      .flatMap((s) => s.fx)
      .filter((f) => f.type === 'text');
    expect(forP.map((f) => f.x)).toEqual([1, 2]);
  });
});

describe('MatchRunner move commands', () => {
  it('reports the newest applied move command in each snapshot', () => {
    const { runner, snapshots } = createRunner();
    runner.handleMove('e', { type: 'move', roundId: 1, seq: 3, keys: 8, x: 0, y: 0 });
    for (let i = 0; i < 3; i++) runner.step();
    expect(snapshots('e').at(-1)!.ack).toBe(3);
    expect(snapshots('p').at(-1)!.ack).toBe(0);
  });

  it('releases movement keys when a player stops sending move commands', () => {
    const { runner } = createRunner();
    const walkRight = moveKeysToBits({ KeyD: true });
    runner.handleMove('p', { type: 'move', roundId: 1, seq: 1, keys: walkRight, x: 0, y: 0 });
    const x0 = runner.game.p.x;
    for (let i = 0; i < 10; i++) runner.step();
    expect(runner.game.p.x).toBeGreaterThan(x0); // still walking on the last command
    for (let i = 0; i < 20; i++) runner.step();
    const stoppedAt = runner.game.p.x;
    for (let i = 0; i < 10; i++) runner.step();
    expect(runner.game.p.x).toBe(stoppedAt); // timed out: keys released
    expect(stoppedAt - x0).toBeLessThan(17 * WALK_SPEED);
  });
});
