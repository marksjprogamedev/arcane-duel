import { beforeEach, describe, expect, it } from 'vitest';
import { SURGE } from '../../shared/sim/combat/areas';
import { cast } from '../../shared/sim/combat/cast';
import { chargeableVariant, continuousVariant } from '../../shared/sim/variants';
import { update } from '../../shared/sim/update';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

const loadout = { WATER: 'water_surge' } as const;

function place(distance: number) {
  game.wizards[0].x = 200;
  game.wizards[0].y = 300;
  game.wizards[1].x = 200 + distance;
  game.wizards[1].y = 300;
}
const run = (ticks: number) => {
  for (let i = 0; i < ticks; i++) update(game, 1);
};

describe('Water Surge', () => {
  it('is an instant cast: no projectile, no spray, no charging', () => {
    expect(continuousVariant('WATER', loadout)).toBe(false);
    expect(chargeableVariant('WATER', loadout)).toBe(false);
    place(150);
    expect(cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout)).toBe(true);
    expect(game.shots).toHaveLength(0);
    expect(game.zones).toHaveLength(1);
  });

  it('comes out as a growing ring that expires', () => {
    place(900);
    cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout);
    const ring = game.zones[0];
    expect(ring.spell).toBe('WATER');
    run(10);
    const early = ring.r;
    run(10);
    expect(ring.r).toBeGreaterThan(early);
    run(SURGE.LIFE);
    expect(game.zones).toHaveLength(0);
  });

  it('soaks to 75% and hurls back a wizard it reaches, once, and nobody else', () => {
    place(150);
    game.wizards[0].x = 200;
    cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout);
    run(1);
    expect(game.wizards[1].wet).toBe(0); // the ring (20 px) has not reached them yet
    run(40);
    expect(game.wizards[1].wet).toBeGreaterThan(60);
    expect(game.wizards[1].wet).toBeLessThanOrEqual(75);
    expect(game.wizards[1].x).toBeGreaterThan(150 + 200 + 100); // thrown a long way
    expect(game.wizards[1].hp).toBe(200); // no damage
    expect(game.wizards[0].wet).toBe(0);
    expect(game.wizards[0].x).toBe(200);
  });

  it('does not reach a wizard beyond its radius', () => {
    place(SURGE.MAX_R + 80);
    cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout);
    run(SURGE.LIFE + 5);
    expect(game.wizards[1].wet).toBe(0);
    expect(game.wizards[1].x).toBe(200 + SURGE.MAX_R + 80);
  });

  it('is stopped by a pillar between the two, and by a bubble', () => {
    game.map = { ...game.map, obstacles: [{ x: 280, y: 300, r: 30 }] };
    place(150);
    cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout);
    run(SURGE.LIFE + 5);
    expect(game.wizards[1].wet).toBe(0);

    resetDuel();
    game.map = { ...game.map, obstacles: [] };
    place(150);
    game.bubbles.push({ x: 350, y: 300, r: 60, owner: game.wizards[1], life: 400 });
    cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout);
    run(SURGE.LIFE + 5);
    expect(game.wizards[1].wet).toBe(0);
  });

  it('does not shove a wizard whose water shield stops it', () => {
    place(150);
    game.wizards[1].shield = { type: 1, life: 250 };
    cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout);
    run(SURGE.LIFE + 5);
    expect(game.wizards[1].wet).toBe(0);
    expect(game.wizards[1].x).toBe(350);
  });

  it('has a five second cooldown', () => {
    place(150);
    expect(cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout)).toBe(true);
    expect(cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout)).toBe(false);
    run(SURGE.COOLDOWN - 1);
    expect(cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout)).toBe(false);
    run(1);
    expect(cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout)).toBe(true);
  });

  it("puts out the caster's own fire", () => {
    place(900);
    game.wizards[0].burn = 60;
    game.wizards[0].burnTime = 120;
    cast(game, game.wizards[0], 700, 300, 1, 'WATER', loadout);
    expect(game.wizards[0].burn).toBe(0);
    expect(game.wizards[0].burnTime).toBe(0);
    expect(game.events.some((e) => e.type === 'text' && e.text === 'EXTINGUISHED')).toBe(true);
  });
});
