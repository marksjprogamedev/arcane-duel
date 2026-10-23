import crypto from 'node:crypto';
import WebSocket from 'ws';
import { createDelayLine, OUT_DELAY_MS } from '../latency';
import type { MatchRunner } from '../match';
import { recordBytesOut } from '../stats';
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type LobbyOptions,
  type Profile,
  type ServerMessage,
  type WorkshopLook,
} from '../../shared/protocol';
import {
  EMPTY_ROOM_CLOSE_MS,
  RECONNECT_GRACE_MS,
  START_COUNTDOWN_TICKS,
} from '../../shared/constants';
import type { Account } from '../../shared/accountApi';
import type { Friends } from '../friends';
import type { Seat, SpellLoadout } from '../../shared/types';

export interface Client extends WebSocket {
  room: string | null;
  /** Set once the client said hello with our protocol version. */
  helloOk: boolean;
  /** The spell variants this player picked in the lobby (checked by the validator). */
  loadout?: SpellLoadout;
  /** Who they are in their room ("Player 3"): fixed when they join, whichever seat they move to. */
  playerNo?: number;
  /** Random per browser tab, from `hello`: how a returning guest is recognised. */
  clientId?: string;
  /** The logged-in player, from the session cookie sent with the WebSocket; fixed for the connection's life. */
  account?: Account;
  /** That session's token hash, so a logout can find this connection. */
  sessionHash?: string;
}

export interface Room {
  code: string;
  /** Who sits in each seat (`2 * teamSize` of them); the creator starts in seat 0. */
  players: (Client | null)[];
  /** The room's host: picks the options and starts the match. The creator, until they leave a match. */
  host: Client;
  /** The host's identity (`identityOf`): a host who left comes back to the role if nobody took it meanwhile. */
  hostIdentity: string | undefined;
  /** The `playerNo` each returning player (by identity) had, so they keep their name. */
  playerNos: Map<string, number>;
  /** Lobby members watching instead of playing. */
  spectators: Client[];
  /** Who sat in each seat when the match started (their identity), so a leaver can take it back. */
  seatOwners: (string | undefined)[];
  /** Each seat's player name when the match started (`playerName`), for the match's messages. */
  names: string[];
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
  /** Friends (none without a database). */
  friends: null as Friends | null,
  /** Where accounts' looks and loadouts are kept (none without a database). */
  profiles: null as null | {
    load: (userId: number) => Profile;
    save: (userId: number, part: { workshop?: WorkshopLook; loadout?: SpellLoadout }) => void;
  },
};

export function configureRooms(options: {
  reconnectGraceMs?: number;
  emptyRoomMs?: number;
  teamMatches?: boolean;
  startCountdownTicks?: number;
  profiles?: typeof config.profiles;
  friends?: Friends | null;
}) {
  if (options.friends !== undefined) config.friends = options.friends;
  if (options.profiles !== undefined) config.profiles = options.profiles;
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

/**
 * Who a connection is, across reconnects: the account for a logged-in player (any tab or device), else
 * the browser tab's `clientId`; undefined for a client that sent neither.
 */
export const identityOf = (ws: Client): string | undefined =>
  ws.account ? `u:${ws.account.id}` : ws.clientId ? `c:${ws.clientId}` : undefined;

/** The name a player goes by in rooms: their display name, or "Player 3" for a guest. */
export const playerName = (ws: Client) => ws.account?.displayName ?? `Player ${ws.playerNo}`;

/** Gives a client their number in this room. */
export function numberPlayer(room: Room, ws: Client) {
  const id = identityOf(ws);
  const known = id ? room.playerNos.get(id) : undefined;
  ws.playerNo = known ?? room.nextPlayerNo++;
  if (id) room.playerNos.set(id, ws.playerNo);
}

/**
 * Another connection of the same account that is in the room (seated and not away, or watching): the
 * account's other tab or device. A guest has no twin (a new tab is a new player).
 */
export function accountTwin(room: Room, ws: Client): Client | undefined {
  if (!ws.account) return undefined;
  const id = ws.account.id;
  const same = (other: Client | null): other is Client =>
    !!other && other !== ws && other.account?.id === id;
  return (
    room.players.find((p, seat) => same(p) && !room.away.has(seat)) ?? room.spectators.find(same)
  );
}

/** Whether `ws` is still in the room: seated (and not someone who left the match) or watching. */
export function isMember(room: Room, ws: Client): boolean {
  const seat = seatOf(room, ws);
  return isSpectator(room, ws) || (seat !== null && !room.left.has(seat));
}

/** Makes `ws` the host. */
export function setHost(room: Room, ws: Client) {
  room.host = ws;
  room.hostIdentity = identityOf(ws);
}

/**
 * Keeps the invariant that the room's host is someone in it: a returning host (same tab) gets the role
 * back if it is free, and if the host is gone for good the lowest connected player (else the first
 * spectator) takes over.
 */
export function ensureHost(room: Room, returning?: Client) {
  if (isMember(room, room.host)) return;
  const returningId = returning && identityOf(returning);
  if (returning && returningId && returningId === room.hostIdentity) {
    setHost(room, returning);
    return;
  }
  const heir = nextHost(room);
  if (heir) setHost(room, heir);
}

/** The next in the join queue: whoever joined the room earliest among those still connected, players or watchers. */
export function nextHost(room: Room, leaving?: Client): Client | undefined {
  const members = [...connected(room).map((p) => p.ws), ...room.spectators].filter(
    (ws) => ws !== leaving,
  );
  return members.sort((a, b) => (a.playerNo ?? 0) - (b.playerNo ?? 0))[0];
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
