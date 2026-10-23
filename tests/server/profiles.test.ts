// An account's Workshop look and spellbook loadout (protocol 23): sent after `welcome`, saved with
// `save_profile`, passed on to the account's other connections; guests and malformed looks ignored.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ARGON2_PARAMS } from '../../server/accounts/secrets';
import { openDatabase, type Db } from '../../server/db';
import { validateClientMessage } from '../../server/validate';
import { startTestServer, stopTestServer, TestClient, testServerUrl } from './helpers';

let db: Db;
let host: string;
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

async function signUp(username: string) {
  const res = await fetch(`http://${host}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: `http://${host}` },
    body: JSON.stringify({ username, displayName: 'Wizard', password: 'a long enough phrase' }),
  });
  return res.headers.get('set-cookie')!.split(';')[0];
}
async function client(cookie?: string) {
  const c = new TestClient(cookie ? { Cookie: cookie } : undefined);
  await c.open();
  return c;
}
const look = { head: 'grey3', hat: 'blue_pointed', skin: '#c68642', robeColor: '#335', size: 2 };

describe('profiles', () => {
  it('a new account has nothing saved; a save comes back on the next connection', async () => {
    const cookie = await signUp('merlin');
    const a = await client(cookie);
    expect((await a.next('profile')).profile).toEqual({ workshop: null, loadout: null });
    a.send({ type: 'save_profile', workshop: look });
    a.send({ type: 'save_profile', loadout: { FIRE: 'fireball' } });
    await new Promise((r) => setTimeout(r, 100));
    const b = await client(cookie);
    expect((await b.next('profile')).profile).toEqual({
      workshop: look,
      loadout: { FIRE: 'fireball' },
    });
  });

  it("passes a save on to the account's other connections, not back to the saver", async () => {
    const cookie = await signUp('merlin');
    const a = await client(cookie);
    const b = await client(cookie);
    await a.next('profile');
    await b.next('profile');
    a.send({ type: 'save_profile', loadout: { FIRE: 'pyro_disc' } });
    expect((await b.next('profile')).profile.loadout).toEqual({ FIRE: 'pyro_disc' });
    await new Promise((r) => setTimeout(r, 100));
    expect(a.messages.some((m) => m.type === 'profile')).toBe(false);
  });

  it('a guest gets no profile and cannot save one', async () => {
    const guest = await client();
    await guest.next('welcome');
    guest.send({ type: 'save_profile', workshop: look });
    await new Promise((r) => setTimeout(r, 100));
    expect(guest.messages.some((m) => m.type === 'profile')).toBe(false);
    expect(db.prepare('SELECT count(*) AS n FROM profiles').get()).toEqual({ n: 0 });
  });
});

describe('validating save_profile', () => {
  it('keeps a well-formed look and a sanitised loadout', () => {
    expect(
      validateClientMessage({
        type: 'save_profile',
        workshop: look,
        loadout: { FIRE: 'fireball', WATER: 'nonsense' },
      }),
    ).toEqual({ type: 'save_profile', workshop: look, loadout: { FIRE: 'fireball' } });
  });

  it('refuses a malformed look or an empty message', () => {
    const bad = [
      { head: { nested: true } },
      { head: 'x'.repeat(41) },
      { 'bad key': 'x' },
      Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, 1])),
      ['grey3'],
      { size: Infinity },
    ];
    for (const workshop of bad)
      expect(validateClientMessage({ type: 'save_profile', workshop })).toBeNull();
    expect(validateClientMessage({ type: 'save_profile' })).toBeNull();
  });
});
