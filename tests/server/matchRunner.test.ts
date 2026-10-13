import { describe, expect, it } from 'vitest';
import { MatchRunner } from '../../server/match';
import type { ServerMessage } from '../../shared/protocol';
import type { WizardId } from '../../shared/types';

/** A runner whose messages are collected per player, stepped by hand (no timers). */
function createRunner() {
  const inbox: Record<WizardId, ServerMessage[]> = { p: [], e: [] };
  const blocked = new Set<WizardId>();
  const runner = new MatchRunner(
    (side, msg) => inbox[side].push(msg),
    (side) => !blocked.has(side),
  );
  runner.start(1);
  runner.stop(); // stop the timer; the test calls step() itself
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
