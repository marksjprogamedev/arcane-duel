// The spellbook modal's choices, read from its selects (one per spell, `variant<SPELL>`).

import { sanitizeLoadout, SPELL_VARIANTS } from '../../../shared/sim/variants';
import type { SpellLoadout, SpellName } from '../../../shared/types';
import { $ } from '../dom';

/** What the spellbook currently has picked: only real variants, the rest play as the original. */
export function readLoadout(): SpellLoadout {
  return sanitizeLoadout(
    Object.fromEntries(
      (Object.keys(SPELL_VARIANTS) as SpellName[]).map((spell) => [
        spell,
        $<HTMLSelectElement>('variant' + spell).value,
      ]),
    ),
  );
}

/** Calls `onChange` whenever any spell choice changes. */
export function onLoadoutChange(onChange: () => void) {
  for (const spell of Object.keys(SPELL_VARIANTS))
    $<HTMLSelectElement>('variant' + spell).addEventListener('change', onChange);
}
