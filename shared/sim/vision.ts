// Fog of war rules, shared by the server (what to send) and the client (what to draw). A map's
// `vision` is the distance a wizard sees; null means the whole map is visible (arenas).
import type { MapDef } from '../maps';
import type { Vec2 } from '../types';

/**
 * True when `target` is within the viewer's sight on this map. `extra` widens the radius (the
 * server sends a little beyond what is shown so things don't pop in at the edge).
 */
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
