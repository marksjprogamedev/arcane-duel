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

// 2. Online: host creates a room, guest joins, both play for a few seconds
const host = await browser.newPage();
const guest = await browser.newPage();
watch(host, 'host');
watch(guest, 'guest');
await host.goto(base);
await guest.goto(base);
await host.click('#createRoom');
await host.waitForFunction(() => /^[A-Z]{6}$/.test(document.getElementById('roomCode').value));
const code = await host.inputValue('#roomCode');
await guest.fill('#roomCode', code);
await guest.click('#joinRoom');
await host.waitForFunction(
  () => getComputedStyle(document.getElementById('menu')).display === 'none',
);
await guest.waitForFunction(
  () => getComputedStyle(document.getElementById('menu')).display === 'none',
);
for (const pg of [host, guest]) {
  await pg.keyboard.press('1');
  await pg.keyboard.down('KeyD');
}
await guest.mouse.move(300, 300);
await guest.mouse.down();
await host.waitForTimeout(3000);
await guest.mouse.up();
const diag = await guest.textContent('#netdiag');
console.log('online ok, guest netdiag:', diag);
if (!/MULTIPLAYER/.test(diag)) fail('no multiplayer diagnostics on guest');

await browser.close();
if (errors.length) {
  fail('page errors:\n' + errors.join('\n'));
} else if (!process.exitCode) console.log('SMOKE PASS');
