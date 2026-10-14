# Why online play lags, and what was done about it

Status: **closed** (2026-10-14). The code adds almost nothing to the lag; most of it is distance,
and the largest avoidable piece was the host. What is left is listed under "Levers left".

## Where lag comes from

Typical link, 70 ms each way (the numbers `tests/feel.mjs` uses):

```
opponent presses D
  │  wait for the next client tick ........ 0-17 ms   (key changes are sent at once, so ~0)
  │  network: opponent -> server .......... 70 ms     (distance)
  │  wait for the next server tick ........ 0-17 ms   (avg ~8)
  │  wait for the next snapshot ........... 0-33 ms   (30 Hz)
  │  network: server -> you ............... 70 ms     (distance)
  │  interpolation buffer ................. 53-150 ms (one snapshot interval + 20 ms, grows with jitter)
  ▼
you see it  ≈ 190 ms measured
```

Other kinds of lag:

- **Your own movement:** hidden by prediction, so it shows instantly. A wrong guess shows as
  rubber-banding (a visible correction). Phase 4 cut the total correction on the typical link from
  ~305 px to ~120-180 px.
- **Confirmation of actions** (hits, damage, `input`/`spell` ms in the debug line) is one full round
  trip to the server. The server acknowledges at once, so these numbers equal the round trip.
  They never add up: RTT, input and spell all measure the same trip.
- **Jitter** (uneven arrivals) looks like judder. The client absorbs it with a longer interpolation
  buffer, trading a little lag for smoothness. A server stalled by a CPU quota causes the same effect.

## Findings

1. **Hosting was the biggest piece.** The Render service, set to Singapore, answered a WebSocket
   ping from Perth in **149 ms** (plain pages ~185 ms) against 56 ms to AWS Singapore and 49 ms to
   AWS Sydney from the same machine; its DNS name pointed at a US-west host. An Oracle Always Free VM
   in Sydney answers in **50 ms**. That is ~100 ms off every input, spell and opponent movement, more
   than all code changes together. See `docs/DEPLOY-ORACLE.md`.
2. **30 Hz snapshots (was 20) show the opponent 15-20 ms sooner** on every profile, with equal or less
   judder, for ~40% more bandwidth (1 room 33 -> 45 KB/s out, ~22 KB/s per player; CPU 4.7 -> 5.0%).
   Kept.
3. **The apparent regression against the old host-based netcode was the yardstick.** `feel.mjs`
   measures lag against the opponent's own drawn position, which changed with prediction. Measured on
   one clock (`tests/lag-trace.mjs`, medians of 16 presses), the opponent sees you as soon as before
   or sooner (start 184-190 vs 189-205 ms, stop 188-190 vs 210-217 ms, typical link), and your own
   wizard stops at once instead of drifting ~110 ms.
4. **The "+33 ms server catch-up after you stop" is not the server.** `tests/stop-trace.mjs` shows the
   server takes the same steps as the prediction (±1) and the stop reaches the client after one round
   trip plus the tick and snapshot waits. The old netcode scored better only because it dragged the
   drawn wizard back towards the stale server position (rubber-banding).
5. **Sending key changes at once** (instead of at the next tick) is correct and kept, but it was not a
   cause of the extra lag.
6. **A bug in the local latency simulator** (`server/latency.ts`) could reorder messages: one timer
   per message, measured from Node's cached loop clock. It showed as a `join` handled before `hello`
   and made `lag-trace` flaky. Fixed with one queue and one timer
   (`tests/server/latency.test.ts`). It only runs when `ARCANE_LATENCY_*` is set.
7. **A 0.1 CPU quota** (Render's free tier), simulated with `systemd-run -p CPUQuota=10%`:

   | Rooms | Quota | snapshot gap p99 | gap max | slowest tick |
   | ----- | ----- | ---------------- | ------- | ------------ |
   | 1     | none  | 34.9 ms          | 51 ms   | 1.0 ms       |
   | 1     | 10%   | 35.0             | 55      | 1.0          |
   | 3     | none  | 34.9             | 51      | 1.1          |
   | 3     | 10%   | 57.5             | 90      | 23.5         |

   One match is unaffected; around three at once the quota starts to cause 60-90 ms gaps. (Ideal gap
   is 33.3 ms.) The Oracle Micro VM (1/8 CPU, 1 GB) kept 2 busy matches smooth: p99 gap 39 ms,
   slowest tick 6 ms.

## Levers left

Only if lag is still a problem. Each is small:

- Draw the opponent with a little extrapolation instead of pure interpolation (about 20-40 ms sooner,
  but overshoot when they change direction). Try it behind a flag and measure with `lag-trace`.
- Trim the 20 ms interpolation margin.
- Apply a move command the moment it arrives instead of at the next server tick (~8 ms on average).
- Check `/stats` on the live server during a real match: `lastSecond.ticks` ~60 per match and
  `tickMsMax` well under 16 ms.

## How to measure

- `npm run build`, then `node tests/feel.mjs` (profiles `good`, `typical`, `bad`; `steady` = typical
  with no jitter; one run of each takes about 20 s), `node tests/lag-trace.mjs . typical` and
  `node tests/stop-trace.mjs typical`. WSL runs are noisy: repeat a profile 2-3 times before believing
  a difference.
- To compare two builds, make a `git worktree` of each, symlink `node_modules`, build both, and
  alternate runs in one session.
- **Trap:** a game server left running by a crashed run keeps answering on the benchmark's port, so the
  next run measures the wrong code. The scripts refuse a busy port; before measuring,
  `ps aux | grep "[d]ist/server/index.js"` should print nothing.
- Load: `node tests/load.mjs 1,20`.
