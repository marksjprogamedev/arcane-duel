# Plan: maps, battlegrounds and fog of war (toward 1.0.0)

Arenas stay as they are: small, fixed-screen maps. **Battlegrounds** are new: much bigger, fuller
maps where the camera follows your wizard and you only see what is near you, like Magicka: Wizard
Wars. This is the plan for building that in steps, each one shippable to `main` with the arenas
still working.

## Status

Done: **0.1.0** map definitions, **0.1.1** lobby, **0.1.2** synced map, **0.1.3** menu split, **0.2.0** camera, **0.2.1** development battleground, **0.2.2** draw only what is visible, **0.3.0** spawns, **0.3.1** obstacle lookup, **0.3.2** first battleground (Ruined Keep). **0.4.0** vision radius, **0.4.1** server-side culling, **0.4.2** client fog, **0.5.0** split map data (checked by a test). **0.5.1** Caddy serves the client (applied on the server), **0.5.2** measured. Next: **0.6** polish, then 1.0.0-0 (0.4.3 line of sight is optional). Each step adds its items to `docs/TEST-CHECKLIST.md`. Baseline before the
work (`node tests/load.mjs 1 2`, one room): ~3.5% of a core, ~54 KB/s out, 52 MB RSS.

## Decisions

- **1v1 only** for now. The sim is built around two wizards (`game.p`, `game.e`); more players is a
  later, separate piece of work. Design for "the viewer's view" so it is not ruled out.
- **The room creator picks the map.** The joiner sees it but cannot change it.
- **One vision radius** for fog of war. Line of sight (obstacles blocking sight) is optional, later.
- **Versioning:** build through `0.x`; `1.0.0-0` is the first release where battlegrounds are
  playable with fog. Scheme: `major.minor.feature-commit` (see `CHANGELOG.md`). Each minor below is
  one step of this plan; each feature inside it (`0.1.0`, `0.1.1`, ...) is one piece of it.

## Where things stand (why this is a fundamental change)

- The world is a fixed 800x600, hard-coded in about 12 places: `ARENA_WIDTH/HEIGHT`,
  `ARENA_WIZARD_BOUNDS`, the `30..770` / `30..570` clamps in `shared/sim/combat.ts`, the mouse
  mapping in `client/src/input.ts`, and the map art.
- The map choice lives only in the client (`client/src/render/maps.ts`). Online, `flow.ts` forces
  `'enchanted'` and the sim always uses the four pillars, so the two players can't be on the same
  map. Solo does honour the choice.
- Spawns are fixed positions in `shared/sim/match.ts`.
- Snapshots carry every entity to each viewer, so fog drawn only on the client would still let a
  modified client see the enemy.
- Online rooms start the match the moment the joiner arrives. There is no lobby.

## Rules for every step

- **Arenas never regress.** The 10 existing arenas keep working. Battlegrounds stay hidden in the
  menu until one is playable.
- **The server stays light.** It imports only small shared collision data, never art. Record the
  baseline (CPU and KB/s with `tests/load.mjs`) before 0.1, and again at each minor; a step that
  makes it worse needs a reason. Results go in `docs/ROADMAP.md`.
- **One source of truth.** One `MapDef` in `shared/` used by the sim, the server and the client.
  Art is client-only.
- **Tests with the rules.** Collision, bounds, map sync and fog filtering each get unit tests.
- **Every protocol change bumps `PROTOCOL_VERSION`** (outdated clients are told, see HANDOFF).

## 0.1 Maps as data, a lobby, and synced maps

- **0.1.0 `MapDef`.** `shared/` gets a `MapDef` (id, kind `arena | battleground`, size, wizard
  bounds, spawn points, obstacles). Replace every hard-coded 800 / 600 / 770 / 570 / bounds with the
  values from the match's map (carried on `SimState`). Spawns come from the map. No behaviour change;
  existing tests stay green. The client's art and mouse mapping are
  still 800x600; they move to the camera work (0.2).
