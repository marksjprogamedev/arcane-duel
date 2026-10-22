import type { Solid } from '../../shared/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { ARENA_HEIGHT, ARENA_WIDTH, pillars, styles } from '../../shared/constants';
import {
  DARK_CIRCLE,
  DEFAULT_MAP,
  DEV_BATTLEGROUND_OBSTACLES,
  MAP_IDS,
  MAPS,
  isMapId,
  mapFor,
  spawnsFor,
} from '../../shared/maps';
import { resetMatch } from '../../shared/sim/match';
import { inputEventFromWire } from '../../shared/sim/input';
import {
  clampToMap,
  hasLineOfSight,
  firstObstacleHit,
  TARGET_MARGIN,
  moveWithCollision,
} from '../../shared/sim/geometry';
import { solidAt } from '../../shared/sim/obstacles';
import { update } from '../../shared/sim/update';
import { game, resetDuel } from './helpers';

beforeEach(() => resetDuel());

describe('per-arena obstacles', () => {
  it('uses the four pillars unless the match says otherwise', () => {
    expect(game.map.obstacles).toBe(pillars);
    expect(mapFor('temple').obstacles).toBe(pillars);
  });

  it("takes the arena's obstacles from the match setup", () => {
    resetMatch(game, {
      mode: 'still',
      seed: 1,
      styles: [styles[0], styles[1]],
      dummyHP: 100,
      dummyMoving: false,
      map: mapFor('darkcircle'),
    });
    expect(game.map.obstacles).toContainEqual(DARK_CIRCLE.table);
    // and the next match starts back on the default arena
    resetDuel();
    expect(game.map).toBe(DEFAULT_MAP);
  });

  it("a wizard cannot walk through the middle table of the Dark Wizards' Circle", () => {
    const walkDown = (obstacles: readonly Solid[] = pillars) => {
      const w = { x: DARK_CIRCLE.table.x, y: 200 };
      for (let i = 0; i < 80; i++)
        moveWithCollision(w, 0, 3.5, { bounds: DEFAULT_MAP.bounds, obstacles });
      return w.y;
    };
    expect(walkDown(mapFor('darkcircle').obstacles)).toBeLessThan(
      DARK_CIRCLE.table.y - DARK_CIRCLE.table.r,
    );
    // with only the pillars it would walk straight through
    expect(walkDown()).toBeGreaterThan(DARK_CIRCLE.table.y);
  });

  it('projectiles and spells are blocked by the table and by the monuments', () => {
    const { obstacles } = mapFor('darkcircle');
    const { x } = DARK_CIRCLE.table;
    expect(firstObstacleHit(x, 200, x, 400, 0, obstacles)).not.toBeNull();
    expect(firstObstacleHit(x, 200, x, 400, 0, pillars)).toBeNull();
    expect(hasLineOfSight({ x: x - 100, y: 300 }, { x: x + 100, y: 300 }, 5, obstacles)).toBe(
      false,
    );
    for (const m of DARK_CIRCLE.monuments)
      expect(firstObstacleHit(m.x - 80, m.y, m.x + 80, m.y, 0, obstacles)).not.toBeNull();
  });

  it('a bolt stops at the table in the simulation', () => {
    game.map = mapFor('darkcircle');
    const { x } = DARK_CIRCLE.table;
    game.wizards[0].x = x - 100;
    game.wizards[0].y = 300;
    game.wizards[1].x = x + 100;
    game.wizards[1].y = 300;
    game.shots.push({
      id: 1,
      x: x - 70,
      y: 300,
      vx: 7.5,
      vy: 0,
      spell: 'EARTH',
      owner: game.wizards[0],
      r: 14,
      life: 110,
      damage: 25,
      trail: 0,
      travel: 0,
      maxTravel: 450,
      charged: false,
    });
    for (let i = 0; i < 60 && game.shots.length; i++) update(game, 1);
    expect(game.wizards[1].hp).toBe(200);
  });
});

