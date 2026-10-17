// Domain types for the duel simulation. Units: positions in arena pixels (800x600),
// durations/cooldowns in ticks of the 60 Hz game clock.

export type ElementName = 'FIRE' | 'WATER' | 'LIGHTNING' | 'EARTH';
export type Combo = 'STEAM' | 'PLASMA' | 'MAGMA' | 'STORM' | 'ICE' | 'MAGNETIC';
/** Anything a wizard can have as its current attack. */
export type SpellName = ElementName | Combo;
export type SpellVariant =
  | 'default'
  | 'pebbles'
  | 'fireball'
  | 'pyro_disc'
  | 'water_surge'
  | 'lava_pool'
  | 'shards'
  | 'plasma_beam'
  | 'thundercloud'
  | 'magnetic_pull';
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
  | 'flurryCD'
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
  /** Out of the round: dead in an elimination match, or waiting to come back in a respawn match. */
  fallen: boolean;
  /** Ticks until a fallen wizard comes back (respawn matches); 0 when not waiting. */
  returnIn: number;
  plasmaReach?: number;
  magneticReach?: number;
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
  /** Ticks of Pebble Flurry left while it is firing (0 when it isn't). Everyone sees this one. */
  flurryTime: number;
  /** Ticks until a Pebble Flurry can start again. */
  flurryCD: number;
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
  /** A bubble has turned it round: it belongs to the bubble's owner now, who never predicted it. */
  reflected?: boolean;
  variant?: SpellVariant;
  returning?: boolean;
  /** Hits landed so far on each wizard, by seat. */
  discHits?: Record<number, number>;
  discInside?: number[];
  originX?: number;
  originY?: number;
}

/** Magma: slow lava ball that flies to a target point and leaves a crater. */
export interface MagmaShot extends ShotBase {
  magma: true;
  tx: number;
  ty: number;
  /** How far it was lobbed, so a reflection can send it that far again. */
  reach?: number;
  hitTargets: Set<Wizard>;
}

/** Every other projectile: flies in a line up to `maxTravel`. */
export interface BoltShot extends ShotBase {
  magma?: false;
  travel: number;
  maxTravel: number;
  charged: boolean;
  /** How far the cast was charged (1 uncharged, up to 3); only Frost Shards scale chill with it. */
  power?: number;
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
  /** MAGMA and STORM are standing pools and clouds; WATER is a Water Surge's growing ring. */
  k: 'MAGMA' | 'STORM' | 'WATER';
  r: number;
  owner: Wizard;
  life: number;
  tick: number;
  /** A Thundercloud: drifts after the nearest enemy of its owner instead of staying put. */
  follow?: boolean;
  /** A Water Surge: the seats it has already reached (each is soaked and shoved once). */
  hit?: number[];
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
  castOwner?: Seat | null;
  shape?: 'tongue' | 'oval' | 'circle';
  [extra: string]: unknown;
}

export interface Label extends Vec2 {
  s: string;
  c: string;
  life: number;
  damageOwner?: Seat;
}

export interface LightningArc {
  /** A leg that starts at a bubble's edge, not at a wizard (a beam bounced off a bubble). */
  reflected?: boolean;
  reach?: number;
  hit?: boolean;
  variant?: SpellVariant;
  points: Vec2[];
  life: number;
  castOwner: Seat;
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

/** A player's place in the match: an index into `SimState.wizards` (0 = the room creator / local player). */
export type Seat = number;

/** What happens to a wizard that dies in a team match. */
export type DeathRule = 'elimination' | 'respawn';

/** The rules a match is played by; the lobby chooses them (see docs/TEAMS-PLAN.md). */
export interface MatchRules {
  /** Respawn matches end when a team has this many kills. */
  killTarget: number;
  /** Wizards per team (1 = a duel). */
  teamSize: number;
  friendlyFire: boolean;
  deathRule: DeathRule;
  /** Every wizard's starting (and maximum) health. */
  wizardHp: number;
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
  | { type: 'death'; loser: Seat; winner: boolean }
  /** The end-of-round animation finished. */
  | { type: 'round_over' }
  /** A wizard fell but the round goes on (a team match); clients learn it from the snapshot. */
  | { type: 'fall'; seat: Seat }
  | FxEvent;

/**
 * Cosmetic effects. Tiny descriptions of what happened; each client generates (and animates)
 * the particles itself, so none of that travels over the network.
 */
export type FxEvent =
  | { type: 'magnetic_implosion'; x: number; y: number; castOwner: Seat | null }
  | {
      type: 'burst';
      x: number;
      y: number;
      c: string;
      n: number;
      power: number;
      castOwner: Seat | null;
    }
  | { type: 'spray'; wizard: Seat; x: number; y: number; spell: SpellName; castOwner: Seat }
  | { type: 'magma_trail'; x: number; y: number; vx: number; vy: number }
  | { type: 'bolt_trail'; x: number; y: number; spell: SpellName }
  /** Floating text such as "BLOCKED!" or a damage number (`damageOwner` = the damaged wizard). */
  | { type: 'text'; x: number; y: number; text: string; c: string; damageOwner?: Seat }
  /** A lightning bolt or sustained variant beam. */
  | {
      type: 'lightning';
      x: number;
      y: number;
      tx: number;
      ty: number;
      castOwner: Seat;
      variant?: SpellVariant;
      hit?: boolean;
      /** The leg after a bubble turned the beam round; it starts at the bubble's edge. */
      reflected?: boolean;
    }
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
