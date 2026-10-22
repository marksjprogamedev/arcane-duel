// Compares two simulation traces: node scripts/sim-trace/compare.mjs <labelA> <labelB>
// Prints `same` or the first differing tick (with the differing state sections and the first
// changed fields in the nearest full snapshot at or after it) per case; exit 1 on any difference.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const [a, b] = process.argv.slice(2);
if (!a || !b) {
  console.error('usage: node scripts/sim-trace/compare.mjs <labelA> <labelB>');
  process.exit(2);
}
const SECTIONS = ['wizards', 'shots', 'bombs', 'zones', 'traps', 'bubbles', 'events', 'rest'];
const load = (l) =>
  JSON.parse(gunzipSync(readFileSync(`screenshots/simtrace-${l}.json.gz`)).toString('utf8'));
const A = load(a);
const B = load(b);

function diffs(x, y, path, out) {
  if (out.length >= 6) return;
  if (JSON.stringify(x) === JSON.stringify(y)) return;
  if (x && y && typeof x === 'object' && typeof y === 'object') {
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)]))
      diffs(x[k], y[k], `${path}.${k}`, out);
    return;
  }
  out.push(`    ${path}: ${JSON.stringify(x)} -> ${JSON.stringify(y)}`);
}

let bad = 0;
let total = 0;
for (const name of new Set([...Object.keys(A), ...Object.keys(B)])) {
  total++;
  const x = A[name];
  const y = B[name];
  if (!x || !y) {
    console.log(`${name}: only in ${x ? a : b}`);
    bad++;
    continue;
  }
  const n = Math.max(x.ticks.length, y.ticks.length);
  let i = 0;
  while (i < n && x.ticks[i] === y.ticks[i]) i++;
  if (i === n) {
    console.log(`${name}: same (${x.ticks.length} ticks)`);
    continue;
  }
  bad++;
  const hx = x.ticks[i] ?? '';
  const hy = y.ticks[i] ?? '';
  const secs = SECTIONS.filter((_, s) => hx.slice(s * 8, s * 8 + 8) !== hy.slice(s * 8, s * 8 + 8));
  let msg = `${name}: DIFFERENT at tick ${i} (of ${x.ticks.length} / ${y.ticks.length}) in ${secs.join(', ') || 'length'}`;
  const snap = Object.keys(x.snaps)
    .map(Number)
    .sort((p, q) => p - q)
    .find((t) => t >= i && y.snaps[t]);
  if (snap !== undefined) {
    const out = [];
    diffs(x.snaps[snap], y.snaps[snap], '', out);
    msg += `\n  first changed fields in the snapshot at tick ${snap}:\n${out.join('\n')}`;
  }
  console.log(msg);
}
console.log(bad ? `${bad} of ${total} cases differ` : `all ${total} cases same`);
process.exit(bad ? 1 : 0);
