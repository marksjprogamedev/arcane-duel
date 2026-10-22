/**
 * Client-side-only Wizard Workshop appearance. Does not modify authoritative
 * simulation state or the appearance of other players in multiplayer.
 */
import { g } from '../dom';
import { game } from '../state';
import {
  ATLAS_KEYS,
  ATLAS_URL,
  CUSTOM_HEAD,
  CUSTOM_HEAD_INDEX,
  CUSTOM_HEAD_URL,
  CUSTOM_ROBE,
  CUSTOM_ROBE_INDEX,
  CUSTOM_ROBE_URL,
  CUSTOM_STAFF,
  CUSTOM_STAFF_INDEX,
  DEFAULT_SKIN,
  LIMITS,
  PLAIN_STAFF_URL,
  SKIN_COLORS,
  SKIN_HEAD,
  SKIN_HEAD_FIRST,
  SKIN_HEAD_LAST,
  SLOTS,
  spriteRect,
} from './parts';
import type { Appearance, SlotId } from './parts';
import { onHeadsLoaded, tintHeads } from './skinTone';
import { LAYOUT_DEFAULTS, sanitiseLayout } from './store';
import type { Layout } from './store';

// Fallback for an unreadable save (not the Workshop's own defaults, which are in parts.ts).
type SkinnedAppearance = Appearance & { skin: string };
const defaults: SkinnedAppearance = {
  head: 0,
  hat: 0,
  body: 0,
  staff: 0,
  off: 0,
  feet: 0,
  skin: DEFAULT_SKIN,
};
const atlas = new Image();
let ready = false;
atlas.onload = () => {
  ready = true;
};
atlas.onerror = () => {
  ready = false;
};
atlas.src = ATLAS_URL;
const customHead = new Image();
let customHeadReady = false;
customHead.onload = () => {
  customHeadReady = true;
};
customHead.onerror = () => {
  customHeadReady = false;
};
customHead.src = CUSTOM_HEAD_URL;
const customRobe = new Image();
let customRobeReady = false;
customRobe.onload = () => {
  customRobeReady = true;
};
customRobe.onerror = () => {
  customRobeReady = false;
};
customRobe.src = CUSTOM_ROBE_URL;
const plainStaff = new Image();
let plainStaffReady = false;
plainStaff.onload = () => {
  plainStaffReady = true;
};
plainStaff.onerror = () => {
  plainStaffReady = false;
};
plainStaff.src = PLAIN_STAFF_URL;
let appearance: SkinnedAppearance = { ...defaults };
// Tinted grayscale heads, one 32×44 canvas each; rebuilt when the skin tone changes.
let isolatedHeads: HTMLCanvasElement[] = [];
let headsReady = false;
function updateHeads() {
  const heads = tintHeads(appearance.skin);
  if (!heads) return;
  isolatedHeads = heads;
  headsReady = true;
}
onHeadsLoaded(updateHeads);
try {
  const saved = JSON.parse(localStorage.getItem('arcane-wizard-workshop') || 'null');
  if (saved) appearance = validate(saved);
} catch {
  /* storage unavailable */
}
function validate(value: Record<string, unknown>): SkinnedAppearance {
  const result = { ...defaults };
  for (const key of Object.keys(LIMITS) as (keyof Appearance)[]) {
    const v = value[key];
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < LIMITS[key]) result[key] = v;
  }
  if (typeof value.skin === 'string' && SKIN_COLORS.includes(value.skin)) result.skin = value.skin;
  return result;
}
window.addEventListener('arcane-wizard-appearance', ((e: Event) => {
  const previous = appearance.skin;
  appearance = validate((e as CustomEvent<Record<string, unknown>>).detail || {});
  if (previous !== appearance.skin) updateHeads();
}) as EventListener);
let savedLayout: Layout = {};
try {
  savedLayout = sanitiseLayout(JSON.parse(localStorage.getItem('arcane-wizard-layout') || '{}'));
} catch {
  /* storage unavailable */
}
window.addEventListener('arcane-wizard-layout', ((event: Event) => {
  savedLayout = sanitiseLayout((event as CustomEvent<unknown>).detail);
}) as EventListener);
/** Draw a miniature modular wizard at the actor's position, preserving status overlays. */
export function drawWorkshopWizard(x: number, y: number): boolean {
  if (!ready) return false;
  // Painter's order: feet behind robe, then offhand, then head/hat,
  // with the main-hand weapon drawn last in the foreground.
  const selected: [SlotId, string, number][] = [
    ['feetL', ATLAS_KEYS.feet, appearance.feet],
    ['feetR', ATLAS_KEYS.feet, appearance.feet],
    ['body', ATLAS_KEYS.body, appearance.body],
    ['off', ATLAS_KEYS.off, appearance.off - 1],
    ...(appearance.off === 0 ? [['handR', 'hands', 0] as [SlotId, string, number]] : []),
    ['head', ATLAS_KEYS.head, appearance.head],
    ['hat', ATLAS_KEYS.hat, appearance.hat - 1],
    ['staff', ATLAS_KEYS.staff, appearance.staff - 1],
  ];
  g.save();
  // Subtle whole-character idle bob; individual limbs remain static.
  g.translate(x, y + Math.sin(game.t * 0.065) * 1.5);
  g.imageSmoothingEnabled = false;
  // Slightly larger than the first pass to match the original character silhouettes.
  // Equipment remains rigidly attached during the gentle whole-character bob.
  const scale = 0.32;
  for (const [slot, category, idx] of selected) {
    const isPlainStaff = slot === 'staff' && appearance.staff === CUSTOM_STAFF_INDEX;
    const isCustomHead = slot === 'head' && appearance.head === CUSTOM_HEAD_INDEX;
    const isCustomRobe = slot === 'body' && appearance.body === CUSTOM_ROBE_INDEX;
    const isPaletteHead =
      slot === 'head' && appearance.head >= SKIN_HEAD_FIRST && appearance.head <= SKIN_HEAD_LAST;
    const sprite = isPaletteHead
      ? ([0, 0, SKIN_HEAD.w, SKIN_HEAD.h] as [number, number, number, number])
      : isPlainStaff
        ? ([0, 0, CUSTOM_STAFF.w, CUSTOM_STAFF.h] as [number, number, number, number])
        : isCustomHead
          ? ([0, 0, CUSTOM_HEAD.w, CUSTOM_HEAD.h] as [number, number, number, number])
          : isCustomRobe
            ? ([0, 0, CUSTOM_ROBE.w, CUSTOM_ROBE.h] as [number, number, number, number])
            : spriteRect(category, idx);
    if (
      !sprite ||
      (isPlainStaff && !plainStaffReady) ||
      (isCustomHead && !customHeadReady) ||
      (isCustomRobe && !customRobeReady) ||
      (isPaletteHead && !headsReady)
    )
      continue;
    const [sx, sy, sw, sh] = sprite;
    const {
      x: px,
      y: py,
      w: pw,
      h: ph,
    } = isPaletteHead
      ? SKIN_HEAD.box
      : isPlainStaff
        ? CUSTOM_STAFF.box
        : isCustomHead
          ? CUSTOM_HEAD.box
          : isCustomRobe
            ? CUSTOM_ROBE.box
            : SLOTS[slot];
    const assetIndex =
      slot === 'handR'
        ? 0
        : slot === 'feetL' || slot === 'feetR'
          ? appearance.feet
          : appearance[slot];
    const adjustment = savedLayout[`${slot}:${assetIndex}`] || LAYOUT_DEFAULTS;
    const foot = slot === 'feetL' || slot === 'feetR';
    const right = slot === 'feetR';
    const cx = foot && right ? Math.floor(sw / 2) : 0;
    const cw = foot ? (right ? sw - cx : Math.floor(sw / 2)) : sw;
    const ratio = Math.min(pw / cw, ph / sh);
    const width = cw * ratio * adjustment.scale,
      height = sh * ratio * adjustment.scale;
    const dx = (px + (pw - width) / 2 + adjustment.x - 128) * scale;
    const dy = (py + (ph - height) / 2 + adjustment.y - 290) * scale;
    // Match the Workshop preview: rotate about the centre of this individual sprite.
    g.save();
    g.translate(dx + (width * scale) / 2, dy + (height * scale) / 2);
    g.rotate((adjustment.rotate * Math.PI) / 180);
    g.drawImage(
      isPaletteHead
        ? isolatedHeads[appearance.head - SKIN_HEAD_FIRST]
        : isPlainStaff
          ? plainStaff
          : isCustomHead
            ? customHead
            : isCustomRobe
              ? customRobe
              : atlas,
      sx + cx,
      sy,
      cw,
      sh,
      (-width * scale) / 2,
      (-height * scale) / 2,
      width * scale,
      height * scale,
    );
    g.restore();
  }
  g.restore();
  return true;
}
