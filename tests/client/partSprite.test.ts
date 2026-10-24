import { describe, expect, it } from 'vitest';
import {
  ICON_SIZES,
  PART_LABELS,
  iconLook,
  iconSizeFor,
  partSprite,
} from '../../client/src/workshop/partSprite';
import type { TintedAssets } from '../../client/src/workshop/partSprite';
import {
  ATLAS_HEIGHT,
  ATLAS_KEYS,
  ATLAS_URL,
  ATLAS_WIDTH,
  AVAILABLE,
  CUSTOM_HEAD_URL,
  HAT_SPRITES,
  LEFT_HAND,
  MAINHAND_SPRITES,
  OFFHAND_SPRITES,
  SETS,
  SKIN_HEAD,
  SKIN_HEAD_FIRST,
  SLEEVELESS_ROBE_URL,
  spriteRect,
} from '../../client/src/workshop/parts';
import type { PartKey } from '../../client/src/workshop/parts';

const none: TintedAssets = {
  head: () => undefined,
  robe: () => undefined,
  hat: () => undefined,
  leftHand: () => null,
};
const tinted: TintedAssets = {
  head: (i) => 'data:head' + i,
  robe: (i) => 'data:robe' + i,
  hat: (i) => 'data:hat' + i,
  leftHand: () => 'data:hand',
};

describe('part icon sprites', () => {
  it('resolves every available choice of every part, without throwing', () => {
    for (const key of Object.keys(AVAILABLE) as PartKey[]) {
      for (const assets of [none, tinted]) {
        for (const i of AVAILABLE[key]) {
          const sprite = partSprite(key, i, assets);
          expect(['none', 'pending', 'image']).toContain(sprite.kind);
          if (assets === tinted) expect(sprite.kind).not.toBe('pending');
          const box = ICON_SIZES[iconSizeFor(key)];
          const look = iconLook(sprite, box.w, box.h);
          if (look) {
            expect(look.width).toBeGreaterThan(0);
            expect(look.width).toBeLessThanOrEqual(box.w);
            expect(look.height).toBeLessThanOrEqual(box.h);
          }
        }
      }
    }
  });

  it('every part has a name and a label', () => {
    for (const key of Object.keys(AVAILABLE) as PartKey[]) {
      expect(PART_LABELS[key]).toBeTruthy();
      for (const i of AVAILABLE[key]) expect(SETS[key][i]).toBeTruthy();
    }
  });

  it('shows an empty slot for "None" hats and staffs', () => {
    expect(partSprite('hat', 0, tinted)).toEqual({ kind: 'none' });
    expect(partSprite('staff', 0, tinted)).toEqual({ kind: 'none' });
  });

  it('crops boots (an atlas cell) from the atlas', () => {
    expect(partSprite('feet', 3, none)).toEqual({
      kind: 'image',
      url: ATLAS_URL,
      imageW: ATLAS_WIDTH,
      imageH: ATLAS_HEIGHT,
      rect: spriteRect(ATLAS_KEYS.feet, 3),
    });
  });

  it('uses the skin-tinted head, and waits until it exists', () => {
    const index = SKIN_HEAD_FIRST + 2;
    expect(partSprite('head', index, none)).toEqual({ kind: 'pending' });
    expect(partSprite('head', index, tinted)).toEqual({
      kind: 'image',
      url: 'data:head2',
      imageW: SKIN_HEAD.w,
      imageH: SKIN_HEAD.h,
      rect: [0, 0, SKIN_HEAD.w, SKIN_HEAD.h],
    });
  });

  it('uses the stand-alone image of the custom head', () => {
    const sprite = partSprite('head', 8, none);
    expect(sprite.kind === 'image' && sprite.url).toBe(CUSTOM_HEAD_URL);
  });

  it('shows the dyed robe, or the original sleeveless art before it is dyed', () => {
    expect(partSprite('body', 12, none)).toEqual({ kind: 'pending' });
    const dyed = partSprite('body', 12, tinted);
    expect(dyed.kind === 'image' && dyed.url).toBe('data:robe12');
    const plain = partSprite('body', 11, none);
    expect(plain.kind === 'image' && plain.url).toBe(SLEEVELESS_ROBE_URL);
  });

  it('crops a hat from its own image, or shows the dyed one whole', () => {
    const id = Number(Object.keys(HAT_SPRITES)[0]);
    const hat = HAT_SPRITES[id];
    expect(partSprite('hat', id, none)).toEqual({
      kind: 'image',
      url: hat.url,
      imageW: hat.imageWidth,
      imageH: hat.imageHeight,
      rect: hat.rect,
    });
    const dyed = partSprite('hat', id, tinted);
    expect(dyed).toMatchObject({ url: 'data:hat' + id, rect: [0, 0, hat.rect[2], hat.rect[3]] });
  });

  it('uses the sprites of main-hand and offhand choices', () => {
    const wand = Number(Object.keys(MAINHAND_SPRITES)[0]);
    const shield = Number(Object.keys(OFFHAND_SPRITES)[0]);
    expect(partSprite('staff', wand, none)).toMatchObject({ url: MAINHAND_SPRITES[wand].url });
    expect(partSprite('off', shield, none)).toMatchObject({ url: OFFHAND_SPRITES[shield].url });
  });

  it('draws the bare offhand as the skin-tinted left hand', () => {
    expect(partSprite('off', 0, none)).toEqual({ kind: 'pending' });
    expect(partSprite('off', 0, tinted)).toMatchObject({
      url: 'data:hand',
      rect: [0, 0, LEFT_HAND.w, LEFT_HAND.h],
    });
  });

  it('is empty for an out-of-range choice rather than throwing', () => {
    expect(partSprite('feet', 99, none)).toEqual({ kind: 'none' });
  });

  it('scales the crop to fit the box', () => {
    const sprite = partSprite('feet', 3, none);
    if (sprite.kind !== 'image') throw new Error('expected an image');
    const [x, y, w, h] = sprite.rect;
    const scale = Math.min(44 / w, 36 / h);
    expect(iconLook(sprite, 44, 36)).toEqual({
      width: Math.round(w * scale),
      height: Math.round(h * scale),
      backgroundImage: 'url("' + ATLAS_URL + '")',
      backgroundSize: ATLAS_WIDTH * scale + 'px ' + ATLAS_HEIGHT * scale + 'px',
      backgroundPosition: -x * scale + 'px ' + -y * scale + 'px',
    });
    expect(iconLook({ kind: 'none' }, 44, 36)).toBeNull();
  });
});
