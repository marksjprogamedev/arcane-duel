// What is solid in each arena. The simulation reads the list from the match state, so the server and
// the client agree on it; the pictures (client/src/render) draw from the same lists.
import { pillars } from './constants';
import type { Obstacle } from './types';

/** The Dark Wizards' Circle: the four pillar stones, the table in the middle, and a monument on each side. */
export const DARK_CIRCLE = {
  table: { x: 400, y: 300, r: 40 },
  /** Stone monuments, as (x, y, r) of the circle that blocks; the picture stands 20 px lower. */
  monuments: [
    ...pillars,
    { x: 400, y: 114, r: 26 },
    { x: 400, y: 532, r: 26 },
    { x: 90, y: 292, r: 26 },
    { x: 710, y: 288, r: 26 },
  ],
} as const;

const DARK_CIRCLE_OBSTACLES: readonly Obstacle[] = [DARK_CIRCLE.table, ...DARK_CIRCLE.monuments];

/** The solid objects of a map, by the id the map picker uses. Maps that are only painted differently share the pillars. */
export function obstaclesFor(mapId: string): readonly Obstacle[] {
  return mapId === 'darkcircle' ? DARK_CIRCLE_OBSTACLES : pillars;
}
