// "Feel" benchmark: measures rubber-banding of your own wizard and judder/lag of the opponent
// under simulated network conditions, with two real browsers and the built server.
//   npm run build && node tests/feel.mjs [profile,...]     (profiles: good, typical, bad, steady)
import { spawn } from 'node:child_process';
import net from 'node:net';
import { chromium } from 'playwright';

const PROFILES = {
  good: { out: 25, inn: 25, jitter: 3 }, //   ~50 ms RTT
  typical: { out: 70, inn: 70, jitter: 10 }, // ~140 ms RTT (like Perth -> Singapore)
  steady: { out: 70, inn: 70, jitter: 0 }, //  ~140 ms RTT, no jitter (isolates jitter effects)
  bad: { out: 120, inn: 120, jitter: 40 }, //  ~240 ms RTT, jittery
};
const names = (process.argv[2] || 'good,typical,bad').split(',');
const SPEED = 3.5; // pixels per game tick while walking
const TICK_MS = 1000 / 60;
const PORT = 3093;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A server left running (e.g. by a run that crashed or was killed) would answer instead of the
// one started here, with the wrong code and latency settings, and silently ruin the numbers.
const portIsFree = (port) =>
  new Promise((resolve) => {
    const probe = net.createServer().once('error', () => resolve(false));
    probe.listen(port, () => probe.close(() => resolve(true)));
  });
let currentServer = null;
const stopServer = () => currentServer?.kill();
process.on('exit', stopServer);
for (const sig of ['SIGINT', 'SIGTERM'])
  process.on(sig, () => {
    stopServer();
    process.exit(1);
  });

async function runProfile(name) {
  const p = PROFILES[name];
  if (!(await portIsFree(PORT)))
    throw new Error(`port ${PORT} is in use (a leftover server?); stop it and run again`);
  const server = spawn('node', ['dist/server/index.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      ARCANE_LATENCY_MS: String(p.out),
      ARCANE_LATENCY_IN_MS: String(p.inn),
      ARCANE_JITTER_MS: String(p.jitter),
    },
    stdio: 'ignore',
  });
  currentServer = server;
  await sleep(700);
  if (server.exitCode !== null) throw new Error('the game server exited at startup');
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const ctxB = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const A = await ctxA.newPage();
  const B = await ctxB.newPage();
  const url = `http://localhost:${PORT}/?debug`;
  await A.goto(url);
  await B.goto(url);
  await A.click('#createRoom');
  await A.waitForFunction(() => /^[A-Z]{6}$/.test(document.getElementById('lobbyCode').value));
  await B.fill('#roomCode', await A.inputValue('#lobbyCode'));
  await B.click('#joinRoom');
  await A.click('#startMatch:not([disabled])');
  const hidden = () => getComputedStyle(document.getElementById('menu')).display === 'none';
  await A.waitForFunction(hidden);
  await B.waitForFunction(hidden);
  await sleep(1500); // let RTT settle and snapshots flow

  const sampler = () => {
    window.__s = [];
    const loop = () => {
      const { game, net } = window.__arcane;
      const k = game.input[net.seat].keys;
      const theirs = net.drawnShots.find((q) => !q.mine);
      const sh = theirs ? [theirs.id, theirs] : null;
      window.__s.push([
        performance.timeOrigin + performance.now(),
        net.visualE?.x,
        net.visualE?.y,
        game.e.x,
        game.e.y,
        net.visualP?.x,
        net.visualP?.y,
        +!!k.KeyD,
        +!!k.KeyA,
        +!!k.KeyS,
        +!!k.KeyW,
        sh ? sh[0] : null,
        sh ? sh[1].x : null,
        sh ? sh[1].y : null,
      ]);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  await A.evaluate(sampler);
  await B.evaluate(sampler);
  await A.locator('canvas')
    .click({ position: { x: 5, y: 5 } })
    .catch(() => {});

  // A walks in a square; B walks up and down. Both are held-key movements.
  const holdA = async (key, ms) => {
    await A.keyboard.down(key);
    await sleep(ms);
    await A.keyboard.up(key);
  };
  const holdB = async (key, ms) => {
    await B.keyboard.down(key);
    await sleep(ms);
    await B.keyboard.up(key);
  };
  const scriptA = async () => {
    for (let i = 0; i < 6; i++)
      for (const k of ['KeyD', 'KeyS', 'KeyA', 'KeyW']) {
        await holdA(k, 300);
        await sleep(450);
      }
  };
  const scriptB = async () => {
    await B.keyboard.press('Digit4');
    for (let i = 0; i < 4; i++)
      for (const k of ['KeyW', 'KeyS']) {
        await B.mouse.move(250, 300);
        await B.mouse.down();
        await sleep(40);
        await B.mouse.up();
        await holdB(k, 900);
        await sleep(350);
      }
  };
  await Promise.all([scriptA(), scriptB()]);
  await sleep(800);

  const sa = await A.evaluate(() => window.__s);
  const sb = await B.evaluate(() => window.__s);
  await browser.close();
  server.kill();
  currentServer = null;
  await sleep(200);
  return analyse(sa, sb);
}

function pct(arr, q) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0;
}

