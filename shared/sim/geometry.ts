import type { MapDef } from '../maps';
import { WIZARD_HIT_BASE, WIZARD_HIT_HEIGHT } from '../constants';
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
export function moveWithCollision(
  w: Vec2,
  dx: number,
  dy: number,
  { bounds, obstacles }: Pick<MapDef, 'bounds' | 'obstacles'>,
) {
  const x = clamp(w.x + dx, bounds.left, bounds.right);
  if (!solidAt(obstacles, x, w.y, 18)) w.x = x;
  const y = clamp(w.y + dy, bounds.top, bounds.bottom);
  if (!solidAt(obstacles, w.x, y, 18)) w.y = y;
}

export function firstObstacleHit(
  x: number,
  y: number,
  tx: number,
  ty: number,
  margin: number = 0,
  obstacles: readonly Solid[],
) {
  let dx = tx - x,
    dy = ty - y,
    lengthSq = dx * dx + dy * dy;
  if (lengthSq < 0.001) return null;
  let best = null;
  const near = solidsNear(
    obstacles,
    Math.min(x, tx) - margin,
    Math.min(y, ty) - margin,
    Math.max(x, tx) + margin,
    Math.max(y, ty) + margin,
  );
  for (const obstacle of near) {
    const u = rayEntry(obstacle, x, y, dx, dy, lengthSq, margin);
    if (u !== null && (!best || u < best.u)) best = { u, x: x + dx * u, y: y + dy * u };
  }
  return best;
}

export const hasLineOfSight = (a: Vec2, b: Vec2, margin = 0, obstacles: readonly Solid[]) =>
  !firstObstacleHit(a.x, a.y, b.x, b.y, margin, obstacles);

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

/** Heights above the feet at which a wizard's capsule hitbox is sampled: closer together than its radius. */
const HIT_STEPS = [0, 0.33, 0.66, 1].map(
  (f) => WIZARD_HIT_BASE + f * (WIZARD_HIT_HEIGHT - WIZARD_HIT_BASE),
);

/** Like `segmentCircleHit`, but against a wizard's whole body: feet at (cx, cy) up to the head. */
export function segmentWizardHit(
  x: number,
  y: number,
  tx: number,
  ty: number,
  cx: number,
  cy: number,
  radius: number,
): number | null {
  let best: number | null = null;
  for (const lift of HIT_STEPS) {
    const at = segmentCircleHit(x, y, tx, ty, cx, cy - lift, radius);
    if (at !== null && (best === null || at < best)) best = at;
  }
  return best;
}

/** Distance from a point to a wizard's body (the line from just above their feet to their head). */
export function distToWizard(p: Vec2, w: Vec2): number {
  const lift = clamp(w.y - p.y, WIZARD_HIT_BASE, WIZARD_HIT_HEIGHT);
  return Math.hypot(p.x - w.x, p.y - (w.y - lift));
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
  for (const bubble of bubbles) {
    const u = segmentCircleCrossing(ox, oy, x, y, bubble.x, bubble.y, bubble.r);
    if (u !== null && (!best || u < best.u)) best = { u, bubble };
  }
  return best;
}

/** True when a bubble edge lies between two points (one inside a bubble, the other outside). */
export function bubbleBetween(bubbles: Bubble[], a: Vec2, b: Vec2) {
  return bubbles.some(
    (bubble) =>
      Math.hypot(a.x - bubble.x, a.y - bubble.y) < bubble.r !==
      Math.hypot(b.x - bubble.x, b.y - bubble.y) < bubble.r,
  );
}

/** Where a segment ends if a bubble edge stops it first (the end point itself otherwise). */
export function stopAtBubbleEdge(bubbles: Bubble[], ox: number, oy: number, x: number, y: number) {
  const c = bubbleCrossing(bubbles, ox, oy, x, y);
  return c ? { x: ox + (x - ox) * c.u, y: oy + (y - oy) * c.u } : { x, y };
}
