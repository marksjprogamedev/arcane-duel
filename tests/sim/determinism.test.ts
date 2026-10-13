import { describe, expect, it } from 'vitest';
import { applyInput } from '../../shared/sim/input';
import { resolveDeaths, update } from '../../shared/sim/update';
import { game, press, resetDuel } from './helpers';

/** Plays a scripted AI duel and returns a fingerprint of the final state. */
function playScripted(seed: number) {
  resetDuel('duel', seed);
  applyInput(game, 'p', press('Digit1'));
  applyInput(game, 'p', { kind: 'pointerdown', x: 500, y: 300 });
  for (let i = 0; i < 900; i++) {
    if (i % 100 === 50) applyInput(game, 'p', press('KeyD'));
    if (i % 100 === 0) applyInput(game, 'p', press('KeyA'));
    if (update(game, 1)) resolveDeaths(game);
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
