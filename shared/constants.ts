import type { Combo, ElementName, SpellName } from './types';

export const ELEMENT_NAMES: ElementName[] = ['FIRE', 'WATER', 'LIGHTNING', 'EARTH'];
export const ELEMENT_EMOJI = ['🔥', '💧', '⚡', '🪨'];
export const SPELL_COLOR: Record<string, string> = {
  FIRE: '#fb923c',
  WATER: '#38bdf8',
  LIGHTNING: '#fde047',
  EARTH: '#8c704d',
  STEAM: '#e2e8f0',
  PLASMA: '#e879f9',
  MAGMA: '#ff751c',
  STORM: '#a5b4fc',
  ICE: '#a5f3fc',
  MAGNETIC: '#bef264',
  SMOKE: '#aab4bd',
};
/** Ticks a raised shield lasts; the shield's moving bars make one full turn over this. */
export const SHIELD_LIFE = 250;
export const COMBO_OF: Record<string, Combo> = {
  '0,1': 'STEAM',
  '0,2': 'PLASMA',
  '0,3': 'MAGMA',
  '1,2': 'STORM',
  '1,3': 'ICE',
  '2,3': 'MAGNETIC',
};
export const SPELL_ELEMENTS: Record<SpellName, number[]> = {
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
/** Every arena fills the 16:9 view: 1067 x 600 (the old 800 x 600 stretched sideways by 4/3). */
export const ARENA_WIDTH = 1067;
export const ARENA_HEIGHT = 600;
/** How much wider an arena is than the 800 px its art and layout were first drawn for. Intentional: art is drawn at 800 wide and scaled by this. */
export const ARENA_STRETCH = ARENA_WIDTH / 800;
/** The four pillars, mirrored about the arena's middle line (x 533.5). */
export const pillars = [
  { x: 313, y: 165, r: 25 },
  { x: 754, y: 165, r: 25 },
  { x: 313, y: 435, r: 25 },
  { x: 754, y: 435, r: 25 },
];
export const grass = Array.from({ length: 213 }, (_, i) => ({
  x: ((i * 149 + 41) % (ARENA_WIDTH - 30)) + 15,
  y: ((i * 97 + 73) % (ARENA_HEIGHT - 35)) + 15,
  h: 3 + (i % 6),
}));

/**
 * Online connection handling. When a player's connection drops mid-match, the match pauses for
 * everyone for up to this long while they can come back; after that play carries on without them
 * (their wizard stands still, marked `away`) and they can still rejoin until the match ends.
 */
export const RECONNECT_GRACE_MS = 10_000;
/** A room nobody is connected to (every player dropped) is closed after this long. */
export const EMPTY_ROOM_CLOSE_MS = 60_000;
/** How long a client whose connection dropped keeps retrying to get its seat back before going home. */
export const CLIENT_RECONNECT_GIVE_UP_MS = 120_000;

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
  STEAM: 20,
  PLASMA: 20,
  ICE: 20,
  MAGNETIC: 20,
  SWORD: 43,
  FORCE: 150,
  BOMB: 240,
  HEAL: 600,
  BUBBLE: 900,
  TRAP: 600,
} as const;
export type CooldownName = keyof typeof COOLDOWN_TICKS;

/**
 * Beams and sprays (the spells you hold down): the fastest the aim can turn toward the cursor, in
 * radians per tick, and the wait after letting go before the same one can fire again, in ticks.
 */
export const BEAM = { TURN_RATE: 0.05, COOLDOWN_TICKS: 60 } as const;

/** How long a freeze lasts, in ticks: from an ice bomb, or from Chill building up to 100. */
export const FREEZE_TICKS = { BOMB: 165, CHILL: 140 } as const;

/** Ticks from a bomb landing to it going off. */
export const BOMB_FUSE_TICKS = 75;

/** Bubble size, lifetime, and the longest gap between two Space presses that casts it (ticks). */
export const BUBBLE = { RADIUS: 90, LIFE: 240, DOUBLE_TAP_TICKS: 20 } as const;

