// The pure part of the action bar (no DOM), so it can be tested: which spell tiles it shows.
import { ELEMENT_NAMES, COMBO_OF } from '../../../../shared/constants';
import type { SpellName } from '../../../../shared/types';

/** The classic bar: every spell at once. */
export const LEGACY_SPELLS: readonly SpellName[] = [
  'FIRE',
  'WATER',
  'LIGHTNING',
  'EARTH',
  'STEAM',
  'PLASMA',
  'MAGMA',
  'STORM',
  'ICE',
  'MAGNETIC',
];

/** The four elements, in number-key order. */
export const BASE_SPELLS: readonly SpellName[] = ELEMENT_NAMES;

export interface BarState {
  /** The "legacy bar" tick box. */
  legacy: boolean;
  /** Element numbers (0 to 3) loaded for the next cast, in the order they were picked. */
  loaded: readonly number[];
  /** Heal is armed (E): no element is picked yet. */
  healArmed: boolean;
  /** The player stepped back to the four elements while an element is still loaded. */
  showBase: boolean;
}

/** The element whose combinations the bar is showing, or null while it shows the four elements. */
export function partnerOf(bar: BarState): number | null {
  if (bar.legacy || bar.healArmed || bar.showBase || bar.loaded.length === 0) return null;
  return bar.loaded[0];
}

/**
 * The tiles to show. The default bar shows the four elements; once one is loaded, each of the
 * other three tiles turns into the combination of that element with it (Fire loaded: Water becomes
 * Steam, Lightning Plasma, Earth Magma) and its own tile stays as the element on its own.
 */
export function barSpells(bar: BarState): readonly SpellName[] {
  if (bar.legacy) return LEGACY_SPELLS;
  const first = partnerOf(bar);
  if (first === null) return BASE_SPELLS;
  return BASE_SPELLS.map((spell, i) =>
    i === first ? spell : COMBO_OF[[first, i].sort((a, b) => a - b).join(',')],
  );
}
