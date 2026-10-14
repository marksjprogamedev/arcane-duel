# Handoff

Where things stand (2026-10-14) and where to pick up. Read this first, then `docs/ARCHITECTURE.md`
for how the code works. Update this file when the picture changes.

## State in one paragraph

Online play is server-authoritative (60 Hz sim on the server, client prediction for your own wizard,
30 Hz snapshots, reconnect). A long lag investigation concluded the code adds almost nothing; the
big cost was the host, so the game moved from Render (149 ms round trip from Perth) to an Oracle
Cloud VM in Sydney (50 ms). The server has three slots with automatic deploys on push. `main`
holds the networking work and the deploy setup. Mark's gameplay work (charged spells, swept
collision, freeze rules, arena bounds, new bomb and ice art) is on `test`, merged with `main`'s
netcode and cleaned up; it is not on `main` yet.

## Branches and servers

| Branch       | Owner | What it is                                      | Server                     |
| ------------ | ----- | ----------------------------------------------- | -------------------------- |
| `main`       | both  | networking, tests, tooling, deploy scripts      | http://159.13.37.255/      |
| `test`       | Mark  | `main` + his gameplay and art work              | http://159.13.37.255:8081/ |
| `test-jesse` | Jesse | branched from `test`; this docs refresh is here | http://159.13.37.255:8082/ |

Pushing to a branch that is on a slot redeploys it in ~25 s (GitHub Actions -> Deploy to Oracle).
`test` and `test-jesse` are on slots; other branches need a one-time
`ssh ubuntu@159.13.37.255 arcane-deploy test2 <branch>` or Actions -> Run workflow. Details and the
command list: `docs/DEPLOY-ORACLE.md`.

Workflow: branch off `main` (or off `test` for gameplay work), push, test on a slot, open a PR,
merge, `arcane-deploy main` happens automatically on merge, delete the branch. Before pushing:
`npm test`, `npm run typecheck`, `npx prettier --check .` (153 unit tests pass at this commit).

## Where to pick up

1. **Gameplay and behaviour work on `test-jesse`** (what Jesse wanted to start next). Pull Mark's new
   commits with `git pull origin test` before starting and before opening a PR into `test`.
2. **Get `test` onto `main`.** It already contains `main`; open a PR when Mark's work is ready. His
   history has many duplicate one-file commits with the same message and some commits that do not
   build alone, so squash-merge that PR rather than rewriting the branch.
3. **Rendering clean-up in Mark's art code** (deliberately left for him, since he edits it daily):
   - `client/src/render/actor.ts` (ice shell and frost countdown) and `scene.ts` (bomb sprites) create
     arrays and closures every frame; hoist them to module-level constants.
   - Animated `shadowBlur` per frame is slow in canvas 2D; use it sparingly or pre-render.
   - `actor.ts` has a leftover bare `{ ... }` block where the dummy branch was deleted.
   - `q.confirmed` in `net/prediction.ts` means "hit something", which the name does not say.
   - `render/earthVisibility.ts` is a one-line rule used by `net/`; it belongs next to the prediction
     code.
4. **Check the live server under real play:** with two people in a match, `http://159.13.37.255/stats`
   should show `lastSecond.ticks` ~60 per match and `tickMsMax` well under 16 ms. The VM is a Micro
   (1/8 core); if two or more simultaneous matches stutter, try the Ampere shape again
   (`docs/DEPLOY-ORACLE.md`).
5. **HTTPS:** point a free DuckDNS name at `159.13.37.255`, then re-run `setup.sh <domain>`
   (`docs/ROADMAP.md`). Optional.
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
- Benchmarks: a leftover game server on the benchmark port ruins results; the scripts refuse a busy
  port (`docs/INVESTIGATION.md`, "How to measure").
- Open tabs keep the old client after a deploy; the server tells outdated protocol versions to
  refresh. Deploying a slot ends that slot's running matches.
