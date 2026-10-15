// Shared mutable runtime state of the browser client.

import type { LobbyOptions } from '../../shared/protocol';
import { newSeed } from '../../shared/random';
import {
  createSimState,
  DEFAULT_RULES,
  newPlayerInput,
  withSeatAliases,
  type SimState,
} from '../../shared/simState';
import type { MatchRules, SpellName, Wizard } from '../../shared/types';

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
  /** Where each other wizard is drawn (interpolated), by seat. */
  visual: new Map<number, { x: number; y: number }>(),
  /** The first other wizard's drawn position (read by the test scripts). */
  visualP: null as { x: number; y: number } | null,
  /** Seats out of sight (fog of war): their wizard in `game.wizards` holds where they were last seen. */
  hiddenSeats: new Set<number>(),
  /** Our seat in the online match (set by the server). */
  seat: 0,
  /** The rules of the online match (team size, friendly fire, fall rule). */
  rules: { ...DEFAULT_RULES } as MatchRules,
  /** Kills by team 0 and team 1 (respawn matches). */
  score: [0, 0] as [number, number],
  /** The room's options as the server last told us (the lobby sends them back with a change). */
  lobbyOptions: {
    mapId: 'enchanted',
    teamSize: 1,
    friendlyFire: false,
    deathRule: 'elimination',
  } as LobbyOptions,
  /** Where the shot that hit you from out of sight came from (an arrow at the screen edge). */
  hitHint: null as { angle: number; t: number } | null,
  /** Our own drawn position (predicted). */
  visualE: null as { x: number; y: number } | null,
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
  /** Recent positions of each other wizard from snapshots (for interpolation), by seat. */
  samples: new Map<number, { x: number; y: number; st: number }[]>(),
  receivedSnapshotSeq: 0,
  spellActionSequence: 0,
  spellActions: new Map(),
  spellAckMs: 0,
};

/** Our seat: the one the server gave us online, seat 0 offline. */
export const mySeat = () => (net.online ? net.seat : 0);
/** Our wizard. */
export const me = () => game.wizards[mySeat()];
/** Every other wizard in the match. */
export const others = () => game.wizards.filter((w) => w.seat !== mySeat());
/** The first other wizard: the rival in a duel. */
export const rival = () => others()[0];
/** True while `w` is out of sight. */
export const isHidden = (w: Wizard) => net.hiddenSeats.has(w.seat);
/** The input state of the player sitting at this machine. */
export const localInput = () => game.input[mySeat()];
/** True when `w` is on our team (shown green; the other team is red). */
export const greenSide = (w: Wizard) => w.team === (me()?.team ?? 0);
/** True in an online match with more than one wizard on a team. */
export const isTeamMatch = () => net.online && net.rules.teamSize > 1;
/** Standing members of our team: whose eyes we see through. */
export const watchers = () => game.wizards.filter((w) => w.team === me().team && !w.fallen);
