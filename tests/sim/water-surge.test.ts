import { beforeEach, describe, expect, it } from 'vitest';
import { SURGE } from '../../shared/sim/combat/areas';
import { cast } from '../../shared/sim/combat/cast';
import { chargeableVariant, continuousVariant } from '../../shared/sim/variants';
import { update } from '../../shared/sim/update';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

const loadout = { WATER: 'water_surge' } as const;

function place(distance: number) {
  game.p.x = 200;
  game.p.y = 300;
  game.e.x = 200 + distance;
  game.e.y = 300;
}
const run = (ticks: number) => {
  for (let i = 0; i < ticks; i++) update(game, 1);
};

describe('Water Surge', () => {
  it('is an instant cast: no projectile, no spray, no charging', () => {
    expect(continuousVariant('WATER', loadout)).toBe(false);
    expect(chargeableVariant('WATER', loadout)).toBe(false);
    place(150);
    expect(cast(game, game.p, 700, 300, 1, 'WATER', loadout)).toBe(true);
    expect(game.shots).toHaveLength(0);
    expect(game.zones).toHaveLength(1);
  });

  it('comes out as a growing ring that expires', () => {
    place(900);
    cast(game, game.p, 700, 300, 1, 'WATER', loadout);
    const ring = game.zones[0];
    expect(ring.k).toBe('WATER');
    run(10);
    const early = ring.r;
    run(10);
    expect(ring.r).toBeGreaterThan(early);
    run(SURGE.LIFE);
    expect(game.zones).toHaveLength(0);
  });

  it('soaks to 75% and hurls back a wizard it reaches, once, and nobody else', () => {
    place(150);
    game.p.x = 200;
    cast(game, game.p, 700, 300, 1, 'WATER', loadout);
    run(1);
    expect(game.e.wet).toBe(0); // the ring (20 px) has not reached them yet
    run(40);
    expect(game.e.wet).toBeGreaterThan(60);
    expect(game.e.wet).toBeLessThanOrEqual(75);
    expect(game.e.x).toBeGreaterThan(150 + 200 + 100); // thrown a long way
    expect(game.e.hp).toBe(200); // no damage
    expect(game.p.wet).toBe(0);
    expect(game.p.x).toBe(200);
  });

  it('does not reach a wizard beyond its radius', () => {
    place(SURGE.MAX_R + 80);
    cast(game, game.p, 700, 300, 1, 'WATER', loadout);
    run(SURGE.LIFE + 5);
    expect(game.e.wet).toBe(0);
    expect(game.e.x).toBe(200 + SURGE.MAX_R + 80);
  });

  it('is stopped by a pillar between the two, and by a bubble', () => {
    game.map = { ...game.map, obstacles: [{ x: 280, y: 300, r: 30 }] };
    place(150);
    cast(game, game.p, 700, 300, 1, 'WATER', loadout);
    run(SURGE.LIFE + 5);
    expect(game.e.wet).toBe(0);

    resetDuel();
    game.map = { ...game.map, obstacles: [] };
    place(150);
    game.bubbles.push({ x: 350, y: 300, r: 60, owner: game.e, life: 400 });
    cast(game, game.p, 700, 300, 1, 'WATER', loadout);
    run(SURGE.LIFE + 5);
    expect(game.e.wet).toBe(0);
  });

  it('does not shove a wizard whose water shield stops it', () => {
    place(150);
    game.e.shield = { type: 1, life: 250 };
    cast(game, game.p, 700, 300, 1, 'WATER', loadout);
    run(SURGE.LIFE + 5);
    expect(game.e.wet).toBe(0);
    expect(game.e.x).toBe(350);
  });

  it('has a five second cooldown', () => {
    place(150);
    expect(cast(game, game.p, 700, 300, 1, 'WATER', loadout)).toBe(true);
    expect(cast(game, game.p, 700, 300, 1, 'WATER', loadout)).toBe(false);
    run(SURGE.COOLDOWN - 1);
    expect(cast(game, game.p, 700, 300, 1, 'WATER', loadout)).toBe(false);
    run(1);
    expect(cast(game, game.p, 700, 300, 1, 'WATER', loadout)).toBe(true);
  });

  it("puts out the caster's own fire", () => {
    place(900);
    game.p.burn = 60;
    game.p.burnTime = 120;
    cast(game, game.p, 700, 300, 1, 'WATER', loadout);
    expect(game.p.burn).toBe(0);
    expect(game.p.burnTime).toBe(0);
    expect(game.events.some((e) => e.type === 'text' && e.text === 'EXTINGUISHED')).toBe(true);
  });
});
