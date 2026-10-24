import { describe, expect, it } from 'vitest';
import { atlasIconStyle, wheelScrollAmount } from '../../client/src/workshop/carousel';
import {
  ATLAS_KEYS,
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  AVAILABLE,
  spriteRect,
} from '../../client/src/workshop/parts';

describe('boot icons', () => {
  it('crops the atlas sprite and scales it to fit the box', () => {
    const [x, y, w, h] = spriteRect(ATLAS_KEYS.feet, 3)!;
    const scale = Math.min(44 / w, 36 / h);
    expect(atlasIconStyle(ATLAS_KEYS.feet, 3, 44, 36)).toEqual({
      width: Math.round(w * scale),
      height: Math.round(h * scale),
      backgroundSize: ATLAS_WIDTH * scale + 'px ' + ATLAS_HEIGHT * scale + 'px',
      backgroundPosition: -x * scale + 'px ' + -y * scale + 'px',
    });
  });

  it('never overflows the box, for every pair of boots', () => {
    for (const i of AVAILABLE.feet) {
      const look = atlasIconStyle(ATLAS_KEYS.feet, i, 44, 36)!;
      expect(look.width).toBeLessThanOrEqual(44);
      expect(look.height).toBeLessThanOrEqual(36);
      expect(look.width).toBeGreaterThan(0);
    }
  });

  it('has no icon for a choice without a sprite', () => {
    expect(atlasIconStyle(ATLAS_KEYS.feet, 99, 44, 36)).toBeNull();
  });
});

describe('carousel wheel', () => {
  const track = (scrollLeft: number) => ({ scrollLeft, clientWidth: 100, scrollWidth: 500 });

  it('moves the row by the wheel turn, using the larger of the two directions', () => {
    expect(wheelScrollAmount({ deltaX: 0, deltaY: 60 }, track(100))).toBe(60);
    expect(wheelScrollAmount({ deltaX: -40, deltaY: 10 }, track(100))).toBe(-40);
  });

  it('leaves the page to scroll at either end of the row', () => {
    expect(wheelScrollAmount({ deltaX: 0, deltaY: -60 }, track(0))).toBe(0);
    expect(wheelScrollAmount({ deltaX: 0, deltaY: 60 }, track(400))).toBe(0);
    // but the way back from an end still works
    expect(wheelScrollAmount({ deltaX: 0, deltaY: 60 }, track(0))).toBe(60);
    expect(wheelScrollAmount({ deltaX: 0, deltaY: -60 }, track(400))).toBe(-60);
  });

  it('leaves the page alone when the row does not scroll at all', () => {
    expect(
      wheelScrollAmount(
        { deltaX: 0, deltaY: 60 },
        { scrollLeft: 0, clientWidth: 500, scrollWidth: 500 },
      ),
    ).toBe(0);
  });
});
