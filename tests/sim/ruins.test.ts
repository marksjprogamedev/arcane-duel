import { describe, expect, it } from 'vitest';
import { MAPS } from '../../shared/maps';
import { solidAt } from '../../shared/sim/obstacles';
import { RUINS_OBSTACLES, RUINS_STONES, RUINS_WALLS } from '../../shared/ruinsMap';

const map = MAPS.ruins;

describe('the Ruined Keep', () => {
  it('is a battleground the size of the development one, with the camera following', () => {
    expect(map.kind).toBe('battleground');
    expect(map.width).toBe(2400);
    expect(map.height).toBe(1800);
    expect(map.obstacles).toBe(RUINS_OBSTACLES);
  });

  it('has both circles and rectangles, all inside the world', () => {
    expect(RUINS_STONES.length).toBeGreaterThan(5);
    expect(RUINS_WALLS.length).toBeGreaterThan(5);
    for (const o of RUINS_STONES) {
      expect(o.x - o.r).toBeGreaterThan(0);
      expect(o.x + o.r).toBeLessThan(map.width);
      expect(o.y - o.r).toBeGreaterThan(0);
      expect(o.y + o.r).toBeLessThan(map.height);
    }
    for (const o of RUINS_WALLS) {
      expect(o.x - o.hw).toBeGreaterThan(0);
      expect(o.x + o.hw).toBeLessThan(map.width);
      expect(o.y - o.hh).toBeGreaterThan(0);
      expect(o.y + o.hh).toBeLessThan(map.height);
    }
  });

  it('is fair: every obstacle has a mirror image across the middle', () => {
    const key = (o: object) => JSON.stringify(Object.entries(o).sort());
    const all = new Set(RUINS_OBSTACLES.map(key));
    for (const o of RUINS_OBSTACLES) expect(all.has(key({ ...o, x: map.width - o.x }))).toBe(true);
    expect(map.spawns.p.y).toBe(map.spawns.e.y);
    expect(map.spawns.p.x).toBe(map.width - map.spawns.e.x);
  });

  it('keeps the spawns clear, with room to move', () => {
    for (const at of [map.spawns.p, map.spawns.e])
      expect(solidAt(map.obstacles, at.x, at.y, 80)).toBe(false);
  });

  it('can be crossed on foot: a wizard can walk from one spawn to the other', () => {
    const cell = 20;
    const cols = Math.ceil(map.width / cell);
    const open = (cx: number, cy: number) => {
      const x = cx * cell;
      const y = cy * cell;
      const { left, right, top, bottom } = map.bounds;
      return (
        x >= left && x <= right && y >= top && y <= bottom && !solidAt(map.obstacles, x, y, 18)
      );
    };
    const start = [Math.round(map.spawns.p.x / cell), Math.round(map.spawns.p.y / cell)];
    const goal = [Math.round(map.spawns.e.x / cell), Math.round(map.spawns.e.y / cell)];
    const seen = new Set<number>([start[1] * cols + start[0]]);
    const queue = [start];
    while (queue.length) {
      const [cx, cy] = queue.pop()!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const [nx, ny] = [cx + dx, cy + dy];
        const k = ny * cols + nx;
        if (!seen.has(k) && open(nx, ny)) {
          seen.add(k);
          queue.push([nx, ny]);
        }
      }
    }
    expect(seen.has(goal[1] * cols + goal[0])).toBe(true);
  });

  it('has the middle of the keep reachable, through its gaps', () => {
    // the centre stone stands in the courtyard; a point beside it is open and inside the keep walls
    expect(solidAt(map.obstacles, 1200, 900, 18)).toBe(true);
    expect(solidAt(map.obstacles, 1200, 830, 18)).toBe(false);
    // the gap in the north wall is wide enough to walk through
    expect(solidAt(map.obstacles, 1200, 680, 18)).toBe(false);
  });

  it('can be crossed from every team start slot to every other (so a 2v2 is playable)', () => {
    const cell = 20;
    const cols = Math.ceil(map.width / cell);
    const { left, right, top, bottom } = map.bounds;
    const open = (cx: number, cy: number) => {
      const [x, y] = [cx * cell, cy * cell];
      return (
        x >= left && x <= right && y >= top && y <= bottom && !solidAt(map.obstacles, x, y, 18)
      );
    };
    const slots = map.teamSpawns!.flat();
    const key = (at: { x: number; y: number }) =>
      Math.round(at.y / cell) * cols + Math.round(at.x / cell);
    const seen = new Set<number>([key(slots[0])]);
    const queue = [[Math.round(slots[0].x / cell), Math.round(slots[0].y / cell)]];
    while (queue.length) {
      const [cx, cy] = queue.pop()!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const [nx, ny] = [cx + dx, cy + dy];
        if (!seen.has(ny * cols + nx) && open(nx, ny)) {
          seen.add(ny * cols + nx);
          queue.push([nx, ny]);
        }
      }
    }
    // everything reachable from one slot, so all slots are connected to each other
    for (const slot of slots) expect(seen.has(key(slot))).toBe(true);
  });
});
