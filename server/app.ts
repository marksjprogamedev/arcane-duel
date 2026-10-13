import http from 'node:http';
import { WebSocketServer } from 'ws';
import { MAX_MESSAGE_BYTES, type ClientMessage } from '../shared/protocol';
import { createDelayLine, IN_DELAY_MS } from './latency';
import { handleMessage, leaveRoom, type Client } from './rooms';
import { createStaticHandler } from './static';

/** Builds the HTTP + WebSocket server without listening, so tests can use an ephemeral port. */
export function createGameServer(clientRoot: string, version: string): http.Server {
  const server = http.createServer(createStaticHandler(clientRoot, version));
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MESSAGE_BYTES });

  wss.on('connection', (socket) => {
    const ws = socket as Client;
    ws.room = null;
    ws.role = null;
    const inbound = createDelayLine(IN_DELAY_MS);
    ws.on('message', (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;
      inbound(() => handleMessage(ws, msg));
    });
    ws.on('close', () => leaveRoom(ws));
    ws.on('error', () => {});
  });
  server.on('close', () => wss.close());
  return server;
}
