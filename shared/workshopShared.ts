// The Wizard Workshop layouts everyone shares: where each piece sits (`layout`) and the hat-head and
// head-body pair alignments (`pairs`). The server stores one copy (`GET`/`PUT /api/workshop-layouts`);
// the Workshop and the in-match renderer both read it. The same checks run on the server (on a save)
// and in the client (on a load), so a bad copy is dropped by both.

export type LayoutAdjustment = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  /** Missing in older saves means the original orientation. */
  flipX?: boolean;
};
export type Layout = Record<string, LayoutAdjustment>;
export type PairKind = 'hatHead' | 'headBody';
export type PairAlignments = Record<PairKind, Record<string, LayoutAdjustment>>;

export interface SharedWorkshop {
  layout: Layout;
  pairs: PairAlignments;
}

/** `GET /api/workshop-layouts`: null `shared` means nothing was published yet (use the bundled one). */
export interface SharedWorkshopResponse {
  shared: SharedWorkshop | null;
  /** True when the logged-in account may publish. */
  canEdit: boolean;
}

export const MAX_SHARED_WORKSHOP_BYTES = 256 * 1024;

const LAYOUT_KEY = /^(head|hat|body|staff|off|handR|handStaff|feetL|feetR):\d+$/;
const PAIR_KEY = /^\d+:\d+$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** One well-formed, in-range adjustment, or null. */
export function sanitiseAdjustment(raw: unknown): LayoutAdjustment | null {
  if (!isRecord(raw)) return null;
  const x = Number(raw.x),
    y = Number(raw.y),
    scale = Number(raw.scale),
    rotate = raw.rotate == null ? 0 : Number(raw.rotate);
  if (
    !Number.isFinite(x) ||
    Math.abs(x) > 150 ||
    !Number.isFinite(y) ||
    Math.abs(y) > 150 ||
    !Number.isFinite(scale) ||
    scale < 0.25 ||
    scale > 3 ||
    !Number.isFinite(rotate) ||
    Math.abs(rotate) > 180
  )
    return null;
  return { x, y, scale, rotate, ...(typeof raw.flipX === 'boolean' ? { flipX: raw.flipX } : {}) };
}

/** Keeps only well-formed, in-range layout entries. */
export function sanitiseLayout(value: unknown): Layout {
  const output: Layout = {};
  if (!isRecord(value)) return output;
  for (const [key, raw] of Object.entries(value)) {
    if (!LAYOUT_KEY.test(key)) continue;
    const adjustment = sanitiseAdjustment(raw);
    if (adjustment) output[key] = adjustment;
  }
  return output;
}

/** Keeps only well-formed pair alignments (`<head>:<hat or body>` keys). */
export function sanitisePairs(value: unknown): PairAlignments {
  const output: PairAlignments = { hatHead: {}, headBody: {} };
  if (!isRecord(value)) return output;
  for (const kind of ['hatHead', 'headBody'] as const) {
    const source = value[kind];
    if (!isRecord(source)) continue;
    for (const [key, raw] of Object.entries(source)) {
      if (!PAIR_KEY.test(key)) continue;
      const adjustment = sanitiseAdjustment(raw);
      if (adjustment) output[kind][key] = adjustment;
    }
  }
  return output;
}

/**
 * Checks a whole copy strictly: anything malformed or out of range makes the whole thing null,
 * so a save never half-applies.
 */
export function parseSharedWorkshop(value: unknown): SharedWorkshop | null {
  if (!isRecord(value) || !isRecord(value.layout) || !isRecord(value.pairs)) return null;
  const layout = sanitiseLayout(value.layout);
  if (Object.keys(layout).length !== Object.keys(value.layout).length) return null;
  const pairs = sanitisePairs(value.pairs);
  for (const kind of ['hatHead', 'headBody'] as const) {
    const source = value.pairs[kind];
    if (source !== undefined && !isRecord(source)) return null;
    if (Object.keys(pairs[kind]).length !== Object.keys(source ?? {}).length) return null;
  }
  return { layout, pairs };
}

