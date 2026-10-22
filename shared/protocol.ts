// WebSocket protocol between client and server. Single source of truth for both ends.
//
// The server is authoritative: it runs one simulation per room. Both players are clients that
// send inputs and receive snapshots of the match.

import type { MapId } from './maps';
import type { Snapshot } from './sim/snapshot';
import type { DeathRule, MatchRules, Seat, SpellLoadout } from './types';

export type { Snapshot } from './sim/snapshot';

/**
 * Bumped whenever the messages change incompatibly. A client sends it in `hello` right after
 * connecting; an outdated client (e.g. a tab left open across a deploy) is told to refresh.
 */
export const PROTOCOL_VERSION = 17;

/** What the room creator chooses in the lobby; kept for rematches, changed in the lobby. */
export interface LobbyOptions {
  mapId: MapId;
  /** Players per team: 1 is a duel, 2 a 2v2. The room has `2 * teamSize` seats. */
  teamSize: number;
  /** Team matches: whether spells hurt teammates. */
  friendlyFire: boolean;
  /** Team matches: a fallen wizard is out until the round ends, or comes back after a delay. */
  deathRule: DeathRule;
  /** Every wizard's health: a normal match, or a very high one for testing spells. */
  wizardHp: WizardHp;
}

/** The health choices a room can be set to. */
export const WIZARD_HP_CHOICES = [200, 1000] as const;
export type WizardHp = (typeof WIZARD_HP_CHOICES)[number];

export const DEFAULT_LOBBY_OPTIONS: LobbyOptions = {
  mapId: 'enchanted',
  teamSize: 1,
  friendlyFire: false,
  deathRule: 'elimination',
  wizardHp: 200,
};

/** The biggest team a room can be set to (a map may allow fewer). */
export const MAX_TEAM_SIZE = 4;

/**
 * The order seats fill as players join, alternating teams so a room stays balanced: the creator
 * (team 0, seat 0), then team 1's first seat, then team 0's second, and so on.
 */
export function joinOrder(teamSize: number): number[] {
  return Array.from({ length: teamSize }, (_, i) => [i, teamSize + i]).flat();
}

/** Discrete player actions. Movement and aim are not actions: they travel in `move` commands. */
export type InputAction = 'key' | 'down' | 'up' | 'bomb' | 'trap' | 'clear';

export interface InputPayload {
  action: InputAction;
  roundId: number;
  inputId?: number;
  castId?: number;
  key?: string;
  down?: boolean;
  x?: number;
  y?: number;
}

// ---- client -> server ----

export type ClientMessage =
  /** First message on every connection. */
  | { type: 'hello'; protocolVersion: number }
  | { type: 'ping'; stamp: number }
  | { type: 'create' }
  | { type: 'join'; code: string }
  /** Reconnect: take over our seat in a room with the token from `created`/`joined`. */
  | { type: 'resume'; code: string; token: string }
  | { type: 'leave' }
  /** The creator changes the options while in the lobby. */
  | { type: 'set_options'; options: LobbyOptions }
  /** The creator moves the player in seat `from` to seat `to` (swapping with whoever is there). */
  | { type: 'move_seat'; from: Seat; to: Seat }
  /** The creator starts the match (needs two players, at least one on each team). */
  | { type: 'start_match' }
  /** The spell variants this player picked in the spellbook; only taken in the lobby. */
  | { type: 'set_loadout'; loadout: SpellLoadout }
  /** After a match, either player sends both players back to the lobby. */
  | { type: 'back_to_lobby' }
  | { type: 'rematch_ready' }
  | ({ type: 'input' } & InputPayload)
  | MoveCommand;

/**
 * Sent by the client every game tick (60 Hz): which movement keys are held and where the player
 * aims. `seq` counts up from 1 each round. The server always uses the newest command it has and
 * reports the newest `seq` it applied in each snapshot (`Snapshot.ack`), so the client can replay
 * the commands the server has not seen yet on top of the server's position (client prediction).
 */
