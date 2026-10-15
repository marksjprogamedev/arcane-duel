// Shared mutable runtime state of the browser client.

import { newSeed } from '../../shared/random';
import {
  createSimState,
  newPlayerInput,
  withSeatAliases,
  type SimState,
} from '../../shared/simState';
import type { SpellName } from '../../shared/types';

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

export const game: GameState = withSeatAliases({
  ...createSimState(newSeed()),
  active: false,
  paused: false,
  last: 0,
  frame: 0,
});

export const net = {
  /** True while playing an online match (the server runs the simulation, we are its client). */
  online: false,
  socket: null,
  /** Code of the room we created or joined, null when not in a room. */
  room: null,
  /** Lets us take our seat back in `room` if the connection drops (from `created`/`joined`). */
  resumeToken: null as string | null,
  /** True while trying to get back into the match after the connection dropped. */
  reconnecting: false,
  guestFinished: false,
  visualP: null,
  /** True while the opponent is out of sight (fog of war): `game.p` then holds where they were last seen. */
  opponentHidden: false,
  /** Where the shot that hit you from out of sight came from (an arrow at the screen edge). */
  hitHint: null as { angle: number; t: number } | null,
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
  guestFiring: false,
  guestFireClock: 0,
  guestFXCooldown: 0,
  guestCooldowns: {},
  guestLastSpace: -Infinity,
  guestCastSequence: 0,
  guestPending: new Map(),
  inputSequence: 0,
  inputPending: new Map(),
  lastAckMs: 0,
  roundId: 0,
  /** True when we created the room we are in (we choose the options and start the match). */
  isHost: false,
  opponentSamples: [],
  receivedSnapshotSeq: 0,
  spellActionSequence: 0,
  spellActions: new Map(),
  spellAckMs: 0,
};

/**
 * The input state of the player sitting at this machine. Online, every player sees themselves as
 * wizard `e` (see serializeSnapshot); offline the local player is `p`.
 */
export const localInput = () => game.input[net.online ? 'e' : 'p'];
