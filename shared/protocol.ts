// WebSocket protocol between client and server. Single source of truth for both ends.
//
// The server is authoritative: it runs one simulation per room. Both players are clients that
// send inputs and receive snapshots of the match.

import type { Snapshot } from './sim/snapshot';
import type { WizardId } from './types';

export type { Snapshot } from './sim/snapshot';

export type InputAction = 'key' | 'down' | 'up' | 'bomb' | 'aim' | 'clear';

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
  | { type: 'ping'; stamp: number }
  | { type: 'create' }
  | { type: 'join'; code: string }
  | { type: 'leave' }
  | { type: 'rematch_ready' }
  | ({ type: 'input' } & InputPayload);

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
  | { type: 'created'; code: string }
  | { type: 'joined'; code: string }
  | { type: 'start'; roundId: number }
  | { type: 'rematch_start'; roundId: number }
  | { type: 'error'; message: string }
  | { type: 'peer_left' }
  | { type: 'input_ack'; inputId: number; accepted: boolean }
  | { type: 'cast_ack'; roundId: number; castId: number; accepted: boolean }
  | { type: 'death_start'; loser: WizardId; winner: boolean }
  | { type: 'state'; state: Snapshot }
  | { type: 'finished'; winner: boolean };

/** Arena size in game units; shared by client rendering and server input clamping. */
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 600;
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
/** Game ticks per second the server simulates. */
export const SERVER_TICK_HZ = 60;
/** The server sends a snapshot every this many ticks (60 / 3 = 20 Hz). */
export const SNAPSHOT_EVERY_TICKS = 3;
/** Largest message the server accepts from a client. Clients only send small inputs. */
export const MAX_MESSAGE_BYTES = 4096;
