// Domain types for the duel simulation. Units: positions in arena pixels (800x600),
// durations/cooldowns in ticks of the 60 Hz game clock.

export type ElementName = 'FIRE' | 'WATER' | 'LIGHTNING' | 'EARTH';
export type Combo = 'STEAM' | 'PLASMA' | 'MAGMA' | 'STORM' | 'ICE' | 'MAGNETIC';
/** Anything a wizard can have as its current attack. */
export type SpellName = ElementName | Combo;
/** Index into `names` (0-3), or 4 for the healing shield. */
export type ShieldType = number;

export type GameMode = 'duel' | 'online' | 'still' | 'moving' | 'mortal';

export interface Vec2 {
  x: number;
  y: number;
}

export interface WizardStyle {
  name: string;
  robe: string;
  shadow: string;
  light: string;
  hat: string;
  trim: string;
  gem: string;
}

export interface Shield {
  type: ShieldType;
  life: number;
}

export interface Wizard extends Vec2 {
  hp: number;
  max: number;
  style: WizardStyle;
  shield: Shield | null;
  cast: number;
  swing: number;
  // cooldowns
  swordCD: number;
  forceCD: number;
  bombCD: number;
  magmaCD: number;
  earthCD: number;
  fireCD: number;
  waterCD: number;
  lightCD: number;
  healCD: number;
  // status effects
  freeze: number;
  burn: number;
  burnTime: number;
  burnTick: number;
  wet: number;
  chill: number;
  scald: number;
  mag: number;
  over: number;
  stat: number;
  rest: Record<string, number>;
  healTick: number;
  silence: number;
  // knockback velocity and facing
  kx: number;
  ky: number;
  face: number;
  spell: SpellName;
}

export interface Shot extends Vec2 {
  vx: number;
  vy: number;
  k: SpellName;
  owner: Wizard;
  r: number;
  life: number;
  damage: number;
  trail: number;
  // normal projectiles
  travel?: number;
  maxTravel?: number;
  charged?: boolean;
  // magma: travels to a target point
  magma?: boolean;
  tx?: number;
  ty?: number;
  hitTargets?: Set<Wizard>;
}

export interface Bomb extends Vec2 {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  u: number;
  flight: number;
  fuse: number;
  k: SpellName;
  owner: Wizard;
  landed: boolean;
  dead: boolean;
}

export interface Zone extends Vec2 {
  k: 'MAGMA' | 'STORM';
  r: number;
  owner: Wizard;
  life: number;
  tick: number;
}

/** Everything a player is currently doing/holding; one per wizard. Drives the simulation. */
export interface PlayerInput {
  /** Currently held movement keys (KeyW/A/S/D). */
  keys: Record<string, boolean>;
  /** Element indices (0-3) loaded for the next cast. */
  loaded: number[];
  attack: SpellName;
  healArmed: boolean;
  /** Aim position in arena coordinates. */
  mouse: Vec2;
  holding: boolean;
  charge: number;
}

// ---- cosmetic effects (not part of the authoritative simulation) ----

export interface Particle extends Vec2 {
  vx: number;
  vy: number;
  c: string;
  life: number;
  r: number;
  castOwner?: WizardId | null;
  [extra: string]: unknown;
}

export interface Label extends Vec2 {
  s: string;
  c: string;
  life: number;
  damageOwner?: string;
}

export interface LightningArc {
  points: Vec2[];
  life: number;
  castOwner: WizardId;
}

export interface Wave extends Vec2 {
  r: number;
  life: number;
  c: string;
}

export interface Death extends Vec2 {
  w: Wizard;
  age: number;
  mortal: boolean;
}

export type WizardId = 'p' | 'e';

/** Damage dealt to one wizard, accumulated for 0.5 s before showing as a floating number. */
export interface DamageBatch {
  w: Wizard;
  n: number;
  c: string;
  kind: 'direct' | 'burn';
  elapsed: number;
}

/**
 * Things the simulation wants the outside world to know about. The simulation never touches
 * the DOM or the network itself; the client drains `game.events` after each step.
 */
export type SimEvent =
  | { type: 'hint'; text: string }
  /** A wizard died and the round is ending (not a training-dummy kill). */
  | { type: 'death'; loser: WizardId; winner: boolean }
  /** The end-of-round animation finished. */
  | { type: 'round_over' };