describe('projectiles on a big map', () => {
  const bolt = (x: number, y: number) => ({
    id: 1,
    x,
    y,
    vx: 7.5,
    vy: 0,
    spell: 'EARTH' as const,
    owner: game.wizards[0],
    r: 14,
    life: 400,
    damage: 25,
    trail: 0,
    travel: 0,
    maxTravel: 5000,
    charged: false,
  });

  it('keep flying past the old 800 px edge on a battleground, and go out at its real edge', () => {
    game.map = { ...mapFor('devbattle'), obstacles: [] };
    game.wizards[0].x = game.wizards[0].y = game.wizards[1].x = game.wizards[1].y = 5000; // out of the way
    game.shots.push(bolt(1000, 900));
    for (let i = 0; i < 20; i++) update(game, 1);
    expect(game.shots).toHaveLength(1);
    expect(game.shots[0].x).toBeGreaterThan(1100);
    for (let i = 0; i < 200 && game.shots.length; i++) update(game, 1);
    expect(game.shots).toHaveLength(0); // it left the 2400 wide world
  });

  it('are still removed just past the edge of an arena', () => {
    game.wizards[0].x = game.wizards[0].y = game.wizards[1].x = game.wizards[1].y = 5000;
    game.shots.push(bolt(ARENA_WIDTH - 10, 300));
    for (let i = 0; i < 20; i++) update(game, 1);
    expect(game.shots).toHaveLength(0);
  });
});

