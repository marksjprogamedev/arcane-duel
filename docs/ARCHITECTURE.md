# Arcane Duel: Architecture, Review and Plan

How the game works today (after the road to 1.0.0, see `docs/ROADMAP.md`), what is good and what is still
weak about it, and where it could go next.

Contents:

1. The big picture
2. Who owns what (client / server / shared)
3. Life of an online match
4. One server tick, one client frame
5. Worked example: casting STEAM online
6. Naming: what the confusing names mean, and better ones
7. Critique of the engineering approach
8. Adding sound, animation and better graphics without breaking multiplayer
9. How the netcode works
10. Hosting and scaling
11. Far future: a real engine
12. What to do next

---

## 1. The big picture

```
   Player A (browser, Perth)                         Player B (browser, Jakarta)
 +---------------------------+                     +---------------------------+
 | client bundle (Vite)      |                     | client bundle (Vite)      |
 |  input -> net -> render   |                     |  input -> net -> render   |
 +-------------+-------------+                     +-------------+-------------+
               |  HTTP(S): index.html, JS, CSS                   |
               |  WS(S) /ws: inputs up, snapshots down           |
               v                                                 v
 +-----------------------------------------------------------------------------+
 | Oracle Cloud VM, Sydney (Caddy in front; one Node process per slot)         |
 |                                                                             |
 |  server/index.ts --> app.ts: one http.Server                                |
 |     |-- static.ts      serves dist/client (the game files), /version        |
 |     |-- /stats         live numbers: rooms, connections, tick time, bytes/s |
 |     '-- WebSocket /ws  -> rooms.ts                                          |
 |                             rooms: Map<"QWERTY", Room>   (in memory only)   |
 |                             Room --> MatchRunner (match.ts)                 |
 |                                        SimState + 60 Hz timer               |
 |                                        uses shared/sim (same code as client)|
 +-----------------------------------------------------------------------------+
        ^
        | git push -> GitHub Actions -> `arcane-deploy`: main on port 80,
 GitHub repo                              test branches on 8081 / 8082

One process does three jobs: web host for the game files, lobby (room codes) and game server
(simulates every match). That's the right call at this size.

## 2. Who owns what

```

shared/ THE GAME RULES. Pure TypeScript: no DOM, no network, no clocks.
sim/ update(state, 1) advances one 1/60 s tick; applyInput(state, side, event)
sim/movement.ts walking + knockback; used by the sim AND by client prediction
sim/obstacles.ts what is solid (circles, rectangles) and the grid that finds nearby ones
sim/vision.ts canSee: the fog-of-war rule, used by the server and the client
sim/snapshot.ts what each player is sent, with fog-of-war culling
maps.ts, ruinsMap.ts map data: size, bounds, spawns, vision, solids (no art)
charge.ts rules for charged spells (which spells charge, speed penalty while charging)
fx/cosmetics.ts turns FxEvents into particles, floating text, arcs, rings (client side)
protocol.ts message types for both ends of the WebSocket, PROTOCOL_VERSION
simState.ts SimState = everything about one match

server/ RUNS MATCHES. Owns the truth in online games.
app.ts http + WebSocket server, rate limit, idle timeout, GET /stats
validate.ts checks the shape of every client message
rooms.ts room codes, lobby (options, start), join/leave, reconnect (resume tokens), routes messages
match.ts MatchRunner: 60 Hz loop, move commands, snapshots at 30 Hz, pause/resume

client/ SHOWS THE GAME. Reads input, draws, plays.
flow.ts the requestAnimationFrame loop, start/finish/pause
input.ts keyboard/mouse -> local sim (solo) or messages (online)
net/ socket + reconnect, snapshot handling, clock sync,
movePrediction.ts (your wizard), prediction.ts (instant spell visuals)
render/ canvas 2D drawing: camera, map art, fog, minimap
ui/ DOM HUD

