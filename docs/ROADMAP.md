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

## Phase 3: server-authoritative netcode (next)
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
