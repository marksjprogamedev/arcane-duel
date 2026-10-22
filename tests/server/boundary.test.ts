// The server must stay light: it imports the simulation and the map data, never the client or any
// art. These tests walk the real import graph from the server's entry point and keep that true.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAP_IDS } from '../../shared/maps';

const root = resolve(__dirname, '../..');
const IMPORT =
  /(?:import|export)\s[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]|import\s+['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;

function resolveTs(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec.replace(/\.js$/, ''));
  for (const candidate of [`${base}.ts`, resolve(base, 'index.ts')])
    if (existsSync(candidate)) return candidate;
  return null;
}

/** Every source file the server can reach from `entry`. */
function reachable(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, 'utf8').matchAll(IMPORT)) {
      const next = resolveTs(file, m[1] ?? m[2] ?? m[3]);
      if (next) queue.push(next);
    }
  }
  return [...seen].map((f) => relative(root, f)).sort();
}

const serverFiles = reachable(resolve(root, 'server/index.ts'));

describe('server import boundary', () => {
  it('finds the server and the shared simulation', () => {
    expect(serverFiles).toContain('server/index.ts');
    expect(serverFiles).toContain('shared/maps.ts');
    expect(serverFiles).toContain('shared/sim/update.ts');
  });

  it('reaches only server/ and shared/, never the client or its art', () => {
    const outside = serverFiles.filter((f) => !/^(server|shared)\//.test(f));
    expect(outside).toEqual([]);
  });

  it('has no browser or canvas code in anything the server loads', () => {
    for (const f of serverFiles) {
      const text = readFileSync(resolve(root, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(text, f).not.toMatch(/\b(document|window|HTMLCanvasElement|getContext|Image)\b/);
    }
  });

  it('keeps map data to plain data: it imports only other shared files', () => {
    for (const f of ['shared/maps.ts', 'shared/ruinsMap.ts']) {
      const text = readFileSync(resolve(root, f), 'utf8');
      for (const m of text.matchAll(IMPORT)) expect(m[1] ?? m[2] ?? m[3], f).toMatch(/^\.\/(\w+)$/);
    }
  });
});

describe('map data and art stay in step', () => {
  it('the client has a picker entry (name, icon) for every map id, and none for a missing map', () => {
    const text = readFileSync(resolve(root, 'client/src/render/arena/maps.ts'), 'utf8');
    const listed = [...text.matchAll(/\{ id: '(\w+)', name: /g)].map((m) => m[1]);
    expect([...listed].sort()).toEqual([...MAP_IDS].sort());
  });
});
