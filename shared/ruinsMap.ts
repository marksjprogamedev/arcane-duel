// The Ruined Keep, the first real battleground: what is solid. Authored as the left half of the map
// and mirrored across the middle, so both spawns get the same cover and the same routes. The art is
// client/src/render/ruins.ts and draws from these lists.
import type { Obstacle, RectObstacle, Solid } from './types';

export const RUINS_WIDTH = 2400;
export const RUINS_HEIGHT = 1800;

const mid = RUINS_WIDTH / 2;

/** Standing stones, fallen pillars and rubble. */
const STONES_LEFT: readonly Obstacle[] = [
  { x: 330, y: 640, r: 28 },
  { x: 330, y: 1160, r: 28 },
  { x: 520, y: 560, r: 32 },
  { x: 575, y: 625, r: 24 },
  { x: 430, y: 1400, r: 32 },
  { x: 700, y: 1180, r: 40 },
  { x: 765, y: 1255, r: 28 },
  { x: 900, y: 420, r: 36 },
  { x: 940, y: 1500, r: 32 },
  { x: 800, y: 760, r: 24 },
];

/** Broken walls: centre and half width / half height. */
const WALLS_LEFT: readonly RectObstacle[] = [
  // the western gatehouse: a wall across the road with a gap in line with the spawns
  { x: 620, y: 765, hw: 12, hh: 65 },
  { x: 620, y: 1035, hw: 12, hh: 65 },
  // low walls that cut the north and south routes
  { x: 900, y: 600, hw: 110, hh: 12 },
  { x: 900, y: 1240, hw: 110, hh: 12 },
  { x: 460, y: 300, hw: 12, hh: 120 },
  { x: 460, y: 1500, hw: 12, hh: 120 },
  // the keep in the middle: a square of walls with a gap in the middle of each side
  { x: 1070, y: 680, hw: 90, hh: 12 }, // north
  { x: 1070, y: 1120, hw: 90, hh: 12 }, // south
  { x: 980, y: 770, hw: 12, hh: 90 }, // west, upper
  { x: 980, y: 1030, hw: 12, hh: 90 }, // west, lower
];

/** On the middle line: not mirrored. */
const CENTRE: readonly Obstacle[] = [{ x: mid, y: 900, r: 40 }];

const mirrorStone = (o: Obstacle): Obstacle => ({ ...o, x: RUINS_WIDTH - o.x });
const mirrorWall = (o: RectObstacle): RectObstacle => ({ ...o, x: RUINS_WIDTH - o.x });

export const RUINS_STONES: readonly Obstacle[] = [
  ...STONES_LEFT,
  ...STONES_LEFT.map(mirrorStone),
  ...CENTRE,
];
export const RUINS_WALLS: readonly RectObstacle[] = [...WALLS_LEFT, ...WALLS_LEFT.map(mirrorWall)];
export const RUINS_OBSTACLES: readonly Solid[] = [...RUINS_STONES, ...RUINS_WALLS];
