# Arcane Duel: Architecture, Review and Plan

Written 2026-10-13 against `main` @ `302ca1d` (v27.1.5, after Phase 3d).

Contents:
1. The big picture
2. Who owns what (client / server / shared)
3. Life of an online match
4. One server tick, one client frame
5. Worked example: casting STEAM online
6. Naming: what the confusing names mean, and better ones
7. Critique of the engineering approach
8. Adding sound, animation and better graphics without breaking multiplayer
9. Networking improvements, in order
10. Hosting and scaling on Render
11. Far future: a real engine

---

## 1. The big picture

```
   Player A (browser, Perth)                         Player B (browser, Jakarta)
 +---------------------------+                     +---------------------------+
 | client bundle (Vite)      |                     | client bundle (Vite)      |
 |  input -> net -> render   |                     |  input -> net -> render   |
 +-------------+-------------+                     +-------------+-------------+
               |  HTTPS: index.html, JS, CSS                     |
               |  WSS /ws: inputs up, snapshots down             |
               v                                                 v
 +-----------------------------------------------------------------------------+
 | Render web service, Singapore (free tier: 0.1 CPU, 512 MB, one Node process)|
 |                                                                             |
 |  server/index.ts --> app.ts: one http.Server                                |
 |     |-- static.ts      serves dist/client (the game files)                  |
 |     |-- /version       plain-text version string                            |
 |     '-- WebSocket /ws  -> rooms.ts                                          |
 |                             rooms: Map<"QWERTY", Room>   (in memory only)   |
 |                             Room --> MatchRunner (match.ts)                 |
 |                                        SimState + 60 Hz timer               |
 |                                        uses shared/sim (same code as client)|
 +-----------------------------------------------------------------------------+
        ^
        | git push to main -> Render runs `npm install && npm run build`, then `npm start`
 GitHub repo
```

One process does three jobs: web host for the game files, lobby (room codes) and game server
(simulates every match). That's the right call at this size.

## 2. Who owns what

```
shared/   THE GAME RULES. Pure TypeScript: no DOM, no network, no clocks.
  sim/        update(state, 1) advances one 1/60 s tick; applyInput(state, side, event)
  fx/         turns small FxEvents into particles (cosmetic, client only in practice)
  protocol.ts message types for both ends of the WebSocket
  simState.ts SimState = everything about one match

server/   RUNS MATCHES. Owns the truth in online games.
  rooms.ts    room codes, join/leave, input sanitising, routes messages
  match.ts    MatchRunner: 60 Hz loop, sends snapshots at 20 Hz, sends acks

client/   SHOWS THE GAME. Reads input, draws, plays.
  flow.ts     the requestAnimationFrame loop, start/finish/pause
  input.ts    keyboard/mouse -> local sim (solo) or messages (online)
  net/        socket, snapshot handling, clock sync, visual prediction
  render/     canvas 2D drawing
  ui/         DOM HUD
```

There are three ways the game runs, and the client switches between them with `net.mpRole`:

| Mode | Who runs `update()` | Client role | Notes |
|---|---|---|---|
| Solo / AI / training | the browser | `null` | fixed 60 Hz steps + render interpolation |
| Online, server netcode (default) | the server | both players are `'guest'` | the one you want |
| Online, legacy host | host's browser | `'host'` / `'guest'` | old relay mode, still behind a checkbox |

## 3. Life of an online match (server netcode)

```
 Alice (creator)            Server                         Bob (joiner)
   |  create {netcode:server} |                                |
   |------------------------->| rooms.set("KXQWPM", room)      |
   |<-- created "KXQWPM" -----|                                |
   |       (Alice texts Bob the code)                          |
   |                          |<----------- join "KXQWPM" -----|
   |                          |------------ joined ----------->|
   |<-- start {role:guest} ---|--- start {role:guest} -------->|
   |                          | new MatchRunner, start(1)      |
   |                          |   Alice = wizard p, Bob = e    |
   |                          |                                |
   |  input key KeyW down #41 |                                |
   |------------------------->| applyInput(game,'p',...)       |
   |<-- input_ack #41 --------|                                |
   |                          | every tick: update(game,1)     |
   |<-- state (seq 87) -------|--- state (seq 88) ------------>|  every 3rd tick = 20 Hz
   |      ...                 |                                |
   |<-- death_start ----------|--- death_start --------------->|
   |<-- finished -------------|--- finished ------------------>|  runner stops
   |  rematch_ready --------->|<---------- rematch_ready ------|
   |<-- rematch_start --------|--- rematch_start ------------->|  runner.start(2)
```

