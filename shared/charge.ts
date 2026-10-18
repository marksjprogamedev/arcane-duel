import type { SpellName } from './types';

/** Projectile attacks charge by holding the mouse button; damage grows from 1x to 3x over this long. */
export const CHARGE_TICKS = 90;
/** A fully charged attack is let go by itself after being held this much longer (3 seconds). */
export const AUTO_RELEASE_TICKS = 180;
/** Suppress the visual meter during ordinary clicks (< 0.2 seconds). */
export const CHARGE_METER_DELAY_TICKS = 12;
export function showChargeMeter(chargeTicks: number, chargeSpell: SpellName | null): boolean {
  return chargeSpell !== null && chargeTicks >= CHARGE_METER_DELAY_TICKS;
}
/** How far the hold has built up, which `input.charge` keeps counting until the auto-release. */
export const MAX_HOLD_TICKS = CHARGE_TICKS + AUTO_RELEASE_TICKS;
export const CHARGE_MOVEMENT_MULTIPLIER = 0.55;
/** Spells that fire continuously while the button is held, instead of charging. */
export const CONTINUOUS_SPELLS: readonly SpellName[] = ['FIRE', 'WATER', 'LIGHTNING'];
export function isContinuousSpell(spell: string): boolean {
  return (CONTINUOUS_SPELLS as readonly string[]).includes(spell);
}
export const CHARGE_SPELLS: readonly SpellName[] = [
  'EARTH',
  'MAGMA',
  'STEAM',
  'PLASMA',
  'STORM',
  'ICE',
  'MAGNETIC',
];
export function isChargeableSpell(spell: SpellName): boolean {
  return CHARGE_SPELLS.includes(spell);
}
/** Whether holding `spell` charges it now (Magma can't charge while on cooldown). */
export function canChargeSpell(spell: SpellName, magmaCD: number): boolean {
  return isChargeableSpell(spell) && !(spell === 'MAGMA' && magmaCD > 0);
}
/** Walking slows only once a charge is really building, not on a plain click. */
export function chargeMovementMultiplier(chargeTicks: number, chargeSpell: SpellName | null) {
  return showChargeMeter(chargeTicks, chargeSpell) ? CHARGE_MOVEMENT_MULTIPLIER : 1;
}