```

There are two ways the game runs; the client switches with `net.online`:

| Mode                 | Who runs `update()` | Notes                                                       |
| -------------------- | ------------------- | ----------------------------------------------------------- |
| Solo / AI / training | the browser         | fixed 60 Hz steps + render interpolation                    |
| Online               | the server          | you predict your own movement, the opponent is interpolated |

## 3. Life of an online match

```

Alice (creator) Server Bob (joiner)
| hello {protocolVersion} | | (every connection)
| create ---------------->| rooms.set("KXQWPM", room) |
|<-- created "KXQWPM", resumeToken, lobby | (the lobby screen)
| (Alice texts Bob the code) |
| |<----------- join "KXQWPM" -----|
| |--- joined, resumeToken ------->|
|<-- lobby {options, guestPresent} -------- lobby ---------->|
| set_options {mapId} --->|--- lobby {options} (to both) -->| only the creator can
| start_match ----------->| phase = match |
|<-- start {roundId:1, mapId, seat:0} --|-- start {..., seat:1} -->|
| | new MatchRunner, start(1) |
| | Alice = wizard p, Bob = e |
| | |
| move {seq:41, keys:W} | (every tick, 60 Hz) |
|------------------------->| newest keys + aim for wizard p |
| input key Digit1 #7 | |
|------------------------->| applyInput(game,'p',...) |
|<-- input_ack #7 ---------| |
| | every tick: update(game,1) |
|<-- state {ack:41, ...} --|--- state {ack:..} ------------>| every 2nd tick = 30 Hz
| ... | |
|<-- death_start ----------|--- death_start --------------->|
|<-- finished -------------|--- finished ------------------>| runner stops
| rematch_ready --------->|<---------- rematch_ready ------|
|<-- rematch_start --------|--- rematch_start ------------->| runner.start(2)
| back_to_lobby ---------->| (either player, instead of a rematch)
|<-- lobby {options} ------|--- lobby {options} ----------->| runner stops, options kept

```

A room has a **phase**: `lobby` (the creator chooses the options, the match is not running) and
`match`. Joining only fills the second seat; the creator starts the match with `start_match`.
A rematch keeps the options and stays in the match phase; `back_to_lobby` returns both players to
the lobby to change them. If the joiner leaves while in the lobby the room stays open for the
creator; the creator leaving closes it. There is no reconnect in the lobby (nothing to resume).

Leaving (`leave`) closes the room and the other player gets `peer_left`. A dropped connection
instead pauses the match and sends `peer_away`; the player's client reconnects and sends
`resume {code, token}` within 10 s (`resumed` / `peer_back`), or the room closes.

## 4. One server tick, one client frame

Server, every 16.7 ms (`MatchRunner.loop`, with catch-up of up to 5 ticks):

```

actions (keys 1-4, clicks) were applied by handleInput() as they arrived;
the newest move command per player sets their held keys and aim
|
update(game, 1) -> moves wizards, shots, bombs, zones; pushes SimEvents
|
every 2nd tick: serializeSnapshot(game, viewer) for each player -> JSON -> ws.send
(only drawn fields; ack = newest move command applied)
|
resolveDeaths(game); flushEvents(): FxEvents queued per player for their next snapshot,
death / round_over sent as their own messages

```

Client online, every display frame (`flow.ts loop`):

```

each 1/60 s tick: movePredictor.tick(keys) moves MY predicted wizard with stepMovement()
and sends move {seq, keys, x, y}
snapshot arrives -> applyState(): replace game.p / game.e / shots / ...,
record opponent position on the server clock,
movePredictor.reconcile(myWizard, ack): restart from the server's
position, replay unacknowledged moves, fade out any difference
|
frame:
my wizard = predicted position (between ticks) + fading correction
opponent = interpolated ~53-150 ms in the past on the server's clock
projectiles = carried forward from the newest snapshot along their velocity
my spells = drawn instantly by net/prediction.ts (visual only, server decides hits)
cosmetics = particles, text, arcs, rings made from FxEvents, animated every frame
|
write those draw positions INTO game.p.x etc, draw(), then put the real values back

