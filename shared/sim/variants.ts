import { isChargeableSpell, isContinuousSpell } from '../charge';
import type { SpellLoadout, SpellName, SpellVariant } from '../types';

export const SPELL_VARIANTS: Record<
  SpellName,
  readonly [string, SpellVariant, string, SpellVariant?, string?, SpellVariant?, string?]
> = {
  FIRE: ['Flamethrower', 'fireball', 'Fireball', 'pyro_disc', 'Pyrodisk'],
  WATER: ['Water Spray', 'jet', 'Pressure Jet'],
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
  'jet',
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
  'stone_lance',
  'molten_shrapnel',
  'shards',
  'glacial_spike',
  'unstable_orb',
  'steam_burst',
  'thundercloud',
];
export function spellVariant(spell: SpellName, loadout: SpellLoadout = {}): SpellVariant {
  return loadout[spell] ?? 'default';
}
export function continuousVariant(spell: SpellName, loadout: SpellLoadout = {}): boolean {
  const v = spellVariant(spell, loadout);
  return CONTINUOUS.includes(v) || (v === 'default' && isContinuousSpell(spell));
}
export function projectileVariant(spell: SpellName, loadout: SpellLoadout = {}): boolean {
  return PROJECTILES.includes(spellVariant(spell, loadout));
}
export function chargeableVariant(spell: SpellName, loadout: SpellLoadout = {}): boolean {
  const v = spellVariant(spell, loadout);
  return (
    (v !== 'pyro_disc' && PROJECTILES.includes(v)) || (v === 'default' && isChargeableSpell(spell))
  );
}
export function variantName(spell: SpellName, loadout: SpellLoadout = {}): string {
  const v = spellVariant(spell, loadout);
  const [base, a, aName, b, bName, c, cName] = SPELL_VARIANTS[spell];
  return v === a ? aName : v === b ? (bName ?? base) : v === c ? (cName ?? base) : base;
}
