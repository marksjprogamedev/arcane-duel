import { isChargeableSpell, isContinuousSpell } from '../charge';
import type { SpellLoadout, SpellName, SpellVariant } from '../types';

/**
 * Every spell's original name, then its alternatives as (variant, name) pairs. A spell with none
 * (Lightning, Steam) is just its original.
 */
export const SPELL_VARIANTS: Record<
  SpellName,
  readonly [string, SpellVariant?, string?, SpellVariant?, string?]
> = {
  FIRE: ['Flamethrower', 'fireball', 'Fireball', 'pyro_disc', 'Pyrodisk'],
  WATER: ['Water Spray', 'water_surge', 'Water Surge'],
  LIGHTNING: ['Lightning Bolt'],
  EARTH: ['Boulder', 'pebbles', 'Pebble Flurry'],
  MAGMA: ['Molten Core', 'lava_pool', 'Lava Pool'],
  ICE: ['Icicle', 'shards', 'Frost Shards'],
  PLASMA: ['Plasma Flare', 'plasma_beam', 'Plasma Beam'],
  STEAM: ['Vapor Blast'],
  STORM: ['Tempest Bolt', 'thundercloud', 'Thundercloud'],
  MAGNETIC: ['Gravity Shot', 'magnetic_pull', 'Magnetic Pull'],
};
/** The spells that have at least one alternative (the ones the spellbook offers). */
export const VARIANT_SPELLS = (Object.keys(SPELL_VARIANTS) as SpellName[]).filter(
  (spell) => SPELL_VARIANTS[spell].length > 1,
);
const CONTINUOUS: readonly SpellVariant[] = ['pebbles', 'plasma_beam', 'magnetic_pull'];
const PROJECTILES: readonly SpellVariant[] = ['fireball', 'pyro_disc', 'shards'];
/**
 * A loadout from outside (a network message) reduced to what is allowed: only known spells, each
 * with one of the variants it offers. Anything else is dropped, so it plays as the original.
 */
export function sanitizeLoadout(raw: unknown): SpellLoadout {
  const out: SpellLoadout = {};
  if (!raw || typeof raw !== 'object') return out;
  const given = raw as Record<string, unknown>;
  for (const spell of Object.keys(SPELL_VARIANTS) as SpellName[]) {
    const v = given[spell];
    if (typeof v === 'string' && v !== 'default' && listed(spell, v))
      out[spell] = v as SpellVariant;
  }
  return out;
}
/** True if `v` is one of the variants `spell` offers. */
function listed(spell: SpellName, v: string) {
  const [, a, , b] = SPELL_VARIANTS[spell]; // the ids sit at 1 and 3; the others are display names
  return v === a || v === b;
}
export function spellVariant(spell: SpellName, loadout: SpellLoadout = {}): SpellVariant {
  const v = loadout[spell];
  // A variant this spell no longer offers (an old saved choice) falls back to the original.
  return v && listed(spell, v) ? v : 'default';
}
export function continuousVariant(spell: SpellName, loadout: SpellLoadout = {}): boolean {
  const v = spellVariant(spell, loadout);
  return CONTINUOUS.includes(v) || (v === 'default' && isContinuousSpell(spell));
}
export function projectileVariant(spell: SpellName, loadout: SpellLoadout = {}): boolean {
  return PROJECTILES.includes(spellVariant(spell, loadout));
}
/** Projectile variants that always fly at full strength: holding the button doesn't charge them. */
export const isUncharged = (v: SpellVariant) => v === 'pyro_disc';
export function chargeableVariant(spell: SpellName, loadout: SpellLoadout = {}): boolean {
  const v = spellVariant(spell, loadout);
  return (
    (!isUncharged(v) && PROJECTILES.includes(v)) || (v === 'default' && isChargeableSpell(spell))
  );
}
export function variantName(spell: SpellName, loadout: SpellLoadout = {}): string {
  const v = spellVariant(spell, loadout);
  const [base, a, aName, b, bName] = SPELL_VARIANTS[spell];
  return v === a ? (aName ?? base) : v === b ? (bName ?? base) : base;
}

/** Resolve legacy artwork filenames/atlas labels independently of display names. */
export function spellArtName(displayName: string): string {
  const original: Record<string, string> = {"Lightning Bolt":"Lightning","Boulder":"Earth Shot","Vapor Blast":"Steam Shot","Plasma Flare":"Plasma Shot","Tempest Bolt":"Storm Shot","Gravity Shot":"Magnetic Shot","Icicle":"Ice Shot","Molten Core":"Magma Shot"};
  return original[displayName] ?? displayName;
}
