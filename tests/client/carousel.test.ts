import { describe, expect, it } from 'vitest';
import { wheelScrollAmount } from '../../client/src/workshop/carousel';
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
