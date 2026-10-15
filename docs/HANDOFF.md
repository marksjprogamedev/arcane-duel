# Handoff

Where things stand (2026-10-15, version 0.10.0-0) and where to pick up. Read this first, then
`docs/ARCHITECTURE.md` for how the code works and `docs/WORKFLOW.md` for how Jesse and Mark share the
repo (the short rules are in `AGENTS.md`). Update this file when the picture changes.

## State in one paragraph

Online play is server-authoritative (60 Hz sim on the server, client prediction for your own wizard,
30 Hz snapshots, reconnect). It runs on an Oracle Cloud VM in Sydney (50 ms from Perth) with three
slots and automatic deploys on push; Caddy serves the client and passes `/ws`, `/stats` and `/version`
to Node. The **maps and fog of war stage** (`docs/MAPS-PLAN.md`, 0.1 to 0.6) is done through 0.6.3 and merged into `main` (PR #13): map definitions, lobby,
synced maps, battlegrounds (the Ruined Keep) with a following camera, vision radius, server-side
culling and client fog, a minimap, sides swapping on a rematch, and the map data / art split. Mark's
wizard designs, balance changes and spell-variant prototype are merged in. It is on `main`. Line of
sight (0.4.3) is optional, and a shrinking zone is deliberately not wanted for now. The next big
thing is team matches (`docs/TEAMS-PLAN.md`).

## Branches and servers

| Branch       | Owner | What it is                                  | Server                     |
| ------------ | ----- | ------------------------------------------- | -------------------------- |
| `main`       | both  | released work                               | http://159.13.37.255/      |
| `test`       | Mark  | Mark's day-to-day branch; no version bumps  | http://159.13.37.255:8081/ |
| `test-jesse` | Jesse | Jesse's day-to-day branch; owns the version | http://159.13.37.255:8082/ |

Pushing to a branch that is on a slot redeploys it in ~25 s (GitHub Actions -> Deploy to Oracle).
Check what each slot runs with `ssh ubuntu@159.13.37.255 arcane-deploy status`. Other branches need a
one-time `ssh ubuntu@159.13.37.255 arcane-deploy test2 <branch>` or Actions -> Run workflow. Slots,
Caddy and the command list: `docs/DEPLOY-ORACLE.md`. Keep branches after merging: a deleted branch stops
redeploying, and a regular merge (not squash) keeps them mergeable.

Workflow (details and reasons in `docs/WORKFLOW.md`): start every session with a pull and a merge of
the other branch, end it with a push. Only Jesse bumps the version; Mark's changelog entries say which
version he was on. Open a PR into `main` with a regular merge when the human asks; afterwards
fast-forward `test` and `test-jesse` to `main` (`git merge --ff-only origin/main`). Version scheme:
`major.minor.feature-commit`, four places to keep in step, checked by `npm run check-version`
(rules at the top of `CHANGELOG.md`).

**What to run before pushing.** `npm test`, `npm run typecheck` and `npx prettier --check .` (about
10 s); the git hooks (`npm install` turns them on) format on commit and run these on push. Run the
browser and load scripts only when the change touches them: `node tests/smoke.mjs` (needs a running
server and Playwright) for UI or room flow changes, `node tests/load.mjs 1,2 10 <map> <scenario>` and
the trace scripts for netcode performance (they need `npm run build` first). Measurements and the
baseline are in `docs/ROADMAP.md`.

## Where to pick up

1. **Team matches (2v2, then 3v3 and 4v4):** the plan is `docs/TEAMS-PLAN.md`; 0.7.0-0 (wizards list), 0.7.1-0 (targeting) and 0.7.2-0 (seats, protocol 8) and 0.7.3-0 (client list) are done, which completes stage 0.7, 0.8.0 (team spawns) and 0.8.1 (rooms by seat), and 0.8.2 (the team lobby, protocol 10), which completes stage 0.8; stage 0.9 (the team rules: elimination, respawn, team vision) is done in the sim and server; 0.10.0 (the team client, protocol 11) lets you play a 2v2; remaining before 1.0.0-0: a 2v2 map check, load numbers and a real playtest (checklist 35). Versions stay on the 0.x line until 2v2 is
   playable: that release is `1.0.0-0`. First
   merge Mark's `test` (it has newer commits) and agree how to share the files that step touches.
   Also still to do: run sections 12 to 25 of `docs/TEST-CHECKLIST.md` on :8082 (fog, hit arrow, minimap
   and rematch sides were only checked by eye or by unit tests, never in a two-person match), and
   keep the version going from 0.10.0-0.
2. **Training mode on battlegrounds:** the AI and dummies walk straight lines and can't path around
   walls. Needed before solo play on the Ruined Keep is good.
3. **Optional 0.4.3 line of sight:** walls hide what is behind them (`docs/MAPS-PLAN.md`).
4. **Things to look at:** the arena art is still hard-coded 800x600 (battleground art is not); the lobby
   only has the map option (more online options go in `LobbyOptions`); Mark's spell variants and
   wizard picker are solo-only.
5. **Rendering clean-up in the art code** (Mark's area):
   - `actor.ts` (ice shell and frost countdown) and `scene.ts` (bomb sprites) create arrays and
     closures every frame; hoist them to module-level constants.
   - Animated `shadowBlur` per frame is slow in canvas 2D; use it sparingly or pre-render.
   - `actor.ts` has a bare `{ ... }` block around the wizard drawing where the dummy branch was deleted.
6. **Check the live server under real play:** with two people in a match, `http://159.13.37.255/stats`
   should show `lastSecond.ticks` ~60 per match and `tickMsMax` well under 16 ms. The VM is a Micro
   (1/8 core); if two or more simultaneous matches stutter, try the Ampere shape again
   (`docs/DEPLOY-ORACLE.md`).
7. **HTTPS:** point a free DuckDNS name at `159.13.37.255`, then re-run `setup.sh <domain>`. Optional.
   Until then the page is plain HTTP, where the Clipboard API is missing: the lobby's copy button falls
   back to a copy command (`client/src/ui/lobby.ts`).
8. **Lag levers**, only if it still feels laggy: opponent extrapolation, a smaller interpolation
   margin, applying moves on arrival (`docs/INVESTIGATION.md`, "Levers left").
9. **Bigger refactors** (`docs/ROADMAP.md`, Next): rename pass, gameplay events and a presentation layer
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
- A map is a `MapDef` (`shared/maps.ts`): size, wizard bounds, spawns, vision, solids (circles and
  rectangles). The match holds it as `game.map`; use that, not hard-coded 800/600 numbers. Art and
  the picker entry stay in `client/src/render/`, keyed by the same map id; `tests/server/boundary.test.ts`
  keeps the server free of client code.
- Fog of war: on a map with `vision`, `serializeSnapshot` leaves out what the viewer can't see
  (`Snapshot.p` is `null` while the rival is hidden); the client keeps `game.p` as last seen
  (`net.opponentHidden`) and draws the fog, hit arrow and minimap. Anything new that carries enemy
  positions in a snapshot must go through the same `canSee` check.
- Online rooms have a lobby phase before the match (`server/rooms.ts`: `Room.phase`, `Room.options`;
  messages `set_options`, `start_match`, `back_to_lobby`, `lobby`). Joining no longer starts the
  match. Scripts that start online matches must send `start_match` (the test scripts do).
- Open tabs keep the old client after a deploy; the server tells outdated protocol versions to
  refresh. Deploying a slot ends that slot's running matches.
