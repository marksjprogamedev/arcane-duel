import { describe, expect, it } from 'vitest';
import {
  backingScale,
  cameraOrigin,
  isVisible,
  MAX_BACKING_WIDTH,
  VIEW_H,
  VIEW_W,
} from '../../client/src/render/cameraMath';
import { MAPS } from '../../shared/maps';

describe('cameraOrigin', () => {
  it('shows a whole arena: the view is exactly as big as it', () => {
    for (const map of Object.values(MAPS).filter((m) => m.kind === 'arena'))
      expect([map.width, map.height]).toEqual([VIEW_W, VIEW_H]);
  });

  it('stays at 0,0 on every arena, wherever the wizard is', () => {
    for (const map of Object.values(MAPS).filter((m) => m.kind === 'arena'))
      for (const focus of [
        { x: 0, y: 0 },
        { x: VIEW_W / 2, y: VIEW_H / 2 },
        { x: VIEW_W, y: VIEW_H },
      ])
        expect(cameraOrigin(map, focus)).toEqual({ x: 0, y: 0 });
  });

  it('moves on the development battleground, which is bigger than the viewport', () => {
    const { devbattle } = MAPS;
    expect(devbattle.kind).toBe('battleground');
    expect(cameraOrigin(devbattle, devbattle.spawns.p).x).toBe(0);
    expect(cameraOrigin(devbattle, devbattle.spawns.e).x).toBe(devbattle.width - VIEW_W);
  });

  const big = { width: 2400, height: 1800 };
  it('centres on the wizard in the middle of a big map', () => {
    expect(cameraOrigin(big, { x: 1200, y: 900 })).toEqual({
      x: 1200 - VIEW_W / 2,
      y: 900 - VIEW_H / 2,
    });
  });
  it('stops at the map edges', () => {
    expect(cameraOrigin(big, { x: 10, y: 10 })).toEqual({ x: 0, y: 0 });
    expect(cameraOrigin(big, { x: 2390, y: 1790 })).toEqual({
      x: big.width - VIEW_W,
      y: big.height - VIEW_H,
    });
  });

  it('isVisible keeps things inside the viewport or within their margin of it', () => {
    const cam = { x: 1000, y: 500 };
    expect(isVisible(cam, 1400, 800, 0)).toBe(true);
    expect(isVisible(cam, 900, 800, 0)).toBe(false);
    expect(isVisible(cam, 900, 800, 120)).toBe(true); // a big effect just off the left edge
    expect(isVisible(cam, 1400, 1200, 50)).toBe(false);
  });
});

describe('backingScale', () => {
  it('gives one backing pixel per real pixel of the canvas on screen', () => {
    expect(backingScale(VIEW_W, 1)).toBe(1);
    expect(backingScale(1600, 1)).toBeCloseTo(1600 / VIEW_W);
    expect(backingScale(1000, 2)).toBeCloseTo(2000 / VIEW_W);
  });
  it('stops at the widest backing store', () => {
    expect(backingScale(3840, 1) * VIEW_W).toBe(MAX_BACKING_WIDTH);
    expect(backingScale(1920, 2) * VIEW_W).toBe(MAX_BACKING_WIDTH);
  });
});
