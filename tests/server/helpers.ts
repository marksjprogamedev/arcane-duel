import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { createGameServer } from '../../server/app';
import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage } from '../../shared/protocol';

/** The running test server and the clients connected to it (see startTestServer). */
let server: ReturnType<typeof createGameServer>;
let url: string;
const sockets: TestClient[] = [];

/** A websocket client that records server messages and lets a test wait for one by type. */
export class TestClient {
  ws: WebSocket;
  messages: ServerMessage[] = [];
  private waiters: { match: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] =
    [];

  constructor() {
    this.ws = new WebSocket(url);
    this.ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString()) as ServerMessage;
      this.messages.push(m);
      this.waiters = this.waiters.filter((w) => {
        if (!w.match(m)) return true;
        w.resolve(m);
        return false;
      });
    });
    sockets.push(this);
  }
  /** Connects and says hello, like the real client. */
  open({ hello = true, clientId }: { hello?: boolean; clientId?: string } = {}) {
    return new Promise<void>((r) =>
      this.ws.on('open', () => {
        if (hello) this.send({ type: 'hello', protocolVersion: PROTOCOL_VERSION, clientId });
        r();
      }),
    );
  }
  send(m: ClientMessage) {
    this.ws.send(JSON.stringify(m));
  }
  /** Resolves with the next (or an already received, unconsumed) message of this type. */
  next<T extends ServerMessage['type']>(
    type: T,
    timeoutMs = 2000,
    pred: (m: any) => boolean = () => true,
  ) {
    const found = this.messages.find((m) => m.type === type && pred(m));
    if (found) {
      this.messages.splice(this.messages.indexOf(found), 1);
      return Promise.resolve(found as Extract<ServerMessage, { type: T }>);
    }
    return new Promise<Extract<ServerMessage, { type: T }>>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), timeoutMs);
      this.waiters.push({
        match: (m) => m.type === type && pred(m),
        resolve: (m) => {
          clearTimeout(t);
          this.messages.splice(this.messages.indexOf(m), 1);
          resolve(m as any);
        },
      });
    });
  }
}

/** The running test server's WebSocket URL. */
export const testServerUrl = () => url;

/** Starts a game server on a free port (call in beforeEach). */
export async function startTestServer(options: Parameters<typeof createGameServer>[2]) {
  server = createGameServer('/nonexistent', 'test', options);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/ws`;
}

/** Drops every client and stops the server (call in afterEach). */
export async function stopTestServer() {
  for (const s of sockets.splice(0)) s.ws.terminate();
  await new Promise<void>((r) => server.close(() => r()));
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