```

## 5. Worked example: Bob casts STEAM online

1. Bob presses `1` (fire) then `2` (water). `input.ts` sends
   `{type:'input', action:'key', key:'Digit1', down:true, inputId:101}` and the same for
   `Digit2`. Locally, `guestSelect` updates the HUD so it feels instant.
2. Bob holds the mouse button and releases. The client sends `{action:'down', x:412, y:288}`
   and `{action:'up', ...}`, and `guestFXAt('STEAM')` immediately draws a predicted steam bolt
   from Bob's _drawn_ position, gated by the same `COOLDOWN_TICKS` the server uses.
3. Server: `validate.ts` checks the messages and clamps x/y to the match's map.
   `MatchRunner.handleInput` calls `applyInput(game, 'e', {kind:'pointerdown',...})`, which
   commits FIRE+WATER = STEAM and starts charging. On `pointerup` it calls `cast()`, which
   creates the shot (`id: 57`) and pushes a `burst` FxEvent.
4. Next snapshot (≤33 ms later) carries shot 57 and the burst. Alice's client starts drawing shot
   57 extrapolated forward; Bob's client already showed his own version.
5. Shot 57 hits Alice: the server applies damage and, half a second later, emits a
   `{type:'text', text:'14', damageOwner:...}` event. Each client draws the floating number
   itself.

From click to confirmed hit is about one round trip, the same for both players (50 ms ping from
Perth to the Oracle server in Sydney; 149 ms was measured to the old Render host).

## 6. Naming

The code has a lot of 1-4 letter names left over from when it was a single-file game. They are
the biggest barrier to adding features (and to anyone else reading it). Suggested renames:

| Now                                      | Meaning                                                                                    | Suggest                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `game.p`, `game.e`                       | aliases for `wizards[0]` and `wizards[1]` (seats 0 and 1); on the client, `p` is the rival and `e` you | `game.wizards[seat]`, `game.me` (being moved to a list in 0.7.3)               |
| `net` (~35 loose fields)                 | all networking state                                                                       | split: `Connection`, `SnapshotBuffer`, `CastPreview`                                    |
| `guestFXAt`, `guestSelect`, `net.guest*` | instant visuals for your own online casts, and their cooldowns                             | `showCastPreview`, `previewSelect`, `castPreview.*`                                     |
| `k` on shots/zones                       | spell kind                                                                                 | `spell`                                                                                 |
| `COL`, `PART`, `pairs`                   | spell colours, spell -> elements, elements -> combo                                        | `SPELL_COLOR`, `SPELL_ELEMENTS`, `COMBO_OF`                                             |
| `make`, `comb`, `walk`, `float`, `tick`  | create wizard, combine elements, move with collision, add floating text, count down timers | `createWizard`, `combineElements`, `moveWithCollision`, `addFloatingText`, `tickTimers` |
| `over`, `stat`, `mag`, `rest`            | status buildups                                                                            | `overcharge`, `static`, `magnetised`, `resistance` (whatever they really are)           |
| `u`, `r`, `s` in fx                      | progress, radius, text                                                                     | write them out                                                                          |

Renames are cheap now (tests exist, the sim is isolated) and get more expensive with every feature.
Do them in their own PRs with no logic change, like the formatter pass you already did.

## 7. Critique

### What's genuinely good

- **The sim is a pure library** (`shared/sim`): state in, events out, seeded RNG, no DOM. This is
  the single most important decision for a multiplayer game. It is what makes a
  server-authoritative model, replays, tests and a future engine port possible.
- **Server-authoritative with a fixed 60 Hz tick**, symmetric latency for both players.
- **Prediction with reconciliation** for your own wizard, using the same movement code as the
  server (`shared/sim/movement.ts`), so the two cannot drift apart.
- **Cosmetics are not on the wire**: particles, floating text, arcs and rings are made by each
  client from small fx events.
- **Robust connection handling**: reconnect with a paused match, protocol version check,
  validated messages, rate limit, `/stats`.
- **Measured, not guessed.** `tests/latency.mjs`, `load.mjs`, `feel.mjs`, `lag-trace.mjs` with
  numbers in the roadmap and `docs/INVESTIGATION.md`. Determinism, framerate-independence and
  prediction tests.
- Interpolation on the server's clock with a jitter-adaptive delay (`net/clock.ts`).

### What will hurt as the game grows (ranked)

1. **The simulation still makes art decisions.** It picks colours
   (`burst(..., '#4ade80', 35, 7)`), particle counts, and the text and position of floating
   labels (`'RESPAWNED'`, `'-14 🔥'`). Cosmetics are already events rather than state; the next
   step is events that describe game facts instead of pictures (section 8). This matters most
   once sounds and animations arrive.

2. **The renderer mutates game state.** `flow.ts` writes predicted/interpolated positions into
   `game.p.x`, draws, then restores them. Any new render code that caches a reference, or any
   exception mid-draw, leaves the game state wrong. Render should read a separate "what to draw"
   object.

3. **Global mutable state everywhere on the client** (`game`, `net` imported by every module),
   and `strict: false` / `noImplicitAny: false` for client code. The sim compiles strict; the
   client doesn't, and it's where the bugs will be.

4. **Mode logic inside `update()`**: the AI and training dummy are `if (game.mode === ...)`
   blocks inside the core tick. The AI should be a separate "input source" that produces the same
   `InputEvent`s a player does; then the server could host AI matches too.

5. **The Wizard type is a bag of 40 fields** (9 cooldown fields, 6 status fields, timers).
   Grouping them (`cooldowns: Record<Ability, number>`, `status: Record<StatusKey, number>`)
   makes snapshots, the HUD and the cooldown-mirroring loop in `applyState` all simpler.

6. Small things:
   - `postinstall` runs `npm run build`, and `arcane-deploy` relies on that (it only runs
     `npm ci --omit=dev`). Don't remove it without changing the deploy script.
   - Your own online casts are previewed by hand-written drawing code in `net/prediction.ts`
     that mirrors what the server does (projectile speeds, ranges). Only the cooldowns are shared
     (`COOLDOWN_TICKS`); the rest can drift if spells change.

## 8. Adding sound, animation and better graphics without breaking multiplayer

The rule that keeps netcode safe:

> **The simulation says _what happened_. The client decides _how it looks and sounds_.**
> Nothing visual or audible is ever simulated on the server or sent as state.

If you follow it, you can go from canvas circles to animated sprites with sound and the
bandwidth and server CPU stay exactly where they are today.

### Today vs. target

```

