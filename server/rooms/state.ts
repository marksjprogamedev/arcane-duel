import crypto from 'node:crypto';
import WebSocket from 'ws';
import { createDelayLine, OUT_DELAY_MS } from '../latency';
import type { MatchRunner } from '../match';
import { recordBytesOut } from '../stats';
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type LobbyOptions,
  type ServerMessage,
} from '../../shared/protocol';
import {
  EMPTY_ROOM_CLOSE_MS,
  RECONNECT_GRACE_MS,
  START_COUNTDOWN_TICKS,
} from '../../shared/constants';
import type { Seat, SpellLoadout } from '../../shared/types';

export interface Client extends WebSocket {
  room: string | null;
  /** Set once the client said hello with our protocol version. */
  helloOk: boolean;
  /** The spell variants this player picked in the lobby (checked by the validator). */
  loadout?: SpellLoadout;
  /** Who they are in their room ("Player 3"): fixed when they join, whichever seat they move to. */
  playerNo?: number;
  /** Random per browser tab, from `hello`: how a returning player is recognised. */
  clientId?: string;
}

export interface Room {
  code: string;
  /** Who sits in each seat (`2 * teamSize` of them); the creator starts in seat 0. */
  players: (Client | null)[];
  /** The room's host: picks the options and starts the match. The creator, until they leave a match. */
  host: Client;
  /** Lobby members watching instead of playing. */
  spectators: Client[];
  /** Who sat in each seat when the match started (their `clientId`), so a leaver can take it back. */
  seatOwners: (string | undefined)[];
  /** The next `playerNo` to hand out. */
  nextPlayerNo: number;
  /** Secret per seat that lets a new connection take over that seat (reconnect). */
  resumeTokens: string[];
  /**
   * Players whose connection dropped during a match. While `timer` runs the match is paused for
   * everyone; once it fires (`timer` null) play carries on without them. They can resume until the
   * match ends; going back to the lobby frees their seats.
   */
  away: Map<Seat, { deadline: number; timer: NodeJS.Timeout | null }>;
  /**
   * Seats whose player left the match on purpose. They are also in `away` (no grace timer), but
   * unlike a drop they cannot come back, and their socket no longer belongs to this room.
   */
  left: Set<Seat>;
  /** Set while nobody is connected; closes the room when it fires. */
  emptyTimer: NodeJS.Timeout | null;
  ready: Set<Client>;
  roundId: number;
  /** In the lobby the creator picks options and starts; during a match the runner is running. */
  phase: 'lobby' | 'match';
  /** The creator's choices; they stay for rematches. */
  options: LobbyOptions;
  /** Present during a match. */
  runner: MatchRunner | null;
}

export const rooms = new Map<string, Room>();

/** Settings configureRooms changes (an object, so every file sees the current values). */
export const config = {
  /** How long a drop pauses the match for everyone, and a returning player ends it early. */
  reconnectGraceMs: RECONNECT_GRACE_MS,
  /** How long a room nobody is connected to stays open. */
  emptyRoomMs: EMPTY_ROOM_CLOSE_MS,
  /** Whether the creator can start a match bigger than a duel (switched off in a test). */
  teamMatches: true,
  /** Ticks between START (or a rematch) and the match beginning (shortened in tests). */
  startCountdownTicks: START_COUNTDOWN_TICKS,
};

export function configureRooms(options: {
  reconnectGraceMs?: number;
  emptyRoomMs?: number;
  teamMatches?: boolean;
  startCountdownTicks?: number;
}) {
  if (options.reconnectGraceMs !== undefined) config.reconnectGraceMs = options.reconnectGraceMs;
  if (options.emptyRoomMs !== undefined) config.emptyRoomMs = options.emptyRoomMs;
  if (options.teamMatches !== undefined) config.teamMatches = options.teamMatches;
  if (options.startCountdownTicks !== undefined)
    config.startCountdownTicks = options.startCountdownTicks;
}

export const send = (ws: WebSocket | null | undefined, msg: ServerMessage) => {
  if (ws?.readyState !== WebSocket.OPEN) return;
  const json = JSON.stringify(msg);
  recordBytesOut(json.length);
  ws.send(json);
};

// Optional local network simulation (see latency.ts): one ordered delay line per receiving socket.
const outLines = new WeakMap<WebSocket, ReturnType<typeof createDelayLine>>();
export const sendDelayed = (ws: WebSocket | null, msg: ServerMessage) => {
  if (!ws) return;
  let line = outLines.get(ws);
  if (!line) outLines.set(ws, (line = createDelayLine(OUT_DELAY_MS)));
  line(() => send(ws, msg));
};

/** The seat the creator starts in. */
export const CREATOR: Seat = 0;
export const newToken = () => crypto.randomBytes(16).toString('hex');

/** Numbers for GET /stats. */
export function roomStats() {
  let matchesRunning = 0;
  let playersAway = 0;
  for (const room of rooms.values()) {
    if (room.runner?.isRunning) matchesRunning++;
    playersAway += room.away.size;
  }
  return { rooms: rooms.size, matchesRunning, playersAway };
}

export function newRoomCode(): string {
  let code: string;
  do {
    code = Array.from(
      crypto.randomBytes(ROOM_CODE_LENGTH),
      (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length],
    ).join('');
  } while (rooms.has(code));
  return code;
}

export const seatOf = (room: Room, ws: Client): Seat | null => {
  const seat = room.players.indexOf(ws);
  return seat < 0 ? null : seat;
};

export const isHost = (room: Room, ws: Client) => room.host === ws;
export const isSpectator = (room: Room, ws: Client) => room.spectators.includes(ws);

/** Gives a client their number in this room. */
export function numberPlayer(room: Room, ws: Client) {
  ws.playerNo = room.nextPlayerNo++;
}

/** The players currently in the room, with their seats. */
export const seated = (room: Room) =>
  room.players.flatMap((ws, seat) => (ws ? [{ ws, seat }] : []));

/**
 * The seat whose view the spectators watch: the lowest player still connected (so it moves on if
 * that player drops), or the lowest seat at all if everyone is away.
 */
export const viewSeatOf = (room: Room): Seat =>
  connected(room)[0]?.seat ?? seated(room)[0]?.seat ?? 0;

/** Players whose connection is up (everyone seated except those away). */
export const connected = (room: Room) => seated(room).filter((p) => !room.away.has(p.seat));

/** Ends a room: stops the match and tells whoever is still connected. */
export function closeRoom(room: Room, leaver: Client | null) {
  rooms.delete(room.code);
  room.runner?.stop();
  for (const { timer } of room.away.values()) if (timer) clearTimeout(timer);
  room.away.clear();
  if (room.emptyTimer) clearTimeout(room.emptyTimer);
  for (const ws of [...seated(room).map((p) => p.ws), ...room.spectators]) {
    if (ws !== leaver) send(ws, { type: 'peer_left' });
    if (ws.room === room.code) ws.room = null; // a seat's leaver may be in another room by now
  }
  room.spectators = [];
}
