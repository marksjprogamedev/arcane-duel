import { beforeEach, describe, expect, it } from 'vitest';
import { cast } from '../../shared/sim/combat';
import { update } from '../../shared/sim/update';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

const loadout = { FIRE: 'pyro_disc' } as const;

describe('Pyrodisk', () => {
  it('is stopped by an enemy bubble and turns home without hurting who is inside', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 300;
    game.bubbles.push({ x: 500, y: 300, r: 90, owner: game.e, life: 400 });
    cast(game, game.p, 500, 300, 1, 'FIRE', loadout);
    const disc = game.shots[0];
    let turned = false;
    for (let i = 0; i < 120 && game.shots.includes(disc); i++) {
      update(game, 1);
      turned ||= !!disc.returning;
      expect(Math.hypot(disc.x - 500, disc.y - 300)).toBeGreaterThanOrEqual(89);
    }
    expect(turned).toBe(true);
    expect(game.e.hp).toBe(200);
  });

  it('hits each foe up to twice, not twice in total', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 300;
    cast(game, game.p, 500, 300, 1, 'FIRE', loadout);
    const disc = game.shots[0];
    expect(disc.discHits).toEqual({});
    for (let i = 0; i < 200; i++) update(game, 1);
    // out and back through the same foe is two hits, counted against that foe's seat
    expect(disc.discHits).toEqual({ [game.e.seat]: 2 });
    expect(game.e.hp).toBe(200 - 2 * disc.damage);
  });
});
