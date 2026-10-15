import { beforeEach, describe, expect, it } from 'vitest';
import { cast } from '../../shared/sim/combat';
import { chargeableVariant, continuousVariant } from '../../shared/sim/variants';
import { update } from '../../shared/sim/update';
import type { BoltShot } from '../../shared/types';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

const loadout = { WATER: 'water_bullet' } as const;

function fireAt(distance: number) {
  game.p.x = 200;
  game.p.y = 300;
  game.e.x = 200 + distance;
  game.e.y = 300;
  expect(cast(game, game.p, game.e.x, game.e.y, 1, 'WATER', loadout)).toBe(true);
  for (let i = 0; i < 60 && game.shots.length; i++) update(game, 1);
}

describe('Water Bullet', () => {
  it('is a single projectile that neither charges nor sprays', () => {
    expect(continuousVariant('WATER', loadout)).toBe(false);
    expect(chargeableVariant('WATER', loadout)).toBe(false);
  });

  it('soaks the target to 40% wet, hurts them and pushes them back', () => {
    fireAt(250);
    expect(game.e.wet).toBeGreaterThanOrEqual(35); // 40, less the little that drains by the end of the tick
    expect(game.e.wet).toBeLessThanOrEqual(40);
    expect(game.e.hp).toBe(200 - 18);
    for (let i = 0; i < 12; i++) update(game, 1); // the shove plays out over the next ticks
    expect(game.e.x).toBeGreaterThan(455);
  });

  it('has a two second cooldown', () => {
    game.e.x = 700;
    expect(cast(game, game.p, 700, 300, 1, 'WATER', loadout)).toBe(true);
    expect(cast(game, game.p, 700, 300, 1, 'WATER', loadout)).toBe(false);
    for (let i = 0; i < 119; i++) update(game, 1);
    expect(cast(game, game.p, 700, 300, 1, 'WATER', loadout)).toBe(false);
    update(game, 1);
    expect(cast(game, game.p, 700, 300, 1, 'WATER', loadout)).toBe(true);
  });

  it('does not push back a target whose shield stops it', () => {
    game.e.shield = { type: 1, life: 250 }; // a water shield
    fireAt(250);
    for (let i = 0; i < 12; i++) update(game, 1);
    expect(game.e.hp).toBe(200);
    expect(game.e.x).toBe(450);
  });
});

describe('Pebble Spray', () => {
  it('has 50% more damage and 30% more range than before (2.6 to 3.9, 220 to 286)', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 700;
    cast(game, game.p, 700, 300, 1, 'EARTH', { EARTH: 'pebbles' });
    const pebble = game.shots[0] as BoltShot;
    expect(pebble.damage).toBeCloseTo(3.9);
    expect(pebble.maxTravel).toBe(286);
  });
});
