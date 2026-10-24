// The shared Wizard Workshop layouts: anyone reads, only editors (arcane-admin workshop-editor) publish.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { parseSharedWorkshop } from '../../shared/workshopShared';
import { runAdmin } from '../../server/admin';
import { ARGON2_PARAMS } from '../../server/accounts/secrets';
import { openDatabase, type Db } from '../../server/db';
import { startTestServer, stopTestServer, testServerUrl } from './helpers';

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
const get = (cookie?: string) =>
  fetch(`http://${host}/api/workshop-layouts`, { headers: cookie ? { Cookie: cookie } : {} });
const put = (body: unknown, cookie?: string, origin: string | null = `http://${host}`) =>
  fetch(`http://${host}/api/workshop-layouts`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const doc = {
  layout: { 'hat:11': { x: 4, y: 12, scale: 1, rotate: 0, flipX: true } },
  pairs: { hatHead: { '16:6': { x: 3, y: 62, scale: 1, rotate: 0 } }, headBody: {} },
};

describe('shared Workshop layouts', () => {
  it('a guest reads nothing until something is published, and cannot edit', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ shared: null, canEdit: false });
  });

  it('an editor publishes; guests and other accounts then read it', async () => {
    const cookie = await signUp('merlin');
    expect(await runAdmin(['workshop-editor', 'merlin'], db, () => {})).toBe(0);
    expect(((await (await get(cookie)).json()) as { canEdit: boolean }).canEdit).toBe(true);
    const res = await put(doc, cookie);
    expect(res.status).toBe(200);
    expect(await (await get()).json()).toEqual({ shared: doc, canEdit: false });
    const other = await signUp('morgana');
    expect(await (await get(other)).json()).toEqual({ shared: doc, canEdit: false });
  });

  it('refuses guests, ordinary accounts and other sites', async () => {
    const cookie = await signUp('merlin');
    expect((await put(doc)).status).toBe(401);
    expect((await put(doc, cookie)).status).toBe(403);
    await runAdmin(['workshop-editor', 'merlin'], db, () => {});
    expect((await put(doc, cookie, 'http://evil.example')).status).toBe(403);
    expect((await put(doc, cookie, null)).status).toBe(403);
    expect(((await (await get()).json()) as { shared: unknown }).shared).toBeNull();
    // the editor right can be taken away again
    await runAdmin(['workshop-editor', 'merlin', '--remove'], db, () => {});
    expect((await put(doc, cookie)).status).toBe(403);
  });

  it('rejects malformed or out-of-range data without changing what is published', async () => {
    const cookie = await signUp('merlin');
    await runAdmin(['workshop-editor', 'merlin'], db, () => {});
    expect((await put(doc, cookie)).status).toBe(200);
    expect((await put('not json', cookie)).status).toBe(400);
    expect(
      (await put({ ...doc, layout: { 'hat:11': { x: 999, y: 0, scale: 1, rotate: 0 } } }, cookie))
        .status,
    ).toBe(400);
    expect((await put({ ...doc, layout: { nonsense: doc.layout['hat:11'] } }, cookie)).status).toBe(
      400,
    );
    expect((await put({ layout: {} }, cookie)).status).toBe(400);
    expect((await put(' '.repeat(300_000), cookie)).status).toBe(413);
    expect(((await (await get()).json()) as { shared: unknown }).shared).toEqual(doc);
  });

  it('admin: unknown user, usage', async () => {
    const lines: string[] = [];
    expect(await runAdmin(['workshop-editor', 'nobody'], db, (l) => lines.push(l))).toBe(1);
    expect(await runAdmin(['workshop-editor'], db, (l) => lines.push(l))).toBe(2);
  });
});

describe('parseSharedWorkshop', () => {
  it('accepts a good copy and rejects a partly bad one whole', () => {
    expect(parseSharedWorkshop(doc)).toEqual(doc);
    expect(parseSharedWorkshop({ ...doc, pairs: { hatHead: { bad: doc.layout['hat:11'] } } })).toBe(
      null,
    );
    expect(parseSharedWorkshop({ ...doc, pairs: { hatHead: 5 } })).toBeNull();
    expect(parseSharedWorkshop(null)).toBeNull();
  });
});
