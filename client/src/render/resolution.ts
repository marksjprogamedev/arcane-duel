// Sharp drawing: the canvas backing store matches the window's real pixels instead of being stretched
// from VIEW_W x VIEW_H, and one scale transform lets every draw call keep using logical coordinates.
import { cv, ctx } from '../dom';
import { backingScale, VIEW_H, VIEW_W } from './cameraMath';

/**
 * Sizes the canvas to its on-screen size whenever that changes (window resize, zoom, a move to
 * another screen) and calls `onResize` afterwards, because resizing blanks the canvas and resets the
 * context, so the base scale is applied again here.
 */
export function fitCanvasToWindow(onResize: () => void) {
  const fit = () => {
    const width = cv.clientWidth;
    if (!width) return;
    const scale = backingScale(width, window.devicePixelRatio || 1);
    cv.width = Math.round(VIEW_W * scale);
    cv.height = Math.round(VIEW_H * scale);
    ctx.setTransform(cv.width / VIEW_W, 0, 0, cv.height / VIEW_H, 0, 0);
    onResize();
  };
  new ResizeObserver(fit).observe(cv);
  fit();
}
