// Shared mutable runtime state of the browser client.

import { newSeed } from '../../shared/random';
import { createSimState, newPlayerInput, type SimState } from '../../shared/simState';
import type { FxEvent, SpellName } from '../../shared/types';

export { newPlayerInput };

/** Client-only loop state layered on top of the simulation state. */
export interface ClientLoopState {
  active: boolean;
  paused: boolean;
  /** Timestamp of the previous animation frame. */
  last: number;
  /** requestAnimationFrame handle. */
  frame: number;
}

export type GameState = SimState & ClientLoopState;

export const game: GameState = {
  ...createSimState(newSeed()),
  active: false,
  paused: false,
  last: 0,
  frame: 0,
};

export const net = {
  mpRole: null,
  socket: null,
  room: null,
  netTick: 0,
  /** True when the server runs the simulation (both players are clients). */
  serverAuth: false,
  /** Legacy host mode: cosmetic events since the last snapshot sent to the guest. */
  pendingFx: [] as FxEvent[],
  guestFinished: false,
  visualP: null,
  visualE: null,
  /** Game time (ms) of the newest snapshot; shots are extrapolated from it. */
  snapshotServerMs: 0,
  /** Debug: projectiles as drawn last frame (read by tests/feel.mjs). */
  drawnShots: [] as { id: number; x: number; y: number; mine: boolean }[],
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

/** The input state of the player sitting at this machine (the guest controls wizard `e`). */
export const localInput = () => game.input[net.mpRole === 'guest' ? 'e' : 'p'];
