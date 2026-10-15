import { describe, expect, it } from 'vitest';
import { extrapolatedShot } from '../../client/src/net/shotExtrapolation';
import type { Bubble, Wizard } from '../../shared/types';

const owner = (team: 0 | 1) => ({ team }) as Wizard;
const bubble = (team: 0 | 1): Bubble => ({ x: 400, y: 300, r: 90, owner: owner(team), life: 200 });
const shot = (over = {}) => ({ x: 250, y: 300, vx: 10, vy: 0, owner: owner(0), ...over });

describe('extrapolatedShot', () => {
  it('carries a shot along its velocity when nothing is in the way', () => {
    expect(extrapolatedShot(shot(), 8, [], false)).toEqual({ x: 330, y: 300 });
  });

  it('stops a shot at the bubble edge instead of drawing it through', () => {
    const at = extrapolatedShot(shot({ x: 290 }), 8, [bubble(1)], false);
    expect(at.x).toBeCloseTo(310, 5); // the edge of a 90 radius bubble at x 400
    expect(at.y).toBeCloseTo(300, 5);
  });

  it('does not stop a shot that is moving away from the bubble', () => {
    const at = extrapolatedShot(shot({ x: 300, vx: -10 }), 8, [bubble(1)], false);
    expect(at).toEqual({ x: 220, y: 300 });
  });

  it("lets a Pyrodisk through its own team's bubble, but not an enemy's, or any with friendly fire", () => {
    const disc = shot({ x: 290, variant: 'pyro_disc' as const });
    expect(extrapolatedShot(disc, 8, [bubble(0)], false).x).toBe(370);
    expect(extrapolatedShot(disc, 8, [bubble(1)], false).x).toBeCloseTo(310, 5);
    expect(extrapolatedShot(disc, 8, [bubble(0)], true).x).toBeCloseTo(310, 5);
  });
});
