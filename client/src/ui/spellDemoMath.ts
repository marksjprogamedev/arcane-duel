// Pure helpers for the spellbook's demo arena and element pages (tested in tests/client).
import { chargeableVariant, continuousVariant } from '../../../shared/sim/variants';
import { MAPS, type MapDef } from '../../../shared/maps';
import type { SpellLoadout, SpellName } from '../../../shared/types';

/**
 * The part of the world the demo canvas shows: a small patch of the Enchanted Arena's floor, about
 * as many units across as the canvas is pixels, so everything is drawn at its match size.
 */
export const DEMO_VIEW = { x: 273, y: 160, w: 520, h: 270 };

/**
 * The demo's map: the two wizards 300 units apart (about where a duel is fought), two pillars
 * between them above and below the line of fire, and walls that keep both wizards in view.
 */
export const DEMO_MAP: MapDef = {
  ...MAPS.enchanted,
  bounds: { left: 300, right: 766, top: 250, bottom: 400 },
  spawns: { p: { x: 383, y: 300 }, e: { x: 683, y: 300 } },
  obstacles: [
    { x: 533, y: 210, r: 25 },
    { x: 533, y: 380, r: 25 },
  ],
};

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
