// Workshop state and its browser storage: the chosen appearance and the per-asset layout.
// The in-match renderer listens for the two window events dispatched from here.
import { DEFAULTS, DEFAULT_SKIN, SETS, SKIN_COLORS } from './parts';
import type { Appearance, PartKey, SlotId } from './parts';

const APPEARANCE_KEY = 'arcane-wizard-workshop';
// Offsets are measured in Workshop preview pixels and shared with the game renderer.
// Keys include the chosen asset index, so adjusting one robe never moves the others.
const LAYOUT_KEY = 'arcane-wizard-layout';

export type LayoutAdjustment = { x: number; y: number; scale: number; rotate: number };
export type Layout = Record<string, LayoutAdjustment>;

export const LAYOUT_DEFAULTS: LayoutAdjustment = { x: 0, y: 0, scale: 1, rotate: 0 };

/** The current choice for each part. Mutated in place so every module sees the same object. */
export const picked: Appearance = { ...DEFAULTS };

/** Skin tone for the grayscale heads. Read through the live binding; change with setSkinTone. */
export let skinTone = DEFAULT_SKIN;
export function setSkinTone(color: string) {
  skinTone = color;
}

/** Replaces the current choice (reset, random). */
export function setPicked(next: Appearance) {
  Object.assign(picked, next);
}

/** Reads the saved appearance into `picked`, ignoring anything out of range. */
export function loadAppearance() {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || 'null');
    if (saved && typeof saved === 'object' && SKIN_COLORS.includes(saved.skin))
      skinTone = saved.skin;
    if (saved && typeof saved === 'object')
      for (const key of Object.keys(DEFAULTS) as PartKey[]) {
        if (Number.isInteger(saved[key]) && saved[key] >= 0 && saved[key] < SETS[key].length)
          picked[key] = saved[key];
      }
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
}

/** Saves the appearance and tells the in-match renderer. */
export function saveAppearance() {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...picked, skin: skinTone }));
  } catch {
    /* Keep the current session working. */
  }
  window.dispatchEvent(
    new CustomEvent('arcane-wizard-appearance', { detail: { ...picked, skin: skinTone } }),
  );
}

/** Keeps only well-formed, in-range layout entries. */
export function sanitiseLayout(value: unknown): Layout {
  const output: Layout = {};
  if (!value || typeof value !== 'object') return output;
  for (const [key, raw] of Object.entries(value)) {
    if (
      !/^(head|hat|body|staff|off|handR|handStaff|feetL|feetR):\d+$/.test(key) ||
      !raw ||
      typeof raw !== 'object'
    )
      continue;
    const part = raw as Record<string, unknown>;
    const x = Number(part.x),
      y = Number(part.y),
      scale = Number(part.scale),
      rotate = part.rotate == null ? 0 : Number(part.rotate);
    if (
      Number.isFinite(x) &&
      Math.abs(x) <= 150 &&
      Number.isFinite(y) &&
      Math.abs(y) <= 150 &&
      Number.isFinite(scale) &&
      scale >= 0.25 &&
      scale <= 3 &&
      Number.isFinite(rotate) &&
      Math.abs(rotate) <= 180
    )
      output[key] = { x, y, scale, rotate };
  }
  return output;
}

let savedLayout: Layout = {};
/** The layout being edited; it only reaches matches once saved. */
export let workingLayout: Layout = {};

/** Reads the saved layout and starts editing from it. */
export function loadLayout() {
  try {
    savedLayout = sanitiseLayout(JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}'));
  } catch {
    /* unavailable */
  }
  workingLayout = structuredClone(savedLayout);
}

const layoutIndex = (slot: SlotId) =>
  slot === 'handR'
    ? 0
    : slot === 'handStaff'
      ? picked.staff
      : slot === 'feetL' || slot === 'feetR'
        ? picked.feet
        : picked[slot];
/** Layout key of the asset currently chosen for a slot. */
export const layoutId = (slot: SlotId) => slot + ':' + layoutIndex(slot);
/** The adjustment being edited for a slot's current asset. */
export const layoutValue = (slot: SlotId): LayoutAdjustment =>
  workingLayout[layoutId(slot)] || LAYOUT_DEFAULTS;

/** Sets one field of a slot's adjustment in the working layout. */
export function setLayoutField(slot: SlotId, patch: Partial<LayoutAdjustment>) {
  workingLayout[layoutId(slot)] = { ...LAYOUT_DEFAULTS, ...layoutValue(slot), ...patch };
}
/** Drops a slot's adjustment, back to the default placement. */
export function clearLayoutPiece(slot: SlotId) {
  delete workingLayout[layoutId(slot)];
}

/** Saves the working layout and tells the in-match renderer. Returns false if storage failed. */
export function saveLayout(): boolean {
  savedLayout = sanitiseLayout(workingLayout);
  let stored = true;
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(savedLayout));
  } catch {
    stored = false;
  }
  window.dispatchEvent(new CustomEvent('arcane-wizard-layout', { detail: savedLayout }));
  return stored;
}
