// Pure helpers for the spellbook's demo arena and element pages (tested in tests/client).
import { chargeableVariant, continuousVariant } from '../../../shared/sim/variants';
import type { SpellLoadout, SpellName } from '../../../shared/types';

/** The part of the arena the demo canvas shows (world units): both wizards and all four pillars. */
export const DEMO_VIEW = { x: 120, y: 85, w: 827, h: 430 };

/** Where a pointer at (`px`, `py`) on a canvas `width` x `height` pixels big points in the world. */
export function demoWorldPoint(px: number, py: number, width: number, height: number) {
  return {
    x: DEMO_VIEW.x + (px / width) * DEMO_VIEW.w,
    y: DEMO_VIEW.y + (py / height) * DEMO_VIEW.h,
  };
}

/** How to cast the chosen spell, shown under the demo. */
export function demoHint(spell: SpellName, loadout: SpellLoadout): string {
  if (continuousVariant(spell, loadout)) return 'Hold the mouse button to keep casting.';
  if (chargeableVariant(spell, loadout)) return 'Hold to charge, release to cast.';
  return 'Click to cast at the cursor.';
}

/** The element `step` places after `from` in `order`, wrapping round at the ends. */
export function stepElement(order: readonly SpellName[], from: SpellName, step: number): SpellName {
  const i = order.indexOf(from);
  return order[(((i + step) % order.length) + order.length) % order.length];
}
