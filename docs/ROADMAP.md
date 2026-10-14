# Roadmap

What has been done, with measurements, and what comes next. `docs/ARCHITECTURE.md` explains how
the current design works.

## Done

- **Phase 0–1:** repo hygiene, Vite + TypeScript, `client/ server/ shared/` layout, typed protocol and domain types.
- **Phase 2:** the game simulation is a pure library in `shared/sim`:
  - takes its state as a parameter (`SimState`), no globals, no DOM, no network
  - reports side effects as `SimEvent`s instead of doing them
  - one `applyInput(state, side, event)` for local and remote players
  - seeded RNG, so a match is reproducible from `seed + inputs`
  - behaviour tests (`npm test`), including determinism and isolation of concurrent matches
  - compiles under `strict` with the server's TypeScript config

### Phase 3: server-authoritative netcode

Before this phase one player's browser ran the match, so the other player waited for two round
trips (~280 ms) before an action was confirmed. Now the server runs one simulation per room and
both players are clients.

- **3a: the server simulates.** One `SimState` per room at a fixed 60 Hz with a self-correcting
  timer and a catch-up cap (~8 µs per tick). Measured with `tests/latency.mjs` at 75 ms simulated
  delay each way: input confirmation 148 -> 73 ms, spell 149 -> 80 ms.
- **3b: no particles on the wire.** The sim emits small fx events (`burst`, `spray`, `magma_trail`,
  `bolt_trail`); clients make and animate the particles (`shared/fx/cosmetics.ts`), which also keeps
  cosmetics off the gameplay RNG. `tests/load.mjs`, 1 room: 257 -> 48 KB/s out.
- **3c: smoothing, measured.** `tests/feel.mjs` drives two real browsers through a scripted fight
  under simulated networks (good ~50 ms RTT, typical ~140 ms, bad ~240 ms with jitter). The server's
  latency simulation is two-way and order-preserving (like TCP).
  - the opponent is interpolated on the **server's clock** (`net/clock.ts`), with a delay that adapts
    to measured jitter (70-150 ms), so jitter no longer turns into judder
  - projectiles have stable ids and are carried forward along their velocity from the newest snapshot
  - results (before -> after), good / typical / bad: opponent drawn behind truth by 140/225/340 ->
    120/195/310 ms; opponent judder 0.19/0.23/0.70 -> 0.17/0.13/0.18; projectile judder
    0.38/0.40/0.57 -> 0.01/0.01/0.02
  - real connection (Perth <-> Singapore, 154 ms RTT): input and spell confirmation 149/150 ms
- **3d: fixed timestep everywhere.** Solo and AI play advance in fixed 1/60 s steps
  (`client/src/loop/fixedStep.ts`), exactly like the server, and draw interpolated between the last two
  steps (`client/src/render/interpolate.ts`). A match is identical at 30/60/75/144/240 Hz (tested).

### Phase 4: networking cleanup

- **One online mode.** Rooms have a creator (wizard `p`) and a joiner (`e`); the client knows only
  `net.room` and `net.online`.
- **Cosmetics out of the simulation.** Floating text, lightning arcs and rings are fx events (`text`,
  `lightning`, `wave`) that clients turn into visuals, like particles.
- **Reliable fx.** Each player has their own fx queue on the server, kept until a snapshot is actually
  sent to them.
- **Prediction with reconciliation.** Clients send a `move` command (held keys + aim) every tick; the
  server uses the newest one and acknowledges it in snapshots (`ack`); the client replays
  unacknowledged moves on top of the server's position with the shared `stepMovement`
  (`client/src/net/movePrediction.ts`). One cooldown table (`COOLDOWN_TICKS`) for the sim, the HUD and
  cast previews. In-process test (`tests/client/movePrediction.test.ts`): with ~115 ms + 33 ms jitter
  each way, the largest per-frame move of your drawn wizard is 4.3 px against a 3.5 px walking step;
  with a steady 75 ms it never exceeds a step.
- **Trimmed snapshots.** Only drawn fields; the opponent's cooldowns and knockback stay on the server.
  `tests/load.mjs`, 1 room with both players active: ~50 -> 29 KB/s out (~15 KB/s per player).
  CPU: 1 room ~5% of a core, 20 rooms ~25%, 76 MB RSS (the load test sends 60 move commands/s per
  player, like real clients).
- **Reconnect.** Resume tokens; a dropped connection pauses the match for up to 10 s; connections
  silent for 15 s are closed.
- **Protocol hygiene.** `hello {protocolVersion}` (outdated clients are told to refresh), validated
  messages, per-connection rate limit, `GET /stats`.
- **`tests/feel.mjs`, before -> after** (typical link ~140 ms RTT, three runs each; good/bad links agree):
  your own wizard's total visible correction 305 -> 123 px, largest per-frame correction 2.3 -> 1.2-1.9 px;
  on the bad link frames with a visible correction 29 -> 5 and no more "never settled" cases. Costs: the
  opponent is drawn ~20 ms further behind (190 -> 210 ms, judder 0.16 -> 0.20), and after you stop, the
  server's copy of you catches up ~33 ms later (100 -> 133 ms; you don't see this, your wizard stops
  instantly). The cause is still under investigation, see `docs/INVESTIGATION.md`. `tests/smoke.mjs` passes.
- **Still to measure:** a real two-player match on Render (watch `/stats`).

## Next

- Rename pass: the short names in `shared/sim` and the client's `guest*` names (ARCHITECTURE section 6).
- Gameplay events and a client presentation layer, so sounds and animations hang off game facts
  (ARCHITECTURE section 8).
- Render from a view model instead of temporarily overwriting `game` positions.
- Tighten client TypeScript (`noImplicitAny`, then `strictNullChecks`; `net` state is the loosest part).
- Move the AI out of `update()` into an input source.
- HTTPS for the Oracle server: point a free domain (e.g. a duckdns.org subdomain) at the VM's IP,
  then run `deploy/oracle/setup.sh <domain>` again; Caddy gets and renews the certificate
  (`docs/DEPLOY-ORACLE.md`). Until then it is plain HTTP on the IP, because certificates are only
  issued for domain names.
- Rematch/lobby polish, hosting config (paid instance, static assets on a CDN).
- Replay tool built on `seed + input log`.
