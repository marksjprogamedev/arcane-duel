import { isChargeableSpell, isContinuousSpell } from '../charge';
import type { SpellLoadout, SpellName, SpellVariant } from '../types';

export const SPELL_VARIANTS: Record<
  SpellName,
  readonly [string, SpellVariant, string, SpellVariant?, string?, SpellVariant?, string?]
> = {
  FIRE: ['Flamethrower', 'fireball', 'Fireball', 'pyro_disc', 'Pyrodisk'],
  WATER: ['Water Spray', 'water_bullet', 'Water Bullet'],
  LIGHTNING: [
    'Lightning',
    'chain_lightning',
    'Chain Lightning',
    'static_discharge',
    'Static Discharge',
  ],
  EARTH: ['Earth Shot', 'pebbles', 'Pebble Spray', 'stone_lance', 'Stone Lance'],
  MAGMA: ['Magma Shot', 'lava_pool', 'Lava Pool', 'molten_shrapnel', 'Molten Shrapnel'],
  ICE: ['Ice Shot', 'shards', 'Frost Shards', 'glacial_spike', 'Glacial Spike'],
  PLASMA: ['Plasma Shot', 'plasma_beam', 'Plasma Beam', 'unstable_orb', 'Unstable Orb'],
  STEAM: ['Steam Shot', 'scalding_mist', 'Scalding Mist', 'steam_burst', 'Steam Burst'],
  STORM: ['Storm Shot', 'thundercloud', 'Thundercloud', 'gale_force', 'Gale Force'],
  MAGNETIC: ['Magnetic Shot', 'magnetic_pull', 'Magnetic Pull', 'iron_swarm', 'Iron Swarm'],
};
const CONTINUOUS: readonly SpellVariant[] = [
  'pebbles',
  'chain_lightning',
  'static_discharge',
  'scalding_mist',
  'plasma_beam',
  'gale_force',
  'magnetic_pull',
  'iron_swarm',
];
const PROJECTILES: readonly SpellVariant[] = [
  'fireball',
  'pyro_disc',
  'water_bullet',
  'stone_lance',
  'molten_shrapnel',
  'shards',
  'glacial_spike',
  'unstable_orb',
  'steam_burst',
  'thundercloud',
];
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
  return (SPELL_VARIANTS[spell] as readonly (string | undefined)[]).includes(v);
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
export const isUncharged = (v: SpellVariant) => v === 'pyro_disc' || v === 'water_bullet';
export function chargeableVariant(spell: SpellName, loadout: SpellLoadout = {}): boolean {
  const v = spellVariant(spell, loadout);
  return (
    (!isUncharged(v) && PROJECTILES.includes(v)) || (v === 'default' && isChargeableSpell(spell))
  );
}
export function variantName(spell: SpellName, loadout: SpellLoadout = {}): string {
  const v = spellVariant(spell, loadout);
  const [base, a, aName, b, bName, c, cName] = SPELL_VARIANTS[spell];
  return v === a ? aName : v === b ? (bName ?? base) : v === c ? (cName ?? base) : base;
}
