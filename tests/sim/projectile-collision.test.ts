import { beforeEach, describe, expect, it } from 'vitest';
import { segmentCircleHit } from '../../shared/sim/geometry';
import { update } from '../../shared/sim/update';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

describe('swept projectile collision', () => {
  it('detects a wizard crossed between projectile endpoints', () => {
    expect(segmentCircleHit(100, 300, 280, 300, 175, 300, 26)).toBeCloseTo(49 / 180);
    expect(segmentCircleHit(100, 300, 280, 300, 175, 400, 26)).toBeNull();
  });

  it('damages a wizard even when a fast bolt passes beyond them in one tick', () => {
    game.p.x = 100; game.p.y = 300;
    game.e.x = 175; game.e.y = 300;
    game.shots.push({
      id: 900, x: 110, y: 300, vx: 110, vy: 0,
      k: 'EARTH', owner: game.p, r: 14, life: 110,
      damage: 25, trail: 0, travel: 0, maxTravel: 450, charged: false,
    });
    update(game, 1);
    expect(game.e.hp).toBe(175);
    expect(game.shots).toHaveLength(0);
  });

  it('blocks a bolt at the pillar before it reaches a wizard', () => {
    game.p.x = 110; game.p.y = 165;
    game.e.x = 330; game.e.y = 165;
    game.shots.push({
      id: 901, x: 150, y: 165, vx: 220, vy: 0,
      k: 'EARTH', owner: game.p, r: 14, life: 110,
      damage: 25, trail: 0, travel: 0, maxTravel: 450, charged: false,
    });
    update(game, 1);
    expect(game.e.hp).toBe(200);
    expect(game.shots).toHaveLength(0);
  });

  it('stops magma on the pillar instead of damaging a wizard behind it', () => {
    game.p.x = 110; game.p.y = 165;
    game.e.x = 330; game.e.y = 165;
    game.shots.push({
      id: 902, x: 190, y: 165, vx: 4, vy: 0,
      k: 'MAGMA', owner: game.p, r: 27, life: 220,
      damage: 40, trail: 0, tx: 350, ty: 165,
      magma: true, hitTargets: new Set(),
    });
    update(game, 40);
    expect(game.e.hp).toBe(200);
    expect(game.shots).toHaveLength(0);
    expect(game.zones.some(z => z.k === 'MAGMA' && z.x < 235)).toBe(true);
  });
});
