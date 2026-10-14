// Key release -> server stops your wizard, without a browser. One player walks left/right in
// bursts like a browser client would (a move command every 1/60 s tick, plus one straight away on
// every key change) and compares the client's predicted steps with the steps the server took.
// Usage: npm run build && node tests/stop-trace.mjs [profile=steady] [trials=30]
//   profiles as in feel.mjs: good, typical, steady, bad
import { spawn } from 'node:child_process';
import net from 'node:net';
import WebSocket from 'ws';

const PROFILES = {
  good: { out: 25, inn: 25, jitter: 3 },
  typical: { out: 70, inn: 70, jitter: 10 },
  steady: { out: 70, inn: 70, jitter: 0 },
  bad: { out: 120, inn: 120, jitter: 40 },
};
const profile = PROFILES[process.argv[2] || 'steady'];
const trials = Number(process.argv[3] || 30);
const PORT = 3097;
const TICK_MS = 1000 / 60;
const SPEED = 3.5; // pixels per game tick while walking
const KEY_A = 2,
  KEY_D = 8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const portIsFree = (port) =>
  new Promise((resolve) => {
    const probe = net.createServer().once('error', () => resolve(false));
    probe.listen(port, () => probe.close(() => resolve(true)));
  });
if (!(await portIsFree(PORT))) {
  console.error(`port ${PORT} is in use (a leftover server?); stop it and run again`);
  process.exit(1);
}
const server = spawn('node', ['dist/server/index.js'], {
  env: {
    ...process.env,
    PORT: String(PORT),
    ARCANE_LATENCY_MS: String(profile.out),
    ARCANE_LATENCY_IN_MS: String(profile.inn),
    ARCANE_JITTER_MS: String(profile.jitter),
  },
  stdio: 'ignore',
});
process.on('exit', () => server.kill());
await sleep(700);

const connect = () =>
  new Promise((res) => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'hello', protocolVersion: 2 }));
      res(ws);
    });
  });
const once = (ws, type) =>
  new Promise((res) => {
    const h = (raw) => {
      const m = JSON.parse(raw);
      if (m.type === type) {
        ws.off('message', h);
        res(m);
      }
    };
    ws.on('message', h);
  });

const idle = await connect();
const me = await connect();
idle.send(JSON.stringify({ type: 'create' }));
const { code } = await once(idle, 'created');
const started = once(me, 'start');
me.send(JSON.stringify({ type: 'join', code }));
const { roundId } = await started;
// the idle player must still be heard from, or the server drops them and pauses the match
setInterval(() => idle.send(JSON.stringify({ type: 'ping', stamp: Date.now() })), 1000);

/** Our wizard as the server reported it: [arrival time, x]. */
const snapshots = [];
me.on('message', (raw) => {
  const m = JSON.parse(raw);
  if (m.type === 'state') snapshots.push([performance.now(), m.state.e.x]);
});

// the browser's fixed-step loop, polled every 4 ms instead of every animation frame
let seq = 0;
let keys = 0;
let predictedSteps = 0;
const sendMove = (s) =>
  me.send(JSON.stringify({ type: 'move', roundId, seq: s, keys, x: 400, y: 300 }));
let carry = 0;
let last = performance.now();
setInterval(() => {
  const now = performance.now();
  carry += now - last;
  last = now;
  for (; carry >= TICK_MS; carry -= TICK_MS) {
    seq++;
    if (keys) predictedSteps++;
    sendMove(seq);
  }
}, 4);
const setKeys = (k) => {
  keys = k;
  sendMove(seq + 1); // like sendMoveKeysNow: under the seq the next tick will use
};

await sleep(1500);
const rows = [];
for (let i = 0; i < trials; i++) {
  await sleep(200 + Math.random() * 100);
  const startX = snapshots.at(-1)[1];
  predictedSteps = 0;
  setKeys(i % 2 ? KEY_A : KEY_D); // alternate, so the wizard stays away from the walls
  await sleep(250 + Math.random() * 100);
  const releasedAt = performance.now();
  setKeys(0);
  await sleep(600);
  const finalX = snapshots.at(-1)[1];
  const stopped = snapshots.find((s) => s[0] >= releasedAt && Math.abs(s[1] - finalX) < 0.01);
  const serverSteps = Math.round(Math.abs(finalX - startX) / SPEED);
  rows.push({
    predicted: predictedSteps,
    server: serverSteps,
    diff: serverSteps - predictedSteps,
    stopArrivedMs: stopped ? Math.round(stopped[0] - releasedAt) : null,
  });
}
console.table(rows);
const diffs = rows.map((r) => r.diff);
const arrived = rows.map((r) => r.stopArrivedMs).filter((v) => v !== null);
arrived.sort((a, b) => a - b);
console.log(
  `server minus predicted steps: min ${Math.min(...diffs)}, max ${Math.max(...diffs)}; ` +
    `key release -> snapshot with the final position: p50 ${arrived[arrived.length >> 1]} ms`,
);
process.exit(0);
