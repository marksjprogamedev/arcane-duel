import http from 'node:http';
import { WebSocketServer } from 'ws';
import { MAX_MESSAGE_BYTES, PROTOCOL_VERSION } from '../shared/protocol';
import { createAccountRoutes, sameOrigin, sessionUser } from './accounts/http';
import { loadProfile, saveProfile } from './accounts/profiles';
import { hashQueueLength } from './accounts/secrets';
import { countUsers } from './accounts/store';
import { databaseBytes, schemaVersion, type Db } from './db';
import { createDelayLine, IN_DELAY_MS } from './latency';
import { configureRooms, handleDisconnect, handleMessage, roomStats, type Client } from './rooms';
import { createFriends } from './friends';
import {
  endAccountSessions,
  presenceOf,
  withPresence,
  sendToAccount,
  onlineAccounts,
  renameAccount,
  trackAccountSocket,
  untrackAccountSocket,
} from './rooms/accounts';
import { createStaticHandler } from './static';
import { recordMessageIn, statsReport } from './stats';
import { createRateLimiter, validateClientMessage } from './validate';

export interface GameServerOptions {
  /** How long a drop pauses the match for everyone (default `RECONNECT_GRACE_MS`). */
  reconnectGraceMs?: number;
  /** How long a room with nobody connected stays open (default `EMPTY_ROOM_CLOSE_MS`). */
  emptyRoomMs?: number;
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
  /** The slot's database (see server/db) and its file, for /stats. Tests run without one. */
  database?: { db: Db; path: string };
}

/** Builds the HTTP + WebSocket server without listening, so tests can use an ephemeral port. */
export function createGameServer(
  clientRoot: string,
  version: string,
  options: GameServerOptions = {},
): http.Server {
  const db = options.database?.db;
  configureRooms({
    friends: db
      ? createFriends(db, {
          sendToUser: (userId, msg) => sendToAccount(userId, msg),
          presenceOf,
        })
      : null,
    profiles: db
      ? {
          load: (userId) => loadProfile(db, userId),
          save: (userId, part) => saveProfile(db, userId, part),
        }
      : null,
    reconnectGraceMs: options.reconnectGraceMs,
    emptyRoomMs: options.emptyRoomMs,
    teamMatches: options.teamMatches,
    startCountdownTicks: options.startCountdownTicks,
  });
  const idleTimeoutMs = options.idleTimeoutMs ?? 15_000;
  const database = options.database;
  const handleApi = database
    ? createAccountRoutes(database.db, {
        onSessionsEnded: endAccountSessions,
        onRenamed: renameAccount,
      })
    : null;
  const serveStatic = createStaticHandler(clientRoot, version);
  const server = http.createServer((req, res) => {
    if (req.url === '/stats') {
      const report = statsReport({
        version,
        protocolVersion: PROTOCOL_VERSION,
        connections: wss.clients.size,
        ...roomStats(),
        ...(database && {
          database: {
            schemaVersion: schemaVersion(database.db),
            bytes: databaseBytes(database.path),
          },
          accounts: countUsers(database.db),
          onlineAccounts: onlineAccounts(),
          hashQueue: hashQueueLength(),
        }),
      });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(report, null, 2));
      return;
    }
    if (req.url?.startsWith('/api/')) {
      if (handleApi) void handleApi(req, res);
      else {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Accounts are not available on this server.' }));
      }
      return;
    }
    serveStatic(req, res);
  });
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: MAX_MESSAGE_BYTES,
    // A browser sends the session cookie with the WebSocket whichever site opened it, so a page on another
    // site must not get one (cross-site WebSocket hijacking). Browsers always send Origin; tools that send
    // none have no cookie to abuse.
    verifyClient: ({ req }: { req: http.IncomingMessage }) =>
      req.headers.origin === undefined || sameOrigin(req),
  });
  const lastHeardAt = new WeakMap<Client, number>();

  wss.on('connection', (socket, req) => {
    const ws = socket as Client;
    ws.room = null;
    ws.helloOk = false;
    // the logged-in player, fixed for this connection's life (the client reconnects after logging in or out)
    const session = database ? sessionUser(database.db, req) : null;
    if (session) {
      ws.account = session.account;
      ws.sessionHash = session.tokenHash;
      trackAccountSocket(ws);
    }
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
      if (!msg) return;
      // in-match traffic (60 a second) never moves anyone between rooms: no presence check for it
      if (msg.type === 'move' || msg.type === 'input' || msg.type === 'ping')
        inbound(() => handleMessage(ws, msg));
      else inbound(() => withPresence(ws, () => handleMessage(ws, msg)));
    });
    ws.on('close', () =>
      withPresence(ws, () => {
        untrackAccountSocket(ws);
        handleDisconnect(ws);
      }),
    );
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
