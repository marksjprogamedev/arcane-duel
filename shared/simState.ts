// Simulation state: one of these per running match (client-side today, one per room on the server).

import { DEFAULT_MAP, type MapDef } from './maps';
import { createRng, type Rng } from './random';
import type {
  Bomb,
  Bubble,
  DamageBatch,
  Death,
  GameMode,
  Label,
  LightningArc,
  Particle,
  PlayerInput,
  Shot,
  Trap,
  SimEvent,
  Vec2,
  Wave,
  Wizard,
  MatchRules,
  Seat,
  Zone,
} from './types';

/** Complete state of one match. Everything the simulation reads or writes. */
export interface SimState {
  /** Everyone in the match, indexed by seat. Offline, seat 0 is the player and seat 1 the opponent / dummy; online, seat 0 is the room creator. */
  wizards: Wizard[];
  rules: MatchRules;
  /** Where each seat starts (and comes back, in respawn matches), by seat. */
  starts: Vec2[];
  /** Kills so far by team 0 and team 1 (respawn matches). */
  score: [number, number];
  mode: GameMode;
  ending: boolean;
  death: Death | null;
  endClock: number;
  winner: boolean;
  shots: Shot[];
  bombs: Bomb[];
  zones: Zone[];
  bubbles: Bubble[];
  traps: Trap[];
  /** Where this match is played: size, bounds, spawns and what is solid. */
  map: MapDef;
  // Cosmetics, client side only: made from fx events by client/src/fx/cosmetics.ts. The simulation
  // never reads or writes these, and they are never sent over the network.
  particles: Particle[];
  labels: Label[];
  arcs: LightningArc[];
  waves: Wave[];
  t: number;
  aiClock: number;
  aiSide: number;
  dummyAngle: number;
  dummyClock: number;
  kills: number;
  respawn: number;
  dummyHP: number;
  dummyMoving: boolean;
  /** Pending simulation events; drained by the client every tick. */
  events: SimEvent[];
  /** Per-wizard input, indexed by seat. */
  input: PlayerInput[];
  /** Seeded generator for everything the simulation randomises. */
  rng: Rng;
  /** Next id for projectiles and bombs. */
  nextId: number;
  damageBatches: Map<string, DamageBatch>;
}

export const DEFAULT_RULES: MatchRules = {
  teamSize: 1,
  friendlyFire: false,
  deathRule: 'elimination',
  wizardHp: 200,
  killTarget: 10,
  emptySeats: [],
};

export function newPlayerInput(mouse: Vec2): PlayerInput {
  return {
    keys: {},
    loaded: [],
    attack: 'FIRE',
    loadout: {},
    healArmed: false,
    mouse,
    holding: false,
    charge: 0,
    lastSpace: -Infinity,
  };
}

export function createSimState(seed: number): SimState {
  return {
    wizards: [] as Wizard[],
    rules: { ...DEFAULT_RULES },
    starts: [],
    score: [0, 0],
    mode: 'duel',
    ending: false,
    death: null,
    endClock: 0,
    winner: false,
    shots: [],
    bombs: [],
    zones: [],
    bubbles: [],
    traps: [],
    map: DEFAULT_MAP,
    particles: [],
    labels: [],
    arcs: [],
    waves: [],
    t: 0,
    aiClock: 0,
    aiSide: 1,
    dummyAngle: 0,
    dummyClock: 0,
    kills: 0,
    respawn: 0,
    dummyHP: 160,
    dummyMoving: false,
    events: [],
    input: [newPlayerInput({ x: 430, y: 300 }), newPlayerInput({ x: 150, y: 300 })],
    rng: createRng(seed),
    nextId: 1,
    damageBatches: new Map(),
  };
}