describe('map definitions', () => {
  it('an arena is symmetric about its middle line: spawns, bounds, pillars and team slots', () => {
    const mirror = (x: number) => ARENA_WIDTH - x;
    const { bounds, teamSpawns } = DEFAULT_MAP;
    const spawns = spawnsFor(DEFAULT_MAP);
    expect(mirror(spawns[0].x)).toBe(spawns[1].x);
    expect(mirror(bounds.left)).toBe(bounds.right);
    expect(pillars.map((q) => mirror(q.x)).sort()).toEqual(pillars.map((q) => q.x).sort());
    expect(teamSpawns![0].map((s) => mirror(s.x))).toEqual(teamSpawns![1].map((s) => s.x));
    for (const s of [...teamSpawns![0], ...teamSpawns![1]]) {
      expect(s.x).toBeGreaterThan(bounds.left);
      expect(s.x).toBeLessThan(bounds.right);
    }
  });

  it('every map has a way to be found by id, and unknown ids fall back to the default arena', () => {
    for (const id of MAP_IDS) {
      expect(isMapId(id)).toBe(true);
      expect(mapFor(id)).toBe(MAPS[id]);
      expect(MAPS[id].id).toBe(id);
    }
    expect(isMapId('nowhere')).toBe(false);
    expect(mapFor('nowhere')).toBe(DEFAULT_MAP);
  });

  it('wizard bounds sit inside the world and both spawns are walkable', () => {
    for (const map of Object.values(MAPS)) {
      const { bounds } = map;
      const spawns = spawnsFor(map);
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(map.width);
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom).toBeLessThanOrEqual(map.height);
      for (const at of spawns) {
        expect(at.x).toBeGreaterThanOrEqual(bounds.left);
        expect(at.x).toBeLessThanOrEqual(bounds.right);
        expect(at.y).toBeGreaterThanOrEqual(bounds.top);
        expect(at.y).toBeLessThanOrEqual(bounds.bottom);
        expect(solidAt(map.obstacles, at.x, at.y, 18)).toBe(false);
      }
    }
  });

  it('a match starts the wizards on the map spawns', () => {
    expect(game.wizards[0]).toMatchObject(spawnsFor(DEFAULT_MAP)[0]);
    expect(game.wizards[1]).toMatchObject(spawnsFor(DEFAULT_MAP)[1]);
  });

  it('spell targets are kept inside the map, whatever its size', () => {
    const big = { ...DEFAULT_MAP, width: 2400, height: 1800 };
    expect(clampToMap(big, 5000, -5)).toEqual({ x: 2400 - TARGET_MARGIN, y: TARGET_MARGIN });
    expect(clampToMap(DEFAULT_MAP, 5000, 5000)).toEqual({
      x: ARENA_WIDTH - TARGET_MARGIN,
      y: ARENA_HEIGHT - TARGET_MARGIN,
    });
  });

  it('aim from the network is clamped to the match map, not a fixed size', () => {
    const big = { ...DEFAULT_MAP, width: 2400, height: 1800 };
    const down = { action: 'down', x: 2000, y: 1500 };
    expect(inputEventFromWire(down, big)).toEqual({ kind: 'pointerdown', x: 2000, y: 1500 });
    expect(inputEventFromWire(down, DEFAULT_MAP)).toEqual({
      kind: 'pointerdown',
      x: ARENA_WIDTH,
      y: ARENA_HEIGHT,
    });
  });

  it('a wizard can walk across the development battleground, stopping at its edge', () => {
    const map = mapFor('devbattle');
    expect(map.width).toBeGreaterThan(800);
    const w = { x: spawnsFor(map)[0].x, y: spawnsFor(map)[0].y } as never;
    for (let i = 0; i < 2000; i++) moveWithCollision(w, 5, 0, { ...map, obstacles: [] });
    expect((w as { x: number }).x).toBeLessThanOrEqual(map.bounds.right);
    expect((w as { x: number }).x).toBeGreaterThan(800); // got past the old arena width
  });

  it('no obstacle on the development battleground covers a spawn, and all are inside the world', () => {
    const map = mapFor('devbattle');
    for (const o of DEV_BATTLEGROUND_OBSTACLES) {
      expect(o.x - o.r).toBeGreaterThan(0);
      expect(o.x + o.r).toBeLessThan(map.width);
      expect(o.y - o.r).toBeGreaterThan(0);
      expect(o.y + o.r).toBeLessThan(map.height);
      for (const at of [spawnsFor(map)[0], spawnsFor(map)[1]])
        expect(Math.hypot(at.x - o.x, at.y - o.y)).toBeGreaterThan(o.r + 40);
    }
  });

  it('spawns are far apart: a battleground starts the wizards over half the map apart', () => {
    for (const map of Object.values(MAPS)) {
      const apart = Math.hypot(
        spawnsFor(map)[0].x - spawnsFor(map)[1].x,
        spawnsFor(map)[0].y - spawnsFor(map)[1].y,
      );
      expect(apart).toBeGreaterThan(400);
      if (map.kind === 'battleground') expect(apart).toBeGreaterThan(map.width / 2);
    }
  });

  it('the wizards start facing each other, on any map', () => {
    for (const map of Object.values(MAPS)) {
      resetMatch(game, {
        mode: 'duel',
        seed: 1,
        styles: [styles[0], styles[1]],
        dummyHP: 100,
        dummyMoving: false,
        map,
      });
      expect(game.input[0].mouse).toEqual(spawnsFor(map)[1]);
      expect(game.input[1].mouse).toEqual(spawnsFor(map)[0]);
    }
  });

  it('a defeated dummy comes back at the map spawn, not a fixed spot', () => {
    const map = mapFor('devbattle');
    resetMatch(game, {
      mode: 'mortal',
      seed: 1,
      styles: [styles[0], styles[1]],
      dummyHP: 100,
      dummyMoving: false,
      map,
    });
    game.respawn = 1;
    game.wizards[1].hp = 0;
    update(game, 1);
    expect(game.wizards[1]).toMatchObject(spawnsFor(map)[1]);
  });

  it('spawn sides swap every other round on a battleground, and never on an arena', () => {
    const ruins = mapFor('ruins');
    const [first, second] = spawnsFor(ruins);
    expect(spawnsFor(ruins, 1)).toEqual([first, second]);
    expect(spawnsFor(ruins, 2)).toEqual([second, first]);
    expect(spawnsFor(ruins, 3)).toEqual([first, second]);
    expect(spawnsFor(ruins)).toEqual([first, second]); // solo: no round
    for (const id of MAP_IDS.filter((m) => mapFor(m).kind === 'arena'))
      expect(spawnsFor(mapFor(id), 2)).toEqual(spawnsFor(mapFor(id)));
  });

  it('a match starts the wizards on the sides the round gives', () => {
    const map = mapFor('ruins');
    const setup = {
      mode: 'online' as const,
      seed: 1,
      styles: [styles[0], styles[1]] as [never, never],
      dummyHP: 100,
      dummyMoving: false,
      map,
    };
    resetMatch(game, { ...setup, round: 1 });
    expect(game.wizards[0]).toMatchObject(spawnsFor(map)[0]);
    resetMatch(game, { ...setup, round: 2 });
    expect(game.wizards[0]).toMatchObject(spawnsFor(map)[1]);
    expect(game.wizards[1]).toMatchObject(spawnsFor(map)[0]);
    expect(game.input[0].mouse).toEqual(spawnsFor(map)[0]); // still facing the rival
  });
});
