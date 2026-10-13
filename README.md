# Arcane Duel

Browser-based 2-player wizard duel (Magicka-style elemental spellcasting).
Runs on HTML5 canvas, with a Node.js WebSocket server for online play.

## Project layout

```
client/    Browser game: index.html, styles.css, src/*.ts.
           src/net/ is the connection, your movement prediction and spell previews.
server/    Node HTTP + WebSocket server (TypeScript): index.ts (boot), app.ts (server, /stats),
           rooms.ts (rooms, reconnect), match.ts (runs a match at 60 Hz), validate.ts, static.ts.
shared/    Code used by both: the game simulation (sim/), cosmetics (fx/), protocol.ts
           (message types), constants.
tests/     Unit tests (`npm test`) and browser/load scripts (see Tests below).
docs/      ARCHITECTURE.md (how it works, diagrams), ROADMAP.md (history, measurements, next),
           INVESTIGATION.md (open lag investigation).
dist/      GENERATED build output from `npm run build`. Gitignored. Never edit.
           dist/client/ is the browser bundle, dist/server/ the compiled server.
```

## Run locally

1. Install Node.js 20 or newer.
2. `npm install`
3. `npm run build` then `npm start` (build compiles both client and server)
4. Open `http://localhost:3036` (override with the `PORT` env var).
5. Click **Create Private Room** and share the six-letter code. Your friend
   joins from the same server URL.

For client development with hot reload, run `npm run dev:server` and `npm run dev`
together and open the Vite URL.

Optional lag simulation: `ARCANE_LATENCY_MS=100 ARCANE_JITTER_MS=20 npm start`

## Tests

- `npm test`: unit tests (simulation, snapshots, prediction, server, validation).
- `npm run typecheck`: TypeScript for client and server.
- After `npm run build` (the browser scripts need Playwright's Chromium:
  `npx playwright install chromium`, plus `sudo npx playwright install-deps chromium` on Linux):
  - `node tests/smoke.mjs`: solo duel and an online match in headless Chromium (server must be running).
  - `node tests/feel.mjs`: how smooth movement looks under simulated good/typical/bad networks.
  - `node tests/latency.mjs`: input/spell confirmation times (start the server with `ARCANE_LATENCY_MS`).
  - `node tests/load.mjs`: server CPU and bandwidth with many rooms.

## Deployment

Needs a host with persistent processes and WebSocket support. Current host:
Render free tier (0.1 CPU, 512 MB RAM, Singapore), deployed from GitHub.
Build command: `npm install && npm run build`. Start command: `npm start`.
Live server numbers (rooms, connections, tick time, bandwidth): `https://<your-app>/stats`.

## Networking model

Server-authoritative: the server runs one simulation per room at a fixed 60 Hz and both
players are clients. They send their held keys every tick plus actions as they happen, and
receive snapshots at 20 Hz; each client predicts its own movement and draws the opponent
slightly in the past. A dropped connection can reconnect within 10 s. See
`docs/ARCHITECTURE.md` for diagrams and `docs/ROADMAP.md` for measurements.
