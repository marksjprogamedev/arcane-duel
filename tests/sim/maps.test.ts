import type { Solid } from '../../shared/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { pillars, styles } from '../../shared/constants';
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
import { clampToMap, clear, ray, TARGET_MARGIN, walk } from '../../shared/sim/geometry';
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
      const w = { x: 400, y: 200 };
      for (let i = 0; i < 80; i++) walk(w, 0, 3.5, { bounds: DEFAULT_MAP.bounds, obstacles });
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
    expect(ray(400, 200, 400, 400, 0, obstacles)).not.toBeNull();
    expect(ray(400, 200, 400, 400)).toBeNull();
    expect(clear({ x: 300, y: 300 }, { x: 500, y: 300 }, 5, obstacles)).toBe(false);
    for (const m of DARK_CIRCLE.monuments)
      expect(ray(m.x - 80, m.y, m.x + 80, m.y, 0, obstacles)).not.toBeNull();
  });

  it('a bolt stops at the table in the simulation', () => {
    game.map = mapFor('darkcircle');
    game.p.x = 300;
    game.p.y = 300;
    game.e.x = 500;
    game.e.y = 300;
    game.shots.push({
      id: 1,
      x: 330,
      y: 300,
      vx: 7.5,
      vy: 0,
      k: 'EARTH',
      owner: game.p,
      r: 14,
      life: 110,
      damage: 25,
      trail: 0,
      travel: 0,
      maxTravel: 450,
      charged: false,
    });
    for (let i = 0; i < 60 && game.shots.length; i++) update(game, 1);
    expect(game.e.hp).toBe(200);
  });
});

describe('projectiles on a big map', () => {
  const bolt = (x: number, y: number) => ({
    id: 1,
    x,
    y,
    vx: 7.5,
    vy: 0,
    k: 'EARTH' as const,
    owner: game.p,
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
    game.p.x = game.p.y = game.e.x = game.e.y = 5000; // out of the way
    game.shots.push(bolt(1000, 900));
    for (let i = 0; i < 20; i++) update(game, 1);
    expect(game.shots).toHaveLength(1);
    expect(game.shots[0].x).toBeGreaterThan(1100);
    for (let i = 0; i < 200 && game.shots.length; i++) update(game, 1);
    expect(game.shots).toHaveLength(0); // it left the 2400 wide world
  });

  it('are still removed just past the edge of an arena', () => {
    game.p.x = game.p.y = game.e.x = game.e.y = 5000;
    game.shots.push(bolt(790, 300));
    for (let i = 0; i < 20; i++) update(game, 1);
    expect(game.shots).toHaveLength(0);
  });
});

describe('map definitions', () => {
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
      const { bounds, spawns } = map;
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(map.width);
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom).toBeLessThanOrEqual(map.height);
      for (const at of [spawns.p, spawns.e]) {
        expect(at.x).toBeGreaterThanOrEqual(bounds.left);
        expect(at.x).toBeLessThanOrEqual(bounds.right);
        expect(at.y).toBeGreaterThanOrEqual(bounds.top);
        expect(at.y).toBeLessThanOrEqual(bounds.bottom);
        expect(solidAt(map.obstacles, at.x, at.y, 18)).toBe(false);
      }
    }
  });

  it('a match starts the wizards on the map spawns', () => {
    expect(game.p).toMatchObject(DEFAULT_MAP.spawns.p);
    expect(game.e).toMatchObject(DEFAULT_MAP.spawns.e);
  });

  it('spell targets are kept inside the map, whatever its size', () => {
    const big = { ...DEFAULT_MAP, width: 2400, height: 1800 };
    expect(clampToMap(big, 5000, -5)).toEqual({ x: 2400 - TARGET_MARGIN, y: TARGET_MARGIN });
    expect(clampToMap(DEFAULT_MAP, 5000, 5000)).toEqual({ x: 770, y: 570 });
  });

  it('aim from the network is clamped to the match map, not a fixed size', () => {
    const big = { ...DEFAULT_MAP, width: 2400, height: 1800 };
    const down = { action: 'down', x: 2000, y: 1500 };
    expect(inputEventFromWire(down, big)).toEqual({ kind: 'pointerdown', x: 2000, y: 1500 });
    expect(inputEventFromWire(down, DEFAULT_MAP)).toEqual({ kind: 'pointerdown', x: 800, y: 600 });
  });

  it('a wizard can walk across the development battleground, stopping at its edge', () => {
    const map = mapFor('devbattle');
    expect(map.width).toBeGreaterThan(800);
    const w = { x: map.spawns.p.x, y: map.spawns.p.y } as never;
    for (let i = 0; i < 2000; i++) walk(w, 5, 0, { ...map, obstacles: [] });
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
      for (const at of [map.spawns.p, map.spawns.e])
        expect(Math.hypot(at.x - o.x, at.y - o.y)).toBeGreaterThan(o.r + 40);
    }
  });

  it('spawns are far apart: a battleground starts the wizards over half the map apart', () => {
    for (const map of Object.values(MAPS)) {
      const apart = Math.hypot(map.spawns.p.x - map.spawns.e.x, map.spawns.p.y - map.spawns.e.y);
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
      expect(game.input[0].mouse).toEqual(map.spawns.e);
      expect(game.input[1].mouse).toEqual(map.spawns.p);
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
    game.e.hp = 0;
    update(game, 1);
    expect(game.e).toMatchObject(map.spawns.e);
  });

  it('spawn sides swap every other round on a battleground, and never on an arena', () => {
    const ruins = mapFor('ruins');
    expect(spawnsFor(ruins, 1)).toBe(ruins.spawns);
    expect(spawnsFor(ruins, 2)).toEqual({ p: ruins.spawns.e, e: ruins.spawns.p });
    expect(spawnsFor(ruins, 3)).toBe(ruins.spawns);
    expect(spawnsFor(ruins)).toBe(ruins.spawns); // solo: no round
    for (const id of MAP_IDS.filter((m) => mapFor(m).kind === 'arena'))
      expect(spawnsFor(mapFor(id), 2)).toBe(mapFor(id).spawns);
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
    expect(game.p).toMatchObject(map.spawns.p);
    resetMatch(game, { ...setup, round: 2 });
    expect(game.p).toMatchObject(map.spawns.e);
    expect(game.e).toMatchObject(map.spawns.p);
    expect(game.input[0].mouse).toEqual(map.spawns.p); // still facing the rival
  });
});
