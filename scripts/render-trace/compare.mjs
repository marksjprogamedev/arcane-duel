// Compares two draw-call traces: node scripts/render-trace/compare.mjs <labelA> <labelB>
// Prints `same` or the first differing call (with both calls) per case; exit 1 on any difference.
import { readFileSync } from 'node:fs';

const [a, b] = process.argv.slice(2);
if (!a || !b) {
  console.error('usage: node scripts/render-trace/compare.mjs <labelA> <labelB>');
  process.exit(2);
}
const load = (l) => JSON.parse(readFileSync(`screenshots/trace-${l}.json`, 'utf8'));
const A = load(a);
const B = load(b);
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
  const n = Math.max(x.length, y.length);
  let i = 0;
  while (i < n && JSON.stringify(x[i]) === JSON.stringify(y[i])) i++;
  if (i === n) console.log(`${name}: same (${x.length} calls)`);
  else {
    bad++;
    console.log(
      `${name}: DIFFERENT at call ${i} (of ${x.length} / ${y.length})\n  ${a}: ${JSON.stringify(x[i])}\n  ${b}: ${JSON.stringify(y[i])}`,
    );
  }
}
console.log(bad ? `${bad} of ${total} cases differ` : `all ${total} cases same`);
process.exit(bad ? 1 : 0);
