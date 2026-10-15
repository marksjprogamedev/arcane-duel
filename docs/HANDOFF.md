# Handoff

Where things stand (2026-10-15, version 0.6.4-0) and where to pick up. Read this first, then
`docs/ARCHITECTURE.md` for how the code works, and `docs/WORKFLOW.md` for how Jesse and Mark share the repo. Update this file when the picture changes.

## State in one paragraph

Online play is server-authoritative (60 Hz sim on the server, client prediction for your own wizard,
30 Hz snapshots, reconnect). It runs on an Oracle Cloud VM in Sydney (50 ms from Perth) with three
slots and automatic deploys on push; Caddy serves the client. Mark's gameplay work is on `main`
(PR #11). `test-jesse` is the **road to 1.0.0** (`docs/MAPS-PLAN.md`): lobby, synced maps, big
battleground maps (Ruined Keep) with a following camera, fog of war (server culling plus client fog)
and a minimap. **Everything through 0.6.3 is done**, including Mark's wizard designs and balance
(0.6.0). Next is **1.0.0-0**; line of sight (0.4.3) is optional and a shrinking zone is deliberately
not wanted for now.

## Branches and servers

| Branch       | What it is                                                    | Server                     |
| ------------ | ------------------------------------------------------------- | -------------------------- |
| `main`       | released work (everything up to PR #11, version 27.4.0 alpha) | http://159.13.37.255/      |
| `test`       | same as `main`                                                | http://159.13.37.255:8081/ |
| `test-jesse` | the 1.0.0 work: Jesse's day-to-day branch, ahead of `main`    | http://159.13.37.255:8082/ |

Pushing to a branch that is on a slot redeploys it in ~25 s (GitHub Actions -> Deploy to Oracle).
Check what each slot runs with `ssh ubuntu@159.13.37.255 arcane-deploy status`. Other branches need a
one-time `ssh ubuntu@159.13.37.255 arcane-deploy test2 <branch>` or Actions -> Run workflow. Details
and the command list: `docs/DEPLOY-ORACLE.md`. Keep branches after merging: a deleted branch stops
redeploying, and a regular merge (not squash) keeps `test-jesse` mergeable again.

Workflow: work on `test-jesse` (or a branch off it), push, test on slot 8082, open a PR into `main`
with a regular merge; `main` deploys automatically. Afterwards fast-forward `test` and `test-jesse`
to `main` (`git merge --ff-only origin/main`). Every commit bumps the version and every feature adds a
`CHANGELOG.md` entry; the rules, including the four places the version lives, are at the top of that
file. Version scheme: `major.minor.feature-commit`, e.g. `0.1.1-0`; everything before 0.0.0 is alpha.

**What to run before pushing.** Normally just `npm test`, `npm run typecheck` and
`npx prettier --check .` (about 10 s; 210 unit tests). Run the browser and load scripts only when the
change touches them: `node tests/smoke.mjs` (needs a running server and Playwright) for UI or room
flow changes, `tests/load.mjs` and the trace scripts for netcode performance. They need `npm run
build` first. Baseline for the 1.0.0 work (`node tests/load.mjs 1 2`, 1 room): ~3.5% of a core,
~54 KB/s out, 52 MB RSS; compare against this at each minor.

## Where to pick up

1. **1.0.0-0** (`docs/MAPS-PLAN.md`). A shrinking zone is deliberately not wanted
   for now. Still open: training mode on battlegrounds (the AI can't path around walls). Done
   before it: minimap, sides swap on rematch, Mark's work merged, and the server-decoupling stage. Caddy serves the client (`deploy/oracle/caddy.sh`, applied on the
   VM; rollback in `docs/DEPLOY-ORACLE.md`), map data is split from art (checked by
   `tests/server/boundary.test.ts`), and the measurements are in `docs/ROADMAP.md`
   (`node tests/load.mjs 1,2 10 <map> <scenario>`).
2. **Things to look at while there:** the client's art is still hard-coded 800x600;
   the lobby has only the arena option so far (other online options go in `LobbyOptions`).
3. **Rendering clean-up in the art code** (left for Mark, who edits it daily):
   - `client/src/render/actor.ts` (ice shell and frost countdown) and `scene.ts` (bomb sprites) create
     arrays and closures every frame; hoist them to module-level constants.
   - Animated `shadowBlur` per frame is slow in canvas 2D; use it sparingly or pre-render.
   - `actor.ts` has a leftover bare `{ ... }` block where the dummy branch was deleted.
4. **Check the live server under real play:** with two people in a match, `http://159.13.37.255/stats`
   should show `lastSecond.ticks` ~60 per match and `tickMsMax` well under 16 ms. The VM is a Micro
   (1/8 core); if two or more simultaneous matches stutter, try the Ampere shape again
   (`docs/DEPLOY-ORACLE.md`).
5. **HTTPS:** point a free DuckDNS name at `159.13.37.255`, then re-run `setup.sh <domain>`
   (`docs/ROADMAP.md`). Optional. Until then the page is plain HTTP, where the Clipboard API is
   missing: the lobby's copy button falls back to a copy command (`client/src/ui/lobby.ts`), worth a
   check on the live site.
6. **Lag levers**, only if it still feels laggy: opponent extrapolation, a smaller interpolation
   margin, applying moves on arrival (`docs/INVESTIGATION.md`, "Levers left").
7. **Bigger refactors** (`docs/ROADMAP.md`, Next): rename pass, gameplay events and a presentation layer
   before adding sound, render from a view model, strict client TypeScript, AI as an input source.

The old Render service is no longer needed and can be deleted.

## Things worth knowing

- The simulation (`shared/sim`) is pure and shared by the server and the client; keep colours, text
  and other visuals out of it. Cosmetics are client-side, generated from fx events.
- Movement rules live in `shared/sim/movement.ts` and are used by both the server and the client's
  prediction. If you change how walking works (speed, slowdowns), change it there, and tell the
  predictor about any new input it depends on (see how charging is passed to `MovePredictor.tick`).
- Snapshots only carry the fields in `shared/sim/snapshot.ts` (`WIZARD_VIEW`, `BOMB_VIEW`, ...). A new
  field the client draws must be added there, or it silently never arrives online. Add a test
  (see `tests/sim/snapshot.test.ts`).
- `npm install` also builds (`postinstall`), and `arcane-deploy` relies on that.
- Shared tuning numbers live in `shared/constants.ts` and `shared/charge.ts`; don't repeat them inline.
- Shell gotcha: `pkill -f 'dist/server/index.js'` also matches (and kills) the shell running it. Find
  the pid with `ps` and `kill` it instead.
- Benchmarks: a leftover game server on the benchmark port ruins results; the scripts refuse a busy
  port (`docs/INVESTIGATION.md`, "How to measure").
- A map is a `MapDef` (`shared/maps.ts`): size, wizard bounds, spawns, obstacles. The match holds it
  as `game.map`; use that, not hard-coded 800/600 numbers or the old `game.obstacles`. Art stays in
  `client/src/render/`, keyed by the same map id.
- Online rooms have a lobby phase before the match (`server/rooms.ts`: `Room.phase`, `Room.options`;
  messages `set_options`, `start_match`, `back_to_lobby`, `lobby`). Joining no longer starts the
  match. Scripts that start online matches must send `start_match` (the test scripts do).
- Open tabs keep the old client after a deploy; the server tells outdated protocol versions to
  refresh. Deploying a slot ends that slot's running matches.
