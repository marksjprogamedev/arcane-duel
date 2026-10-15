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
/** Every projectile sidegrade charges; streams and beams remain continuous. */
export function projectileVariant(spell: SpellName, loadout: SpellLoadout = {}): boolean {
  return ['fireball', 'shards', 'waterorb', 'thunderbolt', 'boulder', 'lance', 'volley']
    .includes(spellVariant(spell, loadout));
}
export function chargeableVariant(spell: SpellName, loadout: SpellLoadout = {}): boolean {
  return projectileVariant(spell, loadout) || (spellVariant(spell, loadout) === 'default' && isChargeableSpell(spell));
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
    case 'waterorb': return 'TIDAL ORB';
    case 'thunderbolt': return 'THUNDERBOLT';
    case 'boulder': return 'BOULDER';
    case 'lance': return 'PLASMA LANCE';
    case 'volley': return 'STORM VOLLEY';
    default:
      return spell;
  }
}
