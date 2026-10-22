import { beforeEach, describe, expect, it } from 'vitest';
import { BUBBLE } from '../../shared/constants';
import { SURGE } from '../../shared/sim/combat/areas';
import { cast } from '../../shared/sim/combat/cast';
import { bomb } from '../../shared/sim/combat/projectiles';
import { update } from '../../shared/sim/update';
import type { Bubble, Shot, SpellLoadout, SpellName, Wizard } from '../../shared/types';
import { game, resetDuel } from './helpers';

/**
 * The rule these tests pin down is written in docs/BUBBLES.md: a bubble reflects every projectile
 * that crosses its edge, in either direction, whoever cast the bubble and whoever cast the shot.
 * Anything that is not reflected must be listed there as an exception, with a test of its own.
 */
beforeEach(() => {
  resetDuel();
  game.wizards[0].x = 150;
  game.wizards[0].y = 300;
  game.wizards[1].x = 480; // close enough that even the shortest shot (Frost Shards) reaches a bubble around it
  game.wizards[1].y = 300;
});

const bubbleAt = (w: Wizard, x = w.x, y = w.y): Bubble => {
  const b: Bubble = { x, y, r: BUBBLE.RADIUS, owner: w, life: 400 };
  game.bubbles.push(b);
  return b;
};

/** Every projectile spell, as (spell, loadout) pairs that fly out as shots. */
const PROJECTILES: [string, SpellName, SpellLoadout][] = [
  ['Fireball', 'FIRE', { FIRE: 'fireball' }],
  ['Pyrodisk', 'FIRE', { FIRE: 'pyro_disc' }],
  ['Boulder', 'EARTH', {}],
  ['Vapor Blast', 'STEAM', {}],
  ['Plasma Flare', 'PLASMA', {}],
  ['Icicle', 'ICE', {}],
  ['Frost Shards', 'ICE', { ICE: 'shards' }],
  ['Gravity Shot', 'MAGNETIC', {}],
  ['Tempest Bolt', 'STORM', {}],
  ['Molten Core (lob)', 'MAGMA', {}],
];

/** Casts from the left wizard at the right one and steps until a shot has been reflected. */
function fireAndWatch(spell: SpellName, loadout: SpellLoadout) {
  expect(cast(game, game.wizards[0], game.wizards[1].x, game.wizards[1].y, 1, spell, loadout)).toBe(
    true,
  );
  const shots = [...game.shots];
  expect(shots.length).toBeGreaterThan(0);
  let reflected: Shot | undefined;
  for (let i = 0; i < 120 && !reflected; i++) {
    update(game, 1);
    reflected = shots.find((s) => s.reflected);
  }
  return reflected;
}

describe.each(PROJECTILES)('%s against a bubble', (_name, spell, loadout) => {
  it("is reflected by an enemy's bubble, which belongs to the bubble's owner from then on", () => {
    const bubble = bubbleAt(game.wizards[1]);
    const s = fireAndWatch(spell, loadout);
    expect(s, 'a reflection happened').toBeDefined();
    expect(s!.owner).toBe(game.wizards[1]);
    expect(game.wizards[1].hp).toBe(200); // it never got inside
    // it was turned at the edge, not carried through
    expect(Math.hypot(s!.x - bubble.x, s!.y - bubble.y)).toBeGreaterThanOrEqual(BUBBLE.RADIUS - 1);
  });

  it("is reflected by its own caster's bubble too, from inside", () => {
    bubbleAt(game.wizards[0]);
    const s = fireAndWatch(spell, loadout);
    expect(s, 'a reflection happened').toBeDefined();
    expect(s!.owner).toBe(game.wizards[0]); // their own bubble: it is still theirs
    expect(game.wizards[1].hp).toBe(200); // and it did not get out to hit anyone
  });

  it("is reflected by a bubble of its caster's that it meets from outside", () => {
    // no enemy in the way: the caster's own second bubble stands in the flight path
    game.wizards[1].x = 700;
    bubbleAt(game.wizards[0], 450, 300);
    const s = fireAndWatch(spell, loadout);
    expect(s, 'a reflection happened').toBeDefined();
    expect(s!.owner).toBe(game.wizards[0]);
  });
});

const BOMBS: SpellName[] = [
  'FIRE',
  'WATER',
  'EARTH',
  'STEAM',
  'PLASMA',
  'STORM',
  'ICE',
  'MAGNETIC',
];

describe.each(BOMBS)('%s bomb against a bubble', (spell) => {
  const throwAtEnemy = () => {
    bomb(game, game.wizards[0], game.wizards[1].x, game.wizards[1].y, spell);
    return game.bombs[0];
  };

  it("is reflected by an enemy's bubble and belongs to the bubble's owner from then on", () => {
    bubbleAt(game.wizards[1]);
    const b = throwAtEnemy();
    for (let i = 0; i < 60 && b.owner === game.wizards[0]; i++) update(game, 1);
    expect(b.owner).toBe(game.wizards[1]);
    expect(Math.hypot(b.x - game.wizards[1].x, b.y - game.wizards[1].y)).toBeGreaterThanOrEqual(
      BUBBLE.RADIUS - 1,
    );
    expect(b.dead).toBe(false); // it did not go off on the edge
    for (let i = 0; i < 200 && !b.dead; i++) update(game, 1);
    expect(game.wizards[1].hp).toBe(200); // it never reached the one inside
  });

  it("is reflected by its own caster's bubble too: you cannot lob out of your own dome", () => {
    bubbleAt(game.wizards[0]);
    const b = throwAtEnemy();
    for (let i = 0; i < 60 && !b.landed; i++) update(game, 1);
    expect(b.owner).toBe(game.wizards[0]);
    expect(b.x).toBeLessThan(game.wizards[0].x + BUBBLE.RADIUS);
    for (let i = 0; i < 200 && !b.dead; i++) update(game, 1);
    expect(game.wizards[1].hp).toBe(200);
  });
});

