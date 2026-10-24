// Which image, and which crop of it, shows one Workshop choice. Pure data lookups over the tables in
// parts.ts (no DOM), so every part group, including a new one, gets its icon from the same function.
import {
  ATLAS_HEIGHT,
  ATLAS_KEYS,
  ATLAS_URL,
  ATLAS_WIDTH,
  CUSTOM_HEAD,
  CUSTOM_HEAD_INDEX,
  CUSTOM_HEAD_URL,
  CUSTOM_ROBE,
  CUSTOM_ROBE_INDEX,
  CUSTOM_ROBE_URL,
  CUSTOM_STAFF,
  CUSTOM_STAFF_INDEX,
  HAT_SPRITES,
  LEFT_HAND,
  LEFT_HAND_INDEX,
  MAINHAND_SPRITES,
  OFFHAND_SPRITES,
  PLAIN_STAFF_URL,
  ROBE_FIRST,
  ROBE_LAST,
  ROBE_TILE,
  SKIN_HEAD,
  SKIN_HEAD_FIRST,
  SKIN_HEAD_LAST,
  SLEEVELESS_ROBE,
  SLEEVELESS_ROBE_INDEX,
  SLEEVELESS_ROBE_URL,
  spriteRect,
} from './parts';
import type { PartKey } from './parts';

/** The tinted images that exist only once their source image has loaded and the dye / skin tone is applied. */
export interface TintedAssets {
  /** Skin-tinted grayscale head, by position in the heads sheet (choice index minus SKIN_HEAD_FIRST). */
  head(sheetIndex: number): string | undefined;
  /** Dyed robe, by choice index. */
  robe(index: number): string | undefined;
  /** Dyed hat, by choice index (undefined with the original colours). */
  hat(index: number): string | undefined;
  /** The skin-tinted bare left hand. */
  leftHand(): string | null;
}

export type Rect = [number, number, number, number];

export type PartSprite =
  /** An empty slot (no hat, no staff). */
  | { kind: 'none' }
  /** The sprite exists but its tinted image has not loaded yet. */
  | { kind: 'pending' }
  /** `rect` of an image that is `imageW` x `imageH` pixels. */
  | { kind: 'image'; url: string; imageW: number; imageH: number; rect: Rect };

/** Choice 0 of these parts is "None"; the atlas cells start at choice 1. */
const ATLAS_OFFSET: Partial<Record<PartKey, number>> = { hat: 1, staff: 1, off: 1 };

const NONE: PartSprite = { kind: 'none' };
const PENDING: PartSprite = { kind: 'pending' };

function whole(url: string, size: { w: number; h: number }): PartSprite {
  return { kind: 'image', url, imageW: size.w, imageH: size.h, rect: [0, 0, size.w, size.h] };
}
function cropped(sprite: {
  url: string;
  rect: Rect;
  imageWidth: number;
  imageHeight: number;
}): PartSprite {
  return {
    kind: 'image',
    url: sprite.url,
    imageW: sprite.imageWidth,
    imageH: sprite.imageHeight,
    rect: sprite.rect,
  };
}

/**
 * The sprite a choice is drawn with, using the same special cases as the preview: stand-alone images,
 * skin-tinted heads and hands, dyed robes and hats, and atlas cells for everything else.
 */
export function partSprite(key: PartKey, index: number, assets: TintedAssets): PartSprite {
  if (key === 'head') {
    if (index === CUSTOM_HEAD_INDEX) return whole(CUSTOM_HEAD_URL, CUSTOM_HEAD);
    if (index >= SKIN_HEAD_FIRST && index <= SKIN_HEAD_LAST) {
      const url = assets.head(index - SKIN_HEAD_FIRST);
      return url ? whole(url, SKIN_HEAD) : PENDING;
    }
  } else if (key === 'hat') {
    const hat = HAT_SPRITES[index];
    if (hat) {
      const dyed = assets.hat(index);
      return dyed ? whole(dyed, { w: hat.rect[2], h: hat.rect[3] }) : cropped(hat);
    }
  } else if (key === 'body') {
    if (index === CUSTOM_ROBE_INDEX) return whole(CUSTOM_ROBE_URL, CUSTOM_ROBE);
    if (index === SLEEVELESS_ROBE_INDEX)
      return whole(assets.robe(index) ?? SLEEVELESS_ROBE_URL, SLEEVELESS_ROBE);
    if (index >= ROBE_FIRST && index <= ROBE_LAST) {
      const url = assets.robe(index);
      return url ? whole(url, ROBE_TILE) : PENDING;
    }
  } else if (key === 'staff') {
    const staff = MAINHAND_SPRITES[index];
    if (staff) return cropped(staff);
    if (index === CUSTOM_STAFF_INDEX) return whole(PLAIN_STAFF_URL, CUSTOM_STAFF);
  } else if (key === 'off') {
    const off = OFFHAND_SPRITES[index];
    if (off) return cropped(off);
    // the bare offhand is the skin-tinted left hand
    if (index === 0 || index === LEFT_HAND_INDEX) {
      const url = assets.leftHand();
      return url ? whole(url, LEFT_HAND) : PENDING;
    }
  }
  const atlasIndex = index - (ATLAS_OFFSET[key] ?? 0);
  if (atlasIndex < 0) return NONE;
  const rect = spriteRect(ATLAS_KEYS[key], atlasIndex);
  if (!rect) return NONE;
  return { kind: 'image', url: ATLAS_URL, imageW: ATLAS_WIDTH, imageH: ATLAS_HEIGHT, rect };
}

/** The inline look of an icon: the crop of the image, scaled to fit a box. Null when there is nothing to draw. */
export function iconLook(sprite: PartSprite, boxW: number, boxH: number) {
  if (sprite.kind !== 'image') return null;
  const [x, y, w, h] = sprite.rect;
  const scale = Math.min(boxW / w, boxH / h);
  return {
    width: Math.round(w * scale),
    height: Math.round(h * scale),
    backgroundImage: 'url("' + sprite.url + '")',
    backgroundSize: sprite.imageW * scale + 'px ' + sprite.imageH * scale + 'px',
    backgroundPosition: -x * scale + 'px ' + -y * scale + 'px',
  };
}

/** Icon box in pixels per carousel size (the tile sizes are `.ui-carousel--tall` etc. in components.css). */
export const ICON_SIZES = {
  normal: { w: 52, h: 46 },
  tall: { w: 40, h: 72 },
};
export type IconSize = keyof typeof ICON_SIZES;
/** Parts whose sprites are tall and thin get a taller tile. */
const TALL_PARTS: PartKey[] = ['staff'];
export function iconSizeFor(key: PartKey): IconSize {
  return TALL_PARTS.includes(key) ? 'tall' : 'normal';
}

/** The group name read out and shown above each row. */
export const PART_LABELS: Record<PartKey, string> = {
  head: 'Head',
  hat: 'Hat',
  body: 'Body',
  staff: 'Main hand',
  off: 'Offhand',
  feet: 'Feet',
};
