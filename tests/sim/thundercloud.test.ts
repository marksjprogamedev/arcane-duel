import { beforeEach, describe, expect, it } from 'vitest';
import { THUNDERCLOUD } from '../../shared/sim/combat/areas';
import { cast } from '../../shared/sim/combat/cast';
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
  game.wizards[0].x = 200;
  game.wizards[0].y = 300;
  game.wizards[1].x = 700;
  game.wizards[1].y = 300;
  expect(cast(game, game.wizards[0], at.x, at.y, 1, 'STORM', loadout)).toBe(true);
  return game.zones[0];
}

describe('Thundercloud', () => {
  it('appears as a cloud where you aim, no further than its reach', () => {
    const near = summon({ x: 400, y: 300 });
    expect(near).toMatchObject({ spell: 'STORM', follow: true, x: 400, y: 300 });
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
    game.wizards[1].y = 500; // the enemy moves: the cloud turns after them
    run(60);
    expect(cloud.y).toBeGreaterThan(300);
  });

  it('strikes an enemy beneath it, and the caster too, and stops after its lifetime', () => {
    const cloud = summon({ x: 500, y: 300 });
    game.wizards[0].x = cloud.x; // the caster stands right under it too
    game.wizards[0].y = cloud.y;
    game.wizards[1].x = cloud.x + 10;
    game.wizards[1].y = cloud.y;
    run(THUNDERCLOUD.STRIKE_TICKS + 2);
    expect(game.wizards[1].hp).toBeLessThan(200);
    expect(game.wizards[0].hp).toBeLessThan(200);
    expect(game.events.some((e) => e.type === 'lightning')).toBe(true);
    run(THUNDERCLOUD.LIFE);
    expect(game.zones).toHaveLength(0);
  });

  it('is one cloud per caster, with a cooldown', () => {
    summon({ x: 400, y: 300 });
    expect(cast(game, game.wizards[0], 400, 300, 1, 'STORM', loadout)).toBe(false);
    run(THUNDERCLOUD.COOLDOWN);
    cast(game, game.wizards[0], 450, 300, 1, 'STORM', loadout);
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
    [c.x, c.y] = [1000, 900]; // the nearest enemy, in the caster's sight
    [d.x, d.y] = [1000, 1300];
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
      expect(cloud.x).toBeGreaterThan(before); // towards the enemy at x 1000
      expect(Math.hypot(cloud.x - c.x, cloud.y - c.y)).toBeLessThan(Math.hypot(before - c.x, 0));
    });

  it('follows the enemy closest to the cloud, not the one closest to its caster', () => {
    const { a, b, c, d } = twoVsTwo(false);
    [b.x, b.y] = [100, 100];
    [d.x, d.y] = [200, 900]; // the enemy nearest to the caster
    // c at x 1000 is the one nearest to the cloud, which is set down at x 900
    cast(game, a, 900, 900, 1, 'STORM', loadout);
    const cloud = game.zones[0];
    run(30);
    expect(cloud.x).toBeGreaterThan(900);
    expect(Math.hypot(cloud.x - c.x, cloud.y - c.y)).toBeLessThan(600);
  });

  it('does not follow an enemy its caster cannot see, even one a teammate can see', () => {
    const { a, b, c, d } = twoVsTwo(false);
    [c.x, c.y] = [1700, 900]; // far outside the caster's sight
    [d.x, d.y] = [1700, 1300];
    [b.x, b.y] = [1500, 900]; // the teammate stands next to them: team vision does not count
    cast(game, a, 900, 900, 1, 'STORM', loadout);
    const cloud = game.zones[0];
    run(40);
    expect(cloud.x).toBe(900);
    expect(cloud.y).toBe(900);
  });

  it('picks the nearest enemy it can see, skipping a closer one in the fog', () => {
    const { a, b, c, d } = twoVsTwo(false);
    [b.x, b.y] = [100, 100];
    [c.x, c.y] = [1200, 900]; // 300 from the cloud, but 600 from the caster: in the fog
    [d.x, d.y] = [700, 640]; // 328 from the cloud, 279 from the caster: in sight
    cast(game, a, 900, 900, 1, 'STORM', loadout);
    const cloud = game.zones[0];
    run(30);
    expect(cloud.x).toBeLessThan(900); // towards d, not c
  });
});
