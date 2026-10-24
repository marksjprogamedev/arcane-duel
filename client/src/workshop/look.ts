// A wizard's whole Workshop look: the chosen part of each slot plus the skin, robe and hat colours. This is what
// is saved in the browser and the account, sent to the server as `WorkshopLook` and drawn in matches. Pure, so
// the same checks serve a look read from storage and one that arrived from another player.
import {
  DEFAULTS,
  DEFAULT_ROBE_COLOR,
  DEFAULT_SKIN,
  ROBE_COLORS,
  SKIN_COLORS,
  isAvailablePart,
} from './parts';
import type { Appearance } from './parts';

export type Look = Appearance & { skin: string; robeColor: string; hatColor: string };

/** What an unreadable or missing look falls back to (the Workshop's defaults). */
export const DEFAULT_LOOK: Look = {
  ...DEFAULTS,
  skin: DEFAULT_SKIN,
  robeColor: DEFAULT_ROBE_COLOR,
  hatColor: DEFAULT_ROBE_COLOR,
};

/**
 * Any value read as a look: parts and colours that are not on offer (retired choices, odd values, a
 * look from a newer or older version) fall back to the default for that slot, so it never throws.
 */
export function parseLook(value: unknown): Look {
  const result = { ...DEFAULT_LOOK };
  if (!value || typeof value !== 'object') return result;
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(DEFAULTS) as (keyof Appearance)[]) {
    const entry = raw[key];
    if (isAvailablePart(key, entry)) result[key] = entry;
  }
  if (typeof raw.skin === 'string' && SKIN_COLORS.includes(raw.skin)) result.skin = raw.skin;
  if (typeof raw.robeColor === 'string' && ROBE_COLORS.includes(raw.robeColor))
    result.robeColor = raw.robeColor;
  if (typeof raw.hatColor === 'string' && ROBE_COLORS.includes(raw.hatColor))
    result.hatColor = raw.hatColor;
  return result;
}
