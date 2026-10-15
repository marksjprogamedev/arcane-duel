# Roadmap

What has been done, with measurements, and what comes next. `docs/ARCHITECTURE.md` explains how
the current design works, `docs/HANDOFF.md` where things stand right now.

## Done

- **Phase 0-1:** repo hygiene, Vite + TypeScript, `client/ server/ shared/` layout, typed protocol and domain types.
- **Phase 2:** the game simulation is a pure library in `shared/sim`: it takes its state as a
  parameter (`SimState`), has no globals, DOM or network, reports side effects as `SimEvent`s, uses
  one `applyInput(state, side, event)` for local and remote players, and a seeded RNG so a match is
  reproducible from `seed + inputs`. Behaviour tests include determinism and isolation of concurrent
  matches. It compiles under `strict` with the server's TypeScript config.

### Phase 3: server-authoritative netcode

Before this phase one player's browser ran the match, so the other player waited for two round
trips (~280 ms) before an action was confirmed. Now the server runs one simulation per room and
both players are clients.

- **3a: the server simulates.** One `SimState` per room at a fixed 60 Hz with a self-correcting
  timer and a catch-up cap (~8 µs per tick). At 75 ms simulated delay each way (`tests/latency.mjs`):
  input confirmation 148 -> 73 ms, spell 149 -> 80 ms.
- **3b: no particles on the wire.** The sim emits small fx events; clients make and animate the
  particles (`shared/fx/cosmetics.ts`), which also keeps cosmetics off the gameplay RNG.
  `tests/load.mjs`, 1 room: 257 -> 48 KB/s out.
- **3c: smoothing, measured.** `tests/feel.mjs` drives two real browsers through a scripted fight
  under simulated networks (good ~50 ms RTT, typical ~140 ms, bad ~240 ms with jitter). The opponent
  is interpolated on the **server's clock** (`net/clock.ts`) with a delay that adapts to measured
  jitter; projectiles have stable ids and are carried forward along their velocity. Opponent judder
  0.19/0.23/0.70 -> 0.17/0.13/0.18, projectile judder 0.38/0.40/0.57 -> 0.01/0.01/0.02.
- **3d: fixed timestep everywhere.** Solo and AI play advance in fixed 1/60 s steps
  (`client/src/loop/fixedStep.ts`) and draw interpolated between the last two steps
  (`client/src/render/interpolate.ts`). A match is identical at 30/60/75/144/240 Hz (tested).

### Phase 4: networking cleanup

- **One online mode.** Rooms have a creator (wizard `p`) and a joiner (`e`); the client knows only
  `net.room` and `net.online`. The legacy host netcode is gone.
- **Cosmetics out of the simulation.** Floating text, lightning arcs and rings are fx events that
  clients turn into visuals, like particles. Each player has their own fx queue on the server, kept
  until a snapshot is actually sent to them.
- **Prediction with reconciliation.** Clients send a `move` command (held keys + aim) every tick; the
  server uses the newest one and acknowledges it in snapshots (`ack`); the client replays
  unacknowledged moves on top of the server's position with the shared `stepMovement`
  (`client/src/net/movePrediction.ts`). Key changes are sent immediately. One cooldown table
  (`COOLDOWN_TICKS`) for the sim, the HUD and cast previews. Your own wizard's total visible
  correction on the typical link: ~305 -> ~120-180 px.
- **Trimmed snapshots.** Only drawn fields; the opponent's cooldowns and knockback stay on the server.
- **Reconnect.** Resume tokens; a dropped connection pauses the match for up to 10 s; connections
  silent for 15 s are closed.
- **Protocol hygiene.** `hello {protocolVersion}` (outdated clients are told to refresh), validated
  messages, per-connection rate limit, `GET /stats`.

### Phase 5: lag investigation and hosting

- **30 Hz snapshots** (was 20): the opponent is shown 15-20 ms sooner (typical link 210 -> 190 ms),
  for ~40% more bandwidth (~22 KB/s per player).
- **The lag is mostly the host.** Render (Singapore) measured 149 ms round trip from Perth, an
  Oracle Cloud VM in Sydney 50 ms. The code adds almost nothing on top of the network; see
  `docs/INVESTIGATION.md` for the full breakdown and measurements.
- **Oracle hosting with slots.** `main` on port 80, two test slots (8081, 8082) for any branch, and
  GitHub Actions deploys on push (`docs/DEPLOY-ORACLE.md`).
