import { beforeEach, describe, expect, it } from 'vitest';
import { cast, THUNDERCLOUD } from '../../shared/sim/combat';
import { WALK_SPEED } from '../../shared/sim/movement';
import { update } from '../../shared/sim/update';
import { styles } from '../../shared/constants';
import { mapFor } from '../../shared/maps';
import { resetMatch } from '../../shared/sim/match';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

const loadout = { STORM: 'thundercloud' } as const;
const run = (ticks: number) => {
  for (let i = 0; i < ticks; i++) update(game, 1);
};
function summon(at = { x: 500, y: 300 }) {
  game.p.x = 200;
  game.p.y = 300;
  game.e.x = 700;
  game.e.y = 300;
  expect(cast(game, game.p, at.x, at.y, 1, 'STORM', loadout)).toBe(true);
  return game.zones[0];
}

describe('Thundercloud', () => {
  it('appears as a cloud where you aim, no further than its reach', () => {
    const near = summon({ x: 400, y: 300 });
    expect(near).toMatchObject({ k: 'STORM', follow: true, x: 400, y: 300 });
    resetDuel();
    const far = summon({ x: 900, y: 300 });
    expect(far.x).toBeCloseTo(200 + THUNDERCLOUD.REACH);
  });

  it("drifts after the nearest enemy at half a wizard's speed", () => {
    const cloud = summon({ x: 400, y: 300 });
    const before = cloud.x;
    run(20);
    const speed = (cloud.x - before) / 20;
    expect(speed).toBeCloseTo(WALK_SPEED * 0.5, 2);
    game.e.y = 500; // the enemy moves: the cloud turns after them
    run(60);
    expect(cloud.y).toBeGreaterThan(300);
  });

  it('strikes an enemy beneath it, and the caster too, and stops after its lifetime', () => {
    const cloud = summon({ x: 500, y: 300 });
    game.p.x = cloud.x; // the caster stands right under it too
    game.p.y = cloud.y;
    game.e.x = cloud.x + 10;
    game.e.y = cloud.y;
    run(THUNDERCLOUD.STRIKE_TICKS + 2);
    expect(game.e.hp).toBeLessThan(200);
    expect(game.p.hp).toBeLessThan(200);
    expect(game.events.some((e) => e.type === 'lightning')).toBe(true);
    run(THUNDERCLOUD.LIFE);
    expect(game.zones).toHaveLength(0);
  });

  it('is one cloud per caster, with a cooldown', () => {
    summon({ x: 400, y: 300 });
    expect(cast(game, game.p, 400, 300, 1, 'STORM', loadout)).toBe(false);
    run(THUNDERCLOUD.COOLDOWN);
    cast(game, game.p, 450, 300, 1, 'STORM', loadout);
    expect(game.zones.filter((z) => z.follow)).toHaveLength(1);
  });
});

describe('Thundercloud in a team match', () => {
  function twoVsTwo(friendlyFire: boolean) {
    resetMatch(game, {
      mode: 'online',
      seed: 1,
      styles: [...styles],
      dummyHP: 100,
      dummyMoving: false,
      map: mapFor('ruins'),
      rules: { teamSize: 2, friendlyFire },
    });
    const [a, b, c, d] = game.wizards;
    [a.x, a.y] = [600, 900]; // the caster
    [b.x, b.y] = [900, 900]; // a teammate, standing where the cloud will be
    [c.x, c.y] = [1500, 900]; // the nearest enemy
    [d.x, d.y] = [1500, 1300];
    return { a, b, c, d };
  }

  for (const friendlyFire of [false, true])
    it(`strikes a teammate beneath it but heads for the enemy (friendly fire ${friendlyFire})`, () => {
      const { a, b, c } = twoVsTwo(friendlyFire);
      cast(game, a, 900, 900, 1, 'STORM', loadout);
      const cloud = game.zones[0];
      run(THUNDERCLOUD.STRIKE_TICKS + 2);
      expect(b.hp).toBeLessThan(200); // under the cloud when it struck
      b.x = 100; // out of the way: the cloud never goes after a teammate
      b.y = 100;
      const before = cloud.x;
      run(40);
      expect(cloud.x).toBeGreaterThan(before); // towards the enemy at x 1500
      expect(Math.hypot(cloud.x - c.x, cloud.y - c.y)).toBeLessThan(Math.hypot(before - c.x, 0));
    });
});
