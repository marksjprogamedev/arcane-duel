// What is solid on a map, with a grid so each check only looks at nearby obstacles.
import type { Obstacle, RectObstacle, Solid } from '../types';

/** Side of a grid cell, in game units. */
const CELL = 128;
/** Lists shorter than this are scanned directly: the arenas have 4 to 9 obstacles. */
const GRID_MIN = 12;

export const isRect = (solid: Solid): solid is RectObstacle => 'hw' in solid;

/** True when the point (px, py) is within `pad` of the solid (a wizard's body, a spell's footprint). */
export function blocksPoint(solid: Solid, px: number, py: number, pad: number): boolean {
  if (isRect(solid)) {
    const dx = Math.max(Math.abs(px - solid.x) - solid.hw, 0);
    const dy = Math.max(Math.abs(py - solid.y) - solid.hh, 0);
    return Math.hypot(dx, dy) < pad;
  }
  return Math.hypot(px - solid.x, py - solid.y) < solid.r + pad;
}

/**
 * Where the segment (x, y) + u * (dx, dy), u in 0..1, first touches the solid grown by `margin`
 * (square corners for rectangles); returns zero if it starts inside. `lengthSq` = dx*dx + dy*dy.
 */
export function rayEntry(
  solid: Solid,
  x: number,
  y: number,
  dx: number,
  dy: number,
  lengthSq: number,
  margin: number,
): number | null {
  if (isRect(solid)) {
    if (Math.abs(x - solid.x) <= solid.hw + margin && Math.abs(y - solid.y) <= solid.hh + margin)
      return 0;
    let near = -Infinity;
    let far = Infinity;
    for (const [p, d, c, half] of [
      [x, dx, solid.x, solid.hw + margin],
      [y, dy, solid.y, solid.hh + margin],
    ] as const) {
      if (Math.abs(d) < 1e-12) {
        if (Math.abs(p - c) > half) return null;
        continue;
      }
      const u1 = (c - half - p) / d;
      const u2 = (c + half - p) / d;
      near = Math.max(near, Math.min(u1, u2));
      far = Math.min(far, Math.max(u1, u2));
    }
    return near >= 0 && near <= far && near <= 1 ? near : null;
  }
  const ox = x - solid.x;
  const oy = y - solid.y;
  const r = solid.r + margin;
  if (ox * ox + oy * oy <= r * r) return 0;
  const b = 2 * (ox * dx + oy * dy);
  const disc = b * b - 4 * lengthSq * (ox * ox + oy * oy - r * r);
  if (disc < 0) return null;
  const u = (-b - Math.sqrt(disc)) / (2 * lengthSq);
  return u >= 0 && u <= 1 ? u : null;
}

type Cells = Map<number, Solid[]>;
const grids = new WeakMap<readonly Solid[], Cells>();
const cellKey = (cx: number, cy: number) => cx * 100003 + cy;

function bounds(solid: Solid) {
  const [hw, hh] = isRect(solid)
    ? [solid.hw, solid.hh]
    : [(solid as Obstacle).r, (solid as Obstacle).r];
  return { x0: solid.x - hw, y0: solid.y - hh, x1: solid.x + hw, y1: solid.y + hh };
}

function gridFor(list: readonly Solid[]): Cells {
  let cells = grids.get(list);
  if (cells) return cells;
  cells = new Map();
  for (const solid of list) {
    const b = bounds(solid);
    for (let cx = Math.floor(b.x0 / CELL); cx <= Math.floor(b.x1 / CELL); cx++)
      for (let cy = Math.floor(b.y0 / CELL); cy <= Math.floor(b.y1 / CELL); cy++) {
        const key = cellKey(cx, cy);
        const cell = cells.get(key);
        if (cell) cell.push(solid);
        else cells.set(key, [solid]);
      }
  }
  grids.set(list, cells);
  return cells;
}

const NONE: readonly Solid[] = [];

/** The solids that might touch the box (callers add their own reach); all of them for a short list. */
export function solidsNear(
  list: readonly Solid[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): readonly Solid[] {
  if (list.length < GRID_MIN) return list;
  const cells = gridFor(list);
  const cx0 = Math.floor(x0 / CELL);
  const cx1 = Math.floor(x1 / CELL);
  const cy0 = Math.floor(y0 / CELL);
  const cy1 = Math.floor(y1 / CELL);
  if (cx0 === cx1 && cy0 === cy1) return cells.get(cellKey(cx0, cy0)) ?? NONE;
  const found = new Set<Solid>();
  for (let cx = cx0; cx <= cx1; cx++)
    for (let cy = cy0; cy <= cy1; cy++)
      for (const solid of cells.get(cellKey(cx, cy)) ?? NONE) found.add(solid);
  return [...found];
}

/** True when any solid is within `pad` of the point. */
export function solidAt(list: readonly Solid[], px: number, py: number, pad: number): boolean {
  return solidsNear(list, px - pad, py - pad, px + pad, py + pad).some((solid) =>
    blocksPoint(solid, px, py, pad),
  );
}
