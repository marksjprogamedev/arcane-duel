import http from 'node:http';
import { WebSocketServer } from 'ws';
import { MAX_MESSAGE_BYTES, PROTOCOL_VERSION } from '../shared/protocol';
import { createDelayLine, IN_DELAY_MS } from './latency';
import { configureRooms, handleDisconnect, handleMessage, roomStats, type Client } from './rooms';
import { createStaticHandler } from './static';
import { recordMessageIn, statsReport } from './stats';
import { createRateLimiter, validateClientMessage } from './validate';

export interface GameServerOptions {
  /** How long a disconnected player can take to reconnect before their room closes. */
  reconnectGraceMs?: number;
  /**
   * Connections that send nothing for this long are closed. Clients ping every 2 s (and send
   * 60 move commands per second in a match), so silence means a dead connection that the
   * operating system has not noticed yet; closing it starts the reconnect grace period.
   */
  idleTimeoutMs?: number;
  /** Let the creator start team matches (on unless a test turns it off). */
  teamMatches?: boolean;
  /** Ticks between START and the match beginning (default `START_COUNTDOWN_TICKS`). */
  startCountdownTicks?: number;
}

/** Builds the HTTP + WebSocket server without listening, so tests can use an ephemeral port. */
export function createGameServer(
  clientRoot: string,
  version: string,
  options: GameServerOptions = {},
): http.Server {
  configureRooms({
    reconnectGraceMs: options.reconnectGraceMs,
    teamMatches: options.teamMatches,
    startCountdownTicks: options.startCountdownTicks,
  });
  const idleTimeoutMs = options.idleTimeoutMs ?? 15_000;
  const serveStatic = createStaticHandler(clientRoot, version);
  const server = http.createServer((req, res) => {
    if (req.url === '/stats') {
      const report = statsReport({
        version,
        protocolVersion: PROTOCOL_VERSION,
        connections: wss.clients.size,
        ...roomStats(),
      });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(report, null, 2));
      return;
    }
    serveStatic(req, res);
  });
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MESSAGE_BYTES });
  const lastHeardAt = new WeakMap<Client, number>();

  wss.on('connection', (socket) => {
    const ws = socket as Client;
    ws.room = null;
    ws.helloOk = false;
    lastHeardAt.set(ws, Date.now());
    const inbound = createDelayLine(IN_DELAY_MS);
    const rateLimit = createRateLimiter();
    ws.on('message', (raw) => {
      lastHeardAt.set(ws, Date.now());
      recordMessageIn();
      const verdict = rateLimit();
      if (verdict === 'disconnect') ws.terminate();
      if (verdict !== 'ok') return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const msg = validateClientMessage(parsed);
      if (msg) inbound(() => handleMessage(ws, msg));
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