/**
 * Traps (middle click), in ticks and pixels: how long a rune lasts, how long it takes to arm, how
 * close a wizard must come to spring it, how far from you it can be set, and how long an Earth
 * trap holds whoever springs it.
 */
export const TRAP = {
  LIFE: 1200,
  ARM_TICKS: 60,
  TRIGGER_RADIUS: 34,
  RANGE: 380,
  PRISON_TICKS: 240,
  /** How long a Water trap holds whoever springs it in the air: no walking, but they can still cast. */
  KNOCKUP_TICKS: 60,
  /** How long after being set a trap stays visible to enemies; its owner's team always sees it. */
  VISIBLE_TICKS: 120,
  /** Blast damage of a trap, as a multiple of the spell's usual bomb damage base. */
  DAMAGE_MULTIPLIER: 2,
} as const;

/**
 * Bomb effects beyond damage and status: the Magnetic bomb's reach and how long its pull overrides
 * walking, the Water bomb's shove (a wizard's knockback speed), and the Earth bomb's slow (a
 * fraction of walking speed taken away, for a number of ticks).
 */
export const BOMB = {
  /** How far from a bomb a wizard is hit when it goes off (the Magnetic bomb uses `MAGNETIC_RADIUS`). */
  BLAST_RADIUS: 100,
  /** A bomb's damage is the spell's `COMBO_DAMAGE` times this (the Magnetic bomb takes 0.65 of that). */
  DAMAGE_MULTIPLIER: 2.5,
  /** The Storm bomb leaves a pool behind: its radius in pixels and how long it lasts in ticks. */
  STORM_POOL_RADIUS: 75,
  STORM_POOL_TICKS: 175,
  /** The Magma combination's bomb creates concealment instead of dealing damage. */
  SMOKE_RADIUS: 150,
  SMOKE_TICKS: 300,
  MAGNETIC_RADIUS: 165,
  MAGNETIC_PULL_TICKS: 30,
  /** The Water bomb's shove: a gentle start speed that fades slowly (`GLIDE_FRICTION` a tick), about 350 px in all. */
  WATER_KNOCKBACK: 28,
  GLIDE_FRICTION: 0.92,
  WATER_GLIDE_TICKS: 90,
  SLOW: 0.75,
  SLOW_TICKS: 180,
} as const;

/**
 * The Magma and Storm pools (the Storm bomb's pool and the Magma area): they pulse every
 * `PULSE_TICKS` on each enemy inside. Magma does `MAGMA_DAMAGE`. Storm adds `STORM_STATIC` static
 * (kept for `STORM_STATIC_DELAY` ticks before it fades) and at full static (100) discharges for
 * `STORM_DISCHARGE_DAMAGE`.
 */
export const POOL = {
  PULSE_TICKS: 24,
  MAGMA_DAMAGE: 4,
  STORM_STATIC: 13,
  STORM_STATIC_DELAY: 165,
  STORM_DISCHARGE_DAMAGE: 18,
} as const;

/** How long a Magma shot lives, in ticks, and how long of that its caster is safe from it. */
export const MAGMA_SHOT_LIFE = 220;
export const MAGMA_OWNER_GRACE_TICKS = 25;

/** Added to a projectile's radius when testing it against a wizard. */
export const WIZARD_HIT_RADIUS = 17;

/** How long everyone waits between the host pressing START and the match beginning (5 seconds). */
export const START_COUNTDOWN_TICKS = 300;

/** How long a fallen wizard waits before coming back in a respawn team match (5 seconds). */
export const TEAM_RESPAWN_TICKS = 300;

/** How far a Pyrodisk flies out before it turns for home. */
export const PYRO_DISC_REACH = 340;

/** Pebble Flurry fires for this long (1.5 s), then needs `FLURRY_COOLDOWN_TICKS` to recharge. */
export const FLURRY_TICKS = 90;
export const FLURRY_COOLDOWN_TICKS = 300;
