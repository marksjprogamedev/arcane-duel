import { beforeEach, describe, expect, it } from 'vitest';
import { styles } from '../../shared/constants';
import { mapFor } from '../../shared/maps';
import { bomb, cast, force, trap } from '../../shared/sim/combat';
import { resetMatch } from '../../shared/sim/match';
import { canHurt, nearestFoe, targetsOf, untouchable } from '../../shared/sim/teams';
import { update } from '../../shared/sim/update';
import { make } from '../../shared/sim/wizard';
import type { Wizard } from '../../shared/types';
import { game } from './helpers';

/** A 2v2 on the Ruined Keep, with everyone in the open: seats 0 and 2 are team 0, 1 and 3 team 1. */
function fourWizards(friendlyFire = false): Wizard[] {
  resetMatch(game, {
    mode: 'online',
    seed: 1,
    styles: [styles[0], styles[1]],
    dummyHP: 100,
    dummyMoving: false,
    map: mapFor('ruins'),
    rules: { teamSize: 2, friendlyFire },
  });
  game.wizards = [
    make(500, 900, 200, styles[0], 0, 0),
    make(800, 900, 200, styles[1], 1, 1),
    make(300, 1300, 200, styles[2], 2, 0),
    make(850, 960, 200, styles[3], 3, 1),
  ];
  return game.wizards;
}

beforeEach(() => fourWizards());

describe('who can be hurt', () => {
  it('enemies always, teammates only with friendly fire', () => {
    const [a, b, c] = game.wizards;
    expect(canHurt(game, a, b)).toBe(true);
    expect(canHurt(game, a, c)).toBe(false);
    game.rules.friendlyFire = true;
    expect(canHurt(game, a, c)).toBe(true);
  });

  it('targetsOf lists the owner’s foes in seat order, and the owner only when asked', () => {
    const [a, b, c, d] = game.wizards;
    expect(targetsOf(game, a)).toEqual([b, d]);
    expect(targetsOf(game, a, true)).toEqual([b, d, a]);
    expect(targetsOf(game, b)).toEqual([a, c]);
    game.rules.friendlyFire = true;
    expect(targetsOf(game, a)).toEqual([b, c, d]);
  });

  it('leaves out the dummy that is waiting to respawn', () => {
    const [a, b] = game.wizards;
    game.respawn = 30;
    expect(untouchable(game, b)).toBe(true);
    expect(targetsOf(game, a)).not.toContain(b);
  });

  it('nearestFoe is the closest wizard on the other team, never a teammate', () => {
    const [a, b, c, d] = game.wizards;
    c.x = 510; // right next to a, but a teammate
    expect(nearestFoe(game, a)).toBe(b);
    d.x = 520;
    d.y = 900;
    expect(nearestFoe(game, a)).toBe(d);
  });
});

describe('attacks reach every wizard they should', () => {
  it('a fire spray hits every enemy in its cone and spares a teammate in the way', () => {
    const [a, b, d] = [game.wizards[0], game.wizards[1], game.wizards[3]];
    const ally = game.wizards[2];
    ally.x = 650;
    ally.y = 900;
    b.x = 700;
    b.y = 900;
    d.x = 720;
    d.y = 905;
    cast(game, a, 800, 900, 1, 'FIRE');
    expect(b.hp).toBeLessThan(200);
    expect(d.hp).toBeLessThan(200);
    expect(ally.hp).toBe(200);
  });

  it('with friendly fire the teammate is hurt too', () => {
    game.rules.friendlyFire = true;
    const [a, b, ally] = game.wizards;
    ally.x = 650;
    ally.y = 900;
    b.x = 700;
    b.y = 900;
    cast(game, a, 800, 900, 1, 'FIRE');
    expect(ally.hp).toBeLessThan(200);
  });

  it('lightning strikes only the nearest wizard in its path', () => {
    const [a, b, , d] = game.wizards;
    b.x = 700;
    b.y = 900;
    d.x = 780;
    d.y = 900;
    cast(game, a, 800, 900, 1, 'LIGHTNING');
    expect(b.hp).toBeLessThan(200);
    expect(d.hp).toBe(200);
  });

  it('force pushes every enemy in reach, not a teammate', () => {
    const [a, b, ally, d] = game.wizards;
    b.x = 560;
    b.y = 900;
    d.x = 500;
    d.y = 980;
    ally.x = 440;
    ally.y = 900;
    force(game, a);
    expect(b.kx).toBeGreaterThan(0);
    expect(d.ky).toBeGreaterThan(0);
    expect(ally.kx).toBe(0);
  });

  it('a bomb blast hurts every enemy in range, and not the thrower’s teammate', () => {
    const [a, b, ally, d] = game.wizards;
    b.x = 600;
    b.y = 900;
    d.x = 640;
    d.y = 900;
    ally.x = 620;
    ally.y = 930;
    bomb(game, a, 620, 900, 'FIRE');
    for (let i = 0; i < 400; i++) update(game, 1);
    expect(b.hp).toBeLessThan(200);
    expect(d.hp).toBeLessThan(200);
    expect(ally.hp).toBe(200);
  });
});

describe('traps on big maps', () => {
  it('can be set far from the old arena corner', () => {
    const [a] = game.wizards;
    a.x = 2000;
    a.y = 1400;
    expect(trap(game, a, 2100, 1400, 'FIRE')).toBe(true);
    expect(game.traps[0].x).toBeGreaterThan(800); // was clamped to 760 on every map
  });
});
