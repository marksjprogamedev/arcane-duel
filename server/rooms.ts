import crypto from 'node:crypto';
import WebSocket from 'ws';
import { createDelayLine, OUT_DELAY_MS } from './latency';
import { MatchRunner } from './match';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type ClientMessage,
  type SanitizedInput,
  type ServerMessage,
} from '../shared/protocol';

export interface Client extends WebSocket {
  room: string | null;
}

interface Room {
  /** Created the room; plays simulation wizard `p`. */
  creator: Client;
  /** Joined with the code; plays simulation wizard `e`. */
  joiner: Client | null;
  ready: Set<Client>;
  roundId: number;
  /** Present once both players are in. */
  runner: MatchRunner | null;
}

const rooms = new Map<string, Room>();

const send = (ws: WebSocket | null | undefined, msg: ServerMessage) => {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

// Optional local network simulation (see latency.ts): one ordered delay line per receiving socket.
const outLines = new WeakMap<WebSocket, ReturnType<typeof createDelayLine>>();
const sendDelayed = (ws: WebSocket | null, msg: ServerMessage) => {
  if (!ws) return;
  let line = outLines.get(ws);
  if (!line) outLines.set(ws, (line = createDelayLine(OUT_DELAY_MS)));
  line(() => send(ws, msg));
};

const clampNumber = (v: unknown, min: number, max: number) =>
  Number.isFinite(v) ? Math.max(min, Math.min(max, v as number)) : 0;
const safeInt = (v: unknown): v is number => Number.isSafeInteger(v);

/** Validates and normalises a player's input message before it reaches the simulation. */
function sanitizeInput(m: Extract<ClientMessage, { type: 'input' }>): SanitizedInput {
  return {
    type: 'input',
    action: m.action,
    roundId: safeInt(m.roundId) ? m.roundId : -1,
    castId: safeInt(m.castId) ? m.castId : null,
    inputId: safeInt(m.inputId) ? m.inputId : null,
    key: String(m.key || '').slice(0, 20),
    down: !!m.down,
    x: clampNumber(m.x, 0, ARENA_WIDTH),
    y: clampNumber(m.y, 0, ARENA_HEIGHT),
  };
}

function createRunner(room: Room): MatchRunner {
  const players = (): Record<'p' | 'e', Client | null> => ({ p: room.creator, e: room.joiner });
  return new MatchRunner(
    (side, msg) => sendDelayed(players()[side], msg),
    (side) => (players()[side]?.bufferedAmount ?? Infinity) < 16000,
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

/** Removes the client from its room. The room is destroyed and the other player notified. */
export function leaveRoom(ws: Client) {
  const code = ws.room;
  if (!code) return;
  const room = rooms.get(code);
  if (room) {
    rooms.delete(code);
    room.runner?.stop();
    const other = room.creator === ws ? room.joiner : room.creator;
    send(other, { type: 'peer_left' });
    if (other) other.room = null;
  }
  ws.room = null;
}

export function handleMessage(ws: Client, m: ClientMessage) {
  switch (m.type) {
    case 'ping':
      send(ws, { type: 'pong', stamp: m.stamp });
      return;
    case 'create': {
      leaveRoom(ws);
      const code = newRoomCode();
      rooms.set(code, { creator: ws, joiner: null, ready: new Set(), roundId: 0, runner: null });
      ws.room = code;
      send(ws, { type: 'created', code });
      return;
    }
    case 'join': {
      const code = String(m.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room || room.joiner || room.creator === ws) {
        send(ws, { type: 'error', message: 'Room not found or already full.' });
        return;
      }
      leaveRoom(ws);
      room.joiner = ws;
      ws.room = code;
      send(ws, { type: 'joined', code });
      room.roundId = 1;
      const start = { type: 'start', roundId: room.roundId } as const;
      send(room.creator, start);
      send(ws, start);
      room.runner = createRunner(room);
      room.runner.start(room.roundId);
      return;
    }
    case 'leave':
      leaveRoom(ws);
      return;
  }

  // Everything below requires an active two-player room.
  const room = ws.room ? rooms.get(ws.room) : undefined;
  if (!room || !room.joiner) return;
  const side = ws === room.creator ? 'p' : 'e';

  switch (m.type) {
    case 'rematch_ready':
      room.ready.add(ws);
      if (room.ready.has(room.creator) && room.ready.has(room.joiner)) {
        room.ready.clear();
        room.roundId++;
        const start = { type: 'rematch_start', roundId: room.roundId } as const;
        send(room.creator, start);
        send(room.joiner, start);
        room.runner?.start(room.roundId);
      }
      return;
    case 'input':
      if (typeof m.action !== 'string') return;
      room.runner?.handleInput(side, sanitizeInput(m));
      return;
  }
}
