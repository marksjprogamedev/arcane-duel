// Shared mutable runtime state. Temporary home for what used to be module-level globals.
// To be replaced by a proper simulation state / client state split.

import type {
  Bomb,
  Death,
  GameMode,
  Label,
  LightningArc,
  Particle,
  Shot,
  SpellName,
  Vec2,
  Wave,
  Wizard,
  Zone,
} from '../../shared/types';

export interface GameState {
  /** Local player's wizard (the host's wizard when online). */
  p: Wizard;
  /** Opponent / dummy / the guest's wizard. */
  e: Wizard;
  mode: GameMode;
  active: boolean;
  paused: boolean;
  ending: boolean;
  death: Death | null;
  endClock: number;
  winner: boolean;
  keys: Record<string, boolean>;
  /** Element indices (0-3) loaded for the next cast. */
  loaded: number[];
  attack: SpellName;
  healArmed: boolean;
  mouse: Vec2;
  holding: boolean;
  charge: number;
  shots: Shot[];
  bombs: Bomb[];
  zones: Zone[];
  particles: Particle[];
  labels: Label[];
  arcs: LightningArc[];
  waves: Wave[];
  t: number;
  last: number;
  frame: number;
  aiClock: number;
  aiSide: number;
  dummyAngle: number;
  dummyClock: number;
  kills: number;
  respawn: number;
  dummyHP: number;
  dummyMoving: boolean;
}

export const game: GameState = {
  p: undefined as unknown as Wizard,
  e: undefined as unknown as Wizard,
  mode: 'duel',
  active: false,
  paused: false,
  ending: false,
  death: null,
  endClock: 0,
  winner: false,
  keys: {} as Record<string, boolean>,
  loaded: [],
  attack: 'FIRE',
  healArmed: false,
  mouse: { x: 430, y: 300 },
  holding: false,
  charge: 0,
  shots: [],
  bombs: [],
  zones: [],
  particles: [],
  labels: [],
  arcs: [],
  waves: [],
  t: 0,
  last: 0,
  frame: 0,
  aiClock: 0,
  aiSide: 1,
  dummyAngle: 0,
  dummyClock: 0,
  kills: 0,
  respawn: 0,
  dummyHP: 160,
  dummyMoving: false,
};

export const net = {
  mpRole: null,
  socket: null,
  room: null,
  remoteKeys: {} as Record<string, boolean>,
  remoteAttack: 'FIRE' as SpellName,
  remoteLoaded: [],
  remoteHealArmed: false,
  remoteHolding: false,
  remoteCharge: 0,
  remoteMouse: { x: 150, y: 300 },
  netTick: 0,
  guestFinished: false,
  visualP: null,
  visualE: null,
  visualShots: new Map(),
  lastNetAt: 0,
  netRTT: 120,
  guestFX: [],
  guestSpell: 'FIRE' as SpellName,
  guestElements: [],
  guestHeal: false,
  guestPressAt: 0,
  guestCorrection: null,
  guestTeleport: false,
  guestLastAuth: null,
  guestFiring: false,
  guestFireClock: 0,
  guestFXCooldown: 0,
  guestCooldowns: {},
  guestCastSequence: 0,
  guestPending: new Map(),
  lastAimSent: 0,
  inputSequence: 0,
  inputPending: new Map(),
  lastAckMs: 0,
  roundId: 0,
  opponentSamples: [],
  netSnapshotSeq: 0,
  receivedSnapshotSeq: 0,
  spellActionSequence: 0,
  spellActions: new Map(),
  spellAckMs: 0,
};
