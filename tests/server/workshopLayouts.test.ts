// The shared Wizard Workshop layouts: anyone reads, only editors (arcane-admin workshop-editor) publish.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  applySharedWorkshopPatch,
  diffSharedWorkshop,
  isEmptyPatch,
  parseSharedWorkshop,
} from '../../shared/workshopShared';
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

describe('publishing a patch', () => {
  const edit = async () => {
    const cookie = await signUp('merlin');
    await runAdmin(['workshop-editor', 'merlin'], db, () => {});
    return cookie;
  };
  const adj = (x: number) => ({ x, y: 1, scale: 1, rotate: 0 });

  it('needs a published copy first', async () => {
    const cookie = await edit();
    expect((await put({ patch: { pairs: { hatHead: { '16:6': adj(1) } } } }, cookie)).status).toBe(
      409,
    );
  });

  it('changes only the named keys, so two editors do not overwrite each other', async () => {
    const cookie = await edit();
    await put(doc, cookie);
    const res = await put(
      { patch: { pairs: { headBody: { '16:14': adj(5) } }, layout: { 'hat:11': null } } },
      cookie,
    );
    expect(res.status).toBe(200);
    const { shared } = (await (await get()).json()) as { shared: typeof doc };
    expect(shared.pairs.hatHead).toEqual(doc.pairs.hatHead);
    expect(shared.pairs.headBody).toEqual({ '16:14': adj(5) });
    expect(shared.layout).toEqual({});
    // a second patch to a different pair keeps the first
    await put({ patch: { pairs: { hatHead: { '16:1': adj(9) } } } }, cookie);
    const again = ((await (await get()).json()) as { shared: typeof doc }).shared;
    expect(again.pairs.headBody).toEqual({ '16:14': adj(5) });
    expect(again.pairs.hatHead['16:1']).toEqual(adj(9));
    expect(again.pairs.hatHead['16:6']).toEqual(doc.pairs.hatHead['16:6']);
  });

  it('rejects a bad patch whole', async () => {
    const cookie = await edit();
    await put(doc, cookie);
    const bad = { patch: { pairs: { hatHead: { '16:1': adj(1), nonsense: adj(2) } } } };
    expect((await put(bad, cookie)).status).toBe(400);
    expect((await put({ patch: { layout: { 'hat:11': { x: 500 } } } }, cookie)).status).toBe(400);
    expect(((await (await get()).json()) as { shared: unknown }).shared).toEqual(doc);
  });
});

describe('diffSharedWorkshop', () => {
  it('describes what changed and applies back to the new copy', () => {
    const a = (x: number) => ({ x, y: 0, scale: 1, rotate: 0 });
    const base = {
      layout: { 'hat:1': a(1), 'hat:2': a(2) },
      pairs: { hatHead: { '1:1': a(1) }, headBody: {} },
    };
    const next = {
      layout: { 'hat:1': a(1), 'hat:3': a(3) },
      pairs: { hatHead: {}, headBody: { '1:2': a(4) } },
    };
    const patch = diffSharedWorkshop(base, next);
    expect(patch).toEqual({
      layout: { 'hat:2': null, 'hat:3': a(3) },
      pairs: { hatHead: { '1:1': null }, headBody: { '1:2': a(4) } },
    });
    expect(applySharedWorkshopPatch(base, patch)).toEqual(next);
    expect(isEmptyPatch(diffSharedWorkshop(base, base))).toBe(true);
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
