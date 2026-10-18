import { beforeEach, describe, expect, it } from 'vitest';
import { pillars } from '../../shared/constants';
import { cast } from '../../shared/sim/combat';
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
    game.p.x = 100;
    game.p.y = 300;
    game.e.x = 175;
    game.e.y = 300;
    game.shots.push({
      id: 900,
      x: 110,
      y: 300,
      vx: 110,
      vy: 0,
      k: 'EARTH',
      owner: game.p,
      r: 14,
      life: 110,
      damage: 25,
      trail: 0,
      travel: 0,
      maxTravel: 450,
      charged: false,
    });
    update(game, 1);
    expect(game.e.hp).toBe(175);
    expect(game.shots).toHaveLength(0);
  });

  it('blocks a bolt at the pillar before it reaches a wizard', () => {
    const { x } = pillars[0];
    game.p.x = x - 125;
    game.p.y = 165;
    game.e.x = x + 95;
    game.e.y = 165;
    game.shots.push({
      id: 901,
      x: 150,
      y: 165,
      vx: 220,
      vy: 0,
      k: 'EARTH',
      owner: game.p,
      r: 14,
      life: 110,
      damage: 25,
      trail: 0,
      travel: 0,
      maxTravel: 450,
      charged: false,
    });
    update(game, 1);
    expect(game.e.hp).toBe(200);
    expect(game.shots).toHaveLength(0);
  });

  it('stops magma on the pillar instead of damaging a wizard behind it', () => {
    const { x } = pillars[0];
    game.p.x = x - 125;
    game.p.y = 165;
    game.e.x = x + 95;
    game.e.y = 165;
    game.shots.push({
      id: 902,
      x: x - 45,
      y: 165,
      vx: 4,
      vy: 0,
      k: 'MAGMA',
      owner: game.p,
      r: 27,
      life: 220,
      damage: 40,
      trail: 0,
      tx: x + 115,
      ty: 165,
      magma: true,
      hitTargets: new Set(),
    });
    update(game, 40);
    expect(game.e.hp).toBe(200);
    expect(game.shots).toHaveLength(0);
    expect(game.zones.some((z) => z.k === 'MAGMA' && z.x < x)).toBe(true);
  });
});

describe('firing while running the same way', () => {
  for (const spell of ['STEAM', 'PLASMA', 'ICE', 'STORM', 'MAGNETIC', 'EARTH'] as const) {
    it(`${spell} does not hit the caster who runs after it`, () => {
      game.p.x = 200;
      game.p.y = 300;
      game.e.x = 700;
      game.e.y = 100;
      game.input[0].keys = { KeyD: true };
      cast(game, game.p, 600, 300, 1, spell);
      for (let i = 0; i < 40; i++) update(game, 1);
      expect(game.p.hp).toBe(game.p.max);
    });
  }

  it('MAGMA spares its caster at first, but hits one who keeps running in it', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 700;
    game.e.y = 100;
    game.input[0].keys = { KeyD: true };
    cast(game, game.p, 600, 300, 1, 'MAGMA');
    for (let i = 0; i < 20; i++) update(game, 1);
    expect(game.p.hp).toBe(game.p.max);
    for (let i = 0; i < 20; i++) update(game, 1);
    expect(game.p.hp).toBeLessThan(game.p.max);
  });

  it('MAGMA that hits an enemy point blank also hurts its caster', () => {
    game.p.x = 300;
    game.p.y = 300;
    game.e.x = 335;
    game.e.y = 300;
    cast(game, game.p, 335, 300, 1, 'MAGMA');
    for (let i = 0; i < 5; i++) update(game, 1);
    expect(game.e.hp).toBeLessThan(game.e.max);
    expect(game.p.hp).toBeLessThan(game.p.max);
  });
});