If either socket closes, the room is deleted and the other player gets `peer_left`. There is no
reconnect.

## 4. One server tick, one client frame

Server, every 16.7 ms (`MatchRunner.loop`, with catch-up of up to 5 ticks):

```
 inputs that arrived since last tick were already applied by handleInput()
       |
 update(game, 1)  -> moves wizards, shots, bombs, zones; pushes SimEvents
       |
 every 3rd tick: serializeSnapshot(game, viewer) for each player -> JSON -> ws.send
       |
 resolveDeaths(game); flushEvents(): FxEvents queued for the next snapshot,
                                      death / round_over sent as their own messages
```

Client in server netcode, every display frame (`flow.ts loop`):

```
 snapshot arrives (any time) -> applyState(): overwrite game.p / game.e / shots / ...,
                               record opponent position on the server clock,
                               compute a correction for my own wizard
       |
 frame:
   my wizard   = predicted locally (walk() with my keys) + decaying correction
   opponent    = interpolated ~70-150 ms in the past on the server's clock
   projectiles = carried forward from the newest snapshot along their velocity
   my spells   = drawn instantly by net/prediction.ts (visual only, server decides hits)
   particles   = advanced every frame from FxEvents
       |
 write those draw positions INTO game.p.x etc, draw(), then put the real values back
```

## 5. Worked example: Bob casts STEAM online

1. Bob presses `Q` (fire) then `W` (water). `input.ts` sends
   `{type:'input', action:'key', key:'KeyQ', down:true, inputId:101, castId:7}` and the same for
   `KeyW`. Locally, `guestSelect` updates the HUD so it feels instant.
2. Bob clicks. Client sends `{action:'down', x:412, y:288, inputId:103}` and `guestFXAt('STEAM')`
   immediately draws a predicted steam cone from Bob's *drawn* position. It also starts a local
   copy of the cooldown from the `guestCD` table.
3. Server: `rooms.ts` clamps x/y to the arena, `MatchRunner.handleInput` calls
   `applyInput(game, 'e', {kind:'pointerdown',...})`, which commits FIRE+WATER = STEAM and sets
   `holding = true`. It replies `input_ack 103`.
4. Next ticks: `update()` charges the cast; on `pointerup` the server calls `cast()`, creates the
   shot with `id: 57`, and pushes `{type:'spray', ...}` FxEvents.
5. Next snapshot (≤50 ms later) carries shot 57 and the spray events. Alice's client starts
   drawing shot 57 extrapolated forward; Bob's client already showed his own version.
6. Shot 57 hits Alice: server applies damage, adds a floating `-14` label to `game.labels`, and
   the label travels to both clients inside the next snapshots.

The result at 154 ms RTT (measured, Perth to Singapore): about 150 ms from click to confirmed
hit, the same for both players. Good.

## 6. Naming

The code has a lot of 1-4 letter names left over from when it was a single-file game. They are
the biggest barrier to adding features (and to anyone else reading it). Suggested renames:

