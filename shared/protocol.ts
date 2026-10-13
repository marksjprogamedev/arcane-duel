// WebSocket protocol between client and server. Single source of truth for both ends.
//
// Current topology (host-authoritative): the server only relays. The `host` simulates the
// match and sends snapshots; the `guest` sends inputs. Messages marked "relayed" are
// forwarded by the server to the other player, optionally with added latency simulation.

import type { Snapshot } from './sim/snapshot';
import type { WizardId } from './types';

export type Role = 'host' | 'guest';

/**
 * Who simulates the match. `host`: one player's browser (original design, server only relays).
 * `server`: the server runs the simulation and both players are clients.
 */
export type Netcode = 'host' | 'server';

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
  | { type: 'create'; netcode?: Netcode }
  | { type: 'join'; code: string }
  | { type: 'leave' }
  | { type: 'rematch_ready' }
  | ({ type: 'input' } & InputPayload) // guest -> host (relayed)
  | { type: 'input_ack'; inputId: number; accepted: boolean } // host -> guest (relayed)
  | { type: 'cast_ack'; roundId: number; castId: number; accepted: boolean } // host -> guest
  | { type: 'death_start'; loser: WizardId; winner: boolean } // host -> guest
  | { type: 'state'; state: Snapshot } // host -> guest
  | { type: 'finished'; winner: boolean }; // host -> guest

// ---- server -> client ----

/** Input as normalised by the server before it reaches the host. */
export interface RelayedInput {
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
  | { type: 'start'; role: Role; roundId: number; netcode?: Netcode }
  | { type: 'rematch_start'; role: Role; roundId: number; netcode?: Netcode }
  | { type: 'error'; message: string }
  | { type: 'peer_left' }
  | RelayedInput
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
/** Game ticks per second the server simulates in `server` netcode. */
export const SERVER_TICK_HZ = 60;
/** The server sends a snapshot every this many ticks (60 / 3 = 20 Hz). */
export const SNAPSHOT_EVERY_TICKS = 3;
export const MAX_MESSAGE_BYTES = 350_000;
