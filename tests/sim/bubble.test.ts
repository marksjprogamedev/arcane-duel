import { beforeEach, describe, expect, it } from 'vitest';
import { BUBBLE, COOLDOWN_TICKS, MAGMA_SHOT_LIFE } from '../../shared/constants';
import { reflect } from '../../shared/sim/combat/reflect';
import { makeSprayParticles } from '../../client/src/fx/cosmetics';
import { applyInput } from '../../shared/sim/input';
import { update } from '../../shared/sim/update';
import type { BoltShot, MagmaShot } from '../../shared/types';
import { game, press, resetDuel } from './helpers';

beforeEach(() => resetDuel());

function bolt(over: Partial<BoltShot> = {}): BoltShot {
  return {
    id: 900,
    x: 300,
    y: 300,
    vx: 7.5,
    vy: 0,
    k: 'EARTH',
    owner: game.wizards[0],
    r: 14,
    life: 110,
    damage: 25,
    trail: 0,
    travel: 0,
    maxTravel: 450,
    charged: false,
    ...over,
  };
}

describe('reflective bubble', () => {
  it('a second Space press right after the first casts it at the wizard', () => {
    applyInput(game, 0, press('Space'));
    expect(game.bubbles).toHaveLength(0);
    update(game, 5);
    applyInput(game, 0, press('Space'));
    expect(game.bubbles).toHaveLength(1);
    expect(game.bubbles[0]).toMatchObject({
      x: game.wizards[0].x,
      y: game.wizards[0].y,
      r: BUBBLE.RADIUS,
    });
    expect(game.wizards[0].bubbleCD).toBe(COOLDOWN_TICKS.BUBBLE);
  });

  it('load, Space, load, Space in quick succession is two shields, not a bubble', () => {
    applyInput(game, 0, press('Digit1'));
    applyInput(game, 0, press('Space'));
    expect(game.wizards[0].shield?.type).toBe(0);
    update(game, 4);
    applyInput(game, 0, press('Digit2'));
    applyInput(game, 0, press('Space'));
    expect(game.bubbles).toHaveLength(0);
    expect(game.wizards[0].shield?.type).toBe(1); // the second shield replaced the first
    expect(game.wizards[0].bubbleCD).toBe(0);
  });

  it('moving between two presses does not break the double tap', () => {
    applyInput(game, 0, press('Space'));
    applyInput(game, 0, press('KeyD'));
    update(game, 3);
    applyInput(game, 0, press('Space'));
    expect(game.bubbles).toHaveLength(1);
  });

  it('two presses far apart are just shields', () => {
    applyInput(game, 0, press('Space'));
    update(game, BUBBLE.DOUBLE_TAP_TICKS + 5);
    applyInput(game, 0, press('Space'));
    expect(game.bubbles).toHaveLength(0);
  });

  it('cannot be recast during its cooldown, and expires after its lifetime', () => {
    applyInput(game, 0, press('Space'));
    applyInput(game, 0, press('Space'));
    expect(game.bubbles).toHaveLength(1);
    applyInput(game, 0, press('Space'));
    applyInput(game, 0, press('Space'));
    expect(game.bubbles).toHaveLength(1);
    update(game, BUBBLE.LIFE + 1);
    expect(game.bubbles).toHaveLength(0);
  });

  it("bounces the opponent's bolt back, and it can then hurt its sender", () => {
    game.wizards[0].x = 400;
    game.wizards[0].y = 300;
    game.wizards[1].x = 100;
    game.wizards[1].y = 300;
    game.bubbles.push({ x: 400, y: 300, r: 90, owner: game.wizards[0], life: 200 });
    game.shots.push(bolt({ x: 200, y: 300, owner: game.wizards[1] }));
    const before = game.wizards[1].hp;
    for (let i = 0; i < 80 && game.shots.length; i++) update(game, 1);
    expect(game.wizards[1].hp).toBeLessThan(before);
    expect(game.wizards[0].hp).toBe(200);
  });

  it('gives a reflected bolt its full range again', () => {
    game.wizards[0].x = 150;
    game.wizards[0].y = 300;
    game.wizards[1].x = 500;
    game.wizards[1].y = 300;
    game.bubbles.push({ x: 500, y: 300, r: 90, owner: game.wizards[1], life: 400 });
    // 300 of its 450 range used up on the way to the bubble: only 150 left without the reset
    game.shots.push(
      bolt({ x: 300, y: 300, owner: game.wizards[0], travel: 300, maxTravel: 450, life: 200 }),
    );
    for (let i = 0; i < 90 && game.shots.length; i++) update(game, 1);
    expect(game.wizards[0].hp).toBeLessThan(200); // it came all the way home (260 px) to hit its sender
  });

  it('sends a reflected Magma lob back its whole original range, with a fresh lifetime', () => {
    const lob: MagmaShot = {
      id: 901,
      x: 410,
      y: 300,
      vx: 4,
      vy: 0,
      k: 'MAGMA',
      owner: game.wizards[0],
      r: 27,
      life: 20,
      damage: 40,
      trail: 0,
      tx: 450, // only 40 px from its target when the bubble turns it
      ty: 300,
      reach: 350,
      magma: true,
      hitTargets: new Set(),
    };
    reflect(lob, { x: 500, y: 300, r: 90, owner: game.wizards[1], life: 400 }, game.map);
    const toTarget = Math.hypot(lob.tx - lob.x, lob.ty - lob.y);
    expect(toTarget).toBeGreaterThan(349); // (the shot is nudged half a pixel off the edge)
    expect(toTarget).toBeLessThan(351);
    expect(lob.tx).toBeLessThan(lob.x); // and back the way it came
    expect(lob.life).toBe(MAGMA_SHOT_LIFE);
    expect(lob.owner).toBe(game.wizards[1]);
  });

  it('reflects a bolt fired from inside the bubble back at its caster', () => {
    game.wizards[0].x = 400;
    game.wizards[0].y = 300;
    game.wizards[1].x = 700;
    game.wizards[1].y = 300;
    game.bubbles.push({ x: 400, y: 300, r: 90, owner: game.wizards[0], life: 200 });
    game.shots.push(bolt({ x: 425, y: 300, owner: game.wizards[0] }));
    for (let i = 0; i < 80 && game.shots.length; i++) update(game, 1);
    expect(game.wizards[0].hp).toBeLessThan(200);
    expect(game.wizards[1].hp).toBe(200);
  });

  it('ignores a bubble that is nowhere near the bolt', () => {
    game.bubbles.push({ x: 100, y: 500, r: 50, owner: game.wizards[0], life: 200 });
    game.wizards[0].x = 300;
    game.wizards[0].y = 300;
    game.wizards[1].x = 500;
    game.wizards[1].y = 300;
    game.shots.push(bolt({ x: 330, y: 300 }));
    for (let i = 0; i < 60 && game.shots.length; i++) update(game, 1);
    expect(game.wizards[1].hp).toBe(175);
  });
});

