// The maps. A map says how big the world is, where a wizard may stand, where each wizard starts and
// what is solid. The simulation reads it from the match state (`game.map`), so the server and the
// client agree on it; the pictures (client/src/render) draw from the same lists.
import { pillars } from './constants';
import type { Obstacle, Vec2 } from './types';

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
  /** What is solid (wizards walk around it, projectiles stop at it). */
  obstacles: readonly Obstacle[];
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

const DARK_CIRCLE_OBSTACLES: readonly Obstacle[] = [DARK_CIRCLE.table, ...DARK_CIRCLE.monuments];

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
] as const;
export type MapId = (typeof MAP_IDS)[number];

/** Every arena is the same size with the same spawns; maps that are only painted differently share the pillars. */
function arena(id: MapId, obstacles: readonly Obstacle[] = pillars): MapDef {
  return {
    id,
    kind: 'arena',
    width: 800,
    height: 600,
    bounds: { left: 82, right: 718, top: 175, bottom: 490 },
    spawns: { p: { x: 155, y: 300 }, e: { x: 645, y: 300 } },
    obstacles,
  };
}

export const MAPS = Object.fromEntries(
  MAP_IDS.map((id) => [id, arena(id, id === 'darkcircle' ? DARK_CIRCLE_OBSTACLES : pillars)]),
) as Record<MapId, MapDef>;

export const DEFAULT_MAP = MAPS.enchanted;

export const isMapId = (id: unknown): id is MapId => MAP_IDS.includes(id as MapId);

/** The map with this id; the default arena for anything unknown. */
export const mapFor = (id: string): MapDef => (isMapId(id) ? MAPS[id] : DEFAULT_MAP);
