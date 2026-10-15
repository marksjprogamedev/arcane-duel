// The maps. A map says how big the world is, where a wizard may stand, where each wizard starts and
// what is solid. The simulation reads it from the match state (`game.map`), so the server and the
// client agree on it; the pictures (client/src/render) draw from the same lists.
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
  spawns: { p: Vec2; e: Vec2 };
  /**
   * How far a wizard sees, in game units; null means everything (arenas). Beyond it the other
   * wizard, shots and effects are hidden (fog of war, 0.4.1 and 0.4.2).
   */
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

/**
 * How far a wizard sees on a battleground. The screen shows 800x600 around you, so this is a little
 * past the top and bottom of the screen and just beyond its sides: the fog closes in on the edges
 * and corners. Spells reach further than this, so you can be shot from out of sight.
 */
export const BATTLEGROUND_VISION = 440;

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

/** Every arena is the same size with the same spawns; maps that are only painted differently share the pillars. */
function arena(id: MapId, obstacles: readonly Solid[] = pillars): MapDef {
  return {
    id,
    kind: 'arena',
    width: 800,
    height: 600,
    bounds: { left: 82, right: 718, top: 175, bottom: 490 },
    spawns: { p: { x: 155, y: 300 }, e: { x: 645, y: 300 } },
    vision: null,
    obstacles,
  };
}

/**
 * A development battleground for building the camera and, later, fog of war. It is three times the
 * arena's size in each direction and scattered with stones so there is cover; the real
 * battlegrounds (0.3.2) replace it as the first one players see.
 */
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

/** The map with this id; the default arena for anything unknown. */
export const mapFor = (id: string): MapDef => (isMapId(id) ? MAPS[id] : DEFAULT_MAP);
