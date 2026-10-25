import { beforeEach, describe, expect, it } from 'vitest';
import { sword } from '../../shared/sim/combat/abilities';
import { applyInput } from '../../shared/sim/input';
import { game, press, resetDuel } from './helpers';

beforeEach(() => resetDuel('online'));

/** Puts the foe `distance` away from the wizard in the direction `angle`. */
function placeFoe(angle: number, distance = 50) {
  const [me, foe] = game.wizards;
  [me.x, me.y] = [400, 300];
  [foe.x, foe.y] = [me.x + Math.cos(angle) * distance, me.y + Math.sin(angle) * distance];
  foe.hp = foe.max = 100;
  return { me, foe };
}

describe('sword aim', () => {
  it('hits a foe in the aimed quarter', () => {
    const { me, foe } = placeFoe(0.5);
    sword(game, me, 0.5 + 0.6);
    expect(foe.hp).toBeLessThan(100);
    expect(me.face).toBeCloseTo(1.1);
  });

  it('misses a foe outside the aimed quarter, even though it is close', () => {
    const { me, foe } = placeFoe(0);
    sword(game, me, Math.PI / 2);
    expect(foe.hp).toBe(100);
    expect(me.swordCD).toBeGreaterThan(0);
  });

  it('misses a foe behind the swing, across the wrap-around of angles', () => {
    const { me, foe } = placeFoe(Math.PI - 0.1);
    sword(game, me, -Math.PI + 0.2);
    expect(foe.hp).toBeLessThan(100); // 0.3 rad apart, through ±PI
    foe.hp = 100;
    me.swordCD = 0;
    sword(game, me, 0);
    expect(foe.hp).toBe(100);
  });

  it('misses a foe in the aimed quarter but out of reach', () => {
    const { me, foe } = placeFoe(0, 120);
    sword(game, me, 0);
    expect(foe.hp).toBe(100);
  });

  it('F swings toward the cursor, not toward the foe', () => {
    const { me, foe } = placeFoe(0);
    applyInput(game, 0, { kind: 'aim', x: me.x, y: me.y + 100 });
    applyInput(game, 0, press('KeyF'));
    expect(me.face).toBeCloseTo(Math.PI / 2);
    expect(foe.hp).toBe(100);
  });
});
