# Arcane Duel

Browser-based 2-player wizard duel (Magicka-style elemental spellcasting).
Runs on HTML5 canvas, with a Node.js WebSocket server for online play.

## Project layout

```
client/    Browser game: index.html, styles.css, src/*.ts.
           src/net/ is the connection, your movement prediction and spell previews.
server/    Node HTTP + WebSocket server (TypeScript): index.ts (boot), app.ts (server, /stats),
           rooms.ts (rooms, reconnect), match.ts (runs a match at 60 Hz), validate.ts, static.ts,
           latency.ts (test-only network simulation).
shared/    Code used by both: the game simulation (sim/), cosmetics (fx/), protocol.ts
           (message types), constants, charge.ts (charged-spell rules).
tests/     Unit tests (`npm test`) and browser/load scripts (see Tests below).
deploy/    Oracle Cloud server scripts (setup.sh, arcane-deploy).
docs/      HANDOFF.md (where things stand, start here), ARCHITECTURE.md (how it works, diagrams),
           ROADMAP.md (history, measurements, next), INVESTIGATION.md (why online play lags and what
           was done about it), DEPLOY-ORACLE.md (hosting and deploys).
dist/      GENERATED build output from `npm run build`. Gitignored. Never edit.
           dist/client/ is the browser bundle, dist/server/ the compiled server.
```

## Run locally

1. Install Node.js 20 or newer.
2. `npm install` (its `postinstall` also builds; deploys rely on this)
3. `npm start`
4. Open `http://localhost:3036` (override with the `PORT` env var).
5. Click **Create Private Room** and share the six-letter code. Your friend
   joins from the same server URL.

After changing code, run `npm run build` and restart. For client development with hot reload, run
`npm run dev:server` and `npm run dev` together and open the Vite URL.

Optional lag simulation (one-way delays in ms, test only):
`ARCANE_LATENCY_MS=70 ARCANE_LATENCY_IN_MS=70 ARCANE_JITTER_MS=10 npm start`

## Tests

- `npm test`: unit tests (simulation, snapshots, prediction, server, validation).
- `npm run typecheck`: TypeScript for client and server.
- `npx prettier --check .`: formatting (`npm run format` fixes it).
- After `npm run build`, the browser and load scripts (need Playwright's Chromium:
  `npx playwright install chromium`, plus `sudo npx playwright install-deps chromium` on Linux):
  - `node tests/smoke.mjs`: solo duel and an online match in headless Chromium (server must be running).
  - `node tests/feel.mjs [good,typical,bad,steady]`: how smooth movement looks under simulated networks.
  - `node tests/lag-trace.mjs [dir] [profile]`: key press to what each screen shows, on one clock.
  - `node tests/stop-trace.mjs [profile]`: key release to the server stopping the wizard (no browser).
  - `node tests/latency.mjs`: input/spell confirmation times (start the server with `ARCANE_LATENCY_MS`).
  - `node tests/load.mjs [rooms] [seconds]`: server CPU and bandwidth with many rooms.

## Deployment

Hosted on an Oracle Cloud Always Free VM in Sydney (about 50 ms from Perth), with three slots:
`main` on the plain IP and two test slots for any branch. Pushes deploy automatically. See
`docs/DEPLOY-ORACLE.md`. Any host with persistent processes and WebSocket support works
(`npm install` builds, `npm start` runs). Render's free tier was tried and added ~90 ms of extra
latency from Australia, even in its Singapore region.

Live server numbers (rooms, connections, tick time, bandwidth): `http://<host>/stats`.

## Networking model

Server-authoritative: the server runs one simulation per room at a fixed 60 Hz and both
players are clients. They send their held keys every tick plus actions as they happen, and
receive snapshots at 30 Hz; each client predicts its own movement and draws the opponent
slightly in the past. A dropped connection can reconnect within 10 s. See
`docs/ARCHITECTURE.md` for diagrams and `docs/ROADMAP.md` for measurements.

## Working on it

Branch off `main`, push, put the branch on a test slot (`docs/DEPLOY-ORACLE.md`), test it, open a
pull request, merge, delete the branch. Run `npm test`, `npm run typecheck` and
`npx prettier --check .` before pushing.
