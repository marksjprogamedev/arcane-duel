// The pure part of the camera (no canvas), so it can be tested.
import type { MapDef } from '../../../shared/maps';
import { clamp } from '../../../shared/math';

/** The viewport is a fixed 16:9 logical size, scaled to the window, so nobody sees more than anyone else. An arena is exactly this size. */
export const VIEW_W = 1067;
export const VIEW_H = 600;

/** The world position of the viewport's top-left corner when it is centred on `focus`, kept inside the map. */
export function cameraOrigin(
  map: Pick<MapDef, 'width' | 'height'>,
  focus: { x: number; y: number },
) {
  return {
    x: clamp(focus.x - VIEW_W / 2, 0, Math.max(0, map.width - VIEW_W)),
    y: clamp(focus.y - VIEW_H / 2, 0, Math.max(0, map.height - VIEW_H)),
  };
}

/** True if a thing at (x, y) reaching out `margin` units could show in a viewport whose corner is `cam`. */
export function isVisible(cam: { x: number; y: number }, x: number, y: number, margin: number) {
  return (
    x > cam.x - margin &&
    x < cam.x + VIEW_W + margin &&
    y > cam.y - margin &&
    y < cam.y + VIEW_H + margin
  );
}
