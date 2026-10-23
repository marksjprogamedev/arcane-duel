// The accounts API (/api/*) against a real server and an in-memory database: sign up, log in and out,
// cookies, passwords, recovery codes, display names, deletion, and the guards (origin, JSON, limits).
import type { AddressInfo } from 'node:net';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createGameServer } from '../../server/app';
import { ARGON2_PARAMS } from '../../server/accounts/secrets';
import { setBan, userByUsername } from '../../server/accounts/store';
import { openDatabase, type Db } from '../../server/db';

let server: ReturnType<typeof createGameServer>;
let db: Db;
let base: string;
let host: string;

beforeAll(() => {
  // the real cost is for the server; tests only need the same code path
  Object.assign(ARGON2_PARAMS, { memory: 1024, passes: 1 });
});
beforeEach(async () => {
  db = openDatabase(':memory:');
  server = createGameServer('/nonexistent', 'test', { database: { db, path: ':memory:' } });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  host = `127.0.0.1:${(server.address() as AddressInfo).port}`;
  base = `http://${host}`;
});
afterEach(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  db.close();
});

let nextIp = 1;
/** POSTs like a page of this site would; each call comes from a new IP unless `ip` is given. */
async function post(path: string, body: unknown, opts: { cookie?: string; ip?: string } = {}) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: `https://${host}`,
      'X-Forwarded-For': opts.ip ?? `10.0.0.${nextIp++}`,
      ...(opts.cookie && { Cookie: opts.cookie }),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json(), setCookie: res.headers.get('set-cookie') };
}
async function me(cookie?: string) {
  const res = await fetch(base + '/api/me', { headers: cookie ? { Cookie: cookie } : {} });
  return (await res.json()).account;
}
const cookieOf = (setCookie: string | null) => setCookie!.split(';')[0];

async function signUp(username = 'merlin', password = 'correct horse battery') {
  const res = await post('/api/signup', { username, password, displayName: 'Merlin' });
  expect(res.status).toBe(200);
  return { ...res, cookie: cookieOf(res.setCookie) };
}

describe('sign up and sessions', () => {
  it('signs up, sets a secure session cookie, and /api/me knows the user', async () => {
    const { body, setCookie, cookie } = await signUp('Merlin_1');
    expect(body.account).toEqual({ id: 1, username: 'merlin_1', displayName: 'Merlin' });
    expect(body.recoveryCode).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
    expect(setCookie).toMatch(
      /^__Host-session=[\w-]{43}; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000$/,
    );
    expect(await me(cookie)).toEqual(body.account);
    expect(await me()).toBeNull();
    // only a hash of the token is stored
    const stored = db.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string };
    expect(cookie).not.toContain(stored.token_hash);
  });

  it('refuses bad, reserved, taken and weak sign-ups with the field', async () => {
    await signUp();
    const tries: [Record<string, string>, number, string][] = [
      [{ username: 'ab' }, 400, 'username'],
      [{ username: 'admin' }, 400, 'username'],
      [{ username: 'MERLIN' }, 409, 'username'],
      [{ displayName: 'x' }, 400, 'displayName'],
      [{ displayName: 'Fuck Off' }, 400, 'displayName'],
      [{ password: 'short' }, 400, 'password'],
      [{ password: 'password1' }, 400, 'password'],
      [{ username: 'nimue', password: 'nimue12345' }, 400, 'password'],
    ];
    for (const [change, status, field] of tries) {
      const res = await post('/api/signup', {
        username: 'morgana',
        password: 'a long enough phrase',
        displayName: 'Morgana',
        ...change,
      });
      expect([change, res.status, res.body.field]).toEqual([change, status, field]);
    }
  });

  it('logs in (any case), and a wrong password or unknown user gets the same answer', async () => {
    await signUp();
    const wrong = await post('/api/login', { username: 'merlin', password: 'nope nope nope' });
    const unknown = await post('/api/login', { username: 'nobody', password: 'nope nope nope' });
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    expect(wrong.body).toEqual(unknown.body);
    const ok = await post('/api/login', {
      username: ' MERLIN ',
      password: 'correct horse battery',
    });
    expect(ok.status).toBe(200);
    expect((await me(cookieOf(ok.setCookie))).username).toBe('merlin');
  });

  it('logs out this session, or every session', async () => {
    const a = await signUp();
    const b = await post('/api/login', { username: 'merlin', password: 'correct horse battery' });
    const c = await post('/api/login', { username: 'merlin', password: 'correct horse battery' });
    const out = await post('/api/logout', {}, { cookie: a.cookie });
    expect(out.setCookie).toContain('Max-Age=0');
    expect(await me(a.cookie)).toBeNull();
    expect(await me(cookieOf(b.setCookie))).not.toBeNull();
    await post('/api/logout', { everywhere: true }, { cookie: cookieOf(b.setCookie) });
    expect(await me(cookieOf(c.setCookie))).toBeNull();
  });

  it('a banned user cannot log in and their sessions end', async () => {
    const { cookie } = await signUp();
    setBan(db, userByUsername(db, 'merlin')!.id, 'testing');
    expect(await me(cookie)).toBeNull();
    const res = await post('/api/login', { username: 'merlin', password: 'correct horse battery' });
    expect(res.status).toBe(403);
  });
});

