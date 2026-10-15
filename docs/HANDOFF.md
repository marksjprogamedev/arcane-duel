# Handoff

Where things stand (2026-10-15, version 0.12.0-0) and where to pick up. Read this first, then
`docs/ARCHITECTURE.md` for how the code works and `docs/WORKFLOW.md` for how Jesse and Mark share the
repo (the short rules are in `AGENTS.md`). Update this file when the picture changes.

## State in one paragraph

Online play is server-authoritative (60 Hz sim on the server, client prediction for your own wizard,
30 Hz snapshots, reconnect). It runs on an Oracle Cloud VM in Sydney (50 ms from Perth) with three
slots and automatic deploys on push; Caddy serves the client and passes `/ws`, `/stats` and `/version`
to Node. The **maps and fog of war stage** (`docs/MAPS-PLAN.md`, 0.1 to 0.6) is merged into `main` (PR #13).
Since then `test-jesse` has the **team matches** (`docs/TEAMS-PLAN.md`, stages 0.7 to 0.10, now at
`0.12.0-0`): a match is a list of wizards in two teams, the lobby takes a team size, friendly fire and a
fall rule, and a **2v2 is playable on every map** with shared team vision, spectating, elimination or
respawn rules and a team HUD. Mark's wizard designs, balance changes and spell variants are merged in
(solo-only variants). Line of sight (0.4.3) is optional; a shrinking zone is deliberately not wanted.

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

1. **Release `1.0.0-0` (team matches up to 4v4):** have people play on :8082 (checklist sections 35 to 38; 2v2
   needs four windows, 4v4 eight or scripted players), fix what they find, then open the PR into `main` (version
   1.0.0-0, regular merge). Then fast-forward `test` and `test-jesse` to `main`. Also never run by a person: the
   fog, minimap and rematch-side checks (sections 16 to 23); Mark's `test` has newer commits to merge.
2. **Disconnects in big matches (open):** one dropped player pauses everyone for up to 10 s and then closes the room;
   with 8 players that is too disruptive (idea in `docs/TEAMS-PLAN.md`). Also check the server numbers on the real
   VM with a 4v4 (`/stats`; `docs/ROADMAP.md` has the dev-machine numbers).
3. **Training mode on battlegrounds:** the AI and dummies walk straight lines and can't path around
   walls. Needed before solo play on the Ruined Keep is good.
4. **Optional 0.4.3 line of sight:** walls hide what is behind them (`docs/MAPS-PLAN.md`).
5. **Things to look at:** the arena art is still hard-coded 800x600 (battleground art is not); the lobby
   has map, team size and the team rules (more options go in `LobbyOptions`); Mark's spell variants and
   wizard picker are solo-only.
6. **Rendering clean-up in the art code** (Mark's area):
   - `actor.ts` (ice shell and frost countdown) and `scene.ts` (bomb sprites) create arrays and
     closures every frame; hoist them to module-level constants.
   - Animated `shadowBlur` per frame is slow in canvas 2D; use it sparingly or pre-render.
   - `actor.ts` has a bare `{ ... }` block around the wizard drawing where the dummy branch was deleted.
7. **Check the live server under real play:** with two people in a match, `http://159.13.37.255/stats`
   should show `lastSecond.ticks` ~60 per match and `tickMsMax` well under 16 ms. The VM is a Micro
   (1/8 core); if two or more simultaneous matches stutter, try the Ampere shape again
   (`docs/DEPLOY-ORACLE.md`).
8. **HTTPS:** point a free DuckDNS name at `159.13.37.255`, then re-run `setup.sh <domain>`. Optional.
   Until then the page is plain HTTP, where the Clipboard API is missing: the lobby's copy button falls
   back to a copy command (`client/src/ui/lobby.ts`).
9. **Lag levers**, only if it still feels laggy: opponent extrapolation, a smaller interpolation
   margin, applying moves on arrival (`docs/INVESTIGATION.md`, "Levers left").
10. **Bigger refactors** (`docs/ROADMAP.md`, Next): rename pass, gameplay events and a presentation layer
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
- Anything that should treat "every player" must loop `game.wizards` / `game.input[seat]`, never name `game.p`
  and `game.e` (that was the 0.10.4 bug: seats 2 and 3 were never ticked). `p` and `e` are only seats 0 and 1,
  kept for solo play and the AI.
- Fog of war: on a map with `vision`, `serializeSnapshot` leaves out what the viewer can't see
  (`Snapshot.p` is `null` while the rival is hidden); the client keeps `game.p` as last seen
  (`net.opponentHidden`) and draws the fog, hit arrow and minimap. Anything new that carries enemy
  positions in a snapshot must go through the same `canSee` check.
- Online rooms have a lobby phase before the match (`server/rooms.ts`: `Room.phase`, `Room.options`;
  messages `set_options`, `start_match`, `back_to_lobby`, `lobby`). Joining no longer starts the
  match. Scripts that start online matches must send `start_match` (the test scripts do).
- Open tabs keep the old client after a deploy; the server tells outdated protocol versions to
  refresh. Deploying a slot ends that slot's running matches.
