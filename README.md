# Arcane Duel

Browser-based wizard duel for two players, or 2 v 2 teams (Magicka-style elemental spellcasting).
Runs on HTML5 canvas, with a Node.js WebSocket server for online play.

## Project layout

```
client/    Browser game: index.html (markup only), src/*.ts, public/ (art, sounds, CSS:
           public/ui/ the shared look, public/screens/ one stylesheet per screen).
           src/net/ is the connection, your movement prediction and spell previews;
           src/render/ draws: scene.ts (draw order), shapes.ts, world/ (wizards, shots, bombs, zones),
           arena/ (map art), effects/ (particles, lightning), hud/ (minimap, team panel, countdown); src/fx/ cosmetics (particles, floating text);
           src/workshop/ the Wizard Workshop; src/ui/ menus and the HUD.
server/    Node HTTP + WebSocket server (TypeScript): index.ts (boot), app.ts (server, /stats),
           rooms.ts (rooms, reconnect), match.ts (runs a match at 60 Hz), validate.ts, static.ts,
           latency.ts (test-only network simulation).
shared/    Code used by both: the game simulation (sim/), protocol.ts
           (message types), constants, charge.ts (charged-spell rules), and the map data
           (maps.ts, ruinsMap.ts; no art, the server loads only this).
tests/     Unit tests (`npm test`) and browser/load scripts (see Tests below).
deploy/    Oracle Cloud server scripts (setup.sh, caddy.sh, arcane-deploy).
scripts/   check-version.mjs (is the version the same in every place it lives).
.githooks/ format on commit, checks on push (turned on by `npm install`).
docs/      HANDOFF.md (where things stand, start here), WORKFLOW.md (how Jesse and Mark share the
           repo), ARCHITECTURE.md (how it works, diagrams), ROADMAP.md (history, measurements,
           next), MAPS-PLAN.md (battlegrounds and fog, done), TEAMS-PLAN.md (2v2, 3v3, 4v4),
           TEST-CHECKLIST.md (manual tests),
           INVESTIGATION.md (why online play lags and what was done about it), DEPLOY-ORACLE.md
           (hosting and deploys).
AGENTS.md  The short rules for AI assistants working here (CLAUDE.md just points to it).
dist/      GENERATED build output from `npm run build`. Gitignored. Never edit.
           dist/client/ is the browser bundle, dist/server/ the compiled server.
```

## Run locally

1. Install Node.js 20 or newer.
2. `npm install` (its `postinstall` also builds; deploys rely on this)
3. `npm start`
4. Open `http://localhost:3036` (override with the `PORT` env var).
5. Click **Create Private Room**: the lobby shows the six-letter code (with a copy button), the map
   (arenas and battlegrounds), the team size (1 v 1 up to 4 v 4), and for team matches friendly fire and what
   happens when a wizard falls. Friends join with the code from the same server URL (they fill the seats
   across the two teams; you can move them with the ⇄ buttons), then you press **Start**.

After changing code, run `npm run build` and restart. For client development with hot reload, run
`npm run dev:server` and `npm run dev` together and open the Vite URL.

Optional lag simulation (one-way delays in ms, test only):
`ARCANE_LATENCY_MS=70 ARCANE_LATENCY_IN_MS=70 ARCANE_JITTER_MS=10 npm start`

## Tests

- `npm test`: unit tests (simulation, snapshots, prediction, server, validation).
- `npm run typecheck`: TypeScript for client and server.
- `npx prettier --check .`: formatting (`npm run format` fixes it). Git hooks run these for you.
- `npm run check-version`: the version is the same everywhere it lives.
- `node scripts/screenshots.mjs <label>` then `--compare <before> <after>`: builds, opens every screen
  (menu, settings, spellbook, Workshop, lobby, a solo match, pause, results, style guide) with a frozen
  clock and seeded randomness, and reports any pixel that changed (images in `screenshots/`, gitignored).
  Run it before and after any client refactor.
