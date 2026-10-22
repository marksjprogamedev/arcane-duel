// The pure part of the fog of war (no canvas), so it can be tested.
import { clamp } from '../../../shared/math';
import { VIEW_H, VIEW_W } from './cameraMath';

/** The fog starts this fraction of the way out to the vision radius and is solid at the radius. */
export const FOG_START = 0.4;

/** How dark the fog is (0..1) at `dist` from the viewer, on a map whose vision radius is `vision`. */
export function fogAlpha(dist: number, vision: number): number {
  const t = clamp((dist / vision - FOG_START) / (1 - FOG_START), 0, 1);
  return t * t * (3 - 2 * t);
}

/** How long a "you were hit from over there" arrow stays, in game ticks. */
export const HIT_HINT_TICKS = 90;

/**
 * Where on the screen an arrow pointing `angle` (radians, 0 = right) sits: on the edge of the
 * viewport, `inset` pixels in, in that direction from the centre.
 */
export function hintAnchor(angle: number, inset = 34) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const halfW = VIEW_W / 2 - inset;
  const halfH = VIEW_H / 2 - inset;
  const scale = Math.min(
    Math.abs(dx) > 1e-9 ? halfW / Math.abs(dx) : Infinity,
    Math.abs(dy) > 1e-9 ? halfH / Math.abs(dy) : Infinity,
  );
  return { x: VIEW_W / 2 + dx * scale, y: VIEW_H / 2 + dy * scale };
}

/**
 * The direction (radians) an unseen attacker's shot came from, given the shots of the previous
 * snapshot, or null when none was close enough to have been the one that hit.
 */
export function incomingAngle(
  me: { x: number; y: number },
  shots: readonly { x: number; y: number; vx: number; vy: number }[],
  reach = 260,
): number | null {
  let best: { d: number; angle: number } | null = null;
  for (const shot of shots) {
    const distance = Math.hypot(shot.x - me.x, shot.y - me.y);
    if (distance > reach || (shot.vx === 0 && shot.vy === 0)) continue;
    if (!best || distance < best.d) best = { d: distance, angle: Math.atan2(-shot.vy, -shot.vx) };
  }
  return best ? best.angle : null;
}