TODAY TARGET
sim: burst(x, y, '#4ade80', 35, 7) sim: events.push({type:'respawned', wizard:'B'})
sim: events.push({type:'text', sim: events.push({type:'damaged', wizard:'A',
text:'-14', c:'#e2e8f0'}) amount:14, spell:'STEAM'})
(fx events describe pictures: colours, client: Presentation layer maps events ->
particle counts, label text) particles + sound + animation + numbers

````

### Gameplay events instead of FX events

Replace `burst/spray/bolt_trail/magma_trail/text/lightning/wave` (which describe _pictures_) with
events that describe _game facts_. Example set:

```ts
type GameEvent =
  | {
      type: 'spell_cast';
      wizard: Slot;
      spell: SpellName;
      x: number;
      y: number;
      dirX: number;
      dirY: number;
      charged: boolean;
    }
  | { type: 'shot_hit'; shotId: number; target: Slot; spell: SpellName; x: number; y: number }
  | { type: 'damaged'; target: Slot; amount: number; source: 'direct' | 'burn' }
  | { type: 'shield_raised'; wizard: Slot; element: ElementName | 'HEAL' }
  | { type: 'status_applied'; target: Slot; status: StatusKey } // e.g. frozen, wet
  | { type: 'bomb_landed'; bombId: number; x: number; y: number; spell: SpellName }
  | { type: 'wizard_died'; wizard: Slot };
````

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

Your own casts are shown instantly (cast preview), then the server's event arrives ~150 ms later.
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

## 9. How the netcode works

**Movement: prediction and reconciliation** (`client/src/net/movePrediction.ts`)

```
client: every tick, MovePredictor.tick(keys) records move {seq: 1042, keys, aim},
        sends it, and moves MY predicted wizard with stepMovement() from shared/sim/movement.ts
