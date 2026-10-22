import { MAGMA_SHOT_LIFE } from '../../constants';
import type { MapDef } from '../../maps';
import type { Bomb, Bubble, Shot } from '../../types';
import { clampToMap } from '../geometry';

/**
 * Bounces a projectile off a bubble edge. It sits at the crossing point (`s.x`, `s.y`), is
 * mirrored about the edge's normal, takes the bubble owner's side, and from then on can hurt
 * anyone, including the one who fired it.
 */
export function reflect(shot: Shot, bubble: Bubble, map: MapDef) {
  const d = Math.hypot(shot.x - bubble.x, shot.y - bubble.y) || 1,
    nx = (shot.x - bubble.x) / d,
    ny = (shot.y - bubble.y) / d;
  // nudge it back to the side it came from, so the next step doesn't cross the edge again
  const side = shot.vx * nx + shot.vy * ny > 0 ? -1 : 1;
  const mirror = (vx: number, vy: number): [number, number] => {
    const dot = vx * nx + vy * ny;
    return [vx - 2 * dot * nx, vy - 2 * dot * ny];
  };
  if (shot.magma === true) {
    // Magma steers by its target point, not its velocity: mirror the way to it.
    const [dx, dy] = mirror(shot.tx - shot.x, shot.ty - shot.y);
    const len = Math.hypot(dx, dy) || 1;
    const reach = shot.reach ?? len; // its whole original range again, not what was left of it
    const target = clampToMap(map, shot.x + (dx / len) * reach, shot.y + (dy / len) * reach);
    shot.tx = target.x;
    shot.ty = target.y;
  }
  [shot.vx, shot.vy] = mirror(shot.vx, shot.vy);
  // a reflected shot starts its flight again: its whole range, and enough life to fly it
  if (shot.magma === true) {
    shot.life = MAGMA_SHOT_LIFE;
  } else {
    shot.travel = 0;
    shot.life = Math.max(
      shot.life,
      Math.ceil(shot.maxTravel / (Math.hypot(shot.vx, shot.vy) || 1)) + 5,
    );
  }
  shot.x += nx * side * 0.5;
  shot.y += ny * side * 0.5;
  shot.owner = bubble.owner;
  shot.ownerClear = true;
  shot.reflected = true;
}

/**
 * Turns a bomb back at a bubble edge, like `reflect` does for a shot: it takes the bubble owner's
 * side, is mirrored about the edge's normal and throws its whole range again from the contact point.
 */
export function reflectBomb(bomb: Bomb, bubble: Bubble, map: MapDef) {
  const d = Math.hypot(bomb.x - bubble.x, bomb.y - bubble.y) || 1,
    nx = (bomb.x - bubble.x) / d,
    ny = (bomb.y - bubble.y) / d;
  const range = Math.hypot(bomb.tx - bomb.sx, bomb.ty - bomb.sy) || 1;
  const dx = (bomb.tx - bomb.sx) / range,
    dy = (bomb.ty - bomb.sy) / range;
  const dot = dx * nx + dy * ny;
  // start half a pixel on the side it came from, so it does not cross the edge again at once
  const side = dot > 0 ? -1 : 1;
  bomb.x = bomb.sx = bomb.x + nx * side * 0.5;
  bomb.y = bomb.sy = bomb.y + ny * side * 0.5;
  const target = clampToMap(
    map,
    bomb.x + (dx - 2 * dot * nx) * range,
    bomb.y + (dy - 2 * dot * ny) * range,
  );
  bomb.tx = target.x;
  bomb.ty = target.y;
  bomb.flightProgress = 0;
  bomb.flight = Math.max(25, range / 12);
  bomb.owner = bubble.owner;
}
