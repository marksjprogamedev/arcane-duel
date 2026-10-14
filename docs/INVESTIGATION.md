# Investigation: opponent lag after the Phase 4 netcode changes

Status: **open**. Last updated 2026-10-14. Branch `refactor-and-cleanup-2`.

## The question

After Phase 4 (client prediction with per-tick move commands, see `docs/ROADMAP.md`), `tests/feel.mjs`
showed two things getting slightly worse than `main`, even though most numbers improved:

- **Opponent lag**: how far behind the opponent's real position you see them. ~190 -> ~210 ms on the
  typical link.
- **Server catch-up after you stop**: how long until the server's copy of your wizard stops where you
  stopped. 100 -> 133 ms. You don't see this one (your wizard stops instantly on your screen), but it
  is the same kind of delay.

The goal is to find out where those ~20-33 ms come from, then cut the total lag where possible.

## Where lag comes from (typical link, 70 ms each way)

```
opponent presses D
  │  wait for the next client tick ........ 0-17 ms   (fixed: key changes are sent immediately)
  │  network: opponent -> server .......... 70 ms     (distance, can't fix)
  │  wait for the next server tick ........ 0-17 ms   (avg ~8)
  │  network: server -> you ............... 70 ms     (distance, can't fix)
  │  interpolation delay .................. >=70 ms   (>= one snapshot interval + margin)
  ▼
you see it  ≈ 190-210 ms measured
```

The interpolation delay is the biggest piece that can be reduced (see "30 Hz snapshots" below).

## How to measure (and a trap)

- `npm run build`, then `node tests/feel.mjs` (profiles `good`, `typical`, `bad`; `steady` = typical
  with no jitter). One run of all three takes ~4-5 min. Single runs on WSL are noisy: repeat a profile
  2-3 times before believing a difference. A run with noticeably fewer `frames` (e.g. 1105 instead of
  ~1140) had a machine hiccup; ignore it.
- To compare with `main`: `git worktree add /tmp/ad-main main`, symlink `node_modules`, build there
  (`npx vite build && npx tsc -p tsconfig.server.json`) and run its own `tests/feel.mjs`.
- **Trap:** a game server left running by a crashed or killed run keeps answering on the benchmark's
  port, so the next run measures the wrong code with the wrong latency settings. This happened three
  times and produced nonsense numbers. `feel.mjs` now refuses a busy port and always stops its server.
  Before measuring, check: `ps aux | grep "[d]ist/server/index.js"` should print nothing.

## Measurements so far

`feel.mjs`, opponent lag (ms) and server catch-up after stop (`self_settle_after_stop_ms_p50`):

| Build                        | good | typical  | bad | steady (no jitter) | catch-up, typical |
| ---------------------------- | ---- | -------- | --- | ------------------ | ----------------- |
| `main`                       | 130  | 190 (×3) | 290 | 195, 200           | 100               |
| Phase 4                      | 120  | 210 (×3) | 325 | -                  | 133               |
| Phase 4 + immediate key send | 125  | 210 (×3) | 320 | 215, 215           | 134-149           |

Your own wizard, total visible correction on the typical link: `main` ~305 px, Phase 4 ~120-180 px
(steady: 295 -> 35-53 px). That improvement is solid and consistent.

## What was tried

### 1. Key presses waited for the next client tick (fixed, but it was not the cause)

Move commands went out once per client tick, so a key press could wait up to ~17 ms. Fix (commit
`0e33f74`): a key change sends a move command at once, under the seq the next tick will use; the
server accepts a repeat of its newest seq so the tick's copy can still update the keys.

A trace with no simulated latency confirmed the fix works: the move command leaves within the same
event, and the server's copy starts/stops at the same times as on `main` (both 20-60 ms after the key,
depending on where in the snapshot cycle the press lands).

**But `feel.mjs` did not change** (still 210 ms typical). So this was not where the extra lag comes from.

### 2. The local latency simulator (disproved)

Theory: `server/latency.ts` gives each message an independent random delay but never lets one overtake
another. At 60 messages/s (vs ~10/s on `main`) almost every message waits behind a recent unlucky one,
so the effective delay creeps up to base + max jitter. The extra lag did grow with jitter (good +0,
typical +20, bad +30).

Test: the `steady` profile (same 70 ms, zero jitter). The branch was **still 15-20 ms behind `main`**
(215 vs 195-200). So jitter may add a little on top, but it is not the main cause.

(Separately, the simulator probably does overstate this effect for high message rates, because real
network delays are correlated rather than independent. Worth keeping in mind when reading `bad` numbers.)

### 3. 30 Hz snapshots (measured: keep)

Commit `bd19c9e`: snapshots every 2 ticks (30 Hz) instead of 3 (20 Hz). The interpolation floor is now
derived from the rate: one interval + 20 ms, i.e. 70 -> ~53 ms. Expected: opponent ~17 ms sooner, for
~50% more snapshot bandwidth (~15 -> ~22 KB/s per player, still below `main`'s ~25). Unit tests pass.

`load.mjs 1,20` (2026-10-14, 20 Hz = `580b6cf`, 30 Hz = `bd19c9e`): 1 room 33 -> 45 KB/s out, CPU
4.7 -> 5.0%; 20 rooms 591 -> 859 KB/s, CPU 14.8 -> 16.3%; RSS unchanged (~62-69 MB). Cost as
expected.

`feel.mjs` (2026-10-14, runs interleaved 20 Hz / 30 Hz, same machine and session):

| Profile      | opponent lag 20 -> 30 Hz | opponent judder        | catch-up after stop |
| ------------ | ------------------------ | ---------------------- | ------------------- |
| good         | 125 -> 105               | 0.17 -> 0.09           | 50 -> 34            |
| typical (×3) | 210 -> 190 (all three)   | 0.12-0.17 -> 0.11-0.16 | 133 -> 117-133      |
| steady       | 210 -> 195               | 0.20 -> 0.14           | 133 -> 118          |
| bad          | 320 -> 305               | 0.36 -> 0.13           | 250 -> 250          |

The opponent is 15-20 ms sooner on every profile, back to `main`'s 190 ms on the typical link,
with equal or less judder. Your own wizard's total correction is about the same (typical 120-156
-> 150-161 px, within run-to-run noise; good and bad improved). Keeping it.

