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

  /** A disc already on its way home from (600, 300) to a caster at (200, 300). */
  function returningDisc() {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 700;
    game.e.y = 600;
    cast(game, game.p, 500, 300, 1, 'FIRE', loadout);
    const disc = game.shots[0];
    Object.assign(disc, { x: 600, y: 300, returning: true, maxTravel: 2000, life: 300 });
    return disc;
  }
  const reachedCaster = (d: { x: number; y: number }) => Math.hypot(d.x - 200, d.y - 300) < 30;

  it('turns home when it hits a pillar going out', () => {
    game.map = { ...game.map, obstacles: [{ x: 400, y: 300, r: 40 }] };
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 700;
    game.e.y = 600;
    cast(game, game.p, 700, 300, 1, 'FIRE', loadout);
    const disc = game.shots[0];
    for (let i = 0; i < 40 && !disc.returning; i++) update(game, 1);
    expect(disc.returning).toBe(true);
    expect(Math.hypot(disc.x - 400, disc.y - 300)).toBeGreaterThanOrEqual(40);
  });

  it('expires when it meets a pillar on the way home', () => {
    game.map = { ...game.map, obstacles: [{ x: 400, y: 300, r: 50 }] };
    const disc = returningDisc();
    for (let i = 0; i < 100 && game.shots.includes(disc); i++) update(game, 1);
    expect(game.shots.includes(disc)).toBe(false);
    expect(disc.life).toBeLessThanOrEqual(0);
    expect(reachedCaster(disc)).toBe(false);
    expect(Math.hypot(disc.x - 400, disc.y - 300)).toBeGreaterThanOrEqual(50);
  });

  it('expires when it meets an enemy bubble on the way home', () => {
    game.map = { ...game.map, obstacles: [] };
    game.bubbles.push({ x: 400, y: 300, r: 60, owner: game.e, life: 600 });
    const disc = returningDisc();
    for (let i = 0; i < 100 && game.shots.includes(disc); i++) update(game, 1);
    expect(game.shots.includes(disc)).toBe(false);
    expect(reachedCaster(disc)).toBe(false);
  });

  it('flies on past the map edge, then comes home at the end of its reach', () => {
    game.map = { ...game.map, obstacles: [] };
    const { width } = game.map;
    game.p.x = width - 100;
    game.p.y = 300;
    game.e.x = 100;
    game.e.y = 600;
    cast(game, game.p, width + 500, 300, 1, 'FIRE', loadout);
    const disc = game.shots[0];
    let outside = false;
    for (let i = 0; i < 300 && game.shots.includes(disc); i++) {
      update(game, 1);
      outside ||= disc.x > width;
      if (disc.returning) expect(outside).toBe(true);
    }
    expect(outside).toBe(true);
    expect(disc.returning).toBe(true);
    expect(Math.hypot(disc.x - game.p.x, disc.y - game.p.y)).toBeLessThan(30);
  });
});
