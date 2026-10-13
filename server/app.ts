import http from 'node:http';
import { WebSocketServer } from 'ws';
import { MAX_MESSAGE_BYTES, type ClientMessage } from '../shared/protocol';
import { createDelayLine, IN_DELAY_MS } from './latency';
import { configureRooms, handleDisconnect, handleMessage, type Client } from './rooms';
import { createStaticHandler } from './static';

export interface GameServerOptions {
  /** How long a disconnected player can take to reconnect before their room closes. */
  reconnectGraceMs?: number;
  /**
   * Connections that send nothing for this long are closed. Clients ping every 2 s (and send
   * 60 move commands per second in a match), so silence means a dead connection that the
   * operating system has not noticed yet; closing it starts the reconnect grace period.
   */
  idleTimeoutMs?: number;
}

/** Builds the HTTP + WebSocket server without listening, so tests can use an ephemeral port. */
export function createGameServer(
  clientRoot: string,
  version: string,
  options: GameServerOptions = {},
): http.Server {
  configureRooms({ reconnectGraceMs: options.reconnectGraceMs });
  const idleTimeoutMs = options.idleTimeoutMs ?? 15_000;
  const server = http.createServer(createStaticHandler(clientRoot, version));
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MESSAGE_BYTES });
  const lastHeardAt = new WeakMap<Client, number>();

  wss.on('connection', (socket) => {
    const ws = socket as Client;
    ws.room = null;
    lastHeardAt.set(ws, Date.now());
    const inbound = createDelayLine(IN_DELAY_MS);
    ws.on('message', (raw) => {
      lastHeardAt.set(ws, Date.now());
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;
      inbound(() => handleMessage(ws, msg));
    });
    ws.on('close', () => handleDisconnect(ws));
    ws.on('error', () => {});
  });

  const idleCheck = setInterval(
    () => {
      const now = Date.now();
      for (const ws of wss.clients as Set<Client>)
        if (now - (lastHeardAt.get(ws) ?? now) > idleTimeoutMs) ws.terminate();
    },
    Math.min(5000, idleTimeoutMs),
  );
  server.on('close', () => {
    clearInterval(idleCheck);
    wss.close();
  });
  return server;
}
