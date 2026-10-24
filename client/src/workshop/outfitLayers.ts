// What an outfit's small picture is made of: robe, head and hat placed in a box. Pure (no DOM), so it is tested
// on its own; outfitIcon.ts draws it.
import type { Look } from './look';
import { iconLook, partSprite } from './partSprite';
import type { PartKey } from './parts';
import type { TintedAssets } from './partSprite';

export const OUTFIT_ICON = { w: 68, h: 60 };

export interface OutfitLayer {
  part: Extract<PartKey, 'body' | 'head' | 'hat' | 'feet' | 'staff' | 'off'>;
  left: number;
  top: number;
  width: number;
  height: number;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
}

/**
 * The layers of the picture, back to front, placed in a box: the boots under the robe, the offhand (shield) on the
 * right, the head on the robe with the hat sitting on it, and the main-hand staff on the left in front. Layers whose
 * image has not loaded yet, and empty choices (no hat, no staff), are left out. Pure (tinted images are handed in).
 */
export function outfitLayers(look: Look, assets: TintedAssets, box = OUTFIT_ICON): OutfitLayer[] {
  const layers: OutfitLayer[] = [];
  const place = (
    part: OutfitLayer['part'],
    index: number,
    fit: { w: number; h: number },
    at: { bottom: number; centre?: number },
  ) => {
    const style = iconLook(partSprite(part, index, assets), fit.w, fit.h);
    if (!style) return null;
    const layer = {
      part,
      left: Math.round((at.centre ?? box.w / 2) - style.width / 2),
      top: Math.round(at.bottom - style.height),
      width: style.width,
      height: style.height,
      backgroundImage: style.backgroundImage,
      backgroundSize: style.backgroundSize,
      backgroundPosition: style.backgroundPosition,
    };
    layers.push(layer);
    return layer;
  };
  const { w, h } = box;
  place('feet', look.feet, { w: w * 0.42, h: h * 0.16 }, { bottom: h });
  place('body', look.body, { w: w * 0.62, h: h * 0.6 }, { bottom: h * 0.93 });
  place('off', look.off, { w: w * 0.3, h: h * 0.46 }, { bottom: h * 0.86, centre: w * 0.86 });
  const head = place('head', look.head, { w: w * 0.4, h: h * 0.42 }, { bottom: h * 0.64 });
  // the brim overlaps the top of the head a little
  const hatBottom = head ? head.top + head.height * 0.3 : h * 0.4;
  place('hat', look.hat, { w: w * 0.62, h: h * 0.34 }, { bottom: hatBottom });
  place('staff', look.staff, { w: w * 0.26, h: h * 0.98 }, { bottom: h, centre: w * 0.13 });
  return layers;
}
