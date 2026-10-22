// Draws the Workshop preview wizard: temporary SVG shapes until the sprite atlas loads,
// then absolutely positioned atlas sprites (one div per slot) with the saved layout applied.
import { $ } from '../dom';
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
  PALETTE,
  PLAIN_STAFF_URL,
  SKIN_HEAD,
  SKIN_HEAD_FIRST,
  SKIN_HEAD_LAST,
  SLOTS,
  spriteRect,
} from './parts';
import type { SlotId } from './parts';
import { onHeadsLoaded, tintHeads } from './skinTone';
import { layoutValue, picked, skinTone } from './store';

/** The atlas sprite divs, one per slot, in painter's order. */
export const parts: HTMLElement[] = [];
let atlasReady = false;
/** One tinted 32×44 PNG data URL per grayscale head, rebuilt whenever the skin tone changes. */
let headSprites: string[] = [];

/** Re-tints the grayscale heads for the current skin tone, then redraws. */
export function updateTintedHeads() {
  const heads = tintHeads(skinTone);
  if (!heads) return;
  headSprites = heads.map((head) => head.toDataURL('image/png'));
  drawAtlas();
}

function rect(x: number, y: number, w: number, h: number, fill: string) {
  return (
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"/>'
  );
}
function path(d: string, fill: string, stroke = '#25233a', sw = 1) {
  return (
    '<path d="' +
    d +
    '" fill="' +
    fill +
    '" stroke="' +
    stroke +
    '" stroke-width="' +
    sw +
    '" stroke-linejoin="round"/>'
  );
}

/** Redraws the SVG fallback shapes for the current choice. */
export function drawSvg() {
  const h = picked.head,
    skin = h === 3 ? '#e6dfc7' : h === 4 ? '#79a45e' : '#f5b080';
  const eyes = h === 3 ? '#24263b' : h === 4 ? '#ffeb93' : '#222338';
  let face = path('M8 5H24V7H27V11H29V24H25V28H7V24H3V11H5V7H8Z', skin);
  face += rect(8, 13, 5, 6, eyes) + rect(20, 13, 5, 6, eyes) + rect(9, 13, 2, 2, '#fff');
  face +=
    h === 0
      ? path('M12 23H21V25H19V27H14V25H12Z', '#763e46', 'none')
      : h === 1
        ? rect(12, 24, 9, 2, '#763e46')
        : h === 2
          ? rect(15, 23, 4, 5, '#733f4a')
          : h === 3
            ? rect(13, 23, 8, 3, '#26283b')
            : path('M12 24H22V26H12Z', '#58744d');
  if (h === 4) face += path('M3 14H0V10H3M29 14H32V10H29', skin);
  $('ww-head').innerHTML = face;
  const c = PALETTE[picked.body];
  let body = path('M9 2H23L29 10V30H3V10Z', c);
  body +=
    path('M11 2L16 8L21 2', 'none', '#e7ba65', 2) +
    rect(15, 9, 2, 19, '#dfb463') +
    rect(5, 28, 22, 3, '#e4b86a');
  $('ww-body').innerHTML = body;
  const hats = ['', '#3379cf', '#b73743', '#358a58', '#8050b5', '#edb74d'];
  $('ww-hat').innerHTML =
    picked.hat === 0
      ? ''
      : picked.hat === 5
        ? path('M4 17L7 4L15 12L18 2L22 12L29 4L32 17Z', hats[5]) + rect(4, 17, 28, 3, '#d89433')
        : path('M6 15L14 4L24 2L29 15Z', hats[picked.hat]) + rect(1, 15, 34, 4, hats[picked.hat]);
  const hand = path('M2 4H4V1H6V4H8V2H10V8H8V11H3V8H1V5H2Z', skin);
  $('ww-handR').innerHTML = picked.off === 0 ? hand : '';
  const boot = ['#8d6047', '#b43f46', '#3979b3'][picked.feet];
  const shoe = path('M4 1H12V6H15V10H1V7H4Z', boot);
  $('ww-feetL').innerHTML = shoe;
  $('ww-feetR').innerHTML = shoe;
  $('ww-staff').innerHTML =
    picked.staff === 3
      ? ''
      : path('M8 12L11 12L10 54H7Z', '#9a693d') +
        (picked.staff === 0
          ? path('M9 15Q1 10 4 4Q9 -2 14 5Q15 9 10 10', 'none', '#ad7846', 3)
          : picked.staff === 1
            ? path('M9 1L15 8L9 15L3 8Z', '#6ad8ff')
            : path('M9 0L15 8L9 14L3 8Z', '#ff8542'));
  $('ww-off').innerHTML =
    picked.off === 0
      ? ''
      : picked.off === 1
        ? path('M3 4H17V25H3Z', '#7753a3') + rect(9, 8, 2, 12, '#e3c077')
        : picked.off === 2
          ? '<circle cx="10" cy="14" r="9" fill="#54d9ff" stroke="#c1f8ff" stroke-width="2"/>'
          : path('M10 2L18 6V16L10 25L2 16V6Z', '#b2a16c');
}