| Now | Meaning | Suggest |
|---|---|---|
| `p`, `e` (wizards, `WizardId`) | "player" / "enemy". Online, `p` is the room creator. | `slotA` / `slotB`, or `wizards: [Wizard, Wizard]` indexed by `PlayerSlot = 0 \| 1` |
| snapshot `p` / `e` | **swapped**: `e` is always *you*, `p` the opponent | `you` / `opponent` |
| `Role 'guest'` in server netcode | means "I'm a client of the server" (both players) | delete roles once host mode goes; use `isOnline` |
| `net` (40 loose fields) | all networking state | split: `Connection`, `SnapshotBuffer`, `LocalPrediction` |
| `guestCD`, `guestFXAt`, `guest*` | predicted visuals for the local online player | `predictedCooldowns`, `showPredictedCast` |
| `k` on shots/zones | spell kind | `spell` |
| `COL`, `PART`, `pairs` | spell colours, spell -> elements, elements -> combo | `SPELL_COLOR`, `SPELL_ELEMENTS`, `COMBO_OF` |
| `make`, `comb`, `walk`, `float`, `tick` | create wizard, combine elements, move with collision, add floating text, count down timers | `createWizard`, `combineElements`, `moveWithCollision`, `addFloatingText`, `tickTimers` |
| `over`, `stat`, `mag`, `rest` | status buildups | `overcharge`, `static`, `magnetised`, `resistance` (whatever they really are) |
| `u`, `r`, `s` in fx | progress, radius, text | write them out |

Renames are cheap now (tests exist, the sim is isolated) and get more expensive with every feature.
Do them in their own PRs with no logic change, like the formatter pass you already did.

## 7. Critique

### What's genuinely good
- **The sim is a pure library** (`shared/sim`): state in, events out, seeded RNG, no DOM. This is
  the single most important decision for a multiplayer game and you got it right. It is what
  makes a server-authoritative model, replays, tests and a future engine port possible.
- **Server-authoritative with a fixed 60 Hz tick**, symmetric latency, no host advantage.
- **Cosmetics are not on the wire** (Phase 3b): FxEvents instead of particles, 257 -> 48 KB/s.
- **Measured, not guessed.** `tests/latency.mjs`, `load.mjs`, `feel.mjs` with numbers in the
  roadmap. Determinism and framerate-independence tests. Most hobby (and plenty of pro) netcode
  has none of this.
- Interpolation on the server's clock with jitter-adaptive delay (`net/clock.ts`) is the correct
  technique, nicely explained.
- Small, honest roadmap with before/after numbers.

### What will hurt as the game grows (ranked)

1. **Two netcodes live side by side.** Every client file branches on `net.mpRole === 'guest'`,
   and the server has two message handlers. The legacy host mode served its purpose (A/B test,
   now done: 281 -> 150 ms). Deleting it removes maybe a third of the client's networking code
   and most of the confusing role names.

2. **Presentation is mixed into the simulation.**
   - The sim decides colours (`burst(..., '#4ade80', 35, 7)`), particle counts, label text
     (`'RESPAWNED'`, `'-14 🔥'`) and label positions. Those are art decisions.
   - `labels`, `arcs`, `waves` live in `SimState` and are **sent in every snapshot** (up to
     16 + 10 + 14 objects, arcs with point lists).
   - This is the main thing that will break when you add sounds and animations (section 8).

3. **The renderer mutates game state.** `flow.ts` writes predicted positions into `game.p.x`,
   draws, then restores them. Any new render code that caches a reference, or any exception
   mid-draw, leaves the game state wrong. Render should read a separate "what to draw" object.

4. **Client prediction is a heuristic, not reconciliation.** Your own wizard is moved with a
   copy of the movement rule (`3.5 * (1 - 0.75 * chill/100)`), corrected by capped, decaying
   offsets with tuned thresholds (`22`, `0.24 * RTT`, `115`, `170`). Spell cooldowns are
   duplicated in `guestCD`. Any rule change (new speed buff, dash, new spell) must be made in
   two places or the prediction drifts. The standard fix is in section 9.

5. **Global mutable state everywhere on the client** (`game`, `net` imported by every module),
   and `strict: false` / `noImplicitAny: false` for client code. The sim compiles strict; the
   client doesn't, and it's where the bugs will be.

6. **Mode logic inside `update()`**: the AI, training dummy, and online input handling are
   `if (game.mode === ...)` blocks inside the core tick, with movement code copy-pasted three
   times. The AI especially should be a separate "input source" that produces the same
   `InputEvent`s a player does; then the server could host AI matches too.

7. **The Wizard type is a bag of 40 fields** (9 cooldown fields, 6 status fields, timers).
   Grouping them (`cooldowns: Record<Ability, number>`, `status: Record<StatusKey, number>`)
   makes snapshots, the HUD and the cooldown-mirroring loop in `applyState` all simpler.