- `TRACE_LABEL=<label> npx vitest run --config scripts/render-trace/vitest.config.mts`, then
  `node scripts/render-trace/compare.mjs <before> <after>`: records every canvas call the renderer makes for
  ~330 cases (every wizard style and status, every spell's shots and bombs, every map) and reports the first
  difference. Proves a render refactor draws exactly the same thing.
- `TRACE_LABEL=<label> npx vitest run --config scripts/sim-trace/vitest.config.mts`, then
  `node scripts/sim-trace/compare.mjs <before> <after>`: runs 586 scripted matches (every spell and variant
  against shields, bubbles and dummies, AI duels on every map, 2v2 to 4v4 with every rule) and reports the first
  tick where the simulation differs. Proves a sim refactor changes no gameplay.
- After `npm run build`, the browser and load scripts (need Playwright's Chromium:
  `npx playwright install chromium`, plus `sudo npx playwright install-deps chromium` on Linux):
  - `node tests/smoke.mjs`: solo duel and an online match in headless Chromium (server must be running).
  - `node tests/feel.mjs [good,typical,bad,steady]`: how smooth movement looks under simulated networks.
  - `node tests/lag-trace.mjs [dir] [profile]`: key press to what each screen shows, on one clock.
  - `node tests/stop-trace.mjs [profile]`: key release to the server stopping the wizard (no browser).
  - `node tests/latency.mjs`: input/spell confirmation times (start the server with `ARCANE_LATENCY_MS`).
  - `node tests/load.mjs [rooms] [seconds] [map] [scenario] [teamSize]`: server CPU and bandwidth with many
    rooms (any map; scenario `wander` or `meet`; team size 1 to 4).

## Deployment

Hosted on an Oracle Cloud Always Free VM in Sydney (about 50 ms from Perth), with three slots:
`main` on the plain IP and two test slots for any branch. Pushes deploy automatically. See
`docs/DEPLOY-ORACLE.md`.

Play online at the server IP `159.13.37.255` (plain HTTP, WebSockets over `ws://`):

| Slot    | URL                          | Port | Runs                                 |
| ------- | ---------------------------- | ---- | ------------------------------------ |
| `main`  | `http://159.13.37.255/`      | 80   | always `main`                        |
| `test1` | `http://159.13.37.255:8081/` | 8081 | whatever was deployed                |
| `test2` | `http://159.13.37.255:8082/` | 8082 | whatever was deployed                |
| `test3` | `http://159.13.37.255:8083/` | 8083 | whatever was deployed (`test-adnan`) |

Any host with persistent processes and WebSocket support works (`npm install` builds, `npm start`
runs); on the VM, Caddy serves the built client and Node handles the game traffic.

Live server numbers (rooms, connections, tick time, bandwidth): `http://<host>/stats`.

## Networking model

Server-authoritative: the server runs one simulation per room at a fixed 60 Hz and both
players are clients. They send their held keys every tick plus actions as they happen, and
receive snapshots at 30 Hz; each client predicts its own movement and draws the opponent
slightly in the past. A dropped connection can reconnect within 10 s. See
`docs/ARCHITECTURE.md` for diagrams and `docs/ROADMAP.md` for measurements.

## Working on it

Jesse works on `test-jesse` and Mark on `test`; both merge the other's branch at the start of a
session and push at the end (`docs/WORKFLOW.md`, `AGENTS.md`). Test on your branch's slot, then open a
pull request into `main`. `npm test`, `npm run typecheck` and `npx prettier --check .` must pass; the
git hooks check them for you.

## Manual testing (for testers and AI assistants)

If you are asked to test the game, or to help someone test it, **read `docs/TEST-CHECKLIST.md` and
run the session from it**: it has the instructions, the ordered checks and a results log. The
checklist grows with every feature (`docs/MAPS-PLAN.md`).
