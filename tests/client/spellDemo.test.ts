import { describe, expect, it } from 'vitest';
import {
  DEMO_MAP,
  DEMO_VIEW,
  demoHint,
  demoWorldPoint,
  stepElement,
} from '../../client/src/ui/menus/spellDemoMath';
import { spawnsFor } from '../../shared/maps';
import type { SpellName } from '../../shared/types';

describe('spellbook demo', () => {
  it('maps the canvas corners to the shown part of the arena, at any canvas size', () => {
    expect(demoWorldPoint(0, 0, 500, 260)).toEqual({ x: DEMO_VIEW.x, y: DEMO_VIEW.y });
    expect(demoWorldPoint(1000, 520, 1000, 520)).toEqual({
      x: DEMO_VIEW.x + DEMO_VIEW.w,
      y: DEMO_VIEW.y + DEMO_VIEW.h,
    });
  });

  it('shows both wizards and every obstacle, so shots can be seen hitting them', () => {
    for (const p of [spawnsFor(DEMO_MAP)[0], spawnsFor(DEMO_MAP)[1]].map((s) => ({
      ...s,
      r: 20,
    }))) {
      expect(p.x - p.r).toBeGreaterThanOrEqual(DEMO_VIEW.x);
      expect(p.x + p.r).toBeLessThanOrEqual(DEMO_VIEW.x + DEMO_VIEW.w);
    }
    for (const p of DEMO_MAP.obstacles.filter((o) => 'r' in o)) {
      expect(p.x - p.r).toBeGreaterThanOrEqual(DEMO_VIEW.x);
      expect(p.x + p.r).toBeLessThanOrEqual(DEMO_VIEW.x + DEMO_VIEW.w);
      expect(p.y - p.r).toBeGreaterThanOrEqual(DEMO_VIEW.y);
      expect(p.y + p.r).toBeLessThanOrEqual(DEMO_VIEW.y + DEMO_VIEW.h);
    }
  });

  it('puts the dummy inside the shortest reach (Flamethrower, 300) with room for status bars above', () => {
    const [p, e] = spawnsFor(DEMO_MAP);
    expect(Math.hypot(e.x - p.x, e.y - p.y)).toBeLessThan(270);
    // up to three status bars stack from 140 units over a wizard's head, 19 apart
    expect(p.y - 140 - 2 * 19 - 10).toBeGreaterThanOrEqual(DEMO_VIEW.y);
  });

  it('keeps the line of fire between the wizards clear of the pillars', () => {
    const y = spawnsFor(DEMO_MAP)[0].y;
    for (const o of DEMO_MAP.obstacles)
      if ('r' in o) expect(Math.abs(o.y - y)).toBeGreaterThan(o.r + 30);
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
