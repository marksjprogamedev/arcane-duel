import { describe, expect, it } from 'vitest';
import { MAPS } from '../../shared/maps';
import { VIEW_H } from '../../client/src/render/cameraMath';
import {
  ACTION_BAR_SPACE,
  MINIMAP_SIZE,
  minimapSize,
  toMinimap,
} from '../../client/src/render/hud/minimapMath';

describe('minimap maths', () => {
  it('fits the longest side to the minimap size and keeps the proportions', () => {
    for (const map of [MAPS.ruins, MAPS.devbattle]) {
      const { w, h } = minimapSize(map);
      expect(Math.max(w, h)).toBe(MINIMAP_SIZE);
      expect(w / h).toBeCloseTo(map.width / map.height, 1);
    }
  });

  it('puts the map corners on the minimap corners and the middle in the middle', () => {
    const map = MAPS.ruins;
    const { scale } = minimapSize(map);
    expect(toMinimap(map, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(toMinimap(map, map.width, map.height).x).toBeCloseTo(map.width * scale);
    expect(toMinimap(map, map.width, map.height).y).toBeCloseTo(map.height * scale);
    expect(toMinimap(map, map.width / 2, map.height / 2).x).toBeCloseTo((map.width * scale) / 2);
  });

  it('leaves room for the minimap above the action bar', () => {
    expect(ACTION_BAR_SPACE + MINIMAP_SIZE).toBeLessThan(VIEW_H);
  });
});
