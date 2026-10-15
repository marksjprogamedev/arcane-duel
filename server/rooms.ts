import crypto from 'node:crypto';
import WebSocket from 'ws';
import { createDelayLine, OUT_DELAY_MS } from './latency';
import { MatchRunner } from './match';
import { recordBytesOut } from './stats';
import {
  DEFAULT_LOBBY_OPTIONS,
  PROTOCOL_VERSION,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type ClientMessage,
  type LobbyOptions,
  type SanitizedInput,
  type ServerMessage,
} from '../shared/protocol';
import type { Seat } from '../shared/types';

export interface Client extends WebSocket {
  room: string | null;
  /** Set once the client said hello with our protocol version. */
  helloOk: boolean;
}

interface Room {
  code: string;
  /** Who sits in each seat: the room creator in seat 0, the player who joined in seat 1. */
  players: (Client | null)[];
  /** Secret per seat that lets a new connection take over that seat (reconnect). */
  resumeTokens: string[];
  /** Players whose connection dropped, with the timer that ends the room if they don't return. */
  away: Map<Seat, NodeJS.Timeout>;
  ready: Set<Client>;
  roundId: number;
  /** In the lobby the creator picks options and starts; during a match the runner is running. */
  phase: 'lobby' | 'match';
  /** The creator's choices; they stay for rematches. */
  options: LobbyOptions;
  /** Present during a match. */
  runner: MatchRunner | null;
}

const rooms = new Map<string, Room>();

/** How long a disconnected player's seat is kept (match paused) before the room closes. */
let reconnectGraceMs = 10_000;

export function configureRooms(options: { reconnectGraceMs?: number }) {
  if (options.reconnectGraceMs !== undefined) reconnectGraceMs = options.reconnectGraceMs;
}

const send = (ws: WebSocket | null | undefined, msg: ServerMessage) => {
  if (ws?.readyState !== WebSocket.OPEN) return;
  const json = JSON.stringify(msg);
  recordBytesOut(json.length);
  ws.send(json);
};

// Optional local network simulation (see latency.ts): one ordered delay line per receiving socket.
const outLines = new WeakMap<WebSocket, ReturnType<typeof createDelayLine>>();
const sendDelayed = (ws: WebSocket | null, msg: ServerMessage) => {
  if (!ws) return;
  let line = outLines.get(ws);
  if (!line) outLines.set(ws, (line = createDelayLine(OUT_DELAY_MS)));
  line(() => send(ws, msg));
};

/** Seats in a room: two until team matches are built. */
const SEAT_COUNT = 2;
const CREATOR: Seat = 0;
const newToken = () => crypto.randomBytes(16).toString('hex');

/** Fills in the optional fields of a (validated) input message for the simulation. */
function toSanitizedInput(m: Extract<ClientMessage, { type: 'input' }>): SanitizedInput {
  return {
    type: 'input',
    action: m.action,
    roundId: m.roundId,
    castId: m.castId ?? null,
    inputId: m.inputId ?? null,
    key: m.key ?? '',
    down: !!m.down,
    x: m.x ?? 0,
    y: m.y ?? 0,
  };
}

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

function createRunner(room: Room): MatchRunner {
  return new MatchRunner(
    (seat, msg) => sendDelayed(room.players[seat], msg),
    (seat) => (room.players[seat]?.bufferedAmount ?? Infinity) < 16000,
  );
}

function newRoomCode(): string {
  let code: string;
  do {
    code = Array.from(
      crypto.randomBytes(ROOM_CODE_LENGTH),
      (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length],
    ).join('');
  } while (rooms.has(code));
  return code;
}

function sendOutdated(ws: Client) {
  send(ws, {
    type: 'error',
    reason: 'outdated',
    message: 'The game has been updated. Please refresh the page.',
  });
}

const seatOf = (room: Room, ws: Client): Seat | null => {
  const seat = room.players.indexOf(ws);
  return seat < 0 ? null : seat;
};

/** The players currently in the room, with their seats. */
const seated = (room: Room) => room.players.flatMap((ws, seat) => (ws ? [{ ws, seat }] : []));

/** Tells everyone in the room how the lobby looks now. */
function sendLobby(room: Room) {
  const lobby = {
    type: 'lobby',
    options: room.options,
    guestPresent: room.players[1] !== null,
  } as const;
  for (const { ws } of seated(room)) send(ws, lobby);
}

/** The joining player leaves the lobby; the room stays open for the creator. */
function vacateGuest(room: Room) {
  room.players[1] = null;
  room.ready.clear();
  sendLobby(room);
}

/** Ends a room: stops the match and tells whoever is still connected. */
function closeRoom(room: Room, leaver: Client | null) {
  rooms.delete(room.code);
  room.runner?.stop();
  for (const timer of room.away.values()) clearTimeout(timer);
  for (const { ws } of seated(room)) {
    if (ws !== leaver) send(ws, { type: 'peer_left' });
    ws.room = null;
  }
}

/** The player chose to leave (or created/joined another room). The room is closed. */
export function leaveRoom(ws: Client) {
  const room = ws.room ? rooms.get(ws.room) : undefined;
  ws.room = null;
  if (!room) return;
  const seat = seatOf(room, ws);
  if (seat !== null && seat !== CREATOR && room.phase === 'lobby') vacateGuest(room);
  else if (seat !== null) closeRoom(room, ws);
}

/**
 * A player's connection closed. During a match their seat is kept for a while so they can
 * reconnect (the match pauses meanwhile); otherwise the room is closed.
 */
