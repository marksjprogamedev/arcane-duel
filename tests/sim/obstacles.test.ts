import { describe, expect, it } from 'vitest';
import { clear, ray, walk } from '../../shared/sim/geometry';
import { blocksPoint, rayEntry, solidAt, solidsNear } from '../../shared/sim/obstacles';
import type { Solid } from '../../shared/types';

/** A repeatable scatter of 150 circles and 150 rectangles over a 3000x2000 map. */
function scatter(): Solid[] {
  let seed = 12345;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  return Array.from({ length: 300 }, (_, i) => {
    const x = next() * 3000;
    const y = next() * 2000;
    return i % 2
      ? { x, y, r: 20 + next() * 40 }
      : { x, y, hw: 15 + next() * 90, hh: 15 + next() * 90 };
  });
}

/** The same questions answered by testing every solid, without the grid. */
function bruteRay(list: readonly Solid[], x: number, y: number, tx: number, ty: number, m: number) {
  const dx = tx - x;
  const dy = ty - y;
  const a = dx * dx + dy * dy;
  let best: number | null = null;
  for (const o of list) {
    const u = rayEntry(o, x, y, dx, dy, a, m);
    if (u !== null && (best === null || u < best)) best = u;
  }
  return best;
}

describe('rectangle obstacles', () => {
  const wall: Solid[] = [{ x: 400, y: 300, hw: 100, hh: 20 }];
  const bounds = { left: 0, right: 800, top: 0, bottom: 600 };

  it('block walking from every side, within the wizard radius of the edge', () => {
    const w = { x: 400, y: 200 };
    for (let i = 0; i < 100; i++) walk(w, 0, 5, { bounds, obstacles: wall });
    expect(w.y).toBeLessThanOrEqual(300 - 20 - 18); // stopped above the wall, not inside it
    expect(w.y).toBeGreaterThan(300 - 20 - 18 - 5);
    const side = { x: 200, y: 300 };
    for (let i = 0; i < 100; i++) walk(side, 5, 0, { bounds, obstacles: wall });
    expect(side.x).toBeLessThanOrEqual(400 - 100 - 18);
  });

  it('stop shots, with the margin added', () => {
    const hit = ray(400, 100, 400, 500, 0, wall);
    expect(hit).toMatchObject({ x: 400, y: 280 });
    expect(ray(400, 100, 400, 500, 10, wall)).toMatchObject({ y: 270 });
    expect(ray(50, 100, 50, 500, 0, wall)).toBeNull(); // passes beside the wall
    expect(ray(0, 300, 799, 300, 0, wall)).toMatchObject({ x: 300 }); // sideways
    expect(ray(400, 300, 400, 500, 0, wall)).toBeNull(); // starting inside is not a hit
    expect(clear({ x: 400, y: 100 }, { x: 400, y: 500 }, 0, wall)).toBe(false);
  });

  it('a spell cannot be placed inside one', () => {
    expect(solidAt(wall, 400, 300, 12)).toBe(true);
    expect(solidAt(wall, 400, 335, 12)).toBe(false);
    expect(solidAt(wall, 400, 325, 12)).toBe(true);
    expect(blocksPoint(wall[0], 505, 325, 12)).toBe(true); // rounded corner reach
    expect(blocksPoint(wall[0], 515, 335, 12)).toBe(false);
  });
});

describe('obstacle lookup grid', () => {
  const list = scatter();

  it('finds the same solid the full scan does, for many random shots', () => {
    let seed = 99;
    const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    let hits = 0;
    for (let i = 0; i < 2000; i++) {
      const [x, y] = [next() * 3000, next() * 2000];
      const long = i % 3 === 0;
      const [tx, ty] = [
        x + (next() - 0.5) * (long ? 2500 : 200),
        y + (next() - 0.5) * (long ? 1800 : 200),
      ];
      const m = [0, 3, 12][i % 3];
      const want = bruteRay(list, x, y, tx, ty, m);
      const got = ray(x, y, tx, ty, m, list);
      if (want === null) expect(got).toBeNull();
      else expect(got?.u).toBeCloseTo(want, 9);
      if (want !== null) hits++;
    }
    expect(hits).toBeGreaterThan(100); // the test is not trivially all misses
  });

  it('answers "is something here" the same as the full scan', () => {
    let seed = 7;
    const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
    for (let i = 0; i < 3000; i++) {
      const [x, y] = [next() * 3000, next() * 2000];
      expect(solidAt(list, x, y, 18)).toBe(list.some((o) => blocksPoint(o, x, y, 18)));
    }
  });

  it('only returns nearby solids for a small query on a big map', () => {
    expect(solidsNear(list, 1000, 1000, 1010, 1010).length).toBeLessThan(10);
    expect(solidsNear(list, 0, 0, 3000, 2000).length).toBe(list.length);
  });

  it('short lists skip the grid (the arenas)', () => {
    const few = list.slice(0, 5);
    expect(solidsNear(few, 0, 0, 10, 10)).toBe(few);
  });
});