describe('friendly fire', () => {
  it("a projectile cannot hurt its caster as it leaves them, but can once it's away", () => {
    game.wizards[0].x = 300;
    game.wizards[0].y = 300;
    game.wizards[1].x = 700;
    game.wizards[1].y = 300;
    game.shots.push(bolt({ x: 325, y: 300 }));
    update(game, 1);
    expect(game.wizards[0].hp).toBe(200);
    update(game, 1);
    expect(game.wizards[0].hp).toBe(200);
    expect(game.shots[0].ownerClear).toBe(true);
  });

  it('walking into your own magma crater hurts you', () => {
    game.wizards[0].x = 300;
    game.wizards[0].y = 300;
    game.wizards[1].x = 700;
    game.wizards[1].y = 300;
    game.zones.push({
      x: 300,
      y: 300,
      k: 'MAGMA',
      r: 65,
      owner: game.wizards[0],
      life: 230,
      tick: 24,
    });
    update(game, 1);
    expect(game.wizards[0].hp).toBeLessThan(200);
  });

  it('your own bomb blast hurts you', () => {
    game.wizards[0].x = 300;
    game.wizards[0].y = 300;
    game.wizards[1].x = 700;
    game.wizards[1].y = 300;
    game.bombs.push({
      id: 1,
      x: 310,
      y: 300,
      sx: 310,
      sy: 300,
      tx: 310,
      ty: 300,
      u: 1,
      flight: 25,
      fuse: 0.5,
      k: 'EARTH',
      owner: game.wizards[0],
      landed: true,
      dead: false,
    });
    update(game, 1);
    expect(game.wizards[0].hp).toBeLessThan(200);
  });
});

