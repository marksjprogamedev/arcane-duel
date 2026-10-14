import type { Combo, ElementName, SpellName } from './types';

export const names: ElementName[] = ['FIRE', 'WATER', 'LIGHTNING', 'EARTH'];
export const emoji = ['🔥', '💧', '⚡', '🪨'];
export const COL: Record<string, string> = {
  FIRE: '#fb923c',
  WATER: '#38bdf8',
  LIGHTNING: '#fde047',
  EARTH: '#a3e635',
  STEAM: '#e2e8f0',
  PLASMA: '#e879f9',
  MAGMA: '#ff751c',
  STORM: '#a5b4fc',
  ICE: '#a5f3fc',
  MAGNETIC: '#bef264',
};
export const pairs: Record<string, Combo> = {
  '0,1': 'STEAM',
  '0,2': 'PLASMA',
  '0,3': 'MAGMA',
  '1,2': 'STORM',
  '1,3': 'ICE',
  '2,3': 'MAGNETIC',
};
export const PART: Record<SpellName, number[]> = {
  FIRE: [0],
  WATER: [1],
  LIGHTNING: [2],
  EARTH: [3],
  STEAM: [0, 1],
  PLASMA: [0, 2],
  MAGMA: [0, 3],
  STORM: [1, 2],
  ICE: [1, 3],
  MAGNETIC: [2, 3],
};
export const styles = [
  ['Ember Mage', '#991b1b', '#581c1c', '#ef4444', '#b91c1c', '#fbbf24', '#fb923c'],
  ['Frost Scholar', '#bae6fd', '#2563a4', '#e0f2fe', '#7dd3fc', '#e2e8f0', '#38bdf8'],
  ['Grove Keeper', '#365c36', '#1b3829', '#6a994e', '#497e45', '#c5a66d', '#86efac'],
  ['Void Arcanist', '#312047', '#171124', '#7045a0', '#261632', '#b7a4d7', '#e879f9'],
  ['Royal Magister', '#e8ddbb', '#3b5091', '#fff5dc', '#f0e4c5', '#d4a741', '#60a5fa'],
  ['Dune Mystic', '#b98a55', '#805331', '#dcb77c', '#c99d67', '#40c9b6', '#2dd4bf'],
  ['Stormcaller', '#263b60', '#101f38', '#4b6b9a', '#1d3155', '#cbd5e1', '#38bdf8'],
  ['Arcane Alchemist', '#0f766e', '#164e48', '#2ca89d', '#115e59', '#b7794d', '#a3e635'],
].map(([name, robe, shadow, light, hat, trim, gem]) => ({
  name,
  robe,
  shadow,
  light,
  hat,
  trim,
  gem,
}));
export const pillars = [
  { x: 235, y: 165, r: 25 },
  { x: 565, y: 165, r: 25 },
  { x: 235, y: 435, r: 25 },
  { x: 565, y: 435, r: 25 },
];
export const grass = Array.from({ length: 160 }, (_, i) => ({
  x: ((i * 149 + 41) % 770) + 15,
  y: ((i * 97 + 73) % 565) + 15,
  h: 3 + (i % 6),
}));

/** Base projectile/bomb damage of the combined spells; elements not listed use 18. */
export const COMBO_DAMAGE: Partial<Record<SpellName, number>> = {
  STEAM: 14,
  PLASMA: 12,
  STORM: 13,
  ICE: 12,
  MAGNETIC: 12,
};

/**
 * Cooldown of every ability, in ticks of the 60 Hz game clock. The simulation sets these; online
 * clients use the same numbers to gate their instant cast previews.
 */
export const COOLDOWN_TICKS = {
  FIRE: 5,
  WATER: 6,
  LIGHTNING: 19,
  EARTH: 39,
  MAGMA: 195,
  SWORD: 43,
  FORCE: 150,
  BOMB: 240,
  HEAL: 600,
} as const;
export type CooldownName = keyof typeof COOLDOWN_TICKS;

/** How long a freeze lasts, in ticks: from an ice bomb, or from Chill building up to 100. */
export const FREEZE_TICKS = { BOMB: 165, CHILL: 140 } as const;
