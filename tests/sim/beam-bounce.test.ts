import { beforeEach, describe, expect, it } from 'vitest';
import { cast } from '../../shared/sim/combat/cast';
import { blocked, hit } from '../../shared/sim/combat/damage';
import { update } from '../../shared/sim/update';
import { game, resetDuel } from './helpers';

beforeEach(() => {
  resetDuel();
  game.map = { ...game.map, obstacles: [] };
});

const plasma = { PLASMA: 'plasma_beam' } as const;
const magnetic = { MAGNETIC: 'magnetic_pull' } as const;
const legs = () => game.events.filter((e) => e.type === 'lightning');

function bubbleAround(x: number, y: number, r = 90) {
  game.bubbles.push({ x, y, r, owner: game.e, life: 400 });
}

describe('a bubble reflects beams', () => {
  it('turns a Plasma Beam straight back at whoever fired it', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 300;
    bubbleAround(500, 300);
    game.p.plasmaReach = 460; // the beam is at full length
    cast(game, game.p, 500, 300, 1, 'PLASMA', plasma);
    expect(game.p.hp).toBeLessThan(200); // hit by its own reflected beam
    expect(game.e.hp).toBe(200); // the bubble's owner is untouched
    const [first, second] = legs() as { castOwner: number; reflected?: boolean; tx: number }[];
    expect(first.reflected).toBeUndefined();
    expect(first.tx).toBeCloseTo(410, 0); // the beam ends at the bubble's edge
    expect(second.reflected).toBe(true);
    expect(second.castOwner).toBe(game.e.seat); // the reflected leg is the bubble owner's
  });

  it('gives the reflected leg its full length again, even when fired from far away', () => {
    game.p.x = 100;
    game.p.y = 300;
    game.e.x = 540;
    game.e.y = 300;
    bubbleAround(540, 300); // its edge is 350 px away: only 110 of a 460 beam would be left
    game.p.plasmaReach = 460;
    cast(game, game.p, 540, 300, 1, 'PLASMA', plasma);
    expect(game.p.hp).toBeLessThan(200); // the reflected beam is a whole 460 long: it reaches home
    const second = legs()[1] as { x: number; tx: number };
    expect(second.tx).toBeCloseTo(450 - (350 - 22), 0); // it ends at the caster's near surface
  });

  it('does the same for a Lightning bolt fired from far away', () => {
    game.p.x = 60;
    game.p.y = 300;
    game.e.x = 360;
    game.e.y = 300;
    bubbleAround(360, 300); // 210 px to the edge: only 90 of a 300 bolt would be left
    cast(game, game.p, 360, 300, 1, 'LIGHTNING');
    expect(game.p.hp).toBeLessThan(200);
  });

  it('sends it off at the mirrored angle when it meets the bubble at a slant', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 360;
    bubbleAround(500, 360);
    game.p.plasmaReach = 460;
    cast(game, game.p, 500, 300, 1, 'PLASMA', plasma);
    expect(game.p.hp).toBe(200); // it did not come back at them
    const second = legs()[1] as { ty: number; y: number };
    expect(second.ty).toBeLessThan(second.y - 50); // and went up and away
  });

  it('turns a Lightning bolt back at the caster too', () => {
    game.p.x = 300;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 300;
    bubbleAround(500, 300);
    cast(game, game.p, 500, 300, 1, 'LIGHTNING');
    expect(game.p.hp).toBeLessThan(200);
    expect(game.e.hp).toBe(200);
    expect(legs()).toHaveLength(2);
  });

  it('pulls the caster toward the bubble when a Magnetic Pull is reflected', () => {
    game.p.x = 300;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 300;
    bubbleAround(500, 300);
    game.p.magneticReach = 440;
    cast(game, game.p, 500, 300, 1, 'MAGNETIC', magnetic);
    expect(game.p.kx).toBeGreaterThan(0);
    expect(game.e.kx).toBe(0);
  });

  it('still reaches a wizard in front of the bubble without bouncing', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 330;
    game.e.y = 300;
    bubbleAround(500, 300); // behind the target
    game.p.plasmaReach = 460;
    cast(game, game.p, 330, 300, 1, 'PLASMA', plasma);
    expect(game.e.hp).toBeLessThan(200);
    expect(legs()).toHaveLength(1);
  });
});

describe('Plasma Beam width', () => {
  it('has twice the hitbox: hits a target that is 0.08 radians off its line', () => {
    game.p.x = 200;
    game.p.y = 300;
    game.e.x = 400;
    game.e.y = 316; // atan(16 / 200) = 0.0798: outside the old 0.055, inside the new 0.11
    game.p.plasmaReach = 460;
    cast(game, game.p, 400, 300, 1, 'PLASMA', plasma);
    expect(game.e.hp).toBeLessThan(200);
  });
});

describe('BLOCKED! messages', () => {
  const labels = () =>
    game.events.filter((e) => e.type === 'text' && (e as { text: string }).text === 'BLOCKED!');

  it('shows one a second however many hits the shield takes', () => {
    game.e.shield = { type: 1, life: 1000 }; // a water shield
    for (let i = 0; i < 130; i++) {
      update(game, 1);
      game.e.shield = { type: 1, life: 1000 };
      expect(blocked(game, game.e, 'WATER')).toBe(true); // still blocks every time
    }
    expect(labels().length).toBeGreaterThanOrEqual(2);
    expect(labels().length).toBeLessThanOrEqual(3);
  });

  it('does it for every spell, not only Fire', () => {
    game.e.shield = { type: 2, life: 1000 }; // lightning shield
    for (let i = 0; i < 40; i++) {
      update(game, 1);
      game.e.shield = { type: 2, life: 1000 };
      hit(game, game.e, 'LIGHTNING', 5);
    }
    expect(game.e.hp).toBe(200);
    expect(labels()).toHaveLength(1);
  });
});
