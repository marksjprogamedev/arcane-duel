// Where a held beam or spray points. It follows the cursor but turns at most `BEAM.TURN_RATE` per
// tick, so flicking the mouse can't whip it round. The simulation and the client's own preview of
// its beams both steer with this.

import { BEAM } from '../constants';
import { clamp } from '../math';
import type { Vec2 } from '../types';

/** The beam's direction after `dt` ticks: `previous` turned toward the cursor, or the cursor's own direction when starting. */
export function beamAngle(previous: number | null, from: Vec2, cursor: Vec2, dt = 1): number {
  const want = Math.atan2(cursor.y - from.y, cursor.x - from.x);
  if (previous === null) return want;
  const turn = Math.atan2(Math.sin(want - previous), Math.cos(want - previous));
  const most = BEAM.TURN_RATE * dt;
  return previous + clamp(turn, -most, most);
}

/** The point the beam aims at: as far from `from` as the cursor is, but along `angle`. */
export function beamPoint(from: Vec2, angle: number, cursor: Vec2): Vec2 {
  const d = Math.hypot(cursor.x - from.x, cursor.y - from.y);
  return { x: from.x + Math.cos(angle) * d, y: from.y + Math.sin(angle) * d };
}
