import http from 'node:http';
import path from 'node:path';
import WebSocket from 'ws';
import { MAX_MESSAGE_BYTES, type ClientMessage } from '../shared/protocol';
import { handleMessage, leaveRoom, type Client } from './rooms';
import { createStaticHandler } from './static';

const VERSION = 'Arcane Duel v27.1.5 latency-test';
const PORT = Number(process.env.PORT) || 3036;
// Compiled to dist/server/index.js; the client bundle is in dist/client.
const clientRoot = path.join(__dirname, '..', 'client');

const server = http.createServer(createStaticHandler(clientRoot, VERSION));
const wss = new WebSocket.Server({ server, path: '/ws', maxPayload: MAX_MESSAGE_BYTES });

wss.on('connection', (socket) => {
  const ws = socket as Client;
  ws.room = null;
  ws.role = null;
  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;
    handleMessage(ws, msg);
  });
  ws.on('close', () => leaveRoom(ws));
  ws.on('error', () => {});
});

server.on('error', (err) => {
  console.error(`Unable to start server on port ${PORT}: ${err.message}`);
  process.exit(1);
});
server.listen(PORT, '0.0.0.0', () => console.log(`${VERSION} listening on 0.0.0.0:${PORT}`));
