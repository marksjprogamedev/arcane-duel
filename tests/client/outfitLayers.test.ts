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

const parts = (layers: { part: string }[]) => layers.map((l) => l.part);
const layer = (layers: { part: string }[], part: string) =>
  layers.find((l) => l.part === part) as {
    top: number;
    left: number;
    width: number;
    height: number;
  };

describe('outfitLayers', () => {
  it('draws boots, robe, offhand, head, hat and staff back to front, every layer inside the box', () => {
    const layers = outfitLayers(palette, loaded);
    expect(parts(layers)).toEqual(['feet', 'body', 'off', 'head', 'hat', 'staff']);
    for (const l of layers) {
      expect(l.width).toBeGreaterThan(0);
      expect(l.left).toBeGreaterThanOrEqual(0);
      expect(l.left + l.width).toBeLessThanOrEqual(OUTFIT_ICON.w);
      expect(l.top).toBeGreaterThanOrEqual(0);
      expect(l.top + l.height).toBeLessThanOrEqual(OUTFIT_ICON.h + 1);
    }
  });

  it('puts the head above the robe, the hat above the head, the staff left and the offhand right', () => {
    const layers = outfitLayers(palette, loaded);
    const [body, head, hat, staff, off] = ['body', 'head', 'hat', 'staff', 'off'].map((p) =>
      layer(layers, p),
    );
    expect(head.top).toBeLessThan(body.top + body.height);
    expect(hat.top + hat.height).toBeLessThanOrEqual(head.top + head.height);
    expect(hat.top).toBeLessThan(head.top);
    expect(staff.left + staff.width / 2).toBeLessThan(body.left + body.width / 2);
    expect(off.left + off.width / 2).toBeGreaterThan(body.left + body.width / 2);
  });

  it('leaves out a tinted layer whose image has not loaded yet instead of drawing nothing wrong', () => {
    // robe and head wait for their tinted images; the rest come straight from the atlas or their own files
    expect(parts(outfitLayers(palette, notLoaded))).toEqual(['feet', 'off', 'hat', 'staff']);
  });

  it('has no layer for an empty choice: bare head, no staff', () => {
    const bare = { ...palette, hat: 0, staff: 0 };
    expect(parts(outfitLayers(bare, loaded))).toEqual(['feet', 'body', 'off', 'head']);
  });

  it('shows the skin-tinted bare hand for the empty offhand once it has loaded', () => {
    const empty = { ...palette, off: 0 };
    expect(parts(outfitLayers(empty, loaded))).not.toContain('off');
    const withHand = { ...loaded, leftHand: () => 'data:hand' };
    expect(parts(outfitLayers(empty, withHand))).toContain('off');
  });

  it('is the same for the same look and different for another', () => {
    expect(outfitLayers(palette, loaded)).toEqual(outfitLayers({ ...palette }, loaded));
    expect(outfitLayers({ ...palette, hat: AVAILABLE.hat[2] }, loaded)).not.toEqual(
      outfitLayers(palette, loaded),
    );
    expect(outfitLayers({ ...palette, feet: AVAILABLE.feet[3] }, loaded)).not.toEqual(
      outfitLayers(palette, loaded),
    );
  });
});
