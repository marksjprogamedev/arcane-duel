// Logged-in players in rooms (protocol 22): the session cookie on the WebSocket, `welcome`, display
// names and guest marks, one seat per account (another tab or device takes over), and connections
// leaving their rooms when the session ends.
import WebSocket from 'ws';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ARGON2_PARAMS } from '../../server/accounts/secrets';
import { openDatabase, type Db } from '../../server/db';
import { startTestServer, stopTestServer, TestClient, testServerUrl } from './helpers';

let db: Db;
let base: string;
let host: string;

beforeAll(() => {
  Object.assign(ARGON2_PARAMS, { memory: 1024, passes: 1 });
});
beforeEach(async () => {
  db = openDatabase(':memory:');
  await startTestServer({
    database: { db, path: ':memory:' },
    startCountdownTicks: 1,
    reconnectGraceMs: 300,
  });
  host = new URL(testServerUrl()).host;
  base = `http://${host}`;
});
afterEach(async () => {
  await stopTestServer();
  db.close();
});

let ip = 1;
async function api(path: string, body: unknown, cookie?: string) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: `http://${host}`,
      'X-Forwarded-For': `10.1.0.${ip++}`,
      ...(cookie && { Cookie: cookie }),
    },
    body: JSON.stringify(body),
  });
  return {
    status: res.status,
    body: await res.json(),
    cookie: res.headers.get('set-cookie')?.split(';')[0],
  };
}
/** Signs up and returns the session cookie. */
async function account(username: string, displayName: string) {
  const res = await api('/api/signup', { username, displayName, password: 'a long enough phrase' });
  expect(res.status).toBe(200);
  return res.cookie!;
}
/** A connected client that said hello, logged in with `cookie` (or a guest). */
async function client(cookie?: string, clientId?: string) {
  const c = new TestClient(cookie ? { Cookie: cookie, Origin: `http://${host}` } : undefined);
  await c.open({ clientId });
  return c;
}

describe('who a connection is', () => {
  it('welcomes a logged-in connection with its account, and a guest with null', async () => {
    const cookie = await account('merlin', 'Merlin');
    const me = await client(cookie);
    expect((await me.next('welcome')).account).toMatchObject({
      username: 'merlin',
      displayName: 'Merlin',
    });
    const guest = await client();
    expect((await guest.next('welcome')).account).toBeNull();
  });

  it('refuses a WebSocket opened by a page on another site', async () => {
    const ws = new WebSocket(testServerUrl(), { headers: { Origin: 'https://evil.example' } });
    const status = await new Promise<number>((resolve) =>
      ws.on('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0)),
    );
    expect(status).toBe(401);
  });

  it('shows display names, and marks guests, in the lobby and the match', async () => {
    const host = await client(await account('merlin', 'Merlin'));
    host.send({ type: 'create' });
    const { code } = await host.next('created');
    const guest = await client(undefined, 'tab-a');
    guest.send({ type: 'join', code });
    const lobby = await guest.next('lobby', 2000, (m) => m.seats.every(Boolean));
    expect(lobby.names).toEqual(['Merlin', 'Player 2']);
    expect(lobby.guests).toEqual([false, true]);
    host.send({ type: 'start_match' });
    const start = await guest.next('start');
    expect(start.names).toEqual(['Merlin', 'Player 2']);
  });

  it('a new display name shows in the lobby at once', async () => {
    const cookie = await account('merlin', 'Merlin');
    const me = await client(cookie);
    me.send({ type: 'create' });
    await me.next('lobby');
    await api('/api/display-name', { displayName: 'The Grey' }, cookie);
    const lobby = await me.next('lobby', 2000, (m) => m.names[0] === 'The Grey');
    expect(lobby.names[0]).toBe('The Grey');
  });
});

describe('one seat per account', () => {
  it('in the lobby, the account opened elsewhere takes over the seat and the host role', async () => {
    const cookie = await account('merlin', 'Merlin');
    const first = await client(cookie);
    first.send({ type: 'create' });
    const { code } = await first.next('created');
    const second = await client(cookie);
    second.send({ type: 'join', code });
    await first.next('replaced');
    const joined = await second.next('joined');
    expect(joined.seat).toBe(0);
    const lobby = await second.next('lobby');
    expect([lobby.youSeat, lobby.youHost, lobby.names[0]]).toEqual([0, true, 'Merlin']);
    expect(lobby.seats.filter(Boolean).length).toBe(1);
  });

  it('in a running match, the account on another device takes its seat back', async () => {
    const cookie = await account('merlin', 'Merlin');
    const a = await client(cookie);
    a.send({ type: 'create' });
    const { code } = await a.next('created');
    const b = await client(undefined, 'tab-b');
    b.send({ type: 'join', code });
    await a.next('lobby', 2000, (m) => m.seats.every(Boolean));
    a.send({ type: 'start_match' });
    await a.next('start');
    const phone = await client(cookie);
    phone.send({ type: 'join', code });
    await a.next('replaced');
    expect((await phone.next('joined')).seat).toBe(0);
    const resumed = await phone.next('resumed');
    expect([resumed.seat, resumed.names[0]]).toEqual([0, 'Merlin']);
  });

  it('two different accounts are two players', async () => {
    const a = await client(await account('merlin', 'Merlin'));
    a.send({ type: 'create' });
    const { code } = await a.next('created');
    const b = await client(await account('morgana', 'Morgana'));
    b.send({ type: 'join', code });
    const lobby = await b.next('lobby');
    expect(lobby.names).toEqual(['Merlin', 'Morgana']);
    expect(a.messages.some((m) => m.type === 'replaced')).toBe(false);
  });
});

describe('when the session ends', () => {
  it('logging out takes that session out of its room; the other player stays', async () => {
    const cookie = await account('merlin', 'Merlin');
    const me = await client(cookie);
    me.send({ type: 'create' });
    const { code } = await me.next('created');
    const other = await client(undefined, 'tab-o');
    other.send({ type: 'join', code });
    await me.next('lobby', 2000, (m) => m.seats.every(Boolean));
    await api('/api/logout', {}, cookie);
    expect((await me.next('signed_out')).reason).toBe('logout');
    const lobby = await other.next('lobby', 2000, (m) => m.seats.filter(Boolean).length === 1);
    expect(lobby.youHost).toBe(true);
  });

  it('changing the password signs out the other sessions only', async () => {
    const cookie = await account('merlin', 'Merlin');
    const login = await api('/api/login', { username: 'merlin', password: 'a long enough phrase' });
    const here = await client(cookie);
    const elsewhere = await client(login.cookie);
    await here.next('welcome');
    await elsewhere.next('welcome');
    await api(
      '/api/password',
      { current: 'a long enough phrase', next: 'another long phrase' },
      cookie,
    );
    expect((await elsewhere.next('signed_out')).reason).toBe('password');
    await new Promise((r) => setTimeout(r, 50));
    expect(here.messages.some((m) => m.type === 'signed_out')).toBe(false);
  });

  it('deleting the account signs out every connection', async () => {
    const cookie = await account('merlin', 'Merlin');
    const me = await client(cookie);
    await me.next('welcome');
    await api('/api/delete-account', { password: 'a long enough phrase' }, cookie);
    expect((await me.next('signed_out')).reason).toBe('deleted');
  });
});