### 4. Was `feel.mjs` comparing like with like? (untested, prime suspect)

`feel.mjs` measures opponent lag against the opponent's **own drawn position** (`net.visualE` on their
screen). That reference changed in Phase 4:

- `main`: the drawn position moved immediately in the same frame as the key press (walk per frame).
- Phase 4: it is `MovePredictor.drawPosition()`: moves on the next tick, drawn with render
  interpolation (up to one tick behind the newest predicted state).

The two builds have different "truth" timelines, so part of the 20 ms may be the yardstick rather
than the game. `tests/lag-trace.mjs` was written to settle this with one wall clock (key press time
-> own screen moves -> opponent's screen moves, at 0 and 70 ms), but **its first run hung** (no output
after 9 minutes on the `main` build at 0 ms; it was stopped). Unknown why; likely a Playwright step
waiting forever. Add per-step timeouts/logging and run it again.

### 6. The +33 ms server catch-up (explained: the yardstick, not the server)

`self_settle_after_stop_ms` is the time from key release until your **drawn** wizard (`net.visualE`)
is within 6 px of the server's copy (`game.e`, the newest snapshot). So it depends on the drawn
position too, not only on the server.

- **The server is not slower.** `tests/stop-trace.mjs` (no browser) walks one player in bursts the way
  the client does and compares predicted steps with server steps. Over 30 releases each on `steady`
  and `typical`, the server took the same number of steps as the prediction, ±1 (3.5 px, under the
  6 px threshold; -2 once with jitter). The snapshot with the final position arrives 138-145 ms
  after release: one-way + tick wait + snapshot wait + one-way, nothing extra.
- **`main` scored better by rubber-banding.** On every snapshot `main` pulled the drawn wizard back
  towards the (stale) server position: 22% of the gap while moving, 65% once stopped
  (`net.guestCorrection` in `main`'s `net/client.ts`). After a release the drawn wizard slid back
  to meet the server's copy halfway, so it was "settled" sooner. Phase 4 stops the wizard dead
  and waits for the server's copy to catch up, which can't happen in less than the round trip.

So the branch is at the network minimum here, and the "worse" number is what removing the
rubber-banding costs on this metric. Nothing to fix.

### 5. Render's 0.1 CPU limit (untested, could matter most in real play)

On the free tier the CPU limit is usually enforced as a quota (~10 ms of CPU per 100 ms). If the
process uses its quota early it is frozen until the next window: ticks and snapshots arrive in bursts,
which looks like jitter, and the client then raises the interpolation delay towards its 150 ms cap.
None of this shows up locally. It can be simulated here (systemd works in this WSL):

```bash
npm run build
systemd-run --user --scope -p CPUQuota=10% env PORT=3036 node dist/server/index.js
# then play / run tests/latency.mjs against it, and watch http://localhost:3036/stats:
# lastSecond.ticks should be ~60 per running match, tickMsMax well under 16 ms
```

On the real deployment, watch `https://<your-app>/stats` during a match for the same numbers.

**Simulated locally (2026-10-14, 30 Hz snapshots):** busy players (moving every tick, casting and
bombing like `load.mjs`) against a server with and without `CPUQuota=10%`, measuring the gaps
between snapshot arrivals on the clients (ideal 33.3 ms) for 15 s:

| Rooms | Quota | gap p95 | gap p99 | gap max | slowest tick |
| ----- | ----- | ------- | ------- | ------- | ------------ |
| 1     | none  | 34.5    | 34.9    | 51      | 1.0 ms       |
| 1     | 10%   | 34.5    | 35.0    | 55      | 1.0 ms       |
| 3     | none  | 34.4    | 34.9    | 51      | 1.1 ms       |
| 3     | 10%   | 34.7    | 57.5    | 90      | 23.5 ms      |

One match fits in the quota with no visible effect (it uses ~5% of a core). From about three at
once the quota starts to bite: occasional 60-90 ms gaps, which the client treats as jitter and
answers with a longer interpolation delay. Still to check: `/stats` on Render during a real match
(its CPU may be slower or shared, unlike this machine).

## Next steps (in order)

1. ~~Measure the 30 Hz commit.~~ Done (point 3): 15-20 ms less opponent lag, kept.
2. ~~Chase the deterministic +33 ms server catch-up.~~ Done: it is the yardstick (point 6).
3. Fix `tests/lag-trace.mjs` (timeouts, logging) and use it to check whether `feel.mjs`'s opponent-lag
   difference is the game or the yardstick (point 4).
4. ~~Simulate the 0.1 CPU quota~~ (done, point 5: one match is fine, ~3 at once start to stutter);
   still check `/stats` on Render during a real match.
5. Only if lag is still a problem after that: consider drawing the opponent with a little
   extrapolation instead of pure interpolation (less lag, but overshoot when they change direction).

## Commits involved

- `d4072c8` prediction + per-tick move commands (Phase 4)
- `aee858d` first feel.mjs before/after record
- `0e33f74` send movement key changes immediately
- `580b6cf` feel.mjs: busy-port check, always stop the server, `steady` profile; `tests/lag-trace.mjs`
- `bd19c9e` 30 Hz snapshots (measured and kept, point 3)
- `tests/stop-trace.mjs`: headless key release -> server stop trace (point 6)