server: uses the newest move command it has (keys stay held until the next one);
        each snapshot says ack: 1039 (newest command applied for that player)
client: on snapshot: start from the server's wizard, drop commands <= 1039,
        replay 1040..1042 -> predicted position. Any difference from what is on screen
        becomes a correction that fades out over ~90 ms (jumps over 140 px snap).
```

This is the classic Gabriel Gambetta / Valve "Source multiplayer networking" model. Sending the
held keys every tick (instead of key up/down events) makes it robust: a lost or late message can't
leave someone walking forever, and if commands stop for 250 ms the server releases the keys.

**Actions** (keys 1-4, clicks, shields, sword, force) are sent as `input` messages when they
happen, applied by the server on arrival and acknowledged (`input_ack`, `cast_ack`). Your own casts
are previewed instantly by `net/prediction.ts`; the server decides hits and damage.

**Charged spells** are decided by `update()` (`canChargeSpell`, `shared/charge.ts`): holding the
button on a chargeable spell charges it, and charging slows walking. The slowdown lives in the shared
`walkWithKeys`, so the server and your movement prediction agree; the charge state is in snapshots so
both players see the charge meter.

**Snapshots** go out at 30 Hz per player and carry only what clients draw: positions, hp, status
values, each wizard's charge state, shots, bombs, zones, and the viewer's own cooldowns and
knockback. About 27 KB/s per player on an arena. Delta or binary snapshots are possible later;
measure first (`docs/ROADMAP.md` has the numbers).

**Fog of war.** On a map with a vision radius (the battlegrounds), `serializeSnapshot` only sends what
the viewer could see, plus a 100-unit margin (`canSee` and `VISION_MARGIN` in `shared/sim/vision.ts`):
the opponent (`Snapshot.p` is `null` while hidden), their shots, bombs, zones, traps, bubbles and
effects. The viewer's own things and the end of a round are always sent. This is what stops a modified
client from reading the enemy's position, and it cuts about 30% of the bandwidth when players are
apart. The client draws the fog, a minimap and an arrow toward hits from out of sight, keeps the
rival's last seen state while hidden (`net.opponentHidden`), and drops their position history so they
appear in the right place when they return. Arenas have no vision radius and are unchanged.

**Fx events** (particles, floating text, lightning, rings) ride along with snapshots. Each player
has their own queue on the server, cleared only when a snapshot is actually sent to them, so a
backed-up connection gets its effects late rather than never.

**The opponent** is drawn ~53-150 ms in the past, interpolated between snapshots on the server's
clock (`net/clock.ts`); projectiles are carried forward along their velocity.

**Connection handling**

- `hello {protocolVersion}` first; an outdated client is told to refresh.
- Every message is validated (`server/validate.ts`) and rate-limited per connection.
- A dropped connection pauses the match for up to 10 s; the client reconnects with its
  `resumeToken`. Connections silent for 15 s are closed so dead ones are noticed.
- `GET /stats` shows rooms, connections, memory, and per-second bytes, messages and tick time.

### Where a map lives

| Part                                               | Where                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Size, bounds, spawns, vision, solids, spatial grid | `shared/maps.ts`, `shared/ruinsMap.ts`, `shared/sim/obstacles.ts` (server and client) |
| Name, icon, picker grouping, the pictures          | `client/src/render/` (`maps.ts`, `ruins.ts`, ...)                                     |

The server loads only the first row. `tests/server/boundary.test.ts` enforces it: nothing the server
imports may come from `client/` or touch the browser. A new map adds its data to `shared/` and its
picture and picker entry to `client/src/render/`; the same test fails if the two lists drift apart.

## 10. Hosting and scaling

### What you have

One Oracle Cloud Always Free VM (Sydney) running up to three copies of the game, one Node process
each, behind Caddy (which serves the built client itself; Node handles `/ws`, `/stats` and `/version`): `main` on port 80 and two test slots (8081, 8082) for any branch. All rooms live
in a `Map` in memory. Deploys, slots and the GitHub Actions workflow are in `docs/DEPLOY-ORACLE.md`.

### Things to know

- **Every deploy restarts that slot's process**, which deletes its rooms and ends its matches. Deploy
  `main` when nobody is playing; test slots are for testing.
- **Oracle can stop a free VM it thinks is idle** (very low CPU, network and memory for ~7 days). It is
  stopped, not deleted; start it from the console and the services come back by themselves.
- **CPU:** one match uses ~5% of a core; the Micro VM (1/8 core, 1 GB RAM, plus a 2 GB swap file for
  builds) stays smooth with 2 busy matches (`docs/INVESTIGATION.md`). Check `/stats` during a real match:
  `lastSecond.ticks` should stay near 60 per running match and `tickMsMax` well under 16 ms.
- **Location matters more than anything in the code.** The same game measured 149 ms round trip to
  Render (Singapore) and 50 ms to Sydney from Perth.

### Scaling steps, only when you need them

```
 Stage 1 (now, friends)      1 instance, rooms in memory                       <- you are here
 Stage 2 (dozens of matches) bigger VM (the Ampere shape, if Oracle has capacity),
                             same design; serve static files
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
`immutable`) and consider hosting `dist/client` on a static host or CDN, with the game server only
doing `/ws`, so a 5 MB sound pack doesn't compete with game ticks for CPU.

