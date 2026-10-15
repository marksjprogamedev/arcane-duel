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
