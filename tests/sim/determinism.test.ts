import { describe, expect, it } from 'vitest';
import { applyInput } from '../../shared/sim/input';
import { resolveDeaths } from '../../shared/sim/update/deaths';
import { update } from '../../shared/sim/update';
import { game, press, resetDuel } from './helpers';

/** Plays a scripted AI duel and returns a fingerprint of the final state. */
function playScripted(seed: number) {
  resetDuel('duel', seed);
  applyInput(game, 0, press('Digit1'));
  applyInput(game, 0, { kind: 'pointerdown', x: 500, y: 300 });
  for (let i = 0; i < 900; i++) {
    if (i % 100 === 50) applyInput(game, 0, press('KeyD'));
    if (i % 100 === 0) applyInput(game, 0, press('KeyA'));
    if (update(game, 1)) resolveDeaths(game);
  }
  return JSON.stringify({
    p: [game.wizards[0].x, game.wizards[0].y, game.wizards[0].hp],
    e: [game.wizards[1].x, game.wizards[1].y, game.wizards[1].hp, game.wizards[1].spell],
    shots: game.shots.length,
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
