import { pillars } from '../constants';
import { clamp } from '../math';
import type { Vec2 } from '../types';

export const ARENA_WIZARD_BOUNDS = { left: 82, right: 718, top: 175, bottom: 490 } as const;

/**
 * Moves by (dx, dy), staying inside the tree-lined arena and stopping at pillars (each axis
 * separately). The upper margin leaves room for the wizard's health and status bars.
 */
export function walk(w: Vec2, dx: number, dy: number) {
  const x = clamp(w.x + dx, ARENA_WIZARD_BOUNDS.left, ARENA_WIZARD_BOUNDS.right);
  if (!pillars.some((o) => Math.hypot(x - o.x, w.y - o.y) < o.r + 18)) w.x = x;
  const y = clamp(w.y + dy, ARENA_WIZARD_BOUNDS.top, ARENA_WIZARD_BOUNDS.bottom);
  if (!pillars.some((o) => Math.hypot(w.x - o.x, y - o.y) < o.r + 18)) w.y = y;
}

export function ray(x: number, y: number, tx: number, ty: number, margin: number = 0) {
  let dx = tx - x,
    dy = ty - y,
    A = dx * dx + dy * dy;
  if (A < 0.001) return null;
  let best = null;
  for (let o of pillars) {
    let ox = x - o.x,
      oy = y - o.y,
      r = o.r + margin,
      B = 2 * (ox * dx + oy * dy),
      D = B * B - 4 * A * (ox * ox + oy * oy - r * r);
    if (D < 0) continue;
    let u = (-B - Math.sqrt(D)) / (2 * A);
    if (u >= 0 && u <= 1 && (!best || u < best.u)) best = { u, x: x + dx * u, y: y + dy * u };
  }
  return best;
}

export const clear = (a: Vec2, b: Vec2, m = 0) => !ray(a.x, a.y, b.x, b.y, m);

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
