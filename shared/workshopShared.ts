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
