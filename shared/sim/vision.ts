// Fog of war rule shared by the server (what to send) and the client (what to draw).
import type { MapDef } from '../maps';
import type { Vec2 } from '../types';

/** True when `target` is within the viewer's sight; `extra` widens the radius. */
export function canSee(
  map: Pick<MapDef, 'vision'>,
  viewer: Vec2,
  target: Vec2,
  extra = 0,
): boolean {
  if (map.vision === null) return true;
  const r = map.vision + extra;
  return (viewer.x - target.x) ** 2 + (viewer.y - target.y) ** 2 <= r * r;
}

/** The server sends this far past the vision radius, so things crossing the edge are already in place. */
export const VISION_MARGIN = 100;

/** The bits of a Smoke Bomb cloud the sight rule needs. */
export interface SmokeCloud extends Vec2 {
  r: number;
  owner: { team: number };
}

const inside = (cloud: SmokeCloud, p: Vec2) =>
  (p.x - cloud.x) ** 2 + (p.y - cloud.y) ** 2 <= cloud.r ** 2;

/**
 * Smoke rule: nobody sees out of a cloud, and only the caster's team sees into it. So a watcher
 * sees `target` unless, for some cloud, exactly one of them is inside it and the watcher is
 * either the one inside or on a team other than the cloud's caster.
 */
export function smokeAllows(
  clouds: readonly SmokeCloud[],
  watcher: Vec2 & { team: number },
  target: Vec2,
): boolean {
  for (const cloud of clouds) {
    const inW = inside(cloud, watcher);
    const inT = inside(cloud, target);
    if (inW === inT) continue;
    if (inW || watcher.team !== cloud.owner.team) return false;
  }
  return true;
}