- **Test tooling:** `tests/lag-trace.mjs`, `tests/stop-trace.mjs`, and a fix for a message-reordering bug
  in the local latency simulator.

### Maps and fog of war (0.1 to 0.6), measured at 0.5.2

`node tests/load.mjs 1,2 10 <map> <scenario>`, one dev machine, 10 s per row, 2 players per room.
Bandwidth is out of the server, summed over both players. CPU is a share of one core and moves by
about 1 point between identical runs, so only bandwidth differences are meaningful here.

| Map / scenario               | 1 room                      | 2 rooms                       |
| ---------------------------- | --------------------------- | ----------------------------- |
| Baseline (2026-10-14, arena) | 3.5%, 54 KB/s, 52 MB        | -                             |
| enchanted / wander           | 4.2-4.5%, 53-55 KB/s, 61 MB | 4.9-5.1%, 105-112 KB/s, 63 MB |
| enchanted / meet             | 4.3%, 55 KB/s               | 5.6%, 107 KB/s                |
| ruins / wander               | 3.9%, 38 KB/s               | 4.5%, 75 KB/s                 |
| ruins / meet                 | 4.3%, 47 KB/s               | 4.0%, 89 KB/s                 |

- **Arenas are unchanged** in bandwidth (55 vs 54 KB/s); the extra CPU and ~9 MB of memory are within
  what the same configuration gives from run to run on this machine, plus the bigger server (maps,
  lobby, vision). The old baseline could not be re-run today (the old load script predates the lobby).
- **Fog of war pays for itself on a battleground:** with the players out of sight of each other
  (`ruins / wander`) the server sends about 30% less than on an arena. In sight of each other
  (`ruins / meet`) it is still below an arena, because many shots stop at walls.
- **2v2 (0.10.3):** `node tests/load.mjs 1,2 10 ruins <scenario> 2`. One 2v2 room (4 players) is about 115 KB/s
  out (about 29 KB/s a player, the same as a duel) and 4 to 5% of a core, whether the teams meet or wander;
  two rooms (8 players) about 235 KB/s and under 6%. The per-team fog keeps it from growing faster than
  the number of players. Same machine and method as the table above.

| Map / scenario / size | 1 room                | 2 rooms               |
| --------------------- | --------------------- | --------------------- |
| ruins / wander / 1v1  | 4.1%, 40 KB/s, 61 MB  | 5.2%, 82 KB/s, 64 MB  |
| ruins / meet / 2v2    | 5.0%, 114 KB/s, 62 MB | 5.7%, 236 KB/s, 63 MB |
| ruins / wander / 2v2  | 4.2%, 115 KB/s, 62 MB | 5.8%, 233 KB/s, 63 MB |

- **No binary or delta snapshot format is needed yet:** 55 KB/s per match is small next to the VM's
  allowance, and the Micro VM spends under 5% of a core per match. Revisit if more than two players
  or much bigger maps come.
- Caddy now serves the client (0.5.1), so the Node process no longer spends time on page loads.

## Next

- **Team matches:** 2v2, then 3v3 and 4v4 (`docs/TEAMS-PLAN.md`). The maps work (0.1 to 0.6) is done and
  merged (`docs/MAPS-PLAN.md`); training mode on battlegrounds and optional line of sight remain.
  Open items are in `docs/HANDOFF.md`.
- **Gameplay and combat work** (Mark on `test`, Jesse on `test-jesse`): spell variants, wizard designs
  and balance. Review notes for the drawing code are in `docs/HANDOFF.md`.
- Rename pass: the short names in `shared/sim` and the client's `guest*` names (ARCHITECTURE section 6).
- Gameplay events and a client presentation layer, so sounds and animations hang off game facts
  (ARCHITECTURE section 8).
- Render from a view model instead of temporarily overwriting `game` positions.
- Tighten client TypeScript (`noImplicitAny`, then `strictNullChecks`; `net` state is the loosest part).
- Move the AI out of `update()` into an input source.
- HTTPS for the Oracle server: point a free domain (e.g. a duckdns.org subdomain) at the VM's IP,
  then run `deploy/oracle/setup.sh <domain>` again; Caddy gets and renews the certificates for all
  slots. Until then it is plain HTTP on the IP, because certificates are only issued for domain names.
- More lobby options (they go in `LobbyOptions`).
- Replay tool built on `seed + input log`.
- Lag levers if still needed: opponent extrapolation, a smaller interpolation margin
  (`docs/INVESTIGATION.md`).
