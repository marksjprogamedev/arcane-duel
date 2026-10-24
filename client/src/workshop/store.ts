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
import {
  sanitiseLayout,
  type Layout,
  type LayoutAdjustment,
  type PairAlignments,
  type PairKind,
  type SharedWorkshop,
  type SharedWorkshopResponse,
} from '../../../shared/workshopShared';

const APPEARANCE_KEY = 'arcane-wizard-workshop';
// The piece layout and the pair alignments are NOT kept in browser storage: one shared copy lives on
// the server (shared/workshopShared.ts, GET/PUT /api/workshop-layouts) so every browser draws the same.
// The bundled copy (shared-workshop.json and DEFAULT_PAIR_ALIGNMENTS) is the fallback until it arrives.
export type { Layout, LayoutAdjustment, PairAlignments, PairKind };
/** Approved pair alignments: the bundled fallback, replaced by the server's copy when it loads. */
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
/** Resets the pair alignments to the shared copy (dropping unpublished session edits). */
export function loadPairs() {
  for (const kind of ['hatHead', 'headBody'] as PairKind[]) {
    for (const key of Object.keys(pairAlignments[kind])) delete pairAlignments[kind][key];
    Object.assign(pairAlignments[kind], structuredClone(DEFAULT_PAIR_ALIGNMENTS[kind]));
  }
}
export function startPairEditing(kind: PairKind | null) {
  editingPair = kind;
  pairDraft = kind ? { ...pieceLayout(pairSlot(kind), false) } : null;
}
export function editPairField(patch: Partial<LayoutAdjustment>) {
  if (editingPair && pairDraft) pairDraft = { ...pairDraft, ...patch };
}
/** Applies the pair being edited for this session; `publishShared` makes it everyone's. */
export function saveCurrentPair(): boolean {
  if (!editingPair || !pairDraft) return false;
  pairAlignments[editingPair][pairKey(editingPair)] = { ...pairDraft };
  window.dispatchEvent(
    new CustomEvent('arcane-wizard-pairs', { detail: structuredClone(pairAlignments) }),
  );
  return true;
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
  saveAppearance();
  window.dispatchEvent(new CustomEvent('arcane-wizard-layout', { detail: savedLayout }));
  window.dispatchEvent(new CustomEvent('arcane-wizard-workshop-imported'));
  return {
    kind: 'layout',
    appearance: Object.keys(nextAppearance).length,
    layout: Object.keys(nextLayout).length,
  };
}

export const LAYOUT_DEFAULTS: LayoutAdjustment = { x: 0, y: 0, scale: 1, rotate: 0 };
/** The shared layout: bundled in every client, replaced in place by the server's copy when it loads. */
export const DEFAULT_LAYOUT: Layout = structuredClone(sharedWorkshop.layout);

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

export { sanitiseLayout };

let savedLayout: Layout = { ...DEFAULT_LAYOUT };
/** The layout being edited; it only reaches matches once saved. */
export let workingLayout: Layout = {};

/** Starts editing from the shared layout (and pairs), dropping unpublished session edits. */
export function loadLayout() {
  savedLayout = { ...DEFAULT_LAYOUT };
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

/** Applies the working layout for this session and tells the in-match renderer. */
export function saveLayout(): boolean {
  savedLayout = sanitiseLayout(workingLayout);
  window.dispatchEvent(new CustomEvent('arcane-wizard-layout', { detail: savedLayout }));
  return true;
}

// ---- the shared copy on the server ----

/** True once the server says the logged-in account may publish. */
export let canPublishShared = false;

const currentShared = (): SharedWorkshop => ({
  layout: DEFAULT_LAYOUT,
  pairs: DEFAULT_PAIR_ALIGNMENTS,
});

function applyShared(doc: SharedWorkshop) {
  for (const key of Object.keys(DEFAULT_LAYOUT)) delete DEFAULT_LAYOUT[key];
  Object.assign(DEFAULT_LAYOUT, doc.layout);
  for (const kind of ['hatHead', 'headBody'] as PairKind[]) {
    for (const key of Object.keys(DEFAULT_PAIR_ALIGNMENTS[kind]))
      delete DEFAULT_PAIR_ALIGNMENTS[kind][key];
    Object.assign(DEFAULT_PAIR_ALIGNMENTS[kind], doc.pairs[kind]);
  }
  loadLayout();
  window.dispatchEvent(new CustomEvent('arcane-wizard-layout', { detail: savedLayout }));
  window.dispatchEvent(
    new CustomEvent('arcane-wizard-pairs', { detail: structuredClone(pairAlignments) }),
  );
  window.dispatchEvent(new CustomEvent('arcane-wizard-workshop-imported'));
}

/** Fetches the shared layouts; on any failure the bundled copy stays. Safe to call again. */
export async function loadSharedWorkshop(): Promise<void> {
  try {
    const res = await fetch('/api/workshop-layouts', { cache: 'no-store' });
    if (!res.ok) return;
    const body = (await res.json()) as SharedWorkshopResponse;
    canPublishShared = body.canEdit === true;
    // unchanged copies are left alone, so asking again never wipes edits being made
    if (body.shared && JSON.stringify(body.shared) !== JSON.stringify(currentShared()))
      applyShared(body.shared);
  } catch {
    /* offline or no database: the bundled layouts stay */
  }
}

export type PublishResult = 'published' | 'not-allowed' | 'failed';

/** Publishes this session's layout and pairs as the shared copy, for editors only. */
export async function publishShared(): Promise<PublishResult> {
  if (!canPublishShared) return 'not-allowed';
  try {
    const res = await fetch('/api/workshop-layouts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout: savedLayout, pairs: pairAlignments }),
    });
    if (res.status === 401 || res.status === 403) {
      canPublishShared = false;
      return 'not-allowed';
    }
    if (!res.ok) return 'failed';
    const body = (await res.json()) as SharedWorkshopResponse;
    if (body.shared) applyShared(body.shared);
    return 'published';
  } catch {
    return 'failed';
  }
}
