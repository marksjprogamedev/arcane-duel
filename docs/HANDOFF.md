# Handoff

Where things stand (2026-10-23, version 0.41.1-0) and where to pick up. Read this first, then
`docs/ARCHITECTURE.md` for how the code works and `docs/WORKFLOW.md` for how Jesse and Mark share the
repo (the short rules are in `AGENTS.md`). Update this file when the picture changes.

## State in one paragraph

Online play is server-authoritative (60 Hz sim on the server, client prediction for your own wizard,
30 Hz snapshots, reconnect). It runs on an Oracle Cloud VM in Sydney (50 ms from Perth) with four
slots and automatic deploys on push, over HTTPS on `arcaneduel.duckdns.org` (0.36.0); Caddy serves the client
and passes `/ws`, `/api`, `/stats` and `/version` to Node. The **maps and fog of war stage** (`docs/MAPS-PLAN.md`, 0.1 to 0.6) is merged into `main` (PR #13).
Since then `test-jesse` has the **team matches** (`docs/TEAMS-PLAN.md`, stages 0.7 to 0.12.0; `main` carries
them too since PR #14, and `test-jesse` is now at `0.33.6-0`): a match is a list of wizards in two teams, the lobby takes a team size (**1v1 up to 4v4**),
friendly fire and a fall rule, and team matches are playable on every map with shared team vision,
spectating, elimination or respawn rules and a team HUD. Mark's wizard designs, balance changes and spell variants are merged in
(variants work online: picked in the lobby spellbook, locked for the match). 0.12.1 to 0.12.17 were spell work:
Water Surge, Pebble Flurry, a moving Thundercloud, nine variants removed, Frost Shards and Plasma Beam retuned, a
silenced wizard can't shield, bubbles reflect beams and reset a shot's range, and a reflected Pyrodisk bounces and ends
(`CHANGELOG.md`). Since 0.12.19 two things changed. **Disconnects** (0.33.0): a drop pauses the match for up to 10 s, then play carries on with
the dropped wizard marked `away`, and the player can rejoin until the match ends. And a **clean-up series** (0.32.0 to 0.33.6)
reorganised the code so a folder or file name tells you what is in it (`README.md` has the code map and a "Where do I change...?"
table): `shared/sim` and the client renderer were split into folders, short names were spelled out (wire protocol 18), `game.p` /
`game.e` and stale 800x600 assumptions are gone. Play and looks did not change; three tools prove it: `scripts/screenshots.mjs`
(pixel diff of every screen), `scripts/render-trace` (every canvas call) and `scripts/sim-trace` (586 scripted matches), see
`README.md`, Tests. Bugs found on the way are listed, not fixed, in `docs/REFACTOR-ISSUES.md`. 0.34 and 0.35
reworked the menus on shared UI components (`docs/UI.md`), made the spellbook a book, and gave the lobby team
switching, spectators, a host who can sit anywhere and rejoining a running match by its code; `main` has
everything up to **0.35.6-0** (PR #37). **Accounts** (0.36.0 to 0.41.1, `docs/ACCOUNTS-PLAN.md`, built on
`test-jesse` only): HTTPS, one SQLite database per slot with nightly encrypted backups of `main`, optional
username + password accounts (no email), display names in rooms, the Workshop look and spells saved on the
account, friends with live presence and lobby invites (no chat), and the `arcane-admin` command. Guests play
exactly as before. `FUTURE_IDEAS.md` (Mark) and `FUTURE_IDEAS_JESSE.md` are idea backlogs: nothing in them is approved. Line of sight (0.4.3) is optional; a shrinking zone is deliberately not wanted.

## Branches and servers

| Branch       | Owner | What it is                                  | Server                                |
| ------------ | ----- | ------------------------------------------- | ------------------------------------- |
| `main`       | both  | released work                               | https://arcaneduel.duckdns.org/       |
| `test`       | Mark  | Mark's day-to-day branch; no version bumps  | https://mark.arcaneduel.duckdns.org/  |
| `test-jesse` | Jesse | Jesse's day-to-day branch; owns the version | https://jesse.arcaneduel.duckdns.org/ |
| `test-adnan` | Adnan | Adnan's day-to-day branch; no version bumps | https://adnan.arcaneduel.duckdns.org/ |

Each slot has its own database (`/var/lib/arcane-duel/<slot>/arcane.db`), so accounts belong to a slot: a test
account made on `jesse.` does not exist on `main`. Deploys keep the database.

Pushing to a branch that is on a slot redeploys it in ~25 s (GitHub Actions -> Deploy to Oracle).
Check what each slot runs with `ssh ubuntu@159.13.37.255 arcane-deploy status`. Other branches need a
one-time `ssh ubuntu@159.13.37.255 arcane-deploy test2 <branch>` or Actions -> Run workflow. Slots,
Caddy and the command list: `docs/DEPLOY-ORACLE.md`. Keep branches after merging: a deleted branch stops
redeploying. PRs into `main` are squash-merged (since 2026-10-22), so merge `main` back into the branch afterwards.
`main` holds one commit per feature version (`0.31.2 - <title>`); its history was rewritten into that shape on
2026-10-22, so re-clone any copy made before then (`docs/WORKFLOW.md`, "Merging into `main`").

Workflow (details and reasons in `docs/WORKFLOW.md`): start every session with a pull and a merge of
the other branch, end it with a push. Only Jesse bumps the version; Mark's changelog entries say which
version he was on. Open a PR into `main` when the human asks; it is squash-merged, and afterwards
you merge `main` back into `test` and `test-jesse` (`git merge origin/main`; no conflicts, the trees are the same) so the next PR shows only new work. Version scheme:
`major.minor.feature-commit`, four places to keep in step, checked by `npm run check-version`
(rules at the top of `CHANGELOG.md`).

**What to run before pushing.** `npm test`, `npm run typecheck` and `npx prettier --check .` (about
10 s); the git hooks (`npm install` turns them on) format on commit and run these on push. Run the
browser and load scripts only when the change touches them: `node tests/smoke.mjs` (needs a running
server and Playwright) for UI or room flow changes, `node scripts/screenshots.mjs` before and after a
client refactor (pixel diff of every screen), `node tests/load.mjs 1,2 10 <map> <scenario> <teamSize>` and
the trace scripts for netcode performance (they need `npm run build` first). Measurements and the
baseline are in `docs/ROADMAP.md`.

**Testing accounts.** Use the slot's HTTPS address, **off a work network**: a corporate firewall
that inspects HTTPS breaks it (certificate warnings, a tab that keeps loading), so use a phone on mobile data or a home connection. Make throwaway test accounts on your own
slot; locally, `http://localhost:3036` works too (the database is `data/arcane.db`).

## Where to pick up

1. **Merge accounts into `main`** (PR from `test-jesse`, only when Jesse says): run the checklist sections
   `[0.36.0-0]` to `[0.41.1-0]` at the top of `docs/TEST-CHECKLIST.md` on `https://jesse.arcaneduel.duckdns.org/`
   plus section 7, then merge `main` back into `test` and `test-jesse`. Mark's and Adnan's branches pick up the
   account code with their next merge of `test-jesse` or `main`.
2. **Real accounts start on `main`** after that merge: `main`'s database starts empty (test accounts stay on
   their slots). Check that `arcane-deploy main` installed `arcane-admin`, that the 03:00 backup uploads
   (`journalctl -u arcane-backup`) and that `scripts/pull-backup.sh` decrypts it; `/stats` on `main` then shows
   `database`, `accounts` and `onlineAccounts`.
3. **Known gaps in accounts** (`CHANGELOG.md` 0.38.0 to 0.41.1, `docs/ACCOUNTS-PLAN.md` section 12):
   other players don't see your Workshop look yet (the server checks a look's shape and size only; the full
   part check has to move to `shared/` first); head/hat and head/body pair alignments stay per browser; no
   Content-Security-Policy header yet; rate limits and presence are in memory, so a deploy resets them; no
   stats, match history or reporting. Accounts are hidden on plain http (LAN play).