/**
 * A change to the shared copy, so two editors working on different pieces or pairs never overwrite
 * each other: each key is set to an adjustment, or to null to remove it.
 */
export interface SharedWorkshopPatch {
  layout?: Record<string, LayoutAdjustment | null>;
  pairs?: Partial<Record<PairKind, Record<string, LayoutAdjustment | null>>>;
}

/** Checks a patch strictly (any bad key or value makes the whole patch null). */
export function parseSharedWorkshopPatch(value: unknown): SharedWorkshopPatch | null {
  if (!isRecord(value)) return null;
  const out: SharedWorkshopPatch = {};
  const entries = (source: unknown, keyOk: RegExp) => {
    if (!isRecord(source)) return null;
    const result: Record<string, LayoutAdjustment | null> = {};
    for (const [key, raw] of Object.entries(source)) {
      if (!keyOk.test(key)) return null;
      if (raw === null) result[key] = null;
      else {
        const adjustment = sanitiseAdjustment(raw);
        if (!adjustment) return null;
        result[key] = adjustment;
      }
    }
    return result;
  };
  if (value.layout !== undefined) {
    const layout = entries(value.layout, LAYOUT_KEY);
    if (!layout) return null;
    out.layout = layout;
  }
  if (value.pairs !== undefined) {
    if (!isRecord(value.pairs)) return null;
    out.pairs = {};
    for (const kind of ['hatHead', 'headBody'] as const) {
      if (value.pairs[kind] === undefined) continue;
      const pairs = entries(value.pairs[kind], PAIR_KEY);
      if (!pairs) return null;
      out.pairs[kind] = pairs;
    }
  }
  return out;
}

export const isEmptyPatch = (patch: SharedWorkshopPatch) =>
  !Object.keys(patch.layout ?? {}).length &&
  !Object.keys(patch.pairs?.hatHead ?? {}).length &&
  !Object.keys(patch.pairs?.headBody ?? {}).length;

/** The shared copy with a patch applied (a new object; `base` is not changed). */
export function applySharedWorkshopPatch(
  base: SharedWorkshop,
  patch: SharedWorkshopPatch,
): SharedWorkshop {
  const next: SharedWorkshop = structuredClone(base);
  const merge = (
    target: Record<string, LayoutAdjustment>,
    changes: Record<string, LayoutAdjustment | null> | undefined,
  ) => {
    for (const [key, adjustment] of Object.entries(changes ?? {})) {
      if (adjustment === null) delete target[key];
      else target[key] = adjustment;
    }
  };
  merge(next.layout, patch.layout);
  merge(next.pairs.hatHead, patch.pairs?.hatHead);
  merge(next.pairs.headBody, patch.pairs?.headBody);
  return next;
}

/** What changed from `base` to `next`: the patch that turns one into the other. */
export function diffSharedWorkshop(
  base: SharedWorkshop,
  next: SharedWorkshop,
): SharedWorkshopPatch {
  const diff = (
    from: Record<string, LayoutAdjustment>,
    to: Record<string, LayoutAdjustment>,
  ): Record<string, LayoutAdjustment | null> => {
    const out: Record<string, LayoutAdjustment | null> = {};
    for (const [key, adjustment] of Object.entries(to))
      if (JSON.stringify(from[key]) !== JSON.stringify(adjustment)) out[key] = adjustment;
    for (const key of Object.keys(from)) if (!(key in to)) out[key] = null;
    return out;
  };
  const patch: SharedWorkshopPatch = {
    layout: diff(base.layout, next.layout),
    pairs: {
      hatHead: diff(base.pairs.hatHead, next.pairs.hatHead),
      headBody: diff(base.pairs.headBody, next.pairs.headBody),
    },
  };
  return patch;
}