describe('Water Surge against a bubble', () => {
  const surge = (w: Wizard) =>
    expect(cast(game, w, w.x, w.y, 1, 'WATER', { WATER: 'water_surge' })).toBe(true);
  const run = (ticks: number) => {
    for (let i = 0; i < ticks; i++) update(game, 1);
  };

  it("is reflected off an enemy bubble from the point of contact, and shoves its caster, not the bubble's owner", () => {
    game.wizards[0].x = 100;
    game.wizards[1].x = 500;
    bubbleAt(game.wizards[1]);
    surge(game.wizards[0]);
    run(SURGE.LIFE);
    const reflected = game.zones.filter((z) => z.reflected);
    // (the ring may have expired by now: look at what it did)
    expect(game.wizards[1].hp).toBe(200);
    expect(game.wizards[1].kx).toBe(0); // the owner inside the bubble is untouched
    expect(
      reflected.length + (game.wizards[0].kx !== 0 || game.wizards[0].wet > 0 ? 1 : 0),
    ).toBeGreaterThan(0);
  });

  it('starts the new ring on the line from the cast point to the bubble, on the side it came from', () => {
    game.wizards[0].x = 100;
    game.wizards[1].x = 500;
    const bubble = bubbleAt(game.wizards[1]);
    surge(game.wizards[0]);
    let ring;
    for (let i = 0; i < SURGE.LIFE && !ring; i++) {
      update(game, 1);
      ring = game.zones.find((z) => z.reflected);
    }
    expect(ring, 'a reflected ring').toBeDefined();
    expect(ring!.owner).toBe(game.wizards[1]); // the bubble's owner's
    expect(ring!.x).toBeCloseTo(bubble.x - BUBBLE.RADIUS - 0.5, 3); // the near edge, just outside
    expect(ring!.y).toBeCloseTo(300, 3);
  });

  it('shoves a wizard who stood between the caster and the bubble, hits the caster on the way back', () => {
    // caster on the left, bubble on the right: the ring is reflected and comes back over the caster
    game.wizards[0].x = 250;
    game.wizards[1].x = 600;
    bubbleAt(game.wizards[1]);
    const before = game.wizards[0].hp;
    surge(game.wizards[0]);
    for (let i = 0; i < SURGE.LIFE * 2; i++) update(game, 1);
    expect(game.wizards[0].wet).toBeGreaterThan(0); // the caster was soaked by its own reflected surge
    expect(game.wizards[0].hp).toBe(before); // a surge soaks and shoves; it does no damage
  });

  it('cast from inside a bubble: hits those inside normally, then reflects off the wall onto the caster', () => {
    // both inside one bubble (the enemy's); the enemy casts, and its own surge comes back to it
    game.wizards[1].x = 500;
    game.wizards[0].x = 440;
    bubbleAt(game.wizards[1]);
    surge(game.wizards[1]);
    run(SURGE.LIFE);
    expect(game.wizards[0].wet).toBeGreaterThan(0); // inside the bubble: reached directly, the normal amount
    expect(game.wizards[1].wet).toBeGreaterThan(0); // and the reflection off the wall reached its own caster
  });

  it('lets the ring that touched the bubble carry on, and starts a second one from the contact point', () => {
    game.wizards[0].x = 100;
    game.wizards[1].x = 500;
    const bubble = bubbleAt(game.wizards[1]);
    surge(game.wizards[0]);
    const original = game.zones[0];
    let second;
    for (let i = 0; i < SURGE.LIFE && !second; i++) {
      update(game, 1);
      second = game.zones.find((z) => z.reflected);
    }
    expect(second, 'a ring started at the bubble').toBeDefined();
    expect(second).not.toBe(original);
    expect(original.reflected).toBeUndefined(); // the first ring is still the caster's own
    expect(original.owner).toBe(game.wizards[0]);
    const grown = original.r;
    update(game, 1);
    expect(original.r).toBeGreaterThan(grown); // and it keeps growing past the bubble
    expect(Math.hypot(original.x - bubble.x, original.y - bubble.y)).toBeGreaterThan(BUBBLE.RADIUS);
  });

  it('keeps bouncing between two bubbles for as long as they stand', () => {
    game.wizards[0].x = 400;
    game.wizards[1].x = 700;
    const left = bubbleAt(game.wizards[0], 150, 300);
    const right = bubbleAt(game.wizards[1], 650, 300);
    surge(game.wizards[0]);
    const seen = new Set<object>();
    for (let i = 0; i < 380; i++) {
      left.life = right.life = 400; // both stand the whole time
      update(game, 1);
      for (const z of game.zones) if (z.reflected) seen.add(z);
      expect(game.zones.length).toBeLessThanOrEqual(SURGE.MAX_RINGS);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4); // there and back, more than once
  });
});

describe('overlapping bubbles', () => {
  it('never pile up Water Surge rings: one cast keeps at most SURGE.MAX_RINGS alive', () => {
    game.wizards[0].x = 100;
    game.wizards[1].x = 400;
    bubbleAt(game.wizards[1]);
    bubbleAt(game.wizards[0], 250, 300); // overlaps the enemy's bubble
    expect(cast(game, game.wizards[0], 400, 300, 1, 'WATER', { WATER: 'water_surge' })).toBe(true);
    for (let i = 0; i < SURGE.LIFE * 8; i++) {
      update(game, 1);
      expect(game.zones.length).toBeLessThanOrEqual(SURGE.MAX_RINGS);
    }
  });
});
