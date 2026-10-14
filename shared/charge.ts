import type { SpellName } from './types';

/** All projectile attacks charged by holding the mouse button. */
export const CHARGE_TICKS = 90;
/** Holding shorter than this is an ordinary cast; longer ones gain power up to CHARGE_TICKS. */
export const CHARGE_POWER_MIN_TICKS = 20;
/** Suppress the visual meter during ordinary clicks (< 0.2 seconds). */
export const CHARGE_METER_DELAY_TICKS = 12;
export function showChargeMeter(chargeTicks: number, chargeSpell: SpellName | null): boolean {
  return (
    chargeSpell !== null &&
    isChargeableSpell(chargeSpell) &&
    chargeTicks >= CHARGE_METER_DELAY_TICKS
  );
}
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
export function chargeMovementMultiplier(charging: boolean): number {
  return charging ? CHARGE_MOVEMENT_MULTIPLIER : 1;
}
