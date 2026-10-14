import crypto from 'node:crypto';
import WebSocket from 'ws';
import { createDelayLine, OUT_DELAY_MS } from './latency';
import { MatchRunner } from './match';
import { recordBytesOut } from './stats';
import {
  PROTOCOL_VERSION,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type ClientMessage,
  type SanitizedInput,
  type ServerMessage,
} from '../shared/protocol';
import type { WizardId } from '../shared/types';

export interface Client extends WebSocket {
  room: string | null;
  /** Set once the client said hello with our protocol version. */
  helloOk: boolean;
}

interface Room {
  code: string;
  /** The room creator plays simulation wizard `p`, the player who joined plays `e`. */
  players: Record<WizardId, Client | null>;
  /** Secret per player that lets a new connection take over their seat (reconnect). */
  resumeTokens: Record<WizardId, string>;
  /** Players whose connection dropped, with the timer that ends the room if they don't return. */
  away: Map<WizardId, NodeJS.Timeout>;
  ready: Set<Client>;
  roundId: number;
  /** Present once both players are in. */
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

const other = (side: WizardId): WizardId => (side === 'p' ? 'e' : 'p');
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
    (side, msg) => sendDelayed(room.players[side], msg),
    (side) => (room.players[side]?.bufferedAmount ?? Infinity) < 16000,
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

const sideOf = (room: Room, ws: Client): WizardId | null =>
  room.players.p === ws ? 'p' : room.players.e === ws ? 'e' : null;

/** Ends a room: stops the match and tells whoever is still connected. */
function closeRoom(room: Room, leaver: Client | null) {
  rooms.delete(room.code);
  room.runner?.stop();
  for (const timer of room.away.values()) clearTimeout(timer);
  for (const ws of Object.values(room.players)) {
    if (!ws) continue;
    if (ws !== leaver) send(ws, { type: 'peer_left' });
    ws.room = null;
  }
}

/** The player chose to leave (or created/joined another room). The room is closed. */
export function leaveRoom(ws: Client) {
  const room = ws.room ? rooms.get(ws.room) : undefined;
  ws.room = null;
  if (room && sideOf(room, ws)) closeRoom(room, ws);
}

/**
 * A player's connection closed. During a match their seat is kept for a while so they can
 * reconnect (the match pauses meanwhile); otherwise the room is closed.
 */
export function handleDisconnect(ws: Client) {
  const room = ws.room ? rooms.get(ws.room) : undefined;
  const side = room && sideOf(room, ws);
  if (!room || !side) return;
  if (!room.runner) {
    closeRoom(room, ws);
    return;
  }
  room.runner.pause();
  send(room.players[other(side)], { type: 'peer_away' });
  room.away.set(
    side,
    setTimeout(() => closeRoom(room, null), reconnectGraceMs),
  );
}

/** A new connection takes over a player's seat with the room code and their resume token. */
function resume(ws: Client, code: string, token: string) {
  const room = rooms.get(code);
  const side = (['p', 'e'] as const).find((s) => room?.resumeTokens[s] === token);
  if (!room || !side) {
    send(ws, { type: 'error', message: 'Could not rejoin the match.' });
    return;
  }
  leaveRoom(ws);
  const old = room.players[side];
  room.players[side] = ws;
  ws.room = code;
  if (old && old !== ws) {
    room.ready.delete(old);
    old.room = null;
    old.terminate(); // a connection the server still believed alive
  }
  clearTimeout(room.away.get(side));
  room.away.delete(side);
  send(ws, { type: 'resumed', code, roundId: room.roundId });
  send(room.players[other(side)], { type: 'peer_back' });
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
        players: { p: ws, e: null },
        resumeTokens: { p: newToken(), e: newToken() },
        away: new Map(),
        ready: new Set(),
        roundId: 0,
        runner: null,
      };
      rooms.set(code, room);
      ws.room = code;
      send(ws, { type: 'created', code, resumeToken: room.resumeTokens.p });
      return;
    }
    case 'join': {
      const code = m.code.toUpperCase();
      const room = rooms.get(code);
      if (!room || room.players.e || room.players.p === ws) {
        send(ws, { type: 'error', message: 'Room not found or already full.' });
        return;
      }
      leaveRoom(ws);
      room.players.e = ws;
      ws.room = code;
      send(ws, { type: 'joined', code, resumeToken: room.resumeTokens.e });
      room.roundId = 1;
      const start = { type: 'start', roundId: room.roundId } as const;
      send(room.players.p, start);
      send(ws, start);
      room.runner = createRunner(room);
      room.runner.start(room.roundId);
      return;
    }
    case 'resume':
      resume(ws, m.code.toUpperCase(), m.token);
      return;
    case 'leave':
      leaveRoom(ws);
      return;
  }

  // Everything below requires an active two-player room.
  const room = ws.room ? rooms.get(ws.room) : undefined;
  const side = room && sideOf(room, ws);
  if (!room || !side || !room.players.e) return;

  switch (m.type) {
    case 'rematch_ready':
      room.ready.add(ws);
      if (room.ready.has(room.players.p!) && room.ready.has(room.players.e)) {
        room.ready.clear();
        room.roundId++;
        const start = { type: 'rematch_start', roundId: room.roundId } as const;
        send(room.players.p, start);
        send(room.players.e, start);
        room.runner?.start(room.roundId);
      }
      return;
    case 'input':
      room.runner?.handleInput(side, toSanitizedInput(m));
      return;
    case 'move':
      room.runner?.handleMove(side, m);
      return;
  }
}
