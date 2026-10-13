import { describe, expect, it } from 'vitest';
import { applyInput } from '../../client/src/sim/input';
import { resolveDeaths, update } from '../../client/src/sim/update';
import { game } from '../../client/src/state';
import { press, resetDuel } from './helpers';

/** Plays a scripted AI duel and returns a fingerprint of the final state. */
function playScripted(seed: number) {
  resetDuel('duel', seed);
  applyInput('p', press('Digit1'));
  applyInput('p', { kind: 'pointerdown', x: 500, y: 300 });
  for (let i = 0; i < 900; i++) {
    if (i % 100 === 50) applyInput('p', press('KeyD'));
    if (i % 100 === 0) applyInput('p', press('KeyA'));
    if (update(1)) resolveDeaths();
  }
  return JSON.stringify({
    p: [game.p.x, game.p.y, game.p.hp],
    e: [game.e.x, game.e.y, game.e.hp, game.e.spell],
    shots: game.shots.length,
    particles: game.particles.length,
  });
}

describe('determinism', () => {
  it('the same seed and inputs give an identical match', () => {
    expect(playScripted(42)).toBe(playScripted(42));
  });

  it('different seeds give different matches (the AI is random)', () => {
    expect(playScripted(1)).not.toBe(playScripted(2));
  });
});
