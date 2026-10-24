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
import sharedWorkshop from './shared-workshop.json';

const APPEARANCE_KEY = 'arcane-wizard-workshop';
// Offsets are measured in Workshop preview pixels and shared with the game renderer.
// Keys include the chosen asset index, so adjusting one robe never moves the others.
const LAYOUT_KEY = 'arcane-wizard-layout';
const SHARED_LAYOUT_MIGRATION_KEY = 'arcane-wizard-shared-layout-2026-10';
const SHIELD_LAYOUT_MIGRATION_KEY = 'arcane-wizard-shield-layout-2026-10';
const SHIELD_LAYOUT_ROLLBACK_KEY = 'arcane-wizard-shield-layout-rollback-2026-10';
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

export type WorkshopImportResult =
  | { kind: 'pairs'; hatHead: number; headBody: number }
  | { kind: 'layout'; appearance: number; layout: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Imports either an exported pair file or the JSON produced by Copy layout. */
export function importWorkshopJson(value: unknown): WorkshopImportResult | null {
  if (!isRecord(value)) return null;

  if ('pairs' in value) {
    const source = value.pairs;
    if (value.version !== 1 || !isRecord(source)) return null;
    const next: PairAlignments = { hatHead: {}, headBody: {} };
    for (const kind of ['hatHead', 'headBody'] as const) {
      if (!isRecord(source[kind])) return null;
      for (const [key, raw] of Object.entries(source[kind])) {
        if (!/^\d+:\d+$/.test(key)) return null;
        const adjustment = sanitiseLayout({ 'head:0': raw })['head:0'];
        if (!adjustment) return null;
        next[kind][key] = adjustment;
      }
    }

    Object.assign(pairAlignments.hatHead, next.hatHead);
    Object.assign(pairAlignments.headBody, next.headBody);
    try {
      localStorage.setItem(PAIRS_KEY, JSON.stringify(pairAlignments));
    } catch {
      /* Keep imported pairs active for this session when storage is blocked. */
    }
    window.dispatchEvent(
      new CustomEvent('arcane-wizard-pairs', { detail: structuredClone(pairAlignments) }),
    );
    return {
      kind: 'pairs',
      hatHead: Object.keys(next.hatHead).length,
      headBody: Object.keys(next.headBody).length,
    };
  }

  if (!isRecord(value.appearance) || !isRecord(value.layout)) return null;
  const nextAppearance: Partial<Appearance> = {};
  let nextSkin: string | null = null;
  for (const [key, raw] of Object.entries(value.appearance)) {
    if (key === 'skin') {
      if (typeof raw !== 'string' || !SKIN_COLORS.includes(raw)) return null;
      nextSkin = raw;
      continue;
    }
    if (!(Object.keys(DEFAULTS) as PartKey[]).includes(key as PartKey)) return null;
    if (!isAvailablePart(key as PartKey, raw)) return null;
    nextAppearance[key as PartKey] = raw;
  }
  if (!Object.keys(nextAppearance).length && nextSkin === null) return null;
  if (
    value.robeColor !== undefined &&
    (typeof value.robeColor !== 'string' || !ROBE_COLORS.includes(value.robeColor))
  )
    return null;
  if (
    value.hatColor !== undefined &&
    (typeof value.hatColor !== 'string' || !ROBE_COLORS.includes(value.hatColor))
  )
    return null;
  const nextLayout = sanitiseLayout(value.layout);
  if (Object.keys(nextLayout).length !== Object.keys(value.layout).length) return null;

  Object.assign(picked, nextAppearance);
  if (nextSkin !== null) setSkinTone(nextSkin);
  if (typeof value.robeColor === 'string') setRobeColor(value.robeColor);
  if (typeof value.hatColor === 'string') setHatColor(value.hatColor);
  savedLayout = { ...DEFAULT_LAYOUT, ...nextLayout };
  workingLayout = structuredClone(savedLayout);
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(nextLayout));
  } catch {
    /* Keep the imported layout active for this session when storage is blocked. */
  }
  saveAppearance();
  window.dispatchEvent(new CustomEvent('arcane-wizard-layout', { detail: savedLayout }));
  window.dispatchEvent(new CustomEvent('arcane-wizard-workshop-imported'));
  return {
    kind: 'layout',
    appearance: Object.keys(nextAppearance).length,
    layout: Object.keys(nextLayout).length,
  };
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
/** Shared Workshop data bundled into every client, in the same format as exported JSON. */
export const DEFAULT_LAYOUT: Layout = sharedWorkshop.layout;

/** The current choice for each part. Mutated in place so every module sees the same object. */
export const picked: Appearance = { ...DEFAULTS };

/** Skin tone for the grayscale heads. Read through the live binding; change with setSkinTone. */
export let skinTone = DEFAULT_SKIN;
export let robeColor = DEFAULT_ROBE_COLOR;
export let hatColor = DEFAULT_ROBE_COLOR;
export function setRobeColor(color: string) {
  if (ROBE_COLORS.includes(color)) robeColor = color;
}
export function setHatColor(color: string) {
  if (ROBE_COLORS.includes(color)) hatColor = color;
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
    if (saved && typeof saved === 'object' && ROBE_COLORS.includes(saved.hatColor))
      hatColor = saved.hatColor;
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
    localStorage.setItem(
      APPEARANCE_KEY,
      JSON.stringify({ ...picked, skin: skinTone, robeColor, hatColor }),
    );
  } catch {
    /* Keep the current session working. */
  }
  window.dispatchEvent(
    new CustomEvent('arcane-wizard-appearance', {
      detail: { ...picked, skin: skinTone, robeColor, hatColor },
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
  let rolledBackShieldOffsets = false;
  let appliedSharedLayout = false;
  try {
    if (localStorage.getItem(SHARED_LAYOUT_MIGRATION_KEY) !== '1') {
      // Older browsers may have a private layout that would otherwise hide the shared defaults.
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(DEFAULT_LAYOUT));
      localStorage.setItem(SHARED_LAYOUT_MIGRATION_KEY, '1');
      appliedSharedLayout = true;
    }
    const userLayout = sanitiseLayout(JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}'));
    if (
      localStorage.getItem(SHIELD_LAYOUT_MIGRATION_KEY) === '1' &&
      localStorage.getItem(SHIELD_LAYOUT_ROLLBACK_KEY) !== '1'
    ) {
      const migratedRound = userLayout['off:12'];
      const migratedTall = userLayout['off:13'];
      if (
        migratedRound?.x === -20 &&
        migratedRound.y === -19 &&
        migratedRound.scale === 1 &&
        migratedRound.rotate === 0
      )
        userLayout['off:12'] = DEFAULT_LAYOUT['off:12'];
      if (
        migratedTall?.x === -18 &&
        migratedTall.y === -21 &&
        migratedTall.scale === 1.7 &&
        migratedTall.rotate === 0
      )
        userLayout['off:13'] = DEFAULT_LAYOUT['off:13'];
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(userLayout));
      localStorage.setItem(SHIELD_LAYOUT_ROLLBACK_KEY, '1');
      rolledBackShieldOffsets = true;
    }
    savedLayout = {
      ...DEFAULT_LAYOUT,
      ...userLayout,
    };
  } catch {
    /* unavailable */
  }
  workingLayout = structuredClone(savedLayout);
  if ((rolledBackShieldOffsets || appliedSharedLayout) && typeof window !== 'undefined')
    window.dispatchEvent(new CustomEvent('arcane-wizard-layout', { detail: savedLayout }));
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
