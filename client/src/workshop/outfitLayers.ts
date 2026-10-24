// What an outfit's small picture is made of: robe, head and hat placed in a box. Pure (no DOM), so it is tested
// on its own; outfitIcon.ts draws it.
import type { Look } from './look';
import { iconLook, partSprite } from './partSprite';
import type { PartKey } from './parts';
import type { TintedAssets } from './partSprite';

export const OUTFIT_ICON = { w: 52, h: 46 };

export interface OutfitLayer {
  part: Extract<PartKey, 'body' | 'head' | 'hat'>;
  left: number;
  top: number;
  width: number;
  height: number;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
}

/**
 * The layers of the picture, back to front, placed in a box: the robe along the bottom, the head on it and the
 * hat sitting on the head. Layers whose image has not loaded yet are left out. Pure (tinted images are handed in).
 */
export function outfitLayers(look: Look, assets: TintedAssets, box = OUTFIT_ICON): OutfitLayer[] {
  const layers: OutfitLayer[] = [];
  const place = (
    part: OutfitLayer['part'],
    index: number,
    fit: { w: number; h: number },
    bottom: number,
  ) => {
    const style = iconLook(partSprite(part, index, assets), fit.w, fit.h);
    if (!style) return null;
    const layer = {
      part,
      left: Math.round((box.w - style.width) / 2),
      top: Math.round(bottom - style.height),
      width: style.width,
      height: style.height,
      backgroundImage: style.backgroundImage,
      backgroundSize: style.backgroundSize,
      backgroundPosition: style.backgroundPosition,
    };
    layers.push(layer);
    return layer;
  };
  place('body', look.body, { w: box.w * 0.85, h: box.h * 0.68 }, box.h);
  const head = place('head', look.head, { w: box.w * 0.46, h: box.h * 0.5 }, box.h * 0.66);
  // the brim overlaps the top of the head a little
  const hatBottom = head ? head.top + head.height * 0.3 : box.h * 0.4;
  place('hat', look.hat, { w: box.w * 0.72, h: box.h * 0.46 }, hatBottom);
  return layers;
}