4. **Release `1.0.0-0` (team matches up to 4v4):** have people play on `https://jesse.arcaneduel.duckdns.org/` (checklist sections 35 to 38 for teams,
   39 to 48 for the spell work; 2v2 needs four windows, 4v4 eight or scripted players; no section has been ticked yet),
   fix what they find, then open the PR into `main` (version
   1.0.0-0, squash merge). Then merge `main` back into `test` and `test-jesse`. Also never run by a person: the
   fog, minimap and rematch-side checks (sections 16 to 23); `test` is merged in as of 0.12.18-0.
5. **Disconnects in big matches (done, needs a real 4v4 test):** a drop pauses everyone for up to 10 s (overlay with a
   countdown), then play carries on with the dropped wizard standing there marked `away`; the room never closes
   because of a drop and the player can rejoin (same tab, also after a refresh) until the match ends
   (`docs/ARCHITECTURE.md` section 3 and 9). An explicit `leave` mid-match (wire protocol 19) now works like a drop
   without the pause: the wizard stays `away`, the others get `peer_left_match`, the leaver can't rejoin, and the room
   closes only when nobody is connected (a host who left hands the host role to the lowest connected seat on
   `back_to_lobby`). Also check the **live server** under a real
   4v4, and two matches at once: `https://jesse.arcaneduel.duckdns.org/stats` should show `lastSecond.ticks` ~60 per match
   and `tickMsMax` well under 16 ms. The VM is a Micro (1/8 core); if it stutters, try the Ampere shape
   (`docs/DEPLOY-ORACLE.md`). `docs/ROADMAP.md` has the dev-machine numbers.
6. **Training mode on battlegrounds:** the AI and dummies walk straight lines and can't path around
   walls. Needed before solo play on the Ruined Keep is good.