export interface MoveCommand {
  type: 'move';
  roundId: number;
  seq: number;
  /** Held movement keys as bits, see moveKeysToBits. */
  keys: number;
  /** Aim position in arena coordinates. */
  x: number;
  y: number;
}

// ---- server -> client ----

/** Input as normalised by the server before it reaches the simulation. */
export interface SanitizedInput {
  type: 'input';
  action: string;
  roundId: number;
  castId: number | null;
  inputId: number | null;
  key: string;
  down: boolean;
  x: number;
  y: number;
}

export type ServerMessage =
  | { type: 'pong'; stamp: number }
  /** `resumeToken` lets this player reconnect to the room if their connection drops. */
  | { type: 'created'; code: string; resumeToken: string; seat: Seat }
  | { type: 'joined'; code: string; resumeToken: string; seat: Seat }
  /**
   * We are back in our seat after reconnecting (also after a page reload, which starts from nothing,
   * so it carries what `start` does); the match continues.
   */
  | {
      type: 'resumed';
      code: string;
      roundId: number;
      seat: Seat;
      mapId: MapId;
      rules: MatchRules;
      loadouts: SpellLoadout[];
    }
  /**
   * You are in the lobby: the current options, which seats are taken, and which one is yours.
   * Sent on every change, and again when a match ends and the players go back to the lobby.
   */
  | {
      type: 'lobby';
      options: LobbyOptions;
      seats: boolean[];
      /** Every seat's spell choices, by seat (empty for an open seat). */
      loadouts: SpellLoadout[];
      youSeat: Seat;
    }
  /**
   * A player's connection dropped (`name` is the wizard's name). The match is paused for everyone
   * for up to `graceMs` while they can come back, then carries on without them (their wizard has
   * `away: true` in snapshots). Also sent to a player who resumes while others are still away.
   */
  | { type: 'peer_away'; seat: Seat; name: string; graceMs: number }
  /** That player reconnected (inside the grace period or after it). */
  | { type: 'peer_back'; seat: Seat }
  /**
   * A match begins on this arena (`mapId` is the creator's choice; a rematch keeps it) once
   * `countdownTicks` have passed (only the lobby start waits; a rematch starts at once); snapshots
   * count the rest down.
   */
  | {
      type: 'start';
      roundId: number;
      mapId: MapId;
      rules: MatchRules;
      loadouts: SpellLoadout[];
      seat: Seat;
      countdownTicks: number;
    }
  | {
      type: 'rematch_start';
      roundId: number;
      mapId: MapId;
      rules: MatchRules;
      loadouts: SpellLoadout[];
      seat: Seat;
      countdownTicks: number;
    }
  /** `reason: 'outdated'` means the client is older than the server and should reload. */
  | { type: 'error'; message: string; reason?: 'outdated' }
  | { type: 'peer_left' }
  | { type: 'input_ack'; inputId: number; accepted: boolean }
  | { type: 'cast_ack'; roundId: number; castId: number; accepted: boolean }
  /** A wizard died and the round is ending; `winner` is true when the receiving player's team won. */
  | { type: 'death_start'; loser: Seat; winner: boolean }
  | { type: 'state'; state: Snapshot }
  | { type: 'finished'; winner: boolean };

/**
 * The largest map coordinate the server accepts in a message. This only rejects nonsense; the
 * simulation then clamps to the match's actual map (`inputEventFromWire`).
 */
export const MAX_MAP_COORD = 8192;
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
/** Game ticks per second the server simulates. */
export const SERVER_TICK_HZ = 60;
/**
 * The server sends a snapshot every this many ticks (60 / 2 = 30 Hz). The opponent is drawn at
 * least one snapshot interval in the past, so a higher rate means seeing them sooner.
 */
export const SNAPSHOT_EVERY_TICKS = 2;
/** Largest message the server accepts from a client. Clients only send small inputs. */
export const MAX_MESSAGE_BYTES = 4096;
