import { beforeEach, describe, expect, it } from 'vitest';
import { BUBBLE, COOLDOWN_TICKS } from '../../shared/constants';
import { makeSprayParticles } from '../../shared/fx/cosmetics';
import { applyInput } from '../../shared/sim/input';
import { update } from '../../shared/sim/update';
import type { BoltShot } from '../../shared/types';
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
    owner: game.p,
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
    expect(game.bubbles[0]).toMatchObject({ x: game.p.x, y: game.p.y, r: BUBBLE.RADIUS });
    expect(game.p.bubbleCD).toBe(COOLDOWN_TICKS.BUBBLE);
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
    game.p.x = 400;
    game.p.y = 300;
    game.e.x = 100;
    game.e.y = 300;
    game.bubbles.push({ x: 400, y: 300, r: 90, owner: game.p, life: 200 });
    game.shots.push(bolt({ x: 200, y: 300, owner: game.e }));
    const before = game.e.hp;
    for (let i = 0; i < 80 && game.shots.length; i++) update(game, 1);
    expect(game.e.hp).toBeLessThan(before);
    expect(game.p.hp).toBe(200);
  });

  it('reflects a bolt fired from inside the bubble back at its caster', () => {
    game.p.x = 400;
    game.p.y = 300;
    game.e.x = 700;
    game.e.y = 300;
    game.bubbles.push({ x: 400, y: 300, r: 90, owner: game.p, life: 200 });
    game.shots.push(bolt({ x: 425, y: 300, owner: game.p }));
    for (let i = 0; i < 80 && game.shots.length; i++) update(game, 1);
    expect(game.p.hp).toBeLessThan(200);
    expect(game.e.hp).toBe(200);
  });

  it('ignores a bubble that is nowhere near the bolt', () => {
    game.bubbles.push({ x: 100, y: 500, r: 50, owner: game.p, life: 200 });
    game.p.x = 300;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 300;
    game.shots.push(bolt({ x: 330, y: 300 }));
    for (let i = 0; i < 60 && game.shots.length; i++) update(game, 1);
    expect(game.e.hp).toBe(175);
  });
});

describe('friendly fire', () => {
  it("a projectile cannot hurt its caster as it leaves them, but can once it's away", () => {
    game.p.x = 300;
    game.p.y = 300;
    game.e.x = 700;
    game.e.y = 300;
    game.shots.push(bolt({ x: 325, y: 300 }));
    update(game, 1);
    expect(game.p.hp).toBe(200);
    update(game, 1);
    expect(game.p.hp).toBe(200);
    expect(game.shots[0].ownerClear).toBe(true);
  });

  it('walking into your own magma crater hurts you', () => {
    game.p.x = 300;
    game.p.y = 300;
    game.e.x = 700;
    game.e.y = 300;
    game.zones.push({ x: 300, y: 300, k: 'MAGMA', r: 65, owner: game.p, life: 230, tick: 24 });
    update(game, 1);
    expect(game.p.hp).toBeLessThan(200);
  });

  it('your own bomb blast hurts you', () => {
    game.p.x = 300;
    game.p.y = 300;
    game.e.x = 700;
    game.e.y = 300;
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
      owner: game.p,
      landed: true,
      dead: false,
    });
    update(game, 1);
    expect(game.p.hp).toBeLessThan(200);
  });
});

describe('bubbles against bombs and sprays', () => {
  it('a bomb detonates at the bubble edge, hurting those outside but not inside', () => {
    game.p.x = 500;
    game.p.y = 300;
    game.e.x = 300;
    game.e.y = 300;
    game.bubbles.push({ x: 500, y: 300, r: 90, owner: game.p, life: 200 });
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
      owner: game.e,
      landed: false,
      dead: false,
    });
    // thrown at p, who stands inside: it bursts on the bubble, 100 away from e
    for (let i = 0; i < 30 && game.bombs.length; i++) update(game, 1);
    expect(game.bombs).toHaveLength(0);
    expect(game.p.hp).toBe(200);
  });

  it('the blast still reaches someone standing just outside the bubble', () => {
    game.p.x = 500;
    game.p.y = 300;
    game.e.x = 380;
    game.e.y = 300;
    game.bubbles.push({ x: 500, y: 300, r: 90, owner: game.p, life: 200 });
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
      owner: game.e,
      landed: false,
      dead: false,
    });
    for (let i = 0; i < 30 && game.bombs.length; i++) update(game, 1);
    expect(game.e.hp).toBeLessThan(200);
    expect(game.p.hp).toBe(200);
  });

  it('spray damage is blocked across a bubble edge, but works inside one', () => {
    game.p.x = 300;
    game.p.y = 300;
    game.e.x = 400;
    game.e.y = 300;
    game.bubbles.push({ x: 400, y: 300, r: 40, owner: game.e, life: 200 });
    applyInput(game, 0, { kind: 'aim', x: 400, y: 300 });
    applyInput(game, 0, press('Digit1'));
    applyInput(game, 0, { kind: 'pointerdown', x: 400, y: 300 });
    update(game, 1);
    expect(game.e.hp).toBe(200);
    game.bubbles[0] = { x: 350, y: 300, r: 200, owner: game.e, life: 200 };
    update(game, 10);
    expect(game.e.hp).toBeLessThan(200);
  });

  it('lightning stops at the bubble edge', () => {
    game.p.x = 300;
    game.p.y = 300;
    game.e.x = 700;
    game.e.y = 300;
    game.bubbles.push({ x: 450, y: 300, r: 50, owner: game.e, life: 200 });
    applyInput(game, 0, press('Digit3'));
    applyInput(game, 0, { kind: 'pointerdown', x: 600, y: 300 });
    update(game, 1);
    const arc = game.events.find((ev) => ev.type === 'lightning');
    expect(arc).toMatchObject({ ty: 300 });
    expect((arc as { tx: number }).tx).toBeCloseTo(400);
  });

  it('spray particles stop at the bubble edge', () => {
    game.p.x = 300;
    game.p.y = 300;
    game.bubbles.push({ x: 450, y: 300, r: 50, owner: game.e, life: 200 });
    const parts = makeSprayParticles(game, game.p, 700, 300, 'FIRE', 0);
    expect(parts.length).toBeGreaterThan(0);
    // a particle is drawn 12 px above where it stopped; none starts inside the bubble
    for (const q of parts)
      expect(Math.hypot(q.x - 450, q.y + 12 - 300)).toBeGreaterThanOrEqual(49.5);
  });
});
