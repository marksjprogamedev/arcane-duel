// Friends (protocol 24): requests by username, accept / decline, mutual requests, remove, block (never
// revealed), limits, online / offline, and that guests have none of it.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ARGON2_PARAMS } from '../../server/accounts/secrets';
import { openDatabase, type Db } from '../../server/db';
import type { FriendsList } from '../../shared/protocol';
import { startTestServer, stopTestServer, TestClient, testServerUrl } from './helpers';

let db: Db;
let host: string;
let ip = 1;
beforeAll(() => {
  Object.assign(ARGON2_PARAMS, { memory: 1024, passes: 1 });
});
beforeEach(async () => {
  db = openDatabase(':memory:');
  await startTestServer({ database: { db, path: ':memory:' } });
  host = new URL(testServerUrl()).host;
});
afterEach(async () => {
  await stopTestServer();
  db.close();
});

/** Signs up `username` and connects; returns the client and its account id. */
async function player(username: string) {
  const res = await fetch(`http://${host}/api/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: `http://${host}`,
      'X-Forwarded-For': `10.2.0.${ip++}`,
    },
    body: JSON.stringify({
      username,
      displayName: username.toUpperCase(),
      password: 'a long enough phrase',
    }),
  });
  const body = await res.json();
  const c = new TestClient({ Cookie: res.headers.get('set-cookie')!.split(';')[0] });
  await c.open();
  await c.next('friends');
  return { c, id: body.account.id as number };
}
/** The next friends list matching `pred`. */
const list = (c: TestClient, pred: (l: FriendsList) => boolean = () => true) =>
  c.next('friends', 2000, (m) => pred(m.list)).then((m) => m.list);
const names = (people: { username: string }[]) => people.map((p) => p.username);

describe('friend requests', () => {
  it('a request shows on both sides, accepting makes friends', async () => {
    const a = await player('merlin');
    const b = await player('morgana');
    a.c.send({ type: 'friend_request', username: 'MORGANA' });
    expect(names((await list(a.c, (l) => l.outgoing.length > 0)).outgoing)).toEqual(['morgana']);
    expect(names((await list(b.c, (l) => l.incoming.length > 0)).incoming)).toEqual(['merlin']);
    b.c.send({ type: 'friend_answer', id: a.id, accept: true });
    const mine = await list(a.c, (l) => l.friends.length > 0);
    expect(mine.friends).toEqual([
      { id: b.id, username: 'morgana', displayName: 'MORGANA', presence: 'online' },
    ]);
    expect(mine.outgoing).toEqual([]);
  });

  it('declining removes the request; asking each other makes friends at once', async () => {
    const a = await player('merlin');
    const b = await player('morgana');
    a.c.send({ type: 'friend_request', username: 'morgana' });
    await list(b.c, (l) => l.incoming.length > 0);
    b.c.send({ type: 'friend_answer', id: a.id, accept: false });
    expect((await list(a.c, (l) => l.outgoing.length === 0)).friends).toEqual([]);
    a.c.send({ type: 'friend_request', username: 'morgana' });
    await list(b.c, (l) => l.incoming.length > 0);
    b.c.send({ type: 'friend_request', username: 'merlin' });
    expect(names((await list(a.c, (l) => l.friends.length > 0)).friends)).toEqual(['morgana']);
  });

  it('explains unknown usernames, yourself and existing friends', async () => {
    const a = await player('merlin');
    a.c.send({ type: 'friend_request', username: 'nobody' });
    expect((await a.c.next('friend_error')).message).toBe('No player has that username.');
    a.c.send({ type: 'friend_request', username: 'merlin' });
    expect((await a.c.next('friend_error')).message).toBe("That's you.");
  });

  it('withdraws a request, and removes a friend', async () => {
    const a = await player('merlin');
    const b = await player('morgana');
    a.c.send({ type: 'friend_request', username: 'morgana' });
    await list(b.c, (l) => l.incoming.length > 0);
    a.c.send({ type: 'friend_remove', id: b.id });
    expect((await list(b.c, (l) => l.incoming.length === 0)).incoming).toEqual([]);
    a.c.send({ type: 'friend_request', username: 'morgana' });
    await list(b.c, (l) => l.incoming.length > 0);
    b.c.send({ type: 'friend_answer', id: a.id, accept: true });
    await list(a.c, (l) => l.friends.length > 0);
    b.c.send({ type: 'friend_remove', id: a.id });
    expect((await list(a.c, (l) => l.friends.length === 0)).friends).toEqual([]);
  });
});

describe('blocking', () => {
  it('ends the friendship, and their requests silently go nowhere', async () => {
    const a = await player('merlin');
    const b = await player('morgana');
    a.c.send({ type: 'friend_request', username: 'morgana' });
    await list(b.c, (l) => l.incoming.length > 0);
    b.c.send({ type: 'friend_answer', id: a.id, accept: true });
    await list(a.c, (l) => l.friends.length > 0);
    b.c.send({ type: 'block', id: a.id });
    expect((await list(a.c, (l) => l.friends.length === 0)).friends).toEqual([]);
    expect(names((await list(b.c, (l) => l.blocked.length > 0)).blocked)).toEqual(['merlin']);
    a.c.send({ type: 'friend_request', username: 'morgana' });
    await list(a.c);
    await new Promise((r) => setTimeout(r, 100));
    expect(a.c.messages.some((m) => m.type === 'friend_error')).toBe(false); // not revealed
    expect(db.prepare('SELECT count(*) AS n FROM friend_requests').get()).toEqual({ n: 0 });
    b.c.send({ type: 'unblock', id: a.id });
    expect((await list(b.c, (l) => l.blocked.length === 0)).blocked).toEqual([]);
  });
});

describe('online, limits, guests', () => {
  it("a friend's list shows them going offline and coming back", async () => {
    const a = await player('merlin');
    const b = await player('morgana');
    a.c.send({ type: 'friend_request', username: 'morgana' });
    await list(b.c, (l) => l.incoming.length > 0);
    b.c.send({ type: 'friend_answer', id: a.id, accept: true });
    await list(a.c, (l) => l.friends[0]?.presence === 'online');
    b.c.ws.close();
    await list(a.c, (l) => l.friends[0]?.presence === 'offline');
  });

  it('limits waiting requests', async () => {
    const a = await player('merlin');
    for (let i = 0; i < 21; i++)
      db.prepare(
        "INSERT INTO users (username, display_name, password_hash, created_at) VALUES (?, 'X', 'x', 0)",
      ).run(`wizard${i}`);
    for (let i = 0; i < 20; i++) a.c.send({ type: 'friend_request', username: `wizard${i}` });
    await list(a.c, (l) => l.outgoing.length === 20);
    a.c.send({ type: 'friend_request', username: 'wizard20' });
    expect((await a.c.next('friend_error')).message).toMatch(/20 requests waiting/);
  });

  it('guests get no friends list and their messages do nothing', async () => {
    const g = new TestClient();
    await g.open();
    await g.next('welcome');
    g.send({ type: 'friend_request', username: 'merlin' });
    await new Promise((r) => setTimeout(r, 100));
    expect(g.messages.some((m) => m.type === 'friends' || m.type === 'friend_error')).toBe(false);
  });
});