export function handleDisconnect(ws: Client) {
  const room = ws.room ? rooms.get(ws.room) : undefined;
  const seat = room ? seatOf(room, ws) : null;
  if (!room || seat === null) return;
  if (room.phase === 'lobby') {
    // no match to rejoin: a guest just drops out, the creator's leaving closes the room
    if (seat !== CREATOR) vacateGuest(room);
    else closeRoom(room, ws);
    return;
  }
  room.runner?.pause();
  for (const p of seated(room)) if (p.seat !== seat) send(p.ws, { type: 'peer_away' });
  room.away.set(
    seat,
    setTimeout(() => closeRoom(room, null), reconnectGraceMs),
  );
}

/** A new connection takes over a player's seat with the room code and their resume token. */
function resume(ws: Client, code: string, token: string) {
  const room = rooms.get(code);
  const seatIndex = room ? room.resumeTokens.indexOf(token) : -1;
  const seat = seatIndex < 0 ? null : seatIndex;
  if (!room || seat === null || room.phase !== 'match') {
    send(ws, { type: 'error', message: 'Could not rejoin the match.' });
    return;
  }
  leaveRoom(ws);
  const old = room.players[seat];
  room.players[seat] = ws;
  ws.room = code;
  if (old && old !== ws) {
    room.ready.delete(old);
    old.room = null;
    old.terminate(); // a connection the server still believed alive
  }
  clearTimeout(room.away.get(seat));
  room.away.delete(seat);
  send(ws, { type: 'resumed', code, roundId: room.roundId, seat });
  for (const p of seated(room)) if (p.seat !== seat) send(p.ws, { type: 'peer_back' });
  if (room.away.size === 0) room.runner?.resume();
}

/** Handles one validated message (see validateClientMessage). */
export function handleMessage(ws: Client, m: ClientMessage) {
  if (m.type === 'hello') {
    ws.helloOk = m.protocolVersion === PROTOCOL_VERSION;
    if (!ws.helloOk) sendOutdated(ws);
    return;
  }
  if (m.type === 'ping') {
    send(ws, { type: 'pong', stamp: m.stamp });
    return;
  }
  // an older client never says hello (or says it with an old version)
  if (!ws.helloOk) {
    sendOutdated(ws);
    return;
  }
  switch (m.type) {
    case 'create': {
      leaveRoom(ws);
      const code = newRoomCode();
      const room: Room = {
        code,
        players: [ws, null],
        resumeTokens: Array.from({ length: SEAT_COUNT }, newToken),
        away: new Map(),
        ready: new Set(),
        roundId: 0,
        phase: 'lobby',
        options: { ...DEFAULT_LOBBY_OPTIONS },
        runner: null,
      };
      rooms.set(code, room);
      ws.room = code;
      send(ws, { type: 'created', code, resumeToken: room.resumeTokens[CREATOR], seat: CREATOR });
      sendLobby(room);
      return;
    }
    case 'join': {
      const code = m.code.toUpperCase();
      const room = rooms.get(code);
      const free = room ? room.players.indexOf(null) : -1;
      if (!room || free < 0 || room.players.includes(ws)) {
        send(ws, { type: 'error', message: 'Room not found or already full.' });
        return;
      }
      leaveRoom(ws);
      room.players[free] = ws;
      room.resumeTokens[free] = newToken(); // a guest who left must not be able to come back with the old one
      ws.room = code;
      send(ws, { type: 'joined', code, resumeToken: room.resumeTokens[free], seat: free });
      sendLobby(room);
      return;
    }
    case 'resume':
      resume(ws, m.code.toUpperCase(), m.token);
      return;
    case 'leave':
      leaveRoom(ws);
      return;
  }

  const room = ws.room ? rooms.get(ws.room) : undefined;
  const seat = room ? seatOf(room, ws) : null;
  if (!room || seat === null) return;

  // The lobby: the creator picks the options and starts the match.
  if (m.type === 'set_options' || m.type === 'start_match') {
    if (seat !== CREATOR || room.phase !== 'lobby') return;
    if (m.type === 'set_options') {
      room.options = m.options;
      sendLobby(room);
    } else if (!room.players.includes(null)) {
      room.phase = 'match';
      room.roundId++;
      for (const p of seated(room))
        send(p.ws, {
          type: 'start',
          roundId: room.roundId,
          mapId: room.options.mapId,
          seat: p.seat,
        });
      room.runner = createRunner(room);
      room.runner.start(room.roundId, room.options.mapId);
    }
    return;
  }

  // Everything below requires a running two-player match.
  if (room.players.includes(null) || room.phase !== 'match') return;

  switch (m.type) {
    case 'back_to_lobby':
      if (room.away.size > 0) return; // a player is reconnecting; the match is paused, not over
      room.runner?.stop();
      room.runner = null;
      room.phase = 'lobby';
      room.ready.clear();
      sendLobby(room);
      return;
    case 'rematch_ready':
      room.ready.add(ws);
      if (seated(room).every((p) => room.ready.has(p.ws))) {
        room.ready.clear();
        room.roundId++;
        for (const p of seated(room))
          send(p.ws, {
            type: 'rematch_start',
            roundId: room.roundId,
            mapId: room.options.mapId,
            seat: p.seat,
          });
        room.runner?.start(room.roundId, room.options.mapId);
      }
      return;
    case 'input':
      room.runner?.handleInput(seat, toSanitizedInput(m));
      return;
    case 'move':
      room.runner?.handleMove(seat, m);
      return;
  }
}
