// Fails if the version differs between the places that must agree, or the newest
// versioned CHANGELOG entry is not that version. Jesse's branch only (see docs/WORKFLOW.md).
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const found = {
  'package.json': pkg.version,
  'package-lock.json': lock.version,
  'package-lock.json packages[""]': lock.packages[''].version,
  'server/index.ts VERSION': read('server/index.ts').match(/VERSION = 'Arcane Duel v(\S+)/)?.[1],
  'CHANGELOG.md newest entry': read('CHANGELOG.md').match(/^## (\d+\.\d+\.\d+-\d+) /m)?.[1],
};
for (const m of read('client/index.html').matchAll(/>v(\d+\.\d+\.\d+-\d+) ·/g)) {
  found[`client/index.html label ${Object.keys(found).length}`] = m[1];
}
const bad = Object.entries(found).filter(([, v]) => v !== pkg.version);
if (bad.length) {
  console.error(`Version mismatch (package.json says ${pkg.version}):`);
  for (const [k, v] of bad) console.error(`  ${k}: ${v ?? 'not found'}`);
  process.exit(1);
}
console.log(`Version ${pkg.version} is consistent in ${Object.keys(found).length} places.`);
