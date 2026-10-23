// Workshop state and its browser storage: the chosen appearance and the per-asset layout.
// The in-match renderer listens for the two window events dispatched from here.
import {
  DEFAULTS,
  DEFAULT_SKIN,
  DEFAULT_ROBE_COLOR,
  ROBE_COLORS,
  isAvailablePart,
  SKIN_COLORS,
} from './parts';
import type { Appearance, PartKey, SlotId } from './parts';

const APPEARANCE_KEY = 'arcane-wizard-workshop';
// Offsets are measured in Workshop preview pixels and shared with the game renderer.
// Keys include the chosen asset index, so adjusting one robe never moves the others.
const LAYOUT_KEY = 'arcane-wizard-layout';
const PAIRS_KEY = 'arcane-wizard-pair-alignments';
export type PairKind = 'hatHead' | 'headBody';
export type PairAlignments = Record<PairKind, Record<string, LayoutAdjustment>>;
/** Approved pair alignments, baked into the game for every new browser.
 * Local developer edits can override these without changing the code defaults. */
export const DEFAULT_PAIR_ALIGNMENTS: PairAlignments = {
  hatHead: {
    '16:6': { x: 3, y: 62, scale: 1, rotate: 0 },
    '16:1': { x: 3, y: 41, scale: 1, rotate: -148 },
  },
  headBody: {},
};
export const pairAlignments: PairAlignments = structuredClone(DEFAULT_PAIR_ALIGNMENTS);
export let editingPair: PairKind | null = null;
let pairDraft: LayoutAdjustment | null = null;
const pairKey = (kind: PairKind, a: Appearance = picked) =>
  kind === 'hatHead' ? `${a.head}:${a.hat}` : `${a.head}:${a.body}`;
const pairSlot = (kind: PairKind) => (kind === 'hatHead' ? 'hat' : 'head');
export const pairCount = (kind: PairKind) => Object.keys(pairAlignments[kind]).length;
export function loadPairs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PAIRS_KEY) || '{}');
    for (const kind of ['hatHead', 'headBody'] as PairKind[]) {
      for (const [key, value] of Object.entries(saved?.[kind] || {})) {
        if (!/^\d+:\d+$/.test(key)) continue;
        const valid = sanitiseLayout({ ['head:0']: value })['head:0'];
        if (valid) pairAlignments[kind][key] = valid;
      }
    }
  } catch {
    /* storage may be blocked */
  }
}
export function startPairEditing(kind: PairKind | null) {
  editingPair = kind;
  pairDraft = kind ? { ...pieceLayout(pairSlot(kind), false) } : null;
}
export function editPairField(patch: Partial<LayoutAdjustment>) {
  if (editingPair && pairDraft) pairDraft = { ...pairDraft, ...patch };
}
export function saveCurrentPair(): boolean {
  if (!editingPair || !pairDraft) return false;
  pairAlignments[editingPair][pairKey(editingPair)] = { ...pairDraft };
  let ok = true;
  try {
    localStorage.setItem(PAIRS_KEY, JSON.stringify(pairAlignments));
  } catch {
    ok = false;
  }
  window.dispatchEvent(
    new CustomEvent('arcane-wizard-pairs', { detail: structuredClone(pairAlignments) }),
  );
  return ok;
}
/** Stored/editable coordinates, before following the head's pair offset. */
function pieceLayout(
  slot: SlotId,
  includeDraft = true,
  a: Appearance = picked,
  layout: Layout = workingLayout,
): LayoutAdjustment {
  const index =
    slot === 'handR'
      ? 0
      : slot === 'handStaff'
        ? a.staff
        : slot === 'feetL' || slot === 'feetR'
          ? a.feet
          : a[slot];
  const base = layout[`${slot}:${index}`] || LAYOUT_DEFAULTS;
  const kind: PairKind | null = slot === 'hat' ? 'hatHead' : slot === 'head' ? 'headBody' : null;
  const saved = kind ? pairAlignments[kind][pairKey(kind, a)] : null;
  return (kind && includeDraft && editingPair === kind && pairDraft) || saved || base;
}

/** Render coordinates. Apply attachment offsets once, without writing them back to a save. */
export function effectiveLayout(
  slot: SlotId,
  includeDraft = true,
  a: Appearance = picked,
  layout: Layout = workingLayout,
): LayoutAdjustment {
  const result = pieceLayout(slot, includeDraft, a, layout);
  if (slot === 'hat') {
    // Keep the hat attached when a head/body alignment shifts the head.
    const headBase = layout[`head:${a.head}`] || LAYOUT_DEFAULTS;
    const headPair = pairAlignments.headBody[pairKey('headBody', a)];
    const head = (includeDraft && editingPair === 'headBody' && pairDraft) || headPair;
    if (head)
      return { ...result, x: result.x + head.x - headBase.x, y: result.y + head.y - headBase.y };
  }
  return result;
}
export function pairExport() {
  return JSON.stringify({ version: 1, pairs: pairAlignments }, null, 2);
}

export type LayoutAdjustment = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  /** Missing in older saves means the original orientation. */
  flipX?: boolean;
};
export type Layout = Record<string, LayoutAdjustment>;

