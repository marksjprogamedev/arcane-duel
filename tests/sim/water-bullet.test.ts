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

  it('has a 1.25 second cooldown', () => {
    game.e.x = 700;
    expect(cast(game, game.p, 700, 300, 1, 'WATER', loadout)).toBe(true);
    expect(cast(game, game.p, 700, 300, 1, 'WATER', loadout)).toBe(false);
    for (let i = 0; i < 74; i++) update(game, 1);
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

describe('Pebble Flurry', () => {
  const pebbles = { EARTH: 'pebbles' } as const;
  const fire = () => cast(game, game.p, 700, 300, 1, 'EARTH', pebbles);
  /** Holds the button and sprays for `ticks` ticks, like a player would. */
  function hold(ticks: number) {
    game.input[0].attack = 'EARTH';
    game.input[0].loadout = pebbles;
    game.input[0].holding = true;
    for (let i = 0; i < ticks; i++) update(game, 1);
  }

  it('hits three times as hard as before and reaches 286', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 700;
    fire();
    const pebble = game.shots[0] as BoltShot;
    expect(pebble.damage).toBeCloseTo(11.7);
    expect(pebble.maxTravel).toBe(286);
  });

  it('fires for 1.5 seconds, then needs five seconds to recharge', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 700;
    hold(5);
    expect(game.p.flurryTime).toBeGreaterThan(0);
    expect(game.p.flurryTime).toBeLessThanOrEqual(90);
    hold(86); // 91 ticks in all
    expect(game.p.flurryTime).toBe(0);
    expect(game.p.flurryCD).toBeGreaterThan(290);
    const pebblesAfter = game.shots.length;
    hold(30); // still holding: nothing more comes out
    expect(game.p.flurryTime).toBe(0);
    expect(fire()).toBe(false);
    game.input[0].holding = false;
    for (let i = 0; i < 230; i++) update(game, 1);
    expect(fire()).toBe(false); // 260 ticks since the end: not yet
    for (let i = 0; i < 50; i++) update(game, 1);
    expect(fire()).toBe(true);
    expect(pebblesAfter).toBeGreaterThan(0);
  });

  it('ends early when the button is let go, and the recharge starts then', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 700;
    hold(20);
    expect(game.p.flurryTime).toBeGreaterThan(0);
    game.input[0].holding = false;
    update(game, 1);
    expect(game.p.flurryTime).toBe(0);
    expect(game.p.flurryCD).toBeGreaterThan(290);
  });
});