8. Small bugs/smells found along the way:
   - `connect()` starts a new `setInterval` ping every time it connects and never clears it;
     after a reconnect you send duplicate pings.
   - Connect error says `localhost:3000`; the server uses 3036.
   - `postinstall` runs `npm run build`, and Render's build command is
     `npm install && npm run build`, so it builds twice.
   - When a socket is backed up, `sendSnapshots` skips that player but still clears
     `pendingFx`, so their effects are lost (harmless now, matters once FX trigger sounds).
   - No per-socket rate limit on messages; a client can spam inputs.
   - README says "Ondeploy" and still describes host mode as current; `VERSION` is
     `'latency-test'`.

## 8. Adding sound, animation and better graphics without breaking multiplayer

The rule that keeps netcode safe:

> **The simulation says *what happened*. The client decides *how it looks and sounds*.**
> Nothing visual or audible is ever simulated on the server or sent as state.

If you follow it, you can go from canvas circles to animated sprites with sound and the
bandwidth and server CPU stay exactly where they are today.

### Today vs. target

```
 TODAY                                       TARGET
 sim: burst(x, y, '#4ade80', 35, 7)          sim: events.push({type:'respawned', wizard:'B'})
 sim: labels.push({s:'-14', c:'#e2e8f0'})    sim: events.push({type:'damaged', wizard:'A',
 snapshot: labels[], arcs[], waves[]                           amount:14, spell:'STEAM'})
                                             snapshot: only gameplay state
                                             client: Presentation layer maps events ->
                                                     particles + sound + animation + numbers
```

### Gameplay events instead of FX events

Replace `burst/spray/bolt_trail/magma_trail` (which describe *pictures*) with events that
describe *game facts*. Example set:

```ts
type GameEvent =
  | { type: 'spell_cast';   wizard: Slot; spell: SpellName; x: number; y: number; dirX: number; dirY: number; charged: boolean }
  | { type: 'shot_hit';     shotId: number; target: Slot; spell: SpellName; x: number; y: number }
  | { type: 'damaged';      target: Slot; amount: number; source: 'direct' | 'burn' }
  | { type: 'shield_raised'; wizard: Slot; element: ElementName | 'HEAL' }
  | { type: 'status_applied'; target: Slot; status: StatusKey }   // e.g. frozen, wet
  | { type: 'bomb_landed';  bombId: number; x: number; y: number; spell: SpellName }
  | { type: 'wizard_died';  wizard: Slot }
```

Then one client module turns them into everything:

```ts
// client/src/presentation/onGameEvent.ts
function onGameEvent(ev: GameEvent) {
  switch (ev.type) {
    case 'shot_hit':
      particles.burst(ev.x, ev.y, SPELL_LOOK[ev.spell].hitParticles);
      sound.play(SPELL_LOOK[ev.spell].hitSound, { x: ev.x });  // stereo pan by x
      camera.shake(2);
      break;
    case 'damaged':
      floatingNumbers.add(ev.target, ev.amount);   // batching/positioning lives here now
      wizardAnim(ev.target).play('flinch');
      break;
    ...
  }
}
```

`SPELL_LOOK` is a client-only table (colours, particle recipes, sound files, sprite sheet).
Artists/you can change it freely; the server never sees it.

### Animations come from state the client already has

Don't send "animation frames". Derive them:

- walk cycle: from the drawn position's change per frame (works for predicted and interpolated
  wizards alike)
- cast pose: from `wizard.cast > 0` or the `spell_cast` event
- frozen / burning overlays: from `freeze`, `burn` already in the snapshot
- death: from `wizard_died` (already its own message)

### Predicted vs confirmed effects (avoids double sounds)

Your own casts are shown instantly (prediction), then the server's event arrives ~150 ms later.
If both play a sound you get "fwoosh-fwoosh". Tag local predictions with the `castId` you already
send, have the server echo `castId` in `spell_cast`, and skip events you've already shown.
Same idea for "server rejected my cast" (you already get `cast_ack accepted:false`): cancel the
predicted visual.

### Keep the frame loop healthy

