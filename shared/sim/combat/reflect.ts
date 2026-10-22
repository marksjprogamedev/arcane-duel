import { MAGMA_SHOT_LIFE } from '../../constants';
import type { MapDef } from '../../maps';
import type { Bomb, Bubble, Shot } from '../../types';
import { clampToMap } from '../geometry';

/**
 * Bounces a projectile off a bubble edge. It sits at the crossing point (`s.x`, `s.y`), is
 * mirrored about the edge's normal, takes the bubble owner's side, and from then on can hurt
 * anyone, including the one who fired it.
 */
export function reflect(s: Shot, b: Bubble, map: MapDef) {
  const d = Math.hypot(s.x - b.x, s.y - b.y) || 1,
    nx = (s.x - b.x) / d,
    ny = (s.y - b.y) / d;
  // nudge it back to the side it came from, so the next step doesn't cross the edge again
  const side = s.vx * nx + s.vy * ny > 0 ? -1 : 1;
  const mirror = (vx: number, vy: number): [number, number] => {
    const dot = vx * nx + vy * ny;
    return [vx - 2 * dot * nx, vy - 2 * dot * ny];
  };
  if (s.magma === true) {
    // Magma steers by its target point, not its velocity: mirror the way to it.
    const [dx, dy] = mirror(s.tx - s.x, s.ty - s.y);
    const len = Math.hypot(dx, dy) || 1;
    const reach = s.reach ?? len; // its whole original range again, not what was left of it
    const target = clampToMap(map, s.x + (dx / len) * reach, s.y + (dy / len) * reach);
    s.tx = target.x;
    s.ty = target.y;
  }
  [s.vx, s.vy] = mirror(s.vx, s.vy);
  // a reflected shot starts its flight again: its whole range, and enough life to fly it
  if (s.magma === true) {
    s.life = MAGMA_SHOT_LIFE;
  } else {
    s.travel = 0;
    s.life = Math.max(s.life, Math.ceil(s.maxTravel / (Math.hypot(s.vx, s.vy) || 1)) + 5);
  }
  s.x += nx * side * 0.5;
  s.y += ny * side * 0.5;
  s.owner = b.owner;
  s.ownerClear = true;
  s.reflected = true;
}

/**
 * Turns a bomb back at a bubble edge, like `reflect` does for a shot: it takes the bubble owner's
 * side, is mirrored about the edge's normal and throws its whole range again from the contact point.
 */
export function reflectBomb(b: Bomb, bubble: Bubble, map: MapDef) {
  const d = Math.hypot(b.x - bubble.x, b.y - bubble.y) || 1,
    nx = (b.x - bubble.x) / d,
    ny = (b.y - bubble.y) / d;
  const range = Math.hypot(b.tx - b.sx, b.ty - b.sy) || 1;
  const dx = (b.tx - b.sx) / range,
    dy = (b.ty - b.sy) / range;
  const dot = dx * nx + dy * ny;
  // start half a pixel on the side it came from, so it does not cross the edge again at once
  const side = dot > 0 ? -1 : 1;
  b.x = b.sx = b.x + nx * side * 0.5;
  b.y = b.sy = b.y + ny * side * 0.5;
  const target = clampToMap(
    map,
    b.x + (dx - 2 * dot * nx) * range,
    b.y + (dy - 2 * dot * ny) * range,
  );
  b.tx = target.x;
  b.ty = target.y;
  b.u = 0;
  b.flight = Math.max(25, range / 12);
  b.owner = bubble.owner;
}
