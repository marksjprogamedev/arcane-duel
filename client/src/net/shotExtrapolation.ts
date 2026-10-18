import { stopAtBubbleEdge } from '../../../shared/sim/geometry';
import type { Bubble, Shot, Vec2 } from '../../../shared/types';

/**
 * Where to draw a shot `age` ticks after the newest snapshot: carried along its velocity, but not
 * through a bubble. The server reflects the shot at the edge of any bubble (enemy, ally or the
 * caster's own: docs/BUBBLES.md), so drawing it past the edge would show it crossing the bubble
 * before the reflection arrives.
 */
export function extrapolatedShot(
  s: Pick<Shot, 'x' | 'y' | 'vx' | 'vy'>,
  age: number,
  bubbles: readonly Bubble[],
): Vec2 {
  return stopAtBubbleEdge(bubbles as Bubble[], s.x, s.y, s.x + s.vx * age, s.y + s.vy * age);
}