- Load sounds/sprites before the match starts (a loading step in the lobby), never mid-fight.
- Use the Web Audio API (one `AudioContext`, decoded buffers, limit simultaneous voices per sound).
- Put a frame-time readout in the existing `netdiag` line. If heavy drawing drops you to 30 fps,
  that's a rendering problem, not a network one, and with the server-authoritative model it
  won't desync anything: the network code doesn't depend on frame rate (you tested this in 3d).
- Rendering heavier graphics: move from canvas 2D to **PixiJS** (WebGL, sprites, batching,
  filters). Because the sim is separate, this is a swap of `client/src/render/` only.

## 9. Networking improvements, in order

Each step is independent and testable with your existing `feel.mjs` / `latency.mjs`.

1. **Delete legacy host mode.** Remove `'host'` netcode, the relay messages
   (`input_ack`/`cast_ack`/`state`/`death_start`/`finished` from the client side), roles, and
   `netState()`. Biggest simplification for the least effort.

2. **Stop sending cosmetics in snapshots.** Move `labels`, `arcs`, `waves` out of `SimState`
   into client-side presentation driven by events (section 8). Smaller snapshots, simpler sim.

3. **Send events reliably, separately from snapshots.** Snapshots can be skipped when a socket
   backs up (that's fine, the next one replaces it). Events can't be skipped once they drive
   sounds. Send them as their own `{type:'events', tick, list}` message every tick that has any,
   or keep them in the snapshot but don't clear them for a player whose snapshot was skipped.

4. **Proper client-side prediction + reconciliation** for your own wizard:

   ```
   client: every tick, build InputCommand {tick: 1042, move: {x:1,y:0}, aimX, aimY, buttons}
           send it, keep it in pendingInputs, and apply it to a local copy of MY wizard
           using the SAME shared/sim movement function the server uses.
   server: applies commands in tick order; each snapshot says lastProcessedInput: 1039.
   client: on snapshot: set my wizard = server's, drop inputs <= 1039,
           re-apply inputs 1040..1042  -> predicted position, no magic thresholds.
           if that differs from what's on screen, blend the visual over ~100 ms.
   ```

   This is the classic Gabriel Gambetta / Valve "Source multiplayer networking" model. It
   removes the copied movement constants, `guestCorrection`, the `22 / 0.24*RTT / 115 / 170`
   thresholds, and (if cooldowns are predicted with the same sim code) the `guestCD` table.
   Your sim already being pure makes this realistic. Sending *state per tick* (keys held, aim)
   instead of *key up/down events* also makes it robust: a lost/late "key up" can no longer leave
   someone walking forever.

5. **Trim snapshots to what clients use.** The opponent's nine cooldowns, `rest`, `burnTick`,
   `healTick` etc. aren't needed for drawing. Send a `WizardView` type. Later, if you need it:
   delta snapshots (only changed fields vs. the last one the client acked) and/or a binary
   format. Measure first: at ~24 KB/s per player you're nowhere near a limit.

6. **Reconnect.** On `create`/`join` give each player a random `resumeToken`. On socket close,
   keep the room for ~10 s (match keeps running or pauses); a new socket sending
   `{type:'resume', token}` is reattached. Mobile/Wi-Fi blips stop ending matches.

7. **Protocol hygiene.** A `hello {protocolVersion}` first message, so a stale tab after a deploy
   gets "please refresh" instead of weird errors. Validate every incoming message shape (a small
   hand-written validator per type is enough). Rate-limit per socket (e.g. 120 messages/s, then
   drop or disconnect).

8. **Interest in "what the server sees".** Add a tiny `/stats` endpoint (rooms, players, average
   tick time, bytes/s). You'll want it the first time someone says "it lagged".

## 10. Hosting and scaling on Render

### What you have
One Node process in Singapore. All rooms in a `Map` in memory.

### Things to know about the free tier
- Free web services **spin down after ~15 minutes without traffic**; the first visitor then waits
  for a cold start (tens of seconds). Fine for testing, annoying when inviting friends. The paid
  "Starter" instance stays up.
- **Every deploy restarts the process**, which deletes every room and ends every match. Deploy
  when nobody's playing, or (later) let the old instance drain.
- 0.1 CPU: your load test measured 20 rooms at 14% of a full core locally, so roughly 5-10
  simultaneous matches before ticks start slipping on the free tier. Verify on Render with
  `load.mjs` pointed at the deployed URL plus the `/stats` endpoint above.

### Scaling steps, only when you need them

```
 Stage 1 (now, friends)      1 instance, rooms in memory                       <- you are here
 Stage 2 (dozens of matches) paid instance, same design; serve static files     ~ $7/mo
                             (sprites, audio) from a CDN/static site, not the
                             game process
 Stage 3 (hundreds)          several game-server instances. Room code must say  needs a small
                             which instance owns it, e.g. "SG1-KXQWPM", or a    lobby service
                             tiny lobby service + Redis maps code -> server URL; or Redis
                             clients connect straight to that server's URL.
 Stage 4 (players worldwide) same as stage 3 in more regions; lobby picks the
                             region with the best ping for both players.
```

The important design point: **one match must live entirely on one process** (it has a 60 Hz
loop and in-memory state). You scale by adding processes and routing players to the right one,
never by spreading one match across machines. Your current design already respects that; the
only missing piece for stage 3 is "which server is room X on?".

Asset growth: as you add audio and sprites, keep Vite's hashed filenames (already cached as
`immutable`, good) and consider hosting `dist/client` as a Render Static Site / Cloudflare Pages,
with the game server only doing `/ws`. That stops a 5 MB sound pack from competing with game
ticks on 0.1 CPU.