function analyse(sa, sb) {
  // own wizard: residual = frame displacement minus the displacement the keys alone would give
  const resid = [];
  const offset = [];
  let ideal = null;
  for (let i = 1; i < sa.length; i++) {
    const [t, vx, vy, , , , , kD, kA, kS, kW] = sa[i];
    const dt = Math.min(2, (t - sa[i - 1][0]) / TICK_MS);
    const gx = kD - kA,
      gy = kS - kW,
      gl = Math.hypot(gx, gy) || 1;
    const mx = (gx / gl) * SPEED * dt,
      my = (gy / gl) * SPEED * dt;
    if (vx == null) continue;
    if (!ideal) ideal = { x: vx, y: vy };
    ideal.x += mx;
    ideal.y += my;
    const px = sa[i - 1][1],
      py = sa[i - 1][2];
    resid.push(Math.hypot(vx - px - mx, vy - py - my));
    offset.push(Math.hypot(vx - ideal.x, vy - ideal.y));
  }
  const bands = resid.filter((r) => r > 1.5);

  // convergence: after each key release, how long until the drawn wizard sits on the authoritative position
  const conv = [];
  let unsettled = 0;
  for (let i = 1; i < sa.length; i++) {
    const was = sa[i - 1][7] + sa[i - 1][8] + sa[i - 1][9] + sa[i - 1][10],
      now = sa[i][7] + sa[i][8] + sa[i][9] + sa[i][10];
    if (was > 0 && now === 0) {
      let j = i;
      const keysDown = (r) => r[7] + r[8] + r[9] + r[10];
      while (
        j < sa.length &&
        keysDown(sa[j]) === 0 &&
        Math.hypot(sa[j][1] - sa[j][3], sa[j][2] - sa[j][4]) > 6
      )
        j++;
      if (j < sa.length && keysDown(sa[j]) === 0) conv.push(sa[j][0] - sa[i][0]);
      else unsettled++;
    }
  }

  // opponent as drawn by A vs the opponent's own drawn position on B (same wall clock)
  const bSeries = sb.filter((r) => r[1] != null).map((r) => [r[0], r[2]]); // B's own visualE.y over time
  const aSeries = sa.filter((r) => r[6] != null).map((r) => [r[0], r[6]]); // opponent y on A
  const at = (series, t) => {
    // linear interpolation
    let lo = 0,
      hi = series.length - 1;
    if (t <= series[0][0]) return series[0][1];
    if (t >= series[hi][0]) return series[hi][1];
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (series[mid][0] <= t) lo = mid;
      else hi = mid;
    }
    const f = (t - series[lo][0]) / (series[hi][0] - series[lo][0]);
    return series[lo][1] + (series[hi][1] - series[lo][1]) * f;
  };
  let best = { shift: 0, err: Infinity };
  for (let shift = 0; shift <= 400; shift += 5) {
    let err = 0,
      n = 0;
    for (const [t, y] of aSeries) {
      if (t - shift < bSeries[0][0] || t - shift > bSeries.at(-1)[0]) continue;
      err += Math.abs(y - at(bSeries, t - shift));
      n++;
    }
    if (n > 30 && err / n < best.err) best = { shift, err: err / n };
  }
  // judder of the opponent while it moves: frame displacements should be steady
  const disp = [];
  let stalls = 0,
    moving = 0;
  for (let i = 1; i < aSeries.length; i++) {
    const d = Math.abs(aSeries[i][1] - aSeries[i - 1][1]);
    if (d > 0.4) {
      moving++;
      disp.push(d);
    } else if (i > 1 && Math.abs(aSeries[i - 1][1] - aSeries[i - 2][1]) > 2) stalls++;
  }
  const mean = disp.reduce((a, b) => a + b, 0) / (disp.length || 1);
  const sd = Math.sqrt(disp.reduce((a, b) => a + (b - mean) ** 2, 0) / (disp.length || 1));

  // projectiles as drawn: consecutive frames of the same shot should move steadily
  const stepSizes = [];
  for (let i = 1; i < sa.length; i++) {
    const a = sa[i - 1];
    const b = sa[i];
    if (a[11] != null && a[11] === b[11]) stepSizes.push(Math.hypot(b[12] - a[12], b[13] - a[13]));
  }
  const stepMean = stepSizes.reduce((a, b) => a + b, 0) / (stepSizes.length || 1);
  const stepSd = Math.sqrt(
    stepSizes.reduce((a, b) => a + (b - stepMean) ** 2, 0) / (stepSizes.length || 1),
  );
  const shotJumps = stepSizes.filter((d) => d > stepMean * 2.5).length;

  return {
    frames: sa.length,
    self_corr_max_px: Math.max(0, ...resid).toFixed(1),
    self_corr_frames_over_1_5px: bands.length,
    self_corr_total_px: resid.reduce((a, b) => a + b, 0).toFixed(0),
    self_offset_from_pure_local_p95_px: pct(offset, 0.95).toFixed(1),
    self_settle_after_stop_ms_p50: Math.round(pct(conv, 0.5)),
    self_settle_after_stop_ms_max: Math.round(Math.max(0, ...conv)),
    self_never_settled: unsettled,
    opp_lag_vs_truth_ms: best.shift,
    opp_judder_cv: (sd / (mean || 1)).toFixed(2),
    opp_stall_frames: stalls,
    shot_samples: stepSizes.length,
    shot_judder_cv: (stepSd / (stepMean || 1)).toFixed(2),
    shot_big_jumps: shotJumps,
  };
}

const rows = {};
for (const n of names) {
  process.stdout.write(`running ${n}... `);
  rows[n] = await runProfile(n);
  console.log('done');
}
console.table(rows);
