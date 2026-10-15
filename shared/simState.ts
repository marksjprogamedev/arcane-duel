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
  /** Everyone in the match, indexed by seat. Stays two wizards until team matches are built. */
  wizards: Wizard[];
  /** Seat 0: the local player (offline), or the room creator (on the server). An alias of `wizards[0]`. */
  p: Wizard;
  /** Seat 1: the opponent / dummy, or the joining player. An alias of `wizards[1]`. */
  e: Wizard;
  rules: MatchRules;
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
  // Cosmetics, client side only: made from fx events by shared/fx/cosmetics.ts. The simulation
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
};

/**
 * Makes `p` and `e` read and write `wizards[0]` and `wizards[1]`. They are accessors that don't
 * show up in spreads or JSON, so call this again after copying a state (the client does).
 */
export function withSeatAliases<T extends { wizards: Wizard[] }>(
  state: T,
): T & { p: Wizard; e: Wizard } {
  for (const [name, seat] of [
    ['p', 0],
    ['e', 1],
  ] as const)
    Object.defineProperty(state, name, {
      get: () => state.wizards[seat],
      set: (w: Wizard) => void (state.wizards[seat] = w),
      configurable: true,
    });
  return state as T & { p: Wizard; e: Wizard };
}

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
  return withSeatAliases({
    wizards: [] as Wizard[],
    rules: { ...DEFAULT_RULES },
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
  }) as SimState;
}
