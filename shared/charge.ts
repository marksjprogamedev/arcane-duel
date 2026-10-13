import type { SpellName } from './types';

/** All projectile attacks charged by holding the mouse button. */
export const CHARGE_TICKS = 90;
export const CHARGE_MOVEMENT_MULTIPLIER = 0.55;
export const CHARGE_SPELLS: readonly SpellName[] = [
  'EARTH', 'MAGMA', 'STEAM', 'PLASMA', 'STORM', 'ICE', 'MAGNETIC',
];
export function isChargeableSpell(spell: SpellName): boolean {
  return CHARGE_SPELLS.includes(spell);
}
export function chargeMovementMultiplier(charging: boolean): number {
  return charging ? CHARGE_MOVEMENT_MULTIPLIER : 1;
}
