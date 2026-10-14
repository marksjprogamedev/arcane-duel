// End-to-end lag with one wall clock (see docs/INVESTIGATION.md, point 4). Player B walks in short
// bursts; for every key press and release this prints how long until B's wizard starts/stops on
// B's own screen and on A's screen. Unlike feel.mjs it does not compare against a drawn "truth",
// so builds with different prediction code can be compared directly.
//   npm run build && node tests/lag-trace.mjs [repo dir with dist/=.] [profile=steady] [presses=12]
//   profiles as in feel.mjs: good, typical, steady, bad, or none (no simulated latency)
import { spawn } from 'node:child_process';
import net from 'node:net';
import { chromium } from 'playwright';

const PROFILES = {
  none: { out: 0, inn: 0, jitter: 0 },
  good: { out: 25, inn: 25, jitter: 3 },
  typical: { out: 70, inn: 70, jitter: 10 },
  steady: { out: 70, inn: 70, jitter: 0 },
  bad: { out: 120, inn: 120, jitter: 40 },
};
const dir = process.argv[2] || '.';
const profileName = process.argv[3] || 'steady';
const profile = PROFILES[profileName];
const presses = Number(process.argv[4] || 12);
const PORT = 3094;
/** Movement smaller than this is a fading correction, not the wizard starting or stopping. */
const MOVE_PX = 1;
const STEP_TIMEOUT_MS = 15_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (msg) => console.error(`[lag-trace ${(performance.now() / 1000).toFixed(1)}s] ${msg}`);
let server = null;
const quit = (code) => {
  server?.kill();
  process.exit(code);
};
// The first version of this script hung without output. Every step now has a timeout, and the
// whole run has a watchdog, so a stuck step is reported by name instead of waiting forever.
let currentStep = 'start';
setTimeout(() => {
  log(`gave up: stuck in step "${currentStep}"`);
  quit(1);
}, 120_000).unref();
const step = async (name, run) => {
  currentStep = name;
  log(name);
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`step "${name}" timed out`)), STEP_TIMEOUT_MS);
  });
  try {
    return await Promise.race([run(), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

if (!profile) {
  log(`unknown profile ${profileName}`);
  quit(1);
}
const portIsFree = (port) =>
  new Promise((resolve) => {
    const probe = net.createServer().once('error', () => resolve(false));
    probe.listen(port, () => probe.close(() => resolve(true)));
  });
if (!(await portIsFree(PORT))) {
  log(`port ${PORT} is in use (a leftover server?); stop it and run again`);
  quit(1);
}
server = spawn('node', [dir + '/dist/server/index.js'], {
  env: {
    ...process.env,
    PORT: String(PORT),
    ARCANE_LATENCY_MS: String(profile.out),
    ARCANE_LATENCY_IN_MS: String(profile.inn),
    ARCANE_JITTER_MS: String(profile.jitter),
  },
  stdio: 'ignore',
});
process.on('exit', () => server?.kill());
await sleep(700);
if (server.exitCode !== null) {
  log('the game server exited at startup');
  quit(1);
}

const pages = {};
try {
  const browser = await step('launch browser', () => chromium.launch());
  const A = await step('open A', async () => (await browser.newContext()).newPage());
  const B = await step('open B', async () => (await browser.newContext()).newPage());
  Object.assign(pages, { A, B });
  for (const page of [A, B]) page.setDefaultTimeout(STEP_TIMEOUT_MS);
  const url = `http://localhost:${PORT}/?debug`;
  await step('load pages', () => Promise.all([A.goto(url), B.goto(url)]));
  await step('A creates a room', async () => {
    await A.click('#createRoom');
    await A.waitForFunction(() => /^[A-Z]{6}$/.test(document.getElementById('roomCode').value));
  });
  await step('B joins', async () => {
    await B.fill('#roomCode', await A.inputValue('#roomCode'));
    await B.click('#joinRoom');
  });
  const hidden = () => getComputedStyle(document.getElementById('menu')).display === 'none';
  await step('match starts', () =>
    Promise.all([A.waitForFunction(hidden), B.waitForFunction(hidden)]),
  );
  await sleep(1500); // let RTT settle and snapshots flow

  // Record B's x as drawn on each screen every frame, and B's movement key presses as B's page
  // saw them (the same clock as its frames).
  const track = (key) => {
    window.__t = [];
    window.__keys = [];
    const loop = () => {
      const v = window.__arcane.net[key];
      if (v) window.__t.push([performance.timeOrigin + performance.now(), v.x]);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    for (const type of ['keydown', 'keyup'])
      window.addEventListener(
        type,
        (ev) => {
          if (!ev.repeat) window.__keys.push([performance.timeOrigin + performance.now(), type]);
        },
        true,
      );
  };
  await step('start sampling', () =>
    Promise.all([A.evaluate(track, 'visualP'), B.evaluate(track, 'visualE')]),
  );
  await step('focus B', () =>
    B.locator('canvas')
      .first()
      .click({ position: { x: 5, y: 5 } })
      .catch(() => {}),
  );
  for (let i = 0; i < presses; i++) {
    const key = i % 2 ? 'KeyA' : 'KeyD'; // alternate, so the wizard stays away from the walls
    await step(`press ${i + 1}/${presses}`, async () => {
      await sleep(500 + Math.random() * 200);
      await B.keyboard.down(key);
      await sleep(250 + Math.random() * 100);
      await B.keyboard.up(key);
    });
  }
  await sleep(1000);
  const [ta, tb, keys] = await step('collect samples', () =>
    Promise.all([
      A.evaluate(() => window.__t),
      B.evaluate(() => window.__t),
      B.evaluate(() => window.__keys),
    ]),
  );
  await step('close browser', () => browser.close());

  // time from `at` until the position has moved more than MOVE_PX from where it was at `at`
  // (starts), or until it stops changing by more than MOVE_PX over the next 100 ms (stops)
  const xAt = (t, at) => [...t].reverse().find((s) => s[0] <= at)?.[1];
  const startDelay = (t, at) => {
    const x0 = xAt(t, at);
    const s = t.find((e) => e[0] > at && Math.abs(e[1] - x0) > MOVE_PX);
    return s ? s[0] - at : NaN;
  };
  const stopDelay = (t, at) => {
    const after = t.filter((e) => e[0] > at);
    for (const s of after) {
      const later = after.filter((e) => e[0] > s[0] && e[0] <= s[0] + 100);
      if (later.length && later.every((e) => Math.abs(e[1] - s[1]) <= MOVE_PX)) return s[0] - at;
    }
    return NaN;
  };
  const downs = keys.filter((k) => k[1] === 'keydown').map((k) => k[0]);
  const ups = keys.filter((k) => k[1] === 'keyup').map((k) => k[0]);
  const median = (a) => {
    const s = a.filter(Number.isFinite).sort((x, y) => x - y);
    return s.length ? Math.round(s[s.length >> 1]) : NaN;
  };
  const row = (label, f, times) => {
    const own = times.map((at) => f(tb, at));
    const seen = times.map((at) => f(ta, at));
    console.log(
      `${label}: own screen +${median(own)} ms, opponent's screen +${median(seen)} ms (medians of ${times.length})`,
    );
  };
  console.log(`${dir} [${profileName}]`);
  row('starts', startDelay, downs);
  row('stops ', stopDelay, ups);
  quit(0);
} catch (err) {
  log(`failed: ${err.message}`);
  for (const [name, page] of Object.entries(pages)) {
    const status = await page
      .evaluate(() => document.getElementById('roomStatus')?.textContent)
      .catch(() => '(page not responding)');
    log(`${name}'s lobby status: ${JSON.stringify(status)}`);
  }
  quit(1);
}
