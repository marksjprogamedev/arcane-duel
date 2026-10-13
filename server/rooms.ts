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
  type Netcode,
  type Role,
  type RelayedInput,
  type ServerMessage,
} from '../shared/protocol';

export interface Client extends WebSocket {
  room: string | null;
  role: Role | null;
}

interface Room {
  host: Client;
  guest: Client | null;
  ready: Set<Client>;
  roundId: number;
  netcode: Netcode;
  /** Present while a `server` netcode match exists; the creator is wizard `p`, the joiner `e`. */
  runner: MatchRunner | null;
}

const rooms = new Map<string, Room>();

const send = (ws: WebSocket | null | undefined, msg: ServerMessage) => {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

// Optional local network simulation (see latency.ts): one ordered delay line per receiving socket.
const outLines = new WeakMap<WebSocket, ReturnType<typeof createDelayLine>>();
const relay = (ws: WebSocket | null, msg: ServerMessage) => {
  if (!ws) return;
  let line = outLines.get(ws);
  if (!line) outLines.set(ws, (line = createDelayLine(OUT_DELAY_MS)));
  line(() => send(ws, msg));
};

const clampNumber = (v: unknown, min: number, max: number) =>
  Number.isFinite(v) ? Math.max(min, Math.min(max, v as number)) : 0;
const safeInt = (v: unknown): v is number => Number.isSafeInteger(v);

/** Validates and normalises a guest/host input message before it reaches the simulation. */
function sanitizeInput(
  m: Extract<ClientMessage, { type: 'input' }>,
  roundId: number,
): RelayedInput {
  return {
    type: 'input',
    action: m.action,
    roundId,
    castId: safeInt(m.castId) ? m.castId : null,
    inputId: safeInt(m.inputId) ? m.inputId : null,
    key: String(m.key || '').slice(0, 20),
    down: !!m.down,
    x: clampNumber(m.x, 0, ARENA_WIDTH),
    y: clampNumber(m.y, 0, ARENA_HEIGHT),
  };
}

function createRunner(room: Room): MatchRunner {
  const players = (): Record<'p' | 'e', Client | null> => ({ p: room.host, e: room.guest });
  return new MatchRunner(
    (side, msg) => relay(players()[side], msg),
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

/** Removes the client from its room. The room is destroyed and the peer notified. */
export function leaveRoom(ws: Client) {
  const code = ws.room;
  if (!code) return;
  const room = rooms.get(code);
  if (room) {
    rooms.delete(code);
    room.runner?.stop();
    const peer = room.host === ws ? room.guest : room.host;
    send(peer, { type: 'peer_left' });
    if (peer) peer.room = null;
  }
  ws.room = null;
  ws.role = null;
}

export function handleMessage(ws: Client, m: ClientMessage) {
  switch (m.type) {
    case 'ping':
      send(ws, { type: 'pong', stamp: m.stamp });
      return;
    case 'create': {
      leaveRoom(ws);
      const code = newRoomCode();
      rooms.set(code, {
        host: ws,
        guest: null,
        ready: new Set(),
        roundId: 0,
        netcode: m.netcode === 'server' ? 'server' : 'host',
        runner: null,
      });
      ws.room = code;
      ws.role = 'host';
      send(ws, { type: 'created', code });
      return;
    }
    case 'join': {
      const code = String(m.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room || room.guest || room.host === ws) {
        send(ws, { type: 'error', message: 'Room not found or already full.' });
        return;
      }
      leaveRoom(ws);
      room.guest = ws;
      ws.room = code;
      ws.role = 'guest';
      send(ws, { type: 'joined', code });
      room.roundId = 1;
      if (room.netcode === 'server') {
        // Both players are clients of the server simulation.
        const start = {
          type: 'start',
          role: 'guest',
          roundId: room.roundId,
          netcode: 'server',
        } as const;
        send(room.host, start);
        send(ws, start);
        room.runner = createRunner(room);
        room.runner.start(room.roundId);
        return;
      }
      send(room.host, { type: 'start', role: 'host', roundId: room.roundId });
      send(ws, { type: 'start', role: 'guest', roundId: room.roundId });
      return;
    }
    case 'leave':
      leaveRoom(ws);
      return;
  }

  // Everything below requires an active two-player room.
  const room = ws.room ? rooms.get(ws.room) : undefined;
  if (!room || !room.guest) return;
  if (room.netcode === 'server') {
    handleServerNetcode(ws, room, room.guest, m);
    return;
  }

  switch (m.type) {
    case 'rematch_ready':
      room.ready.add(ws);
      if (room.ready.has(room.host) && room.ready.has(room.guest)) {
        room.ready.clear();
        room.roundId++;
        send(room.host, { type: 'rematch_start', role: 'host', roundId: room.roundId });
        send(room.guest, { type: 'rematch_start', role: 'guest', roundId: room.roundId });
      }
      return;
    case 'input':
      if (ws !== room.guest || typeof m.action !== 'string' || m.roundId !== room.roundId) return;
      relay(room.host, sanitizeInput(m, room.roundId));
      return;
    case 'input_ack':
      if (ws === room.host && safeInt(m.inputId))
        relay(room.guest, { type: 'input_ack', inputId: m.inputId, accepted: !!m.accepted });
      return;
    case 'cast_ack':
      if (ws === room.host && safeInt(m.castId) && m.roundId === room.roundId)
        relay(room.guest, {
          type: 'cast_ack',
          roundId: room.roundId,
          castId: m.castId,
          accepted: !!m.accepted,
        });
      return;
    case 'death_start':
      if (ws === room.host)
        relay(room.guest, { type: 'death_start', loser: m.loser, winner: !!m.winner });
      return;
    case 'state':
      if (
        ws === room.host &&
        m.state &&
        typeof m.state === 'object' &&
        m.state.roundId === room.roundId
      )
        relay(room.guest, { type: 'state', state: m.state });
      return;
    case 'finished':
      if (ws === room.host) relay(room.guest, { type: 'finished', winner: !!m.winner });
      return;
  }
}

/** Messages in a `server` netcode room: the server simulates, so only inputs and rematches matter. */
function handleServerNetcode(ws: Client, room: Room, guest: Client, m: ClientMessage) {
  switch (m.type) {
    case 'rematch_ready':
      room.ready.add(ws);
      if (room.ready.has(room.host) && room.ready.has(guest)) {
        room.ready.clear();
        room.roundId++;
        const start = {
          type: 'rematch_start',
          role: 'guest',
          roundId: room.roundId,
          netcode: 'server',
        } as const;
        send(room.host, start);
        send(guest, start);
        room.runner?.start(room.roundId);
      }
      return;
    case 'input': {
      if (typeof m.action !== 'string') return;
      const side = ws === room.host ? 'p' : 'e';
      room.runner?.handleInput(side, sanitizeInput(m, m.roundId));
      return;
    }
    default:
      // Host-only messages (state, acks, death/finish) are meaningless here and ignored.
      return;
  }
}
