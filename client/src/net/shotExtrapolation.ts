import { stopAtBubbleEdge } from '../../../shared/sim/geometry';
import type { Bubble, Shot, Vec2 } from '../../../shared/types';

/**
 * Where to draw a shot `age` ticks after the newest snapshot: carried along its velocity, but not
 * through a bubble. The server reflects the shot at the bubble's edge, so drawing it past the edge
 * would show it crossing the bubble before the reflection arrives. (A Pyrodisk passes its own
 * team's bubbles, as it does on the server.)
 */
export function extrapolatedShot(
  s: Pick<Shot, 'x' | 'y' | 'vx' | 'vy' | 'variant' | 'owner'>,
  age: number,
  bubbles: readonly Bubble[],
  friendlyFire: boolean,
): Vec2 {
  const stops = bubbles.filter(
    (b) => s.variant !== 'pyro_disc' || friendlyFire || b.owner.team !== s.owner.team,
  );
  return stopAtBubbleEdge(stops as Bubble[], s.x, s.y, s.x + s.vx * age, s.y + s.vy * age);
}
