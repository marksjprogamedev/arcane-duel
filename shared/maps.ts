// The maps: size, where wizards may stand and start, vision, and what is solid. The sim reads the
// match's map from `game.map`; the pictures (client/src/render) draw from the same data.
import { pillars } from './constants';
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
  /** Where a duel starts: the creator (`p`) and the joiner (`e`). */
  spawns: { p: Vec2; e: Vec2 };
  /**
   * Where bigger teams start: team 0's members, then team 1's, each list as long as the biggest team
   * the map takes. The first of each is the duel spawn. Maps without it are for duels only.
   */
  teamSpawns?: readonly [readonly Vec2[], readonly Vec2[]];
  /** How far a wizard sees (fog of war); null = everything (arenas). */
  vision: number | null;
  /** What is solid (wizards walk around it, projectiles stop at it). */
  obstacles: readonly Solid[];
}

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

const DARK_CIRCLE_OBSTACLES: readonly Solid[] = [DARK_CIRCLE.table, ...DARK_CIRCLE.monuments];

/** How far a wizard sees on a battleground: about the screen's width, so the fog closes in on the edges. */
export const BATTLEGROUND_VISION = 440;

/** Start slots of the left team on a battleground (team 0): the leader in front, the rest around. */
const LEFT_SLOTS: readonly Vec2[] = [
  { x: 220, y: 900 },
  { x: 220, y: 760 },
  { x: 220, y: 1040 },
  { x: 340, y: 900 },
];

/** The same slots mirrored for the right team, on a map of this width. */
const mirrored = (slots: readonly Vec2[], width: number): Vec2[] =>
  slots.map((s) => ({ x: width - s.x, y: s.y }));

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

/** Start slots of the left team in an arena, which has room for two a side. */
const ARENA_SLOTS: readonly Vec2[] = [
  { x: 155, y: 300 },
  { x: 155, y: 390 },
];

/** Every arena is the same size with the same spawns; maps that are only painted differently share the pillars. */
function arena(id: MapId, obstacles: readonly Solid[] = pillars): MapDef {
  return {
    id,
    kind: 'arena',
    width: 800,
    height: 600,
    bounds: { left: 82, right: 718, top: 175, bottom: 490 },
    spawns: { p: { x: 155, y: 300 }, e: { x: 645, y: 300 } },
    teamSpawns: [ARENA_SLOTS, mirrored(ARENA_SLOTS, 800)],
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
  spawns: { p: { x: 220, y: 900 }, e: { x: 2180, y: 900 } },
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
  spawns: { p: { x: 220, y: 900 }, e: { x: RUINS_WIDTH - 220, y: 900 } },
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
export function spawnsFor(map: MapDef, round?: number): MapDef['spawns'] {
  const { p, e } = map.spawns;
  return map.kind === 'battleground' && round !== undefined && round % 2 === 0
    ? { p: e, e: p }
    : map.spawns;
}

/** The biggest team a map takes: 1 (a duel) unless it has team spawns. Arenas take two a side. */
export const maxTeamSize = (map: MapDef) => map.teamSpawns?.[0].length ?? 1;

/**
 * Where each seat starts in this round: team 0's members (seats 0..T-1), then team 1's. As in a
 * duel, battlegrounds swap the two teams every other round.
 */
export function startPositions(map: MapDef, teamSize: number, round?: number): Vec2[] {
  if (teamSize === 1 || !map.teamSpawns) {
    const { p, e } = spawnsFor(map, round);
    return [p, e];
  }
  const [a, b] = map.teamSpawns.map((slots) => slots.slice(0, teamSize));
  return map.kind === 'battleground' && round !== undefined && round % 2 === 0
    ? [...b, ...a]
    : [...a, ...b];
}

/** The map with this id; the default arena for anything unknown. */
export const mapFor = (id: string): MapDef => (isMapId(id) ? MAPS[id] : DEFAULT_MAP);
