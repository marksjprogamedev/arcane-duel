// The pure part of the camera (no canvas), so it can be tested.
import type { MapDef } from '../../../shared/maps';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../../../shared/constants';
import { clamp } from '../../../shared/math';
import { ACTION_BAR_SPACE } from './hud/minimapMath';

/** The viewport is a fixed 16:9 logical size, scaled to the window, so nobody sees more than anyone else. An arena is exactly this size. */
export const VIEW_W = ARENA_WIDTH;
export const VIEW_H = ARENA_HEIGHT;

/** Widest canvas backing store, in pixels: a 4K screen would cost four times the fill rate for little visible gain. */
export const MAX_BACKING_WIDTH = 2560;

/** Backing pixels per logical pixel for a canvas shown `cssWidth` CSS pixels wide on a screen with this pixel ratio. */
export function backingScale(cssWidth: number, pixelRatio: number) {
  return Math.min(cssWidth * pixelRatio, MAX_BACKING_WIDTH) / VIEW_W;
}

/** Clear space kept between a wizard standing at the lowest walkable point and the top of the action bar. */
export const ACTION_BAR_CLEARANCE = 24;

/**
 * The world position of the viewport's top-left corner when it is centred on `focus`, kept inside the
 * map. The view may run a little past the bottom of the map, so a wizard at the lowest walkable point
 * (`bounds.bottom`) still stands above the action bar instead of behind it (`drawBelowMap` fills the
 * strip below the map).
 */
export function cameraOrigin(
  map: Pick<MapDef, 'width' | 'height'> & { bounds?: Pick<MapDef['bounds'], 'bottom'> },
  focus: { x: number; y: number },
) {
  const bottom = Math.max(
    0,
    map.height - VIEW_H,
    map.bounds ? map.bounds.bottom - (VIEW_H - ACTION_BAR_SPACE) + ACTION_BAR_CLEARANCE : 0,
  );
  return {
    x: clamp(focus.x - VIEW_W / 2, 0, Math.max(0, map.width - VIEW_W)),
    y: clamp(focus.y - VIEW_H / 2, 0, bottom),
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