function createAtlasParts() {
  const wizard = $('ww-wizard');
  for (const id of ['feetL', 'feetR', 'body', 'head', 'hat', 'staff', 'off', 'handR']) {
    const node = document.createElement('div');
    node.className = 'ww-atlas-part';
    node.dataset.slot = id;
    node.setAttribute('aria-hidden', 'true');
    wizard.appendChild(node);
    parts.push(node);
  }
}

/** Repositions and re-crops every atlas sprite for the current choice and layout. */
export function drawAtlas() {
  if (!atlasReady) return;
  const selection: Record<SlotId, [string, number]> = {
    head: [ATLAS_KEYS.head, picked.head],
    hat: [ATLAS_KEYS.hat, picked.hat - 1],
    body: [ATLAS_KEYS.body, picked.body],
    staff: [ATLAS_KEYS.staff, picked.staff - 1],
    off: [ATLAS_KEYS.off, picked.off - 1],
    handR: ['hands', 0],
    feetL: [ATLAS_KEYS.feet, picked.feet],
    feetR: [ATLAS_KEYS.feet, picked.feet],
  };
  for (const node of parts) {
    const id = node.dataset.slot as SlotId,
      slot = SLOTS[id],
      [category, idx] = selection[id];
    const customStaff = id === 'staff' && picked.staff === CUSTOM_STAFF_INDEX;
    const customHead = id === 'head' && picked.head === CUSTOM_HEAD_INDEX;
    const customRobe = id === 'body' && picked.body === CUSTOM_ROBE_INDEX;
    const paletteHead =
      id === 'head' && picked.head >= SKIN_HEAD_FIRST && picked.head <= SKIN_HEAD_LAST;
    const customUrl = paletteHead
      ? headSprites[picked.head - SKIN_HEAD_FIRST]
      : customStaff
        ? PLAIN_STAFF_URL
        : customHead
          ? CUSTOM_HEAD_URL
          : customRobe
            ? CUSTOM_ROBE_URL
            : null;
    const customWidth = paletteHead ? SKIN_HEAD.w : customStaff ? CUSTOM_STAFF.w : CUSTOM_HEAD.w;
    const customHeight = paletteHead
      ? SKIN_HEAD.h
      : customStaff
        ? CUSTOM_STAFF.h
        : customHead
          ? CUSTOM_HEAD.h
          : CUSTOM_ROBE.h;
    const rect = customUrl
      ? [0, 0, customWidth, customHeight]
      : id === 'handR' && picked.off !== 0
        ? null
        : spriteRect(category, idx);
    if (!rect) {
      node.style.display = 'none';
      continue;
    }
    const [x, y, w, h] = rect;
    const isFoot = id === 'feetL' || id === 'feetR';
    const cropX = isFoot && id === 'feetR' ? Math.floor(w / 2) : 0;
    const cropW = isFoot ? (id === 'feetR' ? w - Math.floor(w / 2) : Math.floor(w / 2)) : w;
    const renderSlot = paletteHead
      ? SKIN_HEAD.box
      : customStaff
        ? CUSTOM_STAFF.box
        : customHead
          ? CUSTOM_HEAD.box
          : customRobe
            ? CUSTOM_ROBE.box
            : slot;
    const scale = Math.min(renderSlot.w / cropW, renderSlot.h / h);
    const adjustment = layoutValue(id);
    const width = cropW * scale * adjustment.scale,
      height = h * scale * adjustment.scale;
    node.style.display = 'block';
    node.style.left = renderSlot.x + (renderSlot.w - width) / 2 + adjustment.x + 'px';
    node.style.top = renderSlot.y + (renderSlot.h - height) / 2 + adjustment.y + 'px';
    node.style.width = width + 'px';
    node.style.height = height + 'px';
    node.style.transform = 'rotate(' + (adjustment.rotate ?? 0) + 'deg)';
    node.style.backgroundImage = 'url("' + (customUrl || ATLAS_URL) + '")';
    node.style.backgroundSize =
      (customUrl ? customWidth : ATLAS_WIDTH) * scale * adjustment.scale +
      'px ' +
      (customUrl ? customHeight : ATLAS_HEIGHT) * scale * adjustment.scale +
      'px';
    node.style.backgroundPosition = customUrl
      ? '0px 0px'
      : -((x + cropX) * scale * adjustment.scale) + 'px ' + -(y * scale * adjustment.scale) + 'px';
  }
}

/** Creates the sprite divs and loads the atlas; the SVG shapes stay until it arrives. */
export function initPreview() {
  createAtlasParts();
  onHeadsLoaded(updateTintedHeads);
  const image = new Image();
  image.onload = () => {
    atlasReady = true;
    $('ww-wizard').classList.add('ww-atlas-loaded');
    $('ww-asset-status').textContent = 'Atlas loaded: 71 transparent sprites.';
    drawAtlas();
  };
  image.onerror = () => {
    $('ww-asset-status').textContent =
      'Sprite atlas not uploaded yet; displaying temporary shapes.';
  };
  image.src = ATLAS_URL;
}