export const LAYOUT_DEFAULTS: LayoutAdjustment = { x: 0, y: 0, scale: 1, rotate: 0 };
/** Approved Workshop layout. Fresh browsers use this; saved edits override it. */
export const DEFAULT_LAYOUT: Layout = {
  'staff:14': { x: 32, y: -28, scale: 1, rotate: 0 },
  'handStaff:14': { x: 27, y: -17, scale: 0.6, rotate: 0 },
  'handStaff:13': { x: 11, y: -16, scale: 1, rotate: 0 },
  'staff:13': { x: 0, y: 0, scale: 1, rotate: 0 },
  'hat:1': { x: 0, y: 0, scale: 1, rotate: 0 },
  'head:16': { x: -9, y: 7, scale: 1, rotate: 0 },
  'handStaff:7': { x: 14, y: -18, scale: 0.8, rotate: 0 },
  'staff:7': { x: 16, y: -32, scale: 1.3, rotate: 18 },
  'body:13': { x: 3, y: 0, scale: 1.4, rotate: 0 },
  'hat:14': { x: -10, y: 50, scale: 1, rotate: -8 },
  'off:12': { x: -20, y: -5, scale: 1, rotate: 0 },
  'off:13': { x: -18, y: -7, scale: 1.7, rotate: 0 },
  'staff:8': { x: 32, y: -28, scale: 1.1, rotate: -12, flipX: true },
  'handStaff:8': { x: 14, y: -10, scale: 0.8, rotate: 0 },
  'off:11': { x: -21, y: -3, scale: 1, rotate: 0 },
  'feetR:9': { x: -3, y: -6, scale: 1, rotate: 0 },
  'feetL:9': { x: 3, y: -6, scale: 1, rotate: 0 },
  'off:0': { x: -16, y: -10, scale: 1, rotate: 0 },
  'head:12': { x: -11, y: -2, scale: 1.1, rotate: 0 },
  'hat:11': { x: 4, y: 12, scale: 1, rotate: 0, flipX: true },
  'body:12': { x: 0, y: -6, scale: 1.2, rotate: 0 },
  'head:9': { x: 0, y: 0, scale: 1, rotate: 0 },
  'body:14': { x: 0, y: -1, scale: 1.3, rotate: 0 },
  'body:15': { x: -8, y: -2, scale: 1.25, rotate: 0 },
  'staff:12': { x: 23, y: -10, scale: 0.85, rotate: 0 },
  'staff:11': { x: 26, y: -19, scale: 1, rotate: 15 },
  'handStaff:11': { x: 17, y: -6, scale: 0.8, rotate: 0 },
  'staff:10': { x: 13, y: -11, scale: 1, rotate: 21 },
  'handStaff:10': { x: 9, y: 3, scale: 0.7, rotate: 0 },
  'staff:6': { x: 19, y: -16, scale: 1, rotate: 0 },
  'handStaff:6': { x: 19, y: -5, scale: 0.65, rotate: 0 },
  'staff:5': { x: 9, y: -13, scale: 1, rotate: 0 },
  'staff:4': { x: -6, y: -89, scale: 1, rotate: 0 },
  'staff:1': { x: 21, y: -6, scale: 1, rotate: 0 },
  'handStaff:1': { x: 12, y: -6, scale: 0.75, rotate: 0 },
};

/** The current choice for each part. Mutated in place so every module sees the same object. */
export const picked: Appearance = { ...DEFAULTS };

/** Skin tone for the grayscale heads. Read through the live binding; change with setSkinTone. */
export let skinTone = DEFAULT_SKIN;
export let robeColor = DEFAULT_ROBE_COLOR;
export function setRobeColor(color: string) {
  if (ROBE_COLORS.includes(color)) robeColor = color;
}
export function setSkinTone(color: string) {
  skinTone = color;
}

/** Replaces the current choice (reset, random). */
export function setPicked(next: Appearance) {
  Object.assign(picked, next);
}

/** Restores allowed pieces only; retired choices fall back to the approved defaults. */
export function loadAppearance() {
  try {
    const saved = JSON.parse(localStorage.getItem(APPEARANCE_KEY) || 'null');
    if (saved && typeof saved === 'object' && SKIN_COLORS.includes(saved.skin))
      skinTone = saved.skin;
    if (saved && typeof saved === 'object' && ROBE_COLORS.includes(saved.robeColor))
      robeColor = saved.robeColor;
    if (saved && typeof saved === 'object')
      for (const key of Object.keys(DEFAULTS) as PartKey[]) {
        picked[key] = isAvailablePart(key, saved[key]) ? saved[key] : DEFAULTS[key];
      }
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
}

/** Saves the appearance and tells the in-match renderer. */
export function saveAppearance() {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...picked, skin: skinTone, robeColor }));
  } catch {
    /* Keep the current session working. */
  }
  window.dispatchEvent(
    new CustomEvent('arcane-wizard-appearance', {
      detail: { ...picked, skin: skinTone, robeColor },
    }),
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
      output[key] = {
        x,
        y,
        scale,
        rotate,
        ...(typeof part.flipX === 'boolean' ? { flipX: part.flipX } : {}),
      };
  }
  return output;
}

let savedLayout: Layout = { ...DEFAULT_LAYOUT };
/** The layout being edited; it only reaches matches once saved. */
export let workingLayout: Layout = {};

/** Reads the saved layout and starts editing from it. */
export function loadLayout() {
  try {
    savedLayout = {
      ...DEFAULT_LAYOUT,
      ...sanitiseLayout(JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}')),
    };
  } catch {
    /* unavailable */
  }
  workingLayout = structuredClone(savedLayout);
  loadPairs();
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
export const layoutValue = (slot: SlotId): LayoutAdjustment => pieceLayout(slot);

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
