import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '../../client/src/workshop/look';
import { OUTFIT_ICON, outfitLayers } from '../../client/src/workshop/outfitLayers';
import type { TintedAssets } from '../../client/src/workshop/partSprite';
import { AVAILABLE, SKIN_HEAD_FIRST } from '../../client/src/workshop/parts';

const loaded: TintedAssets = {
  head: () => 'data:head',
  robe: () => 'data:robe',
  hat: () => undefined,
  leftHand: () => null,
};
const notLoaded: TintedAssets = {
  head: () => undefined,
  robe: () => undefined,
  hat: () => undefined,
  leftHand: () => null,
};
const palette = {
  ...DEFAULT_LOOK,
  head: SKIN_HEAD_FIRST,
  body: AVAILABLE.body.find((b) => b > 11 && b < 16)!,
};

describe('outfitLayers', () => {
  it('draws robe, head and hat back to front, every layer inside the box', () => {
    const layers = outfitLayers(palette, loaded);
    expect(layers.map((l) => l.part)).toEqual(['body', 'head', 'hat']);
    for (const l of layers) {
      expect(l.width).toBeGreaterThan(0);
      expect(l.left).toBeGreaterThanOrEqual(0);
      expect(l.left + l.width).toBeLessThanOrEqual(OUTFIT_ICON.w);
      expect(l.top + l.height).toBeLessThanOrEqual(OUTFIT_ICON.h + 1);
    }
  });

  it('puts the head above the robe and the hat above the head', () => {
    const [body, head, hat] = outfitLayers(palette, loaded);
    expect(head.top).toBeLessThan(body.top + body.height);
    expect(hat.top + hat.height).toBeLessThanOrEqual(head.top + head.height);
    expect(hat.top).toBeLessThan(head.top);
  });

  it('leaves out a tinted layer whose image has not loaded yet instead of drawing nothing wrong', () => {
    expect(outfitLayers(palette, notLoaded).map((l) => l.part)).toEqual(['hat']);
  });

  it('has no hat layer for the bare-headed choice', () => {
    const bare = { ...palette, hat: 0 };
    expect(outfitLayers(bare, loaded).map((l) => l.part)).toEqual(['body', 'head']);
  });

  it('is the same for the same look and different for another', () => {
    expect(outfitLayers(palette, loaded)).toEqual(outfitLayers({ ...palette }, loaded));
    const other = { ...palette, hat: AVAILABLE.hat[2] };
    expect(outfitLayers(other, loaded)).not.toEqual(outfitLayers(palette, loaded));
  });
});
