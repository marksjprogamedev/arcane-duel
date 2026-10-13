# Roadmap

## Done
- **Phase 0–1:** repo hygiene, Vite + TypeScript, `client/ server/ shared/` layout, typed protocol and domain types.
- **Phase 2:** the game simulation is a pure library in `shared/sim`:
  - takes its state as a parameter (`SimState`), no globals, no DOM, no network
  - reports side effects as `SimEvent`s instead of doing them
  - one `applyInput(state, side, event)` for local and remote players
  - seeded RNG, so a match is reproducible from `seed + inputs`
  - 33 behaviour tests (`npm test`), including determinism and isolation of concurrent matches
  - compiles under `strict` with the server's TypeScript config

## Why online play lags today
The match runs in the **host's browser**. The guest's input travels guest -> server -> host, and the
host's confirmation travels back, so the guest sees roughly `RTT(guest) + RTT(host)`
(~300+ ms) before an action is confirmed, while the host sees 0 ms. About 150 lines of client
code (`net/prediction.ts`) exist to hide that asymmetry. Snapshots are also large JSON blobs of
everything (including particles and labels).

## Phase 3: server-authoritative netcode
The server runs one `SimState` per room and both players are thin clients.

- **Server tick:** fixed 60 Hz (`update(state, 1)`), self-correcting timer with a catch-up cap.
  Measured cost is ~8 us per tick, i.e. ~0.05% of one core per match. The 0.1 CPU free tier is fine for the sim;
  serialisation of snapshots is the part to measure and keep small.
- **Inputs:** clients send `InputEvent`s with a sequence number; the server applies them on the next tick.
- **Snapshots:** 20-30 Hz, compact, wizards + shots + bombs + zones + status only. Particles/labels are
  not sent; clients derive cosmetics from `SimEvent`s. Each snapshot carries the last processed input
  number for the receiving player.
- **Client:** predict the local wizard's movement and reconcile against snapshots; interpolate the
  opponent ~100 ms behind; show spell visuals immediately and let the server confirm hits/damage.
  This replaces the host/guest split and deletes most of `net/prediction.ts`.
- **Expected result:** each player's action reaches the other in about one one-way trip to the server
  plus the interpolation delay, symmetric for both players, and no host advantage or host cheating.
- **Rollout:** behind a switch so the old and new netcode can be A/B tested between friends.
- **Fixed timestep for solo/AI** moves to the same loop (with render interpolation) at that point.

## Later
- Tighten client TypeScript (`noImplicitAny`, then `strictNullChecks`; `net` state is the loosest part).
- Reconnect handling, rematch/lobby polish, hosting config, load/lag simulation tests.
- Replay tool built on `seed + input log`.

## Phase 3 status and measurements
- **3a (done, PR #3):** the server runs the sim per room at a fixed 60 Hz; both players are clients; the old host mode
  remains available via a lobby checkbox. Measured with `tests/latency.mjs` at 75 ms simulated delay each way:
  guest input confirmation 148 -> 73 ms, spell 149 -> 80 ms.
- **Server load** (`tests/load.mjs`, both players mashing buttons, snapshots at 20 Hz, numbers rounded):
  1 room ~2.5% of a core and ~125 KB/s out (~60 KB/s per player); 20 rooms ~20% of a core, 94 MB RSS.
  One match should fit the 0.1 CPU free plan, but this has not been measured on Render itself.
- **3b (done, PR below): shrink snapshots.** The sim no longer creates particles; it emits small `FxEvent`s
  (`burst`, `spray`, `magma_trail`, `bolt_trail`). Clients generate and animate particles themselves
  (`shared/fx/particles.ts`), which also makes the guest's animation smooth (particles advance every frame, not at
  20 Hz) and keeps cosmetics off the gameplay RNG. Measured: 1 room 125 -> 48 KB/s out (257 originally),
  ~24 KB/s per player; 20 rooms 14% of a core, 59 MB RSS.
- **3c (done): smoothing, measured.** `tests/feel.mjs` drives two real browsers through a scripted fight under simulated
  networks (good ~50 ms RTT, typical ~140 ms, bad ~240 ms with jitter) and measures how steadily things are drawn.
  The server's latency simulation is now two-way and order-preserving (like TCP). Changes:
  - the opponent is interpolated on the **server's clock** (`net/clock.ts`), not by packet arrival time, with a delay that
    adapts to measured jitter (70-150 ms), so jitter no longer turns into judder
  - projectiles are carried forward along their velocity from the newest snapshot instead of exponentially smoothed by
    array index; projectiles now have stable ids
  - results (before -> after), good / typical / bad links: opponent drawn behind truth by 140/225/340 -> 120/195/310 ms;
    opponent judder 0.19/0.23/0.70 -> 0.17/0.13/0.18; projectile judder 0.38/0.40/0.57 -> 0.01/0.01/0.02.
  - your own wizard was already steady (largest per-frame correction ~1 px on good/typical links) and is unchanged.
  Measured on a real connection (Perth <-> Singapore, 154 ms RTT): input and spell confirmation 149/150 ms
  (281 ms with the old host relay).
- **3d (done): fixed timestep everywhere.** Solo, AI and the legacy host now advance the simulation in fixed 1/60 s steps (`client/src/loop/fixedStep.ts`),
  exactly like the server, and draw interpolated between the last two steps (`client/src/render/interpolate.ts`). A match is now identical
  at 30/60/75/144/240 Hz (tested), and the legacy host's snapshot rate is 20 Hz regardless of monitor refresh (it used to be every 3rd *frame*).

## Phase 4: networking cleanup (branch `refactor-and-cleanup-2`)
See `docs/ARCHITECTURE.md` section 9 for the reasoning. One commit per step:
- **Legacy host netcode removed.** One online mode; rooms have a creator (wizard `p`) and a joiner (`e`).
- **Cosmetics out of the simulation.** Floating text, lightning arcs and rings are fx events (`text`, `lightning`,
  `wave`) that clients turn into visuals, like particles. Snapshots no longer carry `labels`/`arcs`/`waves`.
- **Reliable fx.** Each player has their own fx queue, kept until a snapshot is actually sent to them.
- **Prediction with reconciliation.** Clients send a `move` command (held keys + aim) every tick; the server uses the
  newest one and acknowledges it in snapshots (`ack`); the client replays unacknowledged moves on top of the server's
  position with the shared `stepMovement` (`client/src/net/movePrediction.ts`). Replaces the correction heuristics and
  the copied movement formula. One cooldown table (`COOLDOWN_TICKS`) for sim, HUD and cast previews.
  In-process test (`tests/client/movePrediction.test.ts`): with ~115 ms + 33 ms jitter each way, the largest
  per-frame move of your drawn wizard is 4.3 px against a 3.5 px walking step; steady 75 ms never exceeds a step.
- **Trimmed snapshots.** Only drawn fields; the opponent's cooldowns/knockback stay on the server.
  `tests/load.mjs`, 1 room, both players active: 46 -> 29 KB/s out (~15 KB/s per player; `main` measures 50).
  CPU: 1 room ~5% of a core, 20 rooms ~25% (the load test now also sends 60 move commands/s per player).
- **Reconnect.** Resume tokens; a dropped connection pauses the match for up to 10 s; idle sockets close after 15 s.
- **Protocol hygiene.** `hello {protocolVersion}` (outdated clients are told to refresh), validated messages,
  per-connection rate limit, `GET /stats`.
- **Not yet measured:** `tests/feel.mjs` and `tests/smoke.mjs` (they need Chromium's system libraries on the dev
  machine); a real two-player test on Render.