- **0.1.1 Lobby screen.** "Create Private Room" opens a lobby instead of waiting on the menu.
  - Shows the room code with a **copy button**.
  - Creator sees the options: the **map picker** (the current arenas for now) and any other
    online options we have; the joiner sees the same options read-only, plus who has joined.
  - The match starts when the creator presses **Start** once the joiner is in (today it starts the
    moment the joiner arrives). Joiner can leave; creator leaving closes the room as now.
  - New messages, roughly: `lobby_options` (creator -> server -> joiner) and `start` triggered by
    the creator. Server validates the map id against the known list.
  - Rematch returns to the lobby (or keeps the options with a one-click rematch; decide then).
  - Menu wording: the map picker label becomes **Arena**, and the "Online uses the original arena"
    note goes away.
- **0.1.2 Synced map.** The chosen `mapId` is part of `start` / `rematch_start` and of the
  reconnect (`resumed`) path. The server's `MatchRunner` builds the sim from it, so both players and
  the server use the same obstacles. Fixes the Dark Wizards' Circle (and every other arena) being
  solo-only. Tests: both players get the same map; reconnect keeps it; a bad id is rejected.
- **0.1.3 Menu split.** Menu and lobby list **Arenas** (the current 10) and **Battlegrounds**
  (hidden until 0.3.2).

## 0.2 Camera (client only)

- **0.2.0 Camera and transform.** One world-to-screen transform, with the camera on your wizard and
  clamped to the map edges. It follows your predicted position, not the snapshot, so it does not
  jitter. The HUD stays in screen space. Arenas lock the camera, so nothing changes for them.
- **0.2.1 Aim in world space.** Mouse aim and spell targets use world coordinates through the
  camera. Add a development battleground (about 2400x1800) to test with.
- **0.2.2 Draw only what is visible.** Backgrounds pre-rendered in chunks; entities and scenery
  outside the viewport are skipped.
- The viewport is a **fixed logical size** scaled to the window (letterboxed), never wider on a
  bigger window, so nobody sees more of the map than anyone else.

## 0.3 Battleground simulation

- **0.3.0 Spawns.** Per-map spawn points, far apart on battlegrounds.
- **0.3.1 Obstacle lookup.** A spatial grid so walking and ray checks only test nearby obstacles
  (cost no longer grows with map size). Add rectangle obstacles alongside circles.
- **0.3.2 First battleground.** One real map, authored as shared data with client art. Battlegrounds
  appear in the menu and lobby (online only at first; the AI and dummies walk straight lines and
  can't path around obstacles yet).

## 0.4 Vision and fog of war

- **0.4.0 Vision radius.** One radius per map; arenas have none (see everything).
- **0.4.1 Server-side culling.** `serializeSnapshot` omits the enemy, shots, bombs, zones, traps and
  fx events outside the viewer's vision radius plus a margin. This stops map-hacking and cuts
  bandwidth. Tests: an enemy outside the radius is absent from the snapshot.
- **0.4.2 Client fog.** One radial darkening pass outside the radius. Entities fade in and out, and
  the opponent's interpolation buffer resets when they reappear so they don't slide in from a stale
  position. A hit from something unseen gets a directional hint.
- **0.4.3 (optional) Line of sight.** Obstacles and bushes hide what is behind them.

## 0.5 Server decoupling

- **0.5.0 Split map data.** Collision and metadata in `shared/`, art in `client/`. Check the server
  build pulls in no art.
- **0.5.1 Static files off the game process.** Let Caddy serve `dist/client` directly so Node only
  handles the WebSocket, `/stats` and `/version`. Keep the Node fallback for local `npm start`.
- **0.5.2 Measure.** Compare with the baseline. If bandwidth is still high, consider a binary or
  delta snapshot format.

## 0.6 Polish, then 1.0.0-0

- Minimap or edge indicators, a shrinking zone or objective so players can't hide forever, spawn
  fairness, training mode on battlegrounds.
- Fixes found along the way go in as their own features.
- `1.0.0-0`: battlegrounds playable online with fog, arenas unchanged, lobby in place.

## Not in this plan

More than two players, teams, AI pathfinding, a map editor, sound.
