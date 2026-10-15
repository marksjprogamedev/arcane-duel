// Smoke test: boots the built game in headless Chromium, runs AI duel and a 2-client online match.
// Usage: npm run build && node server/index.js & node tests/smoke.mjs [baseUrl]
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3036';
const browser = await chromium.launch();
const errors = [];
const watch = (page, name) => {
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
};
const fail = (msg) => {
  console.error('FAIL:', msg);
  process.exitCode = 1;
};

// 1. AI duel boots and runs
const solo = await browser.newPage();
watch(solo, 'solo');
await solo.goto(base);
await solo.click('[data-mode="duel"]');
await solo.keyboard.press('1');
await solo.mouse.move(500, 300);
await solo.waitForTimeout(1500);
if ((await solo.locator('#menu').evaluate((e) => getComputedStyle(e).display)) !== 'none')
  fail('menu still visible after starting duel');
console.log('solo duel ok');

// 2. Online match between two browsers
async function playOnline(label) {
  const creator = await browser.newPage();
  const joiner = await browser.newPage();
  watch(creator, `${label}/creator`);
  watch(joiner, `${label}/joiner`);
  await creator.goto(base);
  await joiner.goto(base);
  await creator.click('#createRoom');
  await creator.waitForFunction(() =>
    /^[A-Z]{6}$/.test(document.getElementById('lobbyCode').value),
  );
  const code = await creator.inputValue('#lobbyCode');
  await joiner.fill('#roomCode', code);
  await joiner.click('#joinRoom');
  await creator.click('#startMatch:not([disabled])');
  const menuHidden = () => getComputedStyle(document.getElementById('menu')).display === 'none';
  await creator.waitForFunction(menuHidden);
  await joiner.waitForFunction(menuHidden);
  for (const pg of [creator, joiner]) {
    await pg.keyboard.press('1');
    await pg.keyboard.down('KeyD');
  }
  await joiner.mouse.move(300, 300);
  await joiner.mouse.down();
  await creator.waitForTimeout(3000);
  await joiner.mouse.up();
  // both players must see live multiplayer diagnostics and a rival label
  for (const [who, pg] of [
    ['creator', creator],
    ['joiner', joiner],
  ]) {
    const diag = await pg.textContent('#netdiag');
    console.log(`online[${label}] ${who} netdiag:`, diag);
    if (!/MULTIPLAYER/.test(diag)) fail(`${label}/${who}: no multiplayer diagnostics`);
    if (!/RIVAL/.test(await pg.textContent('#enemy')))
      fail(`${label}/${who}: expected a server-mode RIVAL hp label`);
  }
  await creator.close();
  await joiner.close();
}
await playOnline('server');

await browser.close();
if (errors.length) {
  fail('page errors:\n' + errors.join('\n'));
} else if (!process.exitCode) console.log('SMOKE PASS');