## 11. Far future: a real engine

What carries over is the *design*, not the TypeScript:

- an authoritative fixed-tick simulation with pure update rules
- inputs up, snapshots + events down, prediction for your wizard, interpolation for the other
- presentation driven by events

Realistic paths, from least to most change:

| Option | Client | Server | Effort | Notes |
|---|---|---|---|---|
| **PixiJS / Phaser** (web) | TS + WebGL | keep current Node server | low | Best next step. Sprites, particles, shaders, still runs in a browser link. Only `render/` changes. |
| **Three.js / Babylon.js** (web 3D) | TS + WebGL/WebGPU | keep Node | medium | If you want 3D or 2.5D wizards. |
| **Godot 4** | GDScript or C# | Node server unchanged (Godot speaks WebSocket + JSON), or port the sim to Godot and run a headless Godot server | medium-high | Great fit for a 2D/2.5D duel game, exports to web/desktop/mobile, free. |
| **Unity** | C# | port sim to C#, run headless Unity or a .NET server | high | Huge asset store; netcode libs like Mirror/Fish-Net/Netcode for GameObjects. |
| **Unreal** | C++ / Blueprints | Unreal dedicated server | very high | Overkill for this game. |
| **Bevy** (Rust) | Rust/ECS | same Rust sim on a server | high | Fun if you want to learn Rust; one language end to end. |

Things to do now that make any of these easier later:
- Keep the protocol language-neutral: plain JSON objects with clear names (not `k`, `p`/`e`), and
  document it. If an engine client can speak the same messages, you can swap the client and keep
  the server, or vice versa.
- Keep all tuning numbers (speeds, damage, cooldowns) in data (`shared/constants.ts` or a JSON
  file), not inline in `update()`. That's the part you'd otherwise have to re-type in C#/GDScript.
- If both client and server run the sim (step 4 of section 9), they don't need to be bit-exact
  across languages; reconciliation absorbs small differences. That's what makes "Godot client,
  Node server" workable. (Lockstep netcode would need bit-exact determinism; you don't need it.)

---

## Suggested order of work

1. Delete legacy host mode (section 9.1). Fix the small bugs in 7.8.
2. Rename pass in shared/sim (section 6). No logic changes.
3. Gameplay events + client presentation layer; move labels/arcs/waves out of the sim (8, 9.2, 9.3).
4. Render reads a view model instead of mutating `game` (7.3). Turn on `strict` for the client.
5. Input commands per tick + real reconciliation (9.4). Delete `guestCD` and correction heuristics.
6. Now add sound and animation freely. Consider PixiJS for graphics.
7. Reconnect, protocol version, rate limits, `/stats` (9.6-9.8). Paid instance when friends complain about cold starts.
