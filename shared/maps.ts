// The maps: size, where wizards may stand and start, vision, and what is solid. The sim reads the
// match's map from `game.map`; the pictures (client/src/render) draw from the same data.
import { ARENA_HEIGHT, ARENA_WIDTH, pillars } from './constants';
import { RUINS_HEIGHT, RUINS_OBSTACLES, RUINS_WIDTH } from './ruinsMap';
import type { Obstacle, Solid, Vec2 } from './types';

export interface MapDef {
  id: MapId;
  /** Arenas fit on one screen; battlegrounds are bigger and the camera follows your wizard. */
  kind: 'arena' | 'battleground';
  /** World size in game units. */
  width: number;
  height: number;
  /** Where a wizard's centre may stand. The upper margin leaves room for the health and status bars. */
  bounds: { left: number; right: number; top: number; bottom: number };
  /**
   * Where each team starts: team 0's members, then team 1's, each list as long as the biggest team
   * the map takes. The first of each is the duel spawn (seat 0 and seat 1); `spawnsFor` returns just those.
   */
  teamSpawns: readonly [readonly Vec2[], readonly Vec2[]];
  /** How far a wizard sees (fog of war); null = everything (arenas). */
  vision: number | null;
  /** What is solid (wizards walk around it, projectiles stop at it). */
  obstacles: readonly Solid[];
}

/** The Dark Wizards' Circle: the four pillar stones, the table in the middle, and a monument on each side. */
export const DARK_CIRCLE = {
  // y 300 is the middle of a 600 tall arena (ARENA_HEIGHT).
  table: { x: ARENA_WIDTH / 2, y: 300, r: 40 },
  /** Stone monuments, as (x, y, r) of the circle that blocks; the picture stands 20 px lower. */
  monuments: [
    ...pillars,
    { x: ARENA_WIDTH / 2, y: 114, r: 26 },
    { x: ARENA_WIDTH / 2, y: 532, r: 26 },
    { x: 120, y: 292, r: 26 },
    { x: ARENA_WIDTH - 120, y: 288, r: 26 },
  ],
} as const;

const DARK_CIRCLE_OBSTACLES: readonly Solid[] = [DARK_CIRCLE.table, ...DARK_CIRCLE.monuments];

/** How far a wizard sees on a battleground: a little over half the screen's width, so the fog only closes in on the far edges (it was 440, until 0.27.1-0). */
export const BATTLEGROUND_VISION = 585;

/** Start slots of the left team on a battleground (team 0): the leader in front, the rest around. */
const LEFT_SLOTS: readonly Vec2[] = [
  { x: 220, y: 900 },
  { x: 220, y: 760 },
  { x: 220, y: 1040 },
  { x: 340, y: 900 },
];

/** The same slots mirrored for the right team, on a map of this width. */
const mirrored = (slots: readonly Vec2[], width: number): Vec2[] =>
  slots.map((slot) => ({ x: width - slot.x, y: slot.y }));

/** The ids the map picker uses. */
export const MAP_IDS = [
  'enchanted',
  'temple',
  'volcano',
  'frozen',
  'colosseum',
  'astral',
  'graveyard',
  'grove',
  'tower',
  'darkcircle',
  'devbattle',
  'ruins',
] as const;
export type MapId = (typeof MAP_IDS)[number];

/** Start slots of the left team in an arena: the leader, one below, one above, and one in the corner. */
const ARENA_SLOTS: readonly Vec2[] = [
  { x: 207, y: 300 },
  { x: 207, y: 390 },
  { x: 207, y: 210 },
  { x: 133, y: 440 },
];

/** Every arena is the same size (the 16:9 view) with the same spawns; maps that are only painted differently share the pillars. */
function arena(id: MapId, obstacles: readonly Solid[] = pillars): MapDef {
  return {
    id,
    kind: 'arena',
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    // the floor is an ellipse from y 81 to 529; the top keeps the same 39 px margin as the bottom
    bounds: { left: 109, right: ARENA_WIDTH - 109, top: 120, bottom: 490 },
    teamSpawns: [ARENA_SLOTS, mirrored(ARENA_SLOTS, ARENA_WIDTH)],
    vision: null,
    obstacles,
  };
}

/** Development battleground: three times the arena's size, scattered with stones for cover. */
export const DEV_BATTLEGROUND_OBSTACLES: readonly Obstacle[] = (() => {
  // a fixed pseudo-random scatter (a small linear congruential generator), the same everywhere
  let seed = 20261014;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  return Array.from({ length: 40 }, () => ({
    x: Math.round(250 + next() * 1900),
    y: Math.round(250 + next() * 1300),
    r: 28 + Math.floor(next() * 4) * 8,
  }));
})();

const devBattleground: MapDef = {
  id: 'devbattle',
  kind: 'battleground',
  width: 2400,
  height: 1800,
  bounds: { left: 60, right: 2340, top: 130, bottom: 1740 },
  teamSpawns: [LEFT_SLOTS, mirrored(LEFT_SLOTS, 2400)],
  vision: BATTLEGROUND_VISION,
  obstacles: DEV_BATTLEGROUND_OBSTACLES,
};

/** The Ruined Keep: a ruined stronghold with a walled keep in the middle (shared/ruinsMap.ts). */
const ruins: MapDef = {
  id: 'ruins',
  kind: 'battleground',
  width: RUINS_WIDTH,
  height: RUINS_HEIGHT,
  bounds: { left: 60, right: RUINS_WIDTH - 60, top: 130, bottom: RUINS_HEIGHT - 60 },
  teamSpawns: [LEFT_SLOTS, mirrored(LEFT_SLOTS, RUINS_WIDTH)],
  vision: BATTLEGROUND_VISION,
  obstacles: RUINS_OBSTACLES,
};

const BATTLEGROUNDS: Partial<Record<MapId, MapDef>> = { devbattle: devBattleground, ruins };

export const MAPS = Object.fromEntries(
  MAP_IDS.map((id) => [
    id,
    BATTLEGROUNDS[id] ?? arena(id, id === 'darkcircle' ? DARK_CIRCLE_OBSTACLES : pillars),
  ]),
) as Record<MapId, MapDef>;

export const DEFAULT_MAP = MAPS.enchanted;

export const isMapId = (id: unknown): id is MapId => MAP_IDS.includes(id as MapId);

/** Where each wizard starts in this online round: battlegrounds swap sides every other round, arenas never. */
export function spawnsFor(map: MapDef, round?: number): [Vec2, Vec2] {
  const [first, second] = [map.teamSpawns[0][0], map.teamSpawns[1][0]];
  return map.kind === 'battleground' && round !== undefined && round % 2 === 0
    ? [second, first]
    : [first, second];
}

/** The biggest team a map takes: as many as it has start slots for. */
export const maxTeamSize = (map: MapDef) => map.teamSpawns[0].length;

/**
 * Where each seat starts in this round: team 0's members (seats 0..T-1), then team 1's. As in a
 * duel, battlegrounds swap the two teams every other round.
 */
export function startPositions(map: MapDef, teamSize: number, round?: number): Vec2[] {
  if (teamSize === 1) return spawnsFor(map, round);
  const [team0Spawns, team1Spawns] = map.teamSpawns.map((slots) => slots.slice(0, teamSize));
  return map.kind === 'battleground' && round !== undefined && round % 2 === 0
    ? [...team1Spawns, ...team0Spawns]
    : [...team0Spawns, ...team1Spawns];
}

/** The map with this id; the default arena for anything unknown. */
export const mapFor = (id: string): MapDef => (isMapId(id) ? MAPS[id] : DEFAULT_MAP);
