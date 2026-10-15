import { beforeEach, describe, expect, it } from 'vitest';
import { cast } from '../../shared/sim/combat';
import { update } from '../../shared/sim/update';
import type { BoltShot } from '../../shared/types';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

const loadout = { FIRE: 'pyro_disc' } as const;

describe('Pyrodisk', () => {
  it('is reflected by an enemy bubble like any projectile, and hurts the one who threw it', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 300;
    game.bubbles.push({ x: 500, y: 300, r: 90, owner: game.e, life: 400 });
    cast(game, game.p, 500, 300, 1, 'FIRE', loadout);
    const disc = game.shots[0] as BoltShot;
    let bounced = false;
    for (let i = 0; i < 60 && game.shots.includes(disc); i++) {
      update(game, 1);
      if (disc.owner === game.e && !bounced) {
        bounced = true;
        expect(disc.reflected).toBe(true);
        expect(disc.vx).toBeLessThan(0); // mirrored: back the way it came
        expect(disc.returning).toBe(false); // it does not turn for home, it flies on
        expect(Math.hypot(disc.x - 500, disc.y - 300)).toBeGreaterThanOrEqual(89); // never inside
      }
    }
    expect(bounced).toBe(true);
    expect(game.p.hp).toBeLessThan(200); // its sender takes the hit
    expect(game.e.hp).toBe(200); // the bubble's owner does not
  });

  it('once reflected, never turns home to anyone: it flies out and expires', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 300;
    game.bubbles.push({ x: 500, y: 300, r: 90, owner: game.e, life: 400 });
    cast(game, game.p, 500, 300, 1, 'FIRE', loadout);
    const disc = game.shots[0] as BoltShot;
    let everReturned = false;
    for (let i = 0; i < 400 && game.shots.includes(disc); i++) {
      update(game, 1);
      everReturned ||= !!disc.returning;
    }
    expect(disc.reflected).toBe(true);
    expect(everReturned).toBe(false); // it did not boomerang to the bubble's owner
    expect(game.shots.includes(disc)).toBe(false); // it ran out of reach and was gone
  });

  it("does not stop the bubble's owner from throwing their own disc while a reflected one flies", () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 300;
    game.bubbles.push({ x: 500, y: 300, r: 90, owner: game.e, life: 400 });
    cast(game, game.p, 500, 300, 1, 'FIRE', loadout);
    const disc = game.shots[0] as BoltShot;
    for (let i = 0; i < 60 && disc.owner === game.p; i++) update(game, 1);
    expect(disc.owner).toBe(game.e); // now reflected, and theirs
    expect(cast(game, game.e, 200, 300, 1, 'FIRE', loadout)).toBe(true);
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

  it('is reflected too when it meets an enemy bubble on the way home', () => {
    game.map = { ...game.map, obstacles: [] };
    game.bubbles.push({ x: 400, y: 300, r: 60, owner: game.e, life: 600 });
    const disc = returningDisc() as BoltShot;
    for (let i = 0; i < 40 && disc.owner === game.p; i++) update(game, 1);
    expect(disc.owner).toBe(game.e);
    expect(disc.returning).toBe(false);
    expect(disc.vx).toBeGreaterThan(0); // turned round, heading away from the caster again
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