describe('bubbles against bombs and sprays', () => {
  it("a bomb is reflected at the bubble edge: it never goes off inside, and is the bubble owner's now", () => {
    game.wizards[0].x = 500;
    game.wizards[0].y = 300;
    game.wizards[1].x = 300;
    game.wizards[1].y = 300;
    game.bubbles.push({ x: 500, y: 300, r: 90, owner: game.wizards[0], life: 200 });
    game.bombs.push({
      id: 1,
      x: 300,
      y: 300,
      sx: 300,
      sy: 300,
      tx: 500,
      ty: 300,
      u: 0,
      flight: 40,
      fuse: 75,
      k: 'EARTH',
      owner: game.wizards[1],
      landed: false,
      dead: false,
    });
    // thrown at p, who stands inside: it turns at the edge and comes back
    update(game, 30);
    expect(game.bombs[0].owner).toBe(game.wizards[0]);
    expect(game.bombs[0].x).toBeLessThan(410);
    expect(game.wizards[0].hp).toBe(200);
  });

  it('the reflected blast lands back on the one who threw the bomb', () => {
    game.wizards[0].x = 500;
    game.wizards[0].y = 300;
    game.wizards[1].x = 300;
    game.wizards[1].y = 300;
    game.bubbles.push({ x: 500, y: 300, r: 90, owner: game.wizards[0], life: 200 });
    game.bombs.push({
      id: 1,
      x: 300,
      y: 300,
      sx: 300,
      sy: 300,
      tx: 500,
      ty: 300,
      u: 0,
      flight: 40,
      fuse: 75,
      k: 'EARTH',
      owner: game.wizards[1],
      landed: false,
      dead: false,
    });
    for (let i = 0; i < 200 && game.bombs.length; i++) update(game, 1);
    expect(game.bombs).toHaveLength(0);
    expect(game.wizards[1].hp).toBeLessThan(200);
    expect(game.wizards[0].hp).toBe(200);
  });

  it('spray damage is blocked across a bubble edge, but works inside one', () => {
    game.wizards[0].x = 300;
    game.wizards[0].y = 300;
    game.wizards[1].x = 400;
    game.wizards[1].y = 300;
    game.bubbles.push({ x: 400, y: 300, r: 40, owner: game.wizards[1], life: 200 });
    applyInput(game, 0, { kind: 'aim', x: 400, y: 300 });
    applyInput(game, 0, press('Digit1'));
    applyInput(game, 0, { kind: 'pointerdown', x: 400, y: 300 });
    update(game, 1);
    expect(game.wizards[1].hp).toBe(200);
    game.bubbles[0] = { x: 350, y: 300, r: 200, owner: game.wizards[1], life: 200 };
    update(game, 10);
    expect(game.wizards[1].hp).toBeLessThan(200);
  });

  it('lightning stops at the bubble edge', () => {
    game.wizards[0].x = 300;
    game.wizards[0].y = 300;
    game.wizards[1].x = 700;
    game.wizards[1].y = 300;
    game.bubbles.push({ x: 450, y: 300, r: 50, owner: game.wizards[1], life: 200 });
    applyInput(game, 0, press('Digit3'));
    applyInput(game, 0, { kind: 'pointerdown', x: 600, y: 300 });
    update(game, 1);
    const arc = game.events.find((ev) => ev.type === 'lightning');
    expect(arc).toMatchObject({ ty: 300 });
    expect((arc as { tx: number }).tx).toBeCloseTo(400);
  });

  it('spray particles stop at the bubble edge', () => {
    game.wizards[0].x = 300;
    game.wizards[0].y = 300;
    game.bubbles.push({ x: 450, y: 300, r: 50, owner: game.wizards[1], life: 200 });
    const parts = makeSprayParticles(game, game.wizards[0], 700, 300, 'FIRE', 0);
    expect(parts.length).toBeGreaterThan(0);
    // a particle is drawn 12 px above where it stopped; none starts inside the bubble
    for (const q of parts)
      expect(Math.hypot(q.x - 450, q.y + 12 - 300)).toBeGreaterThanOrEqual(49.5);
  });
});
