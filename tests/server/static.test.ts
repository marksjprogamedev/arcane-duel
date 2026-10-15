import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createStaticHandler } from '../../server/static';

let root: string;
let server: http.Server;
let base: string;

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'arcane-static-'));
  fs.mkdirSync(path.join(root, 'assets'));
  fs.mkdirSync(path.join(root, 'arena'));
  fs.writeFileSync(path.join(root, 'index.html'), '<p>hi</p>');
  fs.writeFileSync(path.join(root, 'assets', 'index-abc123.js'), 'x');
  fs.writeFileSync(path.join(root, 'arena', 'art.png'), 'x');
  server = http.createServer(createStaticHandler(root, 'v-test'));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(() => {
  server.close();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('the Node fallback that serves the client (Caddy does it on the server)', () => {
  it('serves the page without caching and reports its version', async () => {
    const page = await fetch(`${base}/`);
    expect(page.status).toBe(200);
    expect(page.headers.get('cache-control')).toBe('no-cache');
    expect(await (await fetch(`${base}/version`)).text()).toBe('v-test');
  });

  it('caches hashed build files for good, and everything else only until it changes', async () => {
    expect((await fetch(`${base}/assets/index-abc123.js`)).headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect((await fetch(`${base}/arena/art.png`)).headers.get('cache-control')).toBe('no-cache');
  });

  it('404s for a missing file and does not serve paths outside the root', async () => {
    expect((await fetch(`${base}/nope.js`)).status).toBe(404);
    // fetch tidies "%2e%2e" away, so send the raw path
    const status = await new Promise<number | undefined>((resolve) =>
      http.get(`${base}/%2e%2e/secret`, (res) => (res.resume(), resolve(res.statusCode))),
    );
    expect([403, 404]).toContain(status); // either way, nothing outside the root is served
  });
});
