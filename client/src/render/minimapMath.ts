// The pure part of the minimap (no canvas), so it can be tested.
import type { MapDef } from '../../../shared/maps';

/** Longest side of the minimap, in screen pixels. */
export const MINIMAP_SIZE = 170;

/** The height the action bar takes at the bottom of the viewport (its bottom offset plus its height in screens/hud.css). */
export const ACTION_BAR_SPACE = 108;

/** Size of the minimap for a map, keeping the map's proportions. */
export function minimapSize(map: Pick<MapDef, 'width' | 'height'>) {
  const scale = MINIMAP_SIZE / Math.max(map.width, map.height);
  return { w: Math.round(map.width * scale), h: Math.round(map.height * scale), scale };
}

/** Where a world position lands on the minimap (relative to its top-left corner). */
export function toMinimap(map: Pick<MapDef, 'width' | 'height'>, x: number, y: number) {
  const { scale } = minimapSize(map);
  return { x: x * scale, y: y * scale };
}