describe('changing the account', () => {
  it('changes the password: needs the current one, ends other sessions', async () => {
    const a = await signUp();
    const other = await post('/api/login', {
      username: 'merlin',
      password: 'correct horse battery',
    });
    const bad = await post(
      '/api/password',
      { current: 'wrong wrong', next: 'a brand new phrase' },
      { cookie: a.cookie },
    );
    expect([bad.status, bad.body.field]).toEqual([401, 'current']);
    const ok = await post(
      '/api/password',
      { current: 'correct horse battery', next: 'a brand new phrase' },
      { cookie: a.cookie },
    );
    expect(ok.status).toBe(200);
    expect(await me(a.cookie)).not.toBeNull();
    expect(await me(cookieOf(other.setCookie))).toBeNull();
    const login = await post('/api/login', { username: 'merlin', password: 'a brand new phrase' });
    expect(login.status).toBe(200);
  });

  it('recovers with the code (any case, no dashes), which then changes', async () => {
    const { body, cookie } = await signUp();
    const code: string = body.recoveryCode;
    const wrong = await post('/api/recover', {
      username: 'merlin',
      recoveryCode: 'AAAA-AAAA-AAAA-AAAA',
      next: 'a brand new phrase',
    });
    expect([wrong.status, wrong.body.field]).toEqual([401, 'recoveryCode']);
    const ok = await post('/api/recover', {
      username: 'merlin',
      recoveryCode: code.toLowerCase().replace(/-/g, ' '),
      next: 'a brand new phrase',
    });
    expect(ok.status).toBe(200);
    expect(ok.body.recoveryCode).not.toBe(code);
    expect(await me(cookie)).toBeNull(); // old sessions ended
    expect(await me(cookieOf(ok.setCookie))).not.toBeNull();
    const again = await post('/api/recover', {
      username: 'merlin',
      recoveryCode: code,
      next: 'another new phrase',
    });
    expect(again.status).toBe(401);
  });

  it('issues a new recovery code for the right password', async () => {
    const { cookie, body } = await signUp();
    const res = await post('/api/recovery-code', { password: 'correct horse battery' }, { cookie });
    expect(res.body.recoveryCode).not.toBe(body.recoveryCode);
  });

  it('changes the display name, with the same rules as sign-up', async () => {
    const { cookie } = await signUp();
    const bad = await post('/api/display-name', { displayName: 'Sh1t' }, { cookie });
    expect(bad.status).toBe(400);
    const ok = await post('/api/display-name', { displayName: '  The   Grey ' }, { cookie });
    expect(ok.body.account.displayName).toBe('The Grey');
    expect((await me(cookie)).displayName).toBe('The Grey');
  });

  it('deletes the account with the password; the username is free again', async () => {
    const { cookie } = await signUp();
    const bad = await post('/api/delete-account', { password: 'wrong wrong' }, { cookie });
    expect(bad.status).toBe(401);
    const ok = await post('/api/delete-account', { password: 'correct horse battery' }, { cookie });
    expect(ok.status).toBe(200);
    expect(await me(cookie)).toBeNull();
    expect(db.prepare('SELECT count(*) AS n FROM sessions').get()).toEqual({ n: 0 });
    await signUp();
  });

  it('needs a session for changes', async () => {
    const res = await post('/api/display-name', { displayName: 'Nobody' });
    expect(res.status).toBe(401);
  });
});

describe('guards', () => {
  it('refuses another origin, a missing origin and non-JSON', async () => {
    const send = (headers: Record<string, string>) =>
      fetch(base + '/api/login', { method: 'POST', headers, body: '{}' }).then((r) => r.status);
    expect(await send({ 'Content-Type': 'application/json', Origin: 'https://evil.example' })).toBe(
      403,
    );
    expect(await send({ 'Content-Type': 'application/json' })).toBe(403);
    expect(await send({ 'Content-Type': 'text/plain', Origin: `https://${host}` })).toBe(415);
  });

  it('refuses a body that is too big, and unknown endpoints', async () => {
    const big = await post('/api/login', { username: 'x'.repeat(5000) });
    expect(big.status).toBe(413);
    expect((await post('/api/nothing', {})).status).toBe(404);
  });

  it('locks a username after 5 wrong passwords, whatever the IP', async () => {
    await signUp();
    for (let i = 0; i < 5; i++)
      expect(
        (await post('/api/login', { username: 'merlin', password: `wrong ${i}xxxx` })).status,
      ).toBe(401);
    const locked = await post('/api/login', {
      username: 'merlin',
      password: 'correct horse battery',
    });
    expect(locked.status).toBe(429);
    expect(locked.body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('limits sign-ups per IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++)
      statuses.push(
        (
          await post(
            '/api/signup',
            { username: `wizard${i}`, password: 'a long enough phrase', displayName: 'Wizard' },
            { ip: '10.9.9.9' },
          )
        ).status,
      );
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });

  it('/stats counts accounts', async () => {
    await signUp();
    const stats = await (await fetch(base + '/stats')).json();
    expect(stats.accounts).toBe(1);
    expect(stats.hashQueue).toBe(0);
  });
});
