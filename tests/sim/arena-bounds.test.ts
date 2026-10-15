import { describe, expect, it } from 'vitest';
import { DEFAULT_MAP } from '../../shared/maps';
import { walk } from '../../shared/sim/geometry';

describe('arena walls', () => {
  it('lets a wizard walk past the pillar line to near the top of the floor', () => {
    const w = { x: 400, y: 300 };
    walk(w, 0, -400, DEFAULT_MAP); // straight up, between the two top pillars
    expect(w.y).toBe(DEFAULT_MAP.bounds.top);
    expect(w.y).toBeLessThan(165); // the top pillars' centre line
    expect(w.y).toBeGreaterThan(81); // the floor's own edge
  });
});
