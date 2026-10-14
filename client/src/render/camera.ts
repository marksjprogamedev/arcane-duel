// The camera: which part of the world the fixed-size viewport shows. The canvas is always
// VIEW_W x VIEW_H logical pixels (scaled to the window by CSS), so a bigger window never shows
// more of the map. On a map no larger than the viewport (every arena) the camera stays at 0,0.
import type { MapDef } from '../../../shared/maps';
import { g } from '../dom';
import { localInput } from '../state';

import { cameraOrigin, VIEW_H, VIEW_W } from './cameraMath';

export { VIEW_H, VIEW_W };

/** World position of the viewport's top-left corner. */
export const camera = { x: 0, y: 0 };

/** The mouse in viewport (screen) pixels; stays put while the camera moves under it. */
const screenMouse = { x: 0, y: 0 };
let mouseSeen = false;

export function setScreenMouse(x: number, y: number) {
  screenMouse.x = x;
  screenMouse.y = y;
  mouseSeen = true;
}

/** The mouse in world coordinates, or null before it has moved. */
export function worldMouse(): { x: number; y: number } | null {
  return mouseSeen ? { x: screenMouse.x + camera.x, y: screenMouse.y + camera.y } : null;
}

/** Puts the aim at the mouse's world position; called every frame too, because the camera moves. */
export function followMouse() {
  const w = worldMouse();
  if (!w) return;
  const m = localInput().mouse;
  m.x = w.x;
  m.y = w.y;
}

/** Centres the camera on `focus`, kept inside the map. Call once per drawn frame. */
export function updateCamera(map: MapDef, focus: { x: number; y: number }) {
  Object.assign(camera, cameraOrigin(map, focus));
}

export function resetCamera() {
  camera.x = 0;
  camera.y = 0;
}

/** Runs `drawWorld` with world coordinates mapped to the viewport. Screen-space drawing stays outside. */
export function withCamera(drawWorld: () => void) {
  g.save();
  g.translate(-camera.x, -camera.y);
  drawWorld();
  g.restore();
}
