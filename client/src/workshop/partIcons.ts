// The icon element for any Workshop choice (`partIcon(key, index)`), kept up to date as the skin tone and
// the robe / hat dye change. Which image to show is decided by partSprite.ts; this only draws it.
import { iconLook, iconSizeFor, ICON_SIZES, partSprite } from './partSprite';
import type { PartKey } from './parts';
import { onTintedChange, tintedAssets } from './preview';

const live = new Map<HTMLElement, [PartKey, number]>();

function paint(icon: HTMLElement, key: PartKey, index: number) {
  const sprite = partSprite(key, index, tintedAssets);
  const box = ICON_SIZES[iconSizeFor(key)];
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

/** An icon showing choice `index` of part `key`; it redraws itself when the dye or skin tone changes. */
export function partIcon(key: PartKey, index: number): HTMLElement {
  const icon = document.createElement('span');
  icon.className = 'ui-carousel__icon';
  live.set(icon, [key, index]);
  paint(icon, key, index);
  return icon;
}

/** Forget the icons built so far (call before the pickers are rebuilt). */
export function clearPartIcons() {
  live.clear();
}

onTintedChange(() => {
  for (const [icon, [key, index]] of live) paint(icon, key, index);
});
