import { beforeEach, describe, expect, it } from 'vitest';
import { cast } from '../../shared/sim/combat/cast';
import { update } from '../../shared/sim/update';
import type { BoltShot } from '../../shared/types';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

describe('Pebble Flurry', () => {
  const pebbles = { EARTH: 'pebbles' } as const;
  const fire = () => cast(game, game.wizards[0], 700, 300, 1, 'EARTH', pebbles);
  /** Holds the button and sprays for `ticks` ticks, like a player would. */
  function hold(ticks: number) {
    game.input[0].attack = 'EARTH';
    game.input[0].loadout = pebbles;
    game.input[0].holding = true;
    for (let i = 0; i < ticks; i++) update(game, 1);
  }

  it('hits three times as hard as before and reaches 286', () => {
    game.wizards[0].x = 200;
    game.wizards[0].y = 300;
    game.wizards[1].x = 700;
    fire();
    const pebble = game.shots[0] as BoltShot;
    expect(pebble.damage).toBeCloseTo(11.7);
    expect(pebble.maxTravel).toBe(286);
  });

  it('fires for 1.5 seconds, then needs five seconds to recharge', () => {
    game.wizards[0].x = 200;
    game.wizards[0].y = 300;
    game.wizards[1].x = 700;
    hold(5);
    expect(game.wizards[0].flurryTime).toBeGreaterThan(0);
    expect(game.wizards[0].flurryTime).toBeLessThanOrEqual(90);
    hold(86); // 91 ticks in all
    expect(game.wizards[0].flurryTime).toBe(0);
    expect(game.wizards[0].flurryCD).toBeGreaterThan(290);
    const pebblesAfter = game.shots.length;
    hold(30); // still holding: nothing more comes out
    expect(game.wizards[0].flurryTime).toBe(0);
    expect(fire()).toBe(false);
    game.input[0].holding = false;
    for (let i = 0; i < 230; i++) update(game, 1);
    expect(fire()).toBe(false); // 260 ticks since the end: not yet
    for (let i = 0; i < 50; i++) update(game, 1);
    expect(fire()).toBe(true);
    expect(pebblesAfter).toBeGreaterThan(0);
  });

  it('ends early when the button is let go, and the recharge starts then', () => {
    game.wizards[0].x = 200;
    game.wizards[0].y = 300;
    game.wizards[1].x = 700;
    hold(20);
    expect(game.wizards[0].flurryTime).toBeGreaterThan(0);
    game.input[0].holding = false;
    update(game, 1);
    expect(game.wizards[0].flurryTime).toBe(0);
    expect(game.wizards[0].flurryCD).toBeGreaterThan(290);
  });
});
