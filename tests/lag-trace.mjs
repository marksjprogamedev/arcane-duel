// WORK IN PROGRESS (see docs/INVESTIGATION.md): end-to-end lag trace with one wall clock.
// Player B presses keys; prints how long until B's own wizard moves on B's screen and how long
// until it moves on A's screen. Its first run hung (cause unknown); not yet a trusted tool.
//   npm run build && node tests/lag-trace.mjs <repo dir with dist/> [one-way latency ms]
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const [dir, latency] = [process.argv[2] || '.', process.argv[3] || '0'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [dir + '/dist/server/index.js'], {
  env: { ...process.env, PORT: '3094', ARCANE_LATENCY_MS: latency, ARCANE_LATENCY_IN_MS: latency },
  stdio: 'ignore',
});
process.on('exit', () => server.kill());
await sleep(700);
if (server.exitCode !== null) {
  console.log('server failed to start');
  process.exit(1);
}
const browser = await chromium.launch();
const A = await (await browser.newContext()).newPage();
const B = await (await browser.newContext()).newPage();
await A.goto('http://localhost:3094/?debug');
await B.goto('http://localhost:3094/?debug');
await A.click('#createRoom');
await A.waitForFunction(() => /^[A-Z]{6}$/.test(document.getElementById('roomCode').value));
await B.fill('#roomCode', await A.inputValue('#roomCode'));
await B.click('#joinRoom');
await sleep(2000);
const track = (key) => () => {
  window.__t = [];
  let last = null;
  const loop = () => {
    const v = window.__arcane.net[key];
    const x = v ? Math.round(v.x * 10) / 10 : null;
    if (x !== last) window.__t.push([performance.timeOrigin + performance.now(), x]);
    last = x;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};
await A.evaluate(track('visualP')); // B as seen by A
await B.evaluate(track('visualE')); // B as seen by B
await B.locator('canvas').click({ position: { x: 5, y: 5 } });
const presses = [];
for (let i = 0; i < 8; i++) {
  await sleep(600);
  presses.push(await B.evaluate(() => performance.timeOrigin + performance.now()));
  await B.keyboard.down(i % 2 ? 'KeyA' : 'KeyD');
  await sleep(250);
  await B.keyboard.up(i % 2 ? 'KeyA' : 'KeyD');
}
await sleep(800);
const ta = await A.evaluate(() => window.__t),
  tb = await B.evaluate(() => window.__t);
const firstAfter = (t, at) => (t.find((e) => e[0] > at)?.[0] ?? NaN) - at;
const own = presses.map((p) => firstAfter(tb, p)),
  seen = presses.map((p) => firstAfter(ta, p));
const avg = (a) => (a.reduce((s, v) => s + v, 0) / a.length).toFixed(0);
console.log(
  `own screen moves +${avg(own)} ms, opponent's screen moves +${avg(seen)} ms   [${seen.map((v) => v.toFixed(0)).join(' ')}]`,
);
await browser.close();
