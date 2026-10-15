import { isChargeableSpell, isContinuousSpell } from '../charge';
import type { SpellLoadout, SpellName, SpellVariant } from '../types';

export function spellVariant(spell: SpellName, loadout: SpellLoadout = {}): SpellVariant {
  return loadout[spell] ?? 'default';
}
export function continuousVariant(spell: SpellName, loadout: SpellLoadout = {}): boolean {
  const variant = spellVariant(spell, loadout);
  return (
    variant === 'pebbles' ||
    variant === 'jet' ||
    (variant !== 'fireball' && isContinuousSpell(spell))
  );
}
export function chargeableVariant(spell: SpellName, loadout: SpellLoadout = {}): boolean {
  return spellVariant(spell, loadout) === 'default' && isChargeableSpell(spell);
}
export function variantName(spell: SpellName, loadout: SpellLoadout = {}): string {
  switch (spellVariant(spell, loadout)) {
    case 'pebbles':
      return 'PEBBLE SPRAY';
    case 'fireball':
      return 'FIREBALL';
    case 'jet':
      return 'PRESSURE JET';
    case 'shards':
      return 'FROST SHARDS';
    default:
      return spell;
  }
}
