import { describe, expect, it } from 'vitest';
import { VIEW_H, VIEW_W } from '../../client/src/render/cameraMath';
import { fogAlpha, FOG_START, hintAnchor, incomingAngle } from '../../client/src/render/fogMath';

describe('fog darkness', () => {
  it('is clear near the wizard, solid at the vision radius and beyond, smooth between', () => {
    expect(fogAlpha(0, 560)).toBe(0);
    expect(fogAlpha(560 * FOG_START, 560)).toBe(0);
    expect(fogAlpha(560, 560)).toBe(1);
    expect(fogAlpha(900, 560)).toBe(1);
    let last = 0;
    for (let d = 0; d <= 560; d += 20) {
      const a = fogAlpha(d, 560);
      expect(a).toBeGreaterThanOrEqual(last);
      last = a;
    }
  });

  it('leaves the middle of the screen clear and darkens its corners', () => {
    expect(fogAlpha(VIEW_H / 2, 440)).toBeLessThan(0.6); // the middle of the screen's top edge
    expect(fogAlpha(VIEW_W / 2, 440)).toBeGreaterThan(0.9); // the middle of its side edge
    expect(fogAlpha(Math.hypot(VIEW_W / 2, VIEW_H / 2), 440)).toBe(1); // its corner
  });
});

describe('hit direction arrow', () => {
  it('sits on the edge of the screen toward the attacker, inside it', () => {
    const right = hintAnchor(0);
    expect(right.y).toBeCloseTo(VIEW_H / 2);
    expect(right.x).toBeGreaterThan(VIEW_W - 60);
    expect(right.x).toBeLessThan(VIEW_W);
    const up = hintAnchor(-Math.PI / 2);
    expect(up.x).toBeCloseTo(VIEW_W / 2);
    expect(up.y).toBeLessThan(60);
    const corner = hintAnchor(Math.atan2(VIEW_H, VIEW_W));
    expect(corner.x).toBeGreaterThan(0);
    expect(corner.x).toBeLessThan(VIEW_W);
    expect(corner.y).toBeLessThan(VIEW_H);
  });

  it('points back along the path of the shot that hit', () => {
    const me = { x: 500, y: 500 };
    // a shot flying right-to-left toward me came from the right
    const angle = incomingAngle(me, [{ x: 520, y: 500, vx: -8, vy: 0 }]);
    expect(angle).toBeCloseTo(0);
    // a shot flying downwards came from above
    expect(incomingAngle(me, [{ x: 500, y: 450, vx: 0, vy: 8 }])).toBeCloseTo(-Math.PI / 2);
  });

  it('uses the nearest shot, and none when none is close', () => {
    const me = { x: 0, y: 0 };
    const near = { x: 30, y: 0, vx: -5, vy: 0 };
    const farther = { x: 0, y: 200, vx: 0, vy: -5 };
    expect(incomingAngle(me, [farther, near])).toBeCloseTo(0);
    expect(incomingAngle(me, [{ x: 900, y: 0, vx: -5, vy: 0 }])).toBeNull();
    expect(incomingAngle(me, [])).toBeNull();
  });
});