7. **Optional 0.4.3 line of sight:** walls hide what is behind them (`docs/MAPS-PLAN.md`).
8. **Things to look at:** the arena art is drawn for `ARENA_WIDTH` x `ARENA_HEIGHT` (1067x600, scaled by `ARENA_STRETCH`; battleground art follows its map); the lobby
   has map, team size and the team rules (more options go in `LobbyOptions`); Mark's wizard picker is
   solo-only (spell variants work online since 0.12.2-0).
9. **Rendering clean-up in the art code** (Mark's area):
   - `render/world/wizard/statusEffects.ts` (ice shell and frost countdown) and `render/world/bombs/` (bomb sprites) may create
     arrays and closures every frame; check and hoist them to module-level constants.
   - Animated `shadowBlur` per frame is slow in canvas 2D; use it sparingly or pre-render.
10. **Plain http still matters** for local network play: code must not assume a secure context. The copy
    button keeps its fallback (`client/src/ui/clipboard.ts`) and the account UI hides itself
    (`accountsAvailable` in `client/src/account/state.ts`).
11. **Lag levers**, only if it still feels laggy: opponent extrapolation, a smaller interpolation
    margin, applying moves on arrival (`docs/INVESTIGATION.md`, "Levers left").
12. **Bigger refactors** (`docs/ROADMAP.md`, Next; the rename pass is done, open findings in `docs/REFACTOR-ISSUES.md`): gameplay events and a presentation layer
    before adding sound, render from a view model, strict client TypeScript, AI as an input source.

The old Render service is no longer needed and can be deleted.

## Things worth knowing

- The standard Wizard Workshop alignment layout is `client/src/workshop/shared-workshop.json`, bundled with every client. Its structure matches the JSON from Copy layout; the player's appearance and colours remain local/account data. Developer layout edits can still override the shared layout on that browser after opening Developer tools.

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
  the picker entry stay in `client/src/render/arena/`, keyed by the same map id; `tests/server/boundary.test.ts`
  keeps the server free of client code.
- Anything that should treat "every player" must loop `game.wizards` / `game.input[seat]`, never name a seat
  (that was the 0.10.4 bug: seats 2 and 3 were never ticked). The old `game.p` / `game.e` aliases are gone.
  Solo and training code that means "the player" and "the AI / dummy" uses `soloPlayer(game)` and
  `soloOpponent(game)` (`shared/sim/teams.ts`); anything else says `game.wizards[n]`. Maps have no `spawns`:
  `teamSpawns` holds every start slot, and `spawnsFor(map, round)` gives the duel's two.
- Fog of war: on a map with `vision`, `serializeSnapshot` leaves out the enemies (and their shots and
  effects) that no standing member of the viewer's team can see (`Snapshot.others` lacks them); the client
  keeps each hidden wizard in `game.wizards` as last seen (`net.hiddenSeats`) and draws the shared fog, hit
  arrow and minimap. Anything new that carries enemy positions in a snapshot must go through the same
  `canSee` check.
- Online rooms have a lobby phase before the match (`server/rooms/`: `Room.phase`, `Room.options`,
  `2 x teamSize` seats; messages `set_options`, `set_team`, `start_match`, `back_to_lobby`, `lobby`).
  Joining no longer starts the match. Scripts that start online matches must send `start_match` (the test
  scripts do), after the room is full.
- Reconnecting: the tab keeps `{code, token}` in `sessionStorage` (`client/src/net/session.ts`) from `created`/`joined`
  until it leaves, the room goes, or `resume` is refused; on page load `resumeSavedSession()` sends `resume`, and
  `resumed` carries the map, rules and loadouts so a fresh page can build the match view. A new tab has no entry,
  so it is a new player. On the server a drop sets `Room.away[seat]`: while its timer runs (`RECONNECT_GRACE_MS`,
  `shared/constants.ts`) the runner is paused for everyone; after it the seat stays `away` (`Wizard.away`, in
  snapshots; no input, no snapshots sent, can die) until a `resume`. `join` during a match is refused ("Match in
  progress."), away players don't block `rematch_ready`/`back_to_lobby` (going back frees their seats and rotates
  their tokens), a room with nobody connected closes after `EMPTY_ROOM_CLOSE_MS`. Tests: `tests/server/reconnect.test.ts`.
- Accounts: `/api/*` for account actions, the WebSocket for everything live (`welcome`, `profile`, `friends`,
  invites); the connection is bound to the account from the login cookie when it opens, and rooms know players by
  `identityOf` (account or tab). New tables or columns go in a new step in `server/db/migrations.ts`, never by
  editing a pushed one. `docs/ARCHITECTURE.md` section 13, `docs/ACCOUNTS-PLAN.md`.
- Open tabs keep the old client after a deploy; the server tells outdated protocol versions to
  refresh. Deploying a slot ends that slot's running matches.
