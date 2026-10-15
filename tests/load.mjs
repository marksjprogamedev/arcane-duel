// Measures server CPU use with N concurrent rooms (2 active players each).
// Usage: npm run build && node tests/load.mjs [rooms=1,5,20] [seconds=10] [map=enchanted] [scenario=wander]
//   map       any map id (the host picks it in the lobby)
//   scenario  wander: random walking (on big maps the fog usually hides the rival);
//             meet: both walk at each other, so on a battleground they soon see each other
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import WebSocket from 'ws';
import { PROTOCOL_VERSION } from '../dist/shared/protocol.js'; // needs `npm run build`

const roomCounts = (process.argv[2] || '1,5,20').split(',').map(Number);
const seconds = Number(process.argv[3] || 10);
const mapId = process.argv[4] || 'enchanted';
const scenario = process.argv[5] || 'wander';
if (!['wander', 'meet'].includes(scenario)) throw new Error('scenario: wander or meet');
const PORT = 3095;

const server = spawn('node', ['dist/server/index.js'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});
await new Promise((r) => setTimeout(r, 800));
const ticksPerSec = Number(fs.readFileSync('/proc/self/stat', 'utf8') && 100); // CLK_TCK is 100 on Linux
const cpuSeconds = () => {
  const f = fs.readFileSync(`/proc/${server.pid}/stat`, 'utf8').split(' ');
  return (Number(f[13]) + Number(f[14])) / ticksPerSec; // utime + stime
};
const rssMb = () =>
  Number(fs.readFileSync(`/proc/${server.pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)/)[1]) / 1024;

const connect = () =>
  new Promise((res) => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'hello', protocolVersion: PROTOCOL_VERSION }));
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

async function run(rooms) {
  const clients = [];
  let bytes = 0;
  for (let i = 0; i < rooms; i++) {
    const a = await connect(),
      b = await connect();
    a.on('message', (d) => (bytes += d.length));
    b.on('message', (d) => (bytes += d.length));
    a.send(JSON.stringify({ type: 'create' }));
    const { code } = await once(a, 'created');
    b.send(JSON.stringify({ type: 'join', code }));
    await once(b, 'joined');
    a.send(JSON.stringify({ type: 'set_options', options: { mapId } }));
    a.send(JSON.stringify({ type: 'start_match' }));
    await once(b, 'start');
    clients.push(a, b);
  }
  // like real clients, every player sends a move command per tick (60 Hz), changing direction now
  // and then, and mashes buttons: cast and bomb so the sim and snapshots are busy
  let moveSeq = 0;
  let keys = 0;
  const mover = setInterval(() => {
    moveSeq++;
    if (moveSeq % 20 === 0) keys = Math.floor(Math.random() * 16);
    clients.forEach((ws, i) => {
      // meet: the hosts (even) walk right, the guests (odd) left, along the spawn line
      const k = scenario === 'meet' ? (i % 2 ? 2 : 8) : keys;
      ws.send(JSON.stringify({ type: 'move', roundId: 1, seq: moveSeq, keys: k, x: 400, y: 300 }));
    });
  }, 1000 / 60);
  let inputId = 0;
  const codes = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];
  const timer = setInterval(() => {
    for (const ws of clients) {
      const k = codes[Math.floor(Math.random() * codes.length)];
      ws.send(
        JSON.stringify({
          type: 'input',
          action: 'key',
          key: k,
          down: true,
          roundId: 1,
          inputId: ++inputId,
        }),
      );
      if (Math.random() < 0.3)
        ws.send(
          JSON.stringify({
            type: 'input',
            action: Math.random() < 0.5 ? 'down' : 'bomb',
            x: 100 + Math.random() * 600,
            y: 100 + Math.random() * 400,
            roundId: 1,
            inputId: ++inputId,
          }),
        );
    }
  }, 100);
  const c0 = cpuSeconds(),
    t0 = performance.now();
  await new Promise((r) => setTimeout(r, seconds * 1000));
  const cpu = cpuSeconds() - c0,
    wall = (performance.now() - t0) / 1000;
  clearInterval(timer);
  clearInterval(mover);
  clients.forEach((c) => c.terminate());
  await new Promise((r) => setTimeout(r, 300));
  console.log(
    `${mapId}/${scenario} ${String(rooms).padStart(3)} rooms (${rooms * 2} players): server CPU ${((cpu / wall) * 100).toFixed(1)}% of one core, ${(bytes / wall / 1024).toFixed(0)} KB/s out, RSS ${rssMb().toFixed(0)} MB`,
  );
}
for (const n of roomCounts) await run(n);
server.kill();
