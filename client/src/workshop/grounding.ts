import type { Box } from './parts';
import type { LayoutAdjustment } from './store';

/**
 * Returns a sprite's placement relative to the wizard's logical origin.
 *
 * Grounded layers use the bottom-centre of their fitted slot as the pivot.
 * This keeps a rotated robe or boot attached to the same visual ground point
 * while leaving the collision radius and the shadow completely unchanged.
 */
export function groundedSpritePlacement(
  box: Box,
  width: number,
  height: number,
  outerScale: number,
  adjustment: LayoutAdjustment,
) {
  const anchorX = (box.x + box.w / 2 + adjustment.x) * outerScale;
  const anchorY = (box.y + box.h / 2 + adjustment.y - 290) * outerScale;
  const scaledWidth = width * outerScale;
  const scaledHeight = height * outerScale;
  return {
    x: anchorX,
    y: anchorY - scaledHeight / 2,
    width: scaledWidth,
    height: scaledHeight,
    pivotX: 0,
    pivotY: scaledHeight / 2,
  };
}
