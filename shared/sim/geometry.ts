import { pillars } from '../constants';
import { DEFAULT_MAP, type MapDef } from '../maps';
import { clamp } from '../math';
import type { Bubble, Solid, Vec2 } from '../types';
import { rayEntry, solidAt, solidsNear } from './obstacles';

/** How far inside the map's edge a spell's target is kept. */
export const TARGET_MARGIN = 30;

/** `(x, y)` pulled to inside the map, `TARGET_MARGIN` from its edges. */
export const clampToMap = (map: MapDef, x: number, y: number): Vec2 => ({
  x: clamp(x, TARGET_MARGIN, map.width - TARGET_MARGIN),
  y: clamp(y, TARGET_MARGIN, map.height - TARGET_MARGIN),
});

/**
 * Moves by (dx, dy), staying inside the map's wizard bounds and stopping at its obstacles (each
 * axis separately).
 */
export function walk(
  w: Vec2,
  dx: number,
  dy: number,
  { bounds, obstacles }: Pick<MapDef, 'bounds' | 'obstacles'> = DEFAULT_MAP,
) {
  const x = clamp(w.x + dx, bounds.left, bounds.right);
  if (!solidAt(obstacles, x, w.y, 18)) w.x = x;
  const y = clamp(w.y + dy, bounds.top, bounds.bottom);
  if (!solidAt(obstacles, w.x, y, 18)) w.y = y;
}

export function ray(
  x: number,
  y: number,
  tx: number,
  ty: number,
  margin: number = 0,
  obstacles: readonly Solid[] = pillars,
) {
  let dx = tx - x,
    dy = ty - y,
    A = dx * dx + dy * dy;
  if (A < 0.001) return null;
  let best = null;
  const near = solidsNear(
    obstacles,
    Math.min(x, tx) - margin,
    Math.min(y, ty) - margin,
    Math.max(x, tx) + margin,
    Math.max(y, ty) + margin,
  );
  for (const o of near) {
    const u = rayEntry(o, x, y, dx, dy, A, margin);
    if (u !== null && (!best || u < best.u)) best = { u, x: x + dx * u, y: y + dy * u };
  }
  return best;
}

export const clear = (a: Vec2, b: Vec2, m = 0, obstacles: readonly Solid[] = pillars) =>
  !ray(a.x, a.y, b.x, b.y, m, obstacles);

/** Earliest contact (0..1) between a moving point and a circle along one frame's path. */
export function segmentCircleHit(
  x: number,
  y: number,
  tx: number,
  ty: number,
  cx: number,
  cy: number,
  radius: number,
): number | null {
  const dx = tx - x,
    dy = ty - y;
  const ox = x - cx,
    oy = y - cy;
  const a = dx * dx + dy * dy;
  if (ox * ox + oy * oy <= radius * radius) return 0;
  if (a < 1e-9) return null;
  const b = 2 * (ox * dx + oy * dy);
  const c = ox * ox + oy * oy - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}

/**
 * First point along a segment where it crosses a circle's edge, in either direction (0..1), or
 * null. A segment that starts exactly on the edge and moves away does not count.
 */
export function segmentCircleCrossing(
  x: number,
  y: number,
  tx: number,
  ty: number,
  cx: number,
  cy: number,
  radius: number,
): number | null {
  const dx = tx - x,
    dy = ty - y;
  const ox = x - cx,
    oy = y - cy;
  const a = dx * dx + dy * dy;
  if (a < 1e-9) return null;
  const b = 2 * (ox * dx + oy * dy);
  const c = ox * ox + oy * oy - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  for (const t of [(-b - root) / (2 * a), (-b + root) / (2 * a)]) if (t > 1e-6 && t <= 1) return t;
  return null;
}

/** The earliest bubble edge crossed by the segment (ox, oy) -> (x, y), as a 0..1 fraction. */
export function bubbleCrossing(bubbles: Bubble[], ox: number, oy: number, x: number, y: number) {
  let best: { u: number; bubble: Bubble } | null = null;
  for (const b of bubbles) {
    const u = segmentCircleCrossing(ox, oy, x, y, b.x, b.y, b.r);
    if (u !== null && (!best || u < best.u)) best = { u, bubble: b };
  }
  return best;
}

/** True when a bubble edge lies between two points (one inside a bubble, the other outside). */
export function bubbleBetween(bubbles: Bubble[], a: Vec2, b: Vec2) {
  return bubbles.some(
    (z) => Math.hypot(a.x - z.x, a.y - z.y) < z.r !== Math.hypot(b.x - z.x, b.y - z.y) < z.r,
  );
}

/** Where a segment ends if a bubble edge stops it first (the end point itself otherwise). */
export function stopAtBubbleEdge(bubbles: Bubble[], ox: number, oy: number, x: number, y: number) {
  const c = bubbleCrossing(bubbles, ox, oy, x, y);
  return c ? { x: ox + (x - ox) * c.u, y: oy + (y - oy) * c.u } : { x, y };
}