## 11. Far future: a real engine

What carries over is the _design_, not the TypeScript:

- an authoritative fixed-tick simulation with pure update rules
- inputs up, snapshots + events down, prediction for your wizard, interpolation for the other
- presentation driven by events

Realistic paths, from least to most change:

| Option                             | Client            | Server                                                                                                          | Effort      | Notes                                                                                              |
| ---------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| **PixiJS / Phaser** (web)          | TS + WebGL        | keep current Node server                                                                                        | low         | Best next step. Sprites, particles, shaders, still runs in a browser link. Only `render/` changes. |
| **Three.js / Babylon.js** (web 3D) | TS + WebGL/WebGPU | keep Node                                                                                                       | medium      | If you want 3D or 2.5D wizards.                                                                    |
| **Godot 4**                        | GDScript or C#    | Node server unchanged (Godot speaks WebSocket + JSON), or port the sim to Godot and run a headless Godot server | medium-high | Great fit for a 2D/2.5D duel game, exports to web/desktop/mobile, free.                            |
| **Unity**                          | C#                | port sim to C#, run headless Unity or a .NET server                                                             | high        | Huge asset store; netcode libs like Mirror/Fish-Net/Netcode for GameObjects.                       |

Things to do now that make any of these easier later:

- Keep the protocol language-neutral: plain JSON objects with clear names (not `k`, `p`/`e`), and
  document it. If an engine client can speak the same messages, you can swap the client and keep
  the server, or vice versa.
- Keep all tuning numbers (speeds, damage, cooldowns) in data (`shared/constants.ts` or a JSON
  file), not inline in `update()`. That's the part you'd otherwise have to re-type in C#/GDScript.
- If both client and server run the sim (prediction, section 9), they don't need to be bit-exact
  across languages; reconciliation absorbs small differences. That's what makes "Godot client,
  Node server" workable. (Lockstep netcode would need bit-exact determinism; you don't need it.)

---

## 12. What to do next

The up-to-date list is in `docs/ROADMAP.md` (Next). In rough order:

1. Rename pass in shared/sim and the client's `guest*` names (section 6). No logic changes.
2. Gameplay events + a client presentation layer, so the sim stops choosing colours and text
   (section 8).
3. Render reads a view model instead of mutating `game` (7.2). Turn on `strict` for the client.
4. Now add sound and animation freely. Consider PixiJS for graphics.
5. Move the AI out of `update()` into an input source (7.4).
