// Simulation state: one of these per running match (client-side today, one per room on the server).

import { createRng, type Rng } from './random';
import type {
  Bomb,
  DamageBatch,
  Death,
  GameMode,
  Label,
  LightningArc,
  Particle,
  PlayerInput,
  Shot,
  SimEvent,
  Vec2,
  Wave,
  Wizard,
  WizardId,
  Zone,
} from './types';

/** Complete state of one match. Everything the simulation reads or writes. */
export interface SimState {
  /** Local player's wizard (the host's wizard when online). */
  p: Wizard;
  /** Opponent / dummy / the guest's wizard. */
  e: Wizard;
  mode: GameMode;
  ending: boolean;
  death: Death | null;
  endClock: number;
  winner: boolean;
  shots: Shot[];
  bombs: Bomb[];
  zones: Zone[];
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
  /** Per-wizard input. `p` is the local/host player, `e` the remote player (online). */
  input: Record<WizardId, PlayerInput>;
  /** Seeded generator for everything the simulation randomises. */
  rng: Rng;
  damageBatches: Map<string, DamageBatch>;
}

export function newPlayerInput(mouse: Vec2): PlayerInput {
  return {
    keys: {},
    loaded: [],
    attack: 'FIRE',
    healArmed: false,
    mouse,
    holding: false,
    charge: 0,
  };
}

export function createSimState(seed: number): SimState {
  return {
    p: undefined as unknown as Wizard,
    e: undefined as unknown as Wizard,
    mode: 'duel',
    ending: false,
    death: null,
    endClock: 0,
    winner: false,
    shots: [],
    bombs: [],
    zones: [],
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
    input: { p: newPlayerInput({ x: 430, y: 300 }), e: newPlayerInput({ x: 150, y: 300 }) },
    rng: createRng(seed),
    damageBatches: new Map(),
  };
}
