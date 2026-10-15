import { describe, expect, it } from 'vitest';
import { cameraOrigin, isVisible } from '../../client/src/render/cameraMath';
import { MAPS } from '../../shared/maps';

describe('cameraOrigin', () => {
  it('stays at 0,0 on every arena, wherever the wizard is', () => {
    for (const map of Object.values(MAPS).filter((m) => m.kind === 'arena'))
      for (const focus of [
        { x: 0, y: 0 },
        { x: 400, y: 300 },
        { x: 800, y: 600 },
      ])
        expect(cameraOrigin(map, focus)).toEqual({ x: 0, y: 0 });
  });

  it('moves on the development battleground, which is bigger than the viewport', () => {
    const { devbattle } = MAPS;
    expect(devbattle.kind).toBe('battleground');
    expect(cameraOrigin(devbattle, devbattle.spawns.p).x).toBe(0);
    expect(cameraOrigin(devbattle, devbattle.spawns.e).x).toBe(devbattle.width - 800);
  });

  const big = { width: 2400, height: 1800 };
  it('centres on the wizard in the middle of a big map', () => {
    expect(cameraOrigin(big, { x: 1200, y: 900 })).toEqual({ x: 800, y: 600 });
  });
  it('stops at the map edges', () => {
    expect(cameraOrigin(big, { x: 10, y: 10 })).toEqual({ x: 0, y: 0 });
    expect(cameraOrigin(big, { x: 2390, y: 1790 })).toEqual({ x: 1600, y: 1200 });
  });

  it('isVisible keeps things inside the viewport or within their margin of it', () => {
    const cam = { x: 1000, y: 500 };
    expect(isVisible(cam, 1400, 800, 0)).toBe(true);
    expect(isVisible(cam, 900, 800, 0)).toBe(false);
    expect(isVisible(cam, 900, 800, 120)).toBe(true); // a big effect just off the left edge
    expect(isVisible(cam, 1400, 1200, 50)).toBe(false);
  });
});
