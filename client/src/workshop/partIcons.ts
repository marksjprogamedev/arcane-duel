// The icon element for any Workshop choice (`partIcon(key, index)`), kept up to date as the skin tone and
// the robe / hat dye change. Which image to show is decided by partSprite.ts; this only draws it.
import { iconLook, iconSizeFor, ICON_SIZES, partSprite } from './partSprite';
import type { PartKey } from './parts';
import { onTintedChange, tintedAssets } from './preview';

type Box = { w: number; h: number };
const live = new Map<HTMLElement, [PartKey, number, Box]>();

function paint(icon: HTMLElement, key: PartKey, index: number, box: Box) {
  const sprite = partSprite(key, index, tintedAssets);
  const look = iconLook(sprite, box.w, box.h);
  icon.classList.toggle('ui-carousel__icon--none', sprite.kind === 'none');
  icon.classList.toggle('ui-carousel__icon--pending', sprite.kind === 'pending');
  if (!look) {
    icon.removeAttribute('style');
    return;
  }
  icon.style.width = look.width + 'px';
  icon.style.height = look.height + 'px';
  icon.style.backgroundImage = look.backgroundImage;
  icon.style.backgroundSize = look.backgroundSize;
  icon.style.backgroundPosition = look.backgroundPosition;
}

/**
 * An icon showing choice `index` of part `key`, fitted to `box` (the picker tile size by default); it redraws
 * itself when the dye or skin tone changes, for as long as it is in the page.
 */
export function partIcon(
  key: PartKey,
  index: number,
  box: Box = ICON_SIZES[iconSizeFor(key)],
): HTMLElement {
  const icon = document.createElement('span');
  icon.className = 'ui-carousel__icon';
  live.set(icon, [key, index, box]);
  paint(icon, key, index, box);
  return icon;
}

onTintedChange(() => {
  for (const [icon, [key, index, box]] of live) {
    // lists rebuild their rows on every change: forget the icons that left the page
    if (!icon.isConnected) live.delete(icon);
    else paint(icon, key, index, box);
  }
});
