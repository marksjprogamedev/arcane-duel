// deploy/oracle/caddy.sh writes the server's Caddyfile. These tests print the config it would write
// (CADDY_PRINT=1) and check each slot gets the right name, port and redirect. The real `caddy validate`
// runs on the VM before the config is used.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = resolve(__dirname, '../../deploy/oracle/caddy.sh');

function caddyfile(domain: string): string {
  return execFileSync('bash', [script, domain], {
    env: { ...process.env, CADDY_PRINT: '1', CADDY_IP: '159.13.37.255' },
    encoding: 'utf8',
  });
}

/** Each top-level site block: its address and its body. */
function sites(config: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of config.matchAll(/^(\S+) \{\n([\s\S]*?)^\}/gm)) out.set(m[1], m[2]);
  return out;
}

describe('caddy.sh', () => {
  it('gives each slot its person subdomain, proxied to its own Node port', () => {
    const s = sites(caddyfile('arcaneduel.duckdns.org'));
    const expected: [string, number, string][] = [
      ['arcaneduel.duckdns.org', 3036, 'main'],
      ['mark.arcaneduel.duckdns.org', 3037, 'test1'],
      ['jesse.arcaneduel.duckdns.org', 3038, 'test2'],
      ['adnan.arcaneduel.duckdns.org', 3039, 'test3'],
    ];
    for (const [host, port, slot] of expected) {
      const body = s.get(host);
      expect(body, host).toBeDefined();
      expect(body).toContain(`reverse_proxy localhost:${port}`);
      expect(body).toContain(`/srv/arcane-duel/${slot}/dist/client`);
      expect(body).toContain('@game path /ws /api/* /stats /version');
      expect(body).toContain('X-Frame-Options DENY');
    }
  });

  it('redirects the old http addresses to the new names', () => {
    const s = sites(caddyfile('arcaneduel.duckdns.org'));
    expect(s.get('http://159.13.37.255')).toContain(
      'redir https://arcaneduel.duckdns.org{uri} permanent',
    );
    expect(s.get('http://:8081')).toContain('redir https://mark.arcaneduel.duckdns.org{uri}');
    expect(s.get('http://:8082')).toContain('redir https://jesse.arcaneduel.duckdns.org{uri}');
    expect(s.get('http://:8083')).toContain('redir https://adnan.arcaneduel.duckdns.org{uri}');
    expect(s.size).toBe(8);
  });

  it('serves plain http on the ports without a domain', () => {
    const s = sites(caddyfile(''));
    expect([...s.keys()]).toEqual([':80', ':8081', ':8082', ':8083']);
    expect(s.get(':8082')).toContain('reverse_proxy localhost:3038');
  });
});
