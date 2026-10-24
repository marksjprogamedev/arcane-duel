// A small picture of a whole saved outfit (robe, head and hat in that outfit's own skin tone and dyes), for the
// outfit tiles in the Workshop and the lobby dropdown. Separate from partIcons.ts, which draws one part in the
// colours being worn now: an outfit that is not selected has colours of its own.
import { HAT_SPRITES } from './parts';
import { OUTFIT_ICON, outfitLayers } from './outfitLayers';
import type { Look } from './look';
import type { TintedAssets } from './partSprite';
import { tintHatSprite } from './hatTint';
import { onRobesLoaded, tintRobe } from './robeTint';
import { onHeadsLoaded, onLeftHandLoaded, tintHeads, tintLeftHand } from './skinTone';

// ---- tinted images for a look that is not the one being worn ----

const heads = new Map<string, string[]>();
const robes = new Map<string, string>();
const hats = new Map<string, string>();
const hands = new Map<string, string>();
const hatImages: Record<number, HTMLImageElement> = {};
const listeners: (() => void)[] = [];
const changed = () => listeners.forEach((fn) => fn());
/** Calls `fn` when a source image has loaded, so icons built before it can be built again. */
export const onOutfitAssets = (fn: () => void) => void listeners.push(fn);
onHeadsLoaded(changed);
onRobesLoaded(changed);
onLeftHandLoaded(changed);
for (const [id, sprite] of Object.entries(HAT_SPRITES)) {
  const image = new Image();
  image.onload = changed;
  image.src = sprite.url;
  hatImages[Number(id)] = image;
}

function assetsFor(look: Look): TintedAssets {
  return {
    head(sheetIndex) {
      let sheet = heads.get(look.skin);
      if (!sheet) {
        const canvases = tintHeads(look.skin);
        if (!canvases) return undefined;
        sheet = canvases.map((c) => c.toDataURL('image/png'));
        heads.set(look.skin, sheet);
      }
      return sheet[sheetIndex];
    },
    robe(index) {
      const key = `${index}|${look.robeColor}`;
      let url = robes.get(key);
      if (!url) {
        const canvas = tintRobe(index, look.robeColor);
        if (!canvas) return undefined;
        url = canvas.toDataURL('image/png');
        robes.set(key, url);
      }
      return url;
    },
    hat(index) {
      const key = `${index}|${look.hatColor}`;
      let url = hats.get(key);
      const image = hatImages[index];
      if (!url && image?.complete && image.naturalWidth) {
        const canvas = tintHatSprite(index, image, look.hatColor);
        if (canvas) {
          url = canvas.toDataURL('image/png');
          hats.set(key, url);
        }
      }
      return url;
    },
    leftHand() {
      let url = hands.get(look.skin);
      if (!url) {
        const canvas = tintLeftHand(look.skin);
        if (!canvas) return null;
        url = canvas.toDataURL('image/png');
        hands.set(look.skin, url);
      }
      return url;
    },
  };
}

/** The picture of one outfit, ready to put in a tile. */
export function outfitIcon(look: Look): HTMLElement {
  const icon = document.createElement('span');
  icon.className = 'ui-outfit-icon';
  icon.style.width = OUTFIT_ICON.w + 'px';
  icon.style.height = OUTFIT_ICON.h + 'px';
  for (const layer of outfitLayers(look, assetsFor(look))) {
    const part = document.createElement('span');
    part.className = 'ui-outfit-icon__layer';
    part.style.left = layer.left + 'px';
    part.style.top = layer.top + 'px';
    part.style.width = layer.width + 'px';
    part.style.height = layer.height + 'px';
    part.style.backgroundImage = layer.backgroundImage;
    part.style.backgroundSize = layer.backgroundSize;
    part.style.backgroundPosition = layer.backgroundPosition;
    icon.append(part);
  }
  return icon;
}
