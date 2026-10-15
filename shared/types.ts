// Domain types for the duel simulation. Units: positions in arena pixels (800x600),
// durations/cooldowns in ticks of the 60 Hz game clock.

export type ElementName = 'FIRE' | 'WATER' | 'LIGHTNING' | 'EARTH';
export type Combo = 'STEAM' | 'PLASMA' | 'MAGMA' | 'STORM' | 'ICE' | 'MAGNETIC';
/** Anything a wizard can have as its current attack. */
export type SpellName = ElementName | Combo;
export type SpellVariant = 'default' | 'pebbles' | 'fireball' | 'jet' | 'shards';
export type SpellLoadout = Partial<Record<SpellName, SpellVariant>>;
/** Index into `names` (0-3), or 4 for the healing shield. */
export type ShieldType = number;

/** Wizard fields holding a 0-100 status buildup. */
export type StatusKey = 'wet' | 'chill' | 'scald' | 'mag' | 'over' | 'stat';
/** Wizard fields counted down every tick. */
export type TimerKey =
  | 'cast'
  | 'swing'
  | 'swordCD'
  | 'forceCD'
  | 'bombCD'
  | 'magmaCD'
  | 'earthCD'
  | 'fireCD'
  | 'waterCD'
  | 'lightCD'
  | 'healCD'
  | 'bubbleCD'
  | 'trapCD'
  | 'prison'
  | 'silence'
  | 'freeze';

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

/** One of the two teams in a match. */
export type Team = 0 | 1;

export interface Wizard extends Vec2 {
  /** Position in `SimState.wizards`: seats `0..T-1` are team 0, `T..2T-1` team 1. */
  seat: number;
  team: Team;
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
  bubbleCD: number;
  trapCD: number;
  /** Ticks left trapped in an Earth prison: can't walk or be pushed, can still cast. */
  prison: number;
  // status effects
  freeze: number;
  /** Length of the current freeze when it started (draws the countdown). */
  freezeMax: number;
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
  /** Visible charging state, synchronized in multiplayer snapshots. */
  chargeSpell: SpellName | null;
  chargeTicks: number;
}

interface ShotBase extends Vec2 {
  /** Unique within a match; lets clients track a projectile across snapshots. */
  id: number;
  vx: number;
  vy: number;
  k: SpellName;
  owner: Wizard;
  r: number;
  life: number;
  damage: number;
  trail: number;
  /** Set once the projectile has left its owner's hit circle; before that it can't hurt them. */
  ownerClear?: boolean;
  variant?: SpellVariant;
}

/** Magma: slow lava ball that flies to a target point and leaves a crater. */
export interface MagmaShot extends ShotBase {
  magma: true;
  tx: number;
  ty: number;
  hitTargets: Set<Wizard>;
}

/** Every other projectile: flies in a line up to `maxTravel`. */
export interface BoltShot extends ShotBase {
  magma?: false;
  travel: number;
  maxTravel: number;
  charged: boolean;
}

export type Shot = MagmaShot | BoltShot;

export interface Bomb extends Vec2 {
  id: number;
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

/** A rune on the ground that springs on the first wizard to step on it once it is armed. */
export interface Trap extends Vec2 {
  id: number;
  /** The element or combo it was set with; decides what it does. */
  k: SpellName;
  owner: Wizard;
  /** Ticks left before it fades. */
  life: number;
  /** Ticks left before it is armed. */
  arm: number;
}

/** A reflective dome: projectiles crossing its edge, either way, bounce back. */
export interface Bubble extends Vec2 {
  r: number;
  owner: Wizard;
  life: number;
}

/** Everything a player is currently doing/holding; one per wizard. Drives the simulation. */
export interface PlayerInput {
  /** Currently held movement keys (KeyW/A/S/D). */
  keys: Record<string, boolean>;
  /** Element indices (0-3) loaded for the next cast. */
  loaded: number[];
  attack: SpellName;
  loadout: SpellLoadout;
  healArmed: boolean;
  /** Aim position in arena coordinates. */
  mouse: Vec2;
  holding: boolean;
  charge: number;
  /** `game.t` of the last Space press; two presses close together cast a bubble. */
  lastSpace: number;
}

// ---- cosmetic effects (client only: made from FxEvents, never simulated or sent) ----

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
  damageOwner?: WizardId;
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

/** What happens to a wizard that dies in a team match. */
export type DeathRule = 'elimination' | 'respawn';

/** The rules a match is played by; the lobby chooses them (see docs/TEAMS-PLAN.md). */
export interface MatchRules {
  /** Wizards per team (1 = a duel). */
  teamSize: number;
  friendlyFire: boolean;
  deathRule: DeathRule;
}

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
  | { type: 'round_over' }
  | FxEvent;

/**
 * Cosmetic effects. Tiny descriptions of what happened; each client generates (and animates)
 * the particles itself, so none of that travels over the network.
 */
export type FxEvent =
  | {
      type: 'burst';
      x: number;
      y: number;
      c: string;
      n: number;
      power: number;
      castOwner: WizardId | null;
    }
  | { type: 'spray'; wizard: WizardId; x: number; y: number; spell: SpellName; castOwner: WizardId }
  | { type: 'magma_trail'; x: number; y: number; vx: number; vy: number }
  | { type: 'bolt_trail'; x: number; y: number; spell: SpellName }
  /** Floating text such as "BLOCKED!" or a damage number (`damageOwner` = the damaged wizard). */
  | { type: 'text'; x: number; y: number; text: string; c: string; damageOwner?: WizardId }
  /** A lightning bolt from (x, y) to (tx, ty); the client draws the jagged arc. */
  | { type: 'lightning'; x: number; y: number; tx: number; ty: number; castOwner: WizardId }
  /** An expanding ring (force push, healing). */
  | { type: 'wave'; x: number; y: number; r: number; life: number; c: string };

/** Something solid in the arena: a circle that wizards walk around and projectiles stop at. */
export interface Obstacle extends Vec2 {
  r: number;
}

/** A solid rectangle: centre (x, y) and half its width and height. Walls and buildings. */
export interface RectObstacle extends Vec2 {
  hw: number;
  hh: number;
}

/** Anything solid on a map. */
export type Solid = Obstacle | RectObstacle;
