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
 * The demo's map: the two wizards 240 units apart, inside the shortest reach (Flamethrower and
 * Lightning, 300), standing low so the status bars stacked over their heads stay in view; two
 * pillars above the line of fire, and walls that keep both wizards on screen.
 */
export const DEMO_MAP: MapDef = {
  ...MAPS.enchanted,
  bounds: { left: 300, right: 766, top: 340, bottom: 405 },
  spawns: { p: { x: 403, y: 390 }, e: { x: 643, y: 390 } },
  obstacles: [
    { x: 473, y: 235, r: 25 },
    { x: 553, y: 235, r: 25 },
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
