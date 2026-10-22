import { describe, expect, it } from 'vitest';
import {
  DEMO_VIEW,
  demoHint,
  demoWorldPoint,
  stepElement,
} from '../../client/src/ui/spellDemoMath';
import { pillars } from '../../shared/constants';
import type { SpellName } from '../../shared/types';

describe('spellbook demo', () => {
  it('maps the canvas corners to the shown part of the arena, at any canvas size', () => {
    expect(demoWorldPoint(0, 0, 500, 260)).toEqual({ x: DEMO_VIEW.x, y: DEMO_VIEW.y });
    expect(demoWorldPoint(1000, 520, 1000, 520)).toEqual({
      x: DEMO_VIEW.x + DEMO_VIEW.w,
      y: DEMO_VIEW.y + DEMO_VIEW.h,
    });
  });

  it('shows all four pillars, so shots can be seen hitting them', () => {
    for (const p of pillars) {
      expect(p.x - p.r).toBeGreaterThanOrEqual(DEMO_VIEW.x);
      expect(p.x + p.r).toBeLessThanOrEqual(DEMO_VIEW.x + DEMO_VIEW.w);
      expect(p.y - p.r).toBeGreaterThanOrEqual(DEMO_VIEW.y);
      expect(p.y + p.r).toBeLessThanOrEqual(DEMO_VIEW.y + DEMO_VIEW.h);
    }
  });

  it('tells the player how each kind of spell is cast', () => {
    expect(demoHint('FIRE', {})).toMatch(/^Hold the mouse button/); // Flamethrower
    expect(demoHint('FIRE', { FIRE: 'fireball' })).toMatch(/charge/);
    expect(demoHint('FIRE', { FIRE: 'pyro_disc' })).toMatch(/^Click/);
  });

  it('steps through the elements, wrapping round at both ends', () => {
    const order: SpellName[] = ['FIRE', 'WATER', 'LIGHTNING'];
    expect(stepElement(order, 'FIRE', 1)).toBe('WATER');
    expect(stepElement(order, 'LIGHTNING', 1)).toBe('FIRE');
    expect(stepElement(order, 'FIRE', -1)).toBe('LIGHTNING');
  });
});
