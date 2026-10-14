# Changelog

One entry per feature, newest first: version, date and time (AWST), and a short summary.

## Versioning

Versions are `major.minor.feature-commit`, e.g. `0.0.1-4` (the dash keeps it valid semver for npm).

- **major** and **minor**: bumped by hand for big milestones; the commit number resets to 0.
- **feature**: one small feature or fix, however many commits it takes. Starting the next feature
  adds 1 and resets the commit number (`0.0.0-13` -> `0.0.1-0`).
- **commit**: counts the commits within that feature, starting at 0.

Everything before 0.0.0 (the 27.x versions below) is **alpha**.

Every feature also adds its manual test items to `docs/TEST-CHECKLIST.md` (tagged with the version),
and bumps the "Tested version" line there.

Keep the version in step in four places: `package.json` and `package-lock.json`, `server/index.ts`
(`VERSION`), and the two labels in `client/index.html`, each with a short name for the work (e.g.
"Magma grace 25").

## 0.2.0-0 - 2026-10-14 AWST - Camera and transform

Fifth step of the road to 1.0.0, client only. World drawing now goes through one camera
(`client/src/render/camera.ts`): a fixed 800x600 viewport centred on your own wizard (the predicted
position online), clamped to the map edges. Every arena is exactly the viewport size, so the camera
stays at 0,0 and nothing changes yet. The mouse is kept in screen pixels and turned into a world
position through the camera every frame, so aim stays right when the camera moves. Big maps and the
development battleground come in 0.2.1. `docs/TEST-CHECKLIST.md` is now a living checklist for the
whole road to 1.0.0, with a camera section.

## 0.1.3-0 - 2026-10-14 AWST - Menu split

Fourth step of the road to 1.0.0. The map pickers in the menu and the lobby are grouped by kind,
**Arenas** and **Battlegrounds**, and built from one list. There are no battlegrounds yet, so that
group stays hidden until the first one lands (0.3.2). The picker is now labelled **Map**.

## 0.1.2-0 - 2026-10-14 AWST - Synced map

Third step of the road to 1.0.0. The arena chosen in the lobby is now the one played.

- `start` and `rematch_start` carry the `mapId`; the server builds the match on it and the client
  starts on the same arena (obstacles, spawns, prediction). Every arena, including the Dark Wizards'
  Circle, now works online, and a rematch keeps it. Reconnecting keeps the client's current arena.
- The "still uses the original arena" notes are gone; the menu picker is labelled **Arena**.
- Protocol 6.

## 0.1.1-1 - 2026-10-14 21:40 AWST - Lobby

Second step of the road to 1.0.0. Online rooms now have a lobby.

- **Create Private Room** opens a lobby with the room code and a **copy button** (it falls back to a
  plain copy command, because the game is served over HTTP where the Clipboard API is missing).
- The creator picks the **arena** in the lobby and presses **START** once the other player is in;
  before, the match started the moment the joiner arrived. The guest sees the choice, read-only.
  (The match still uses the original arena until synced maps, 0.1.2.)
- A rematch keeps the options. The end screen has a new **BACK TO LOBBY** button that returns both
  players to the lobby to change them.
- If the guest leaves the lobby the room stays open for the creator; the creator leaving closes it.
- Protocol 5: `set_options`, `start_match`, `back_to_lobby` and a `lobby` message; the server room
  has a lobby/match phase. The test and load scripts press START.
- 0.1.1-1: `tests/load.mjs` and `tests/stop-trace.mjs` use the real `PROTOCOL_VERSION` (they had a
  stale hard-coded one and could not join); `docs/HANDOFF.md`, the README and the architecture doc
  describe the lobby and the 1.0.0 plan.

## 0.1.0-0 - 2026-10-14 20:25 AWST - Map definitions

First step of the road to 1.0.0 (`docs/MAPS-PLAN.md`). No change to how the game plays.

- New `MapDef` (`shared/maps.ts`, was `shared/arenas.ts`): world size, wizard bounds, spawn points
  and obstacles, one per map id. The match holds it as `game.map` (replacing `game.obstacles`).
- The simulation reads bounds, spawns and the spell-target margin from the map instead of
  hard-coded 800 / 600 / 770 / 570 numbers (`walk`, knockback, Magma, bombs, reflected Magma).
- Client movement prediction walks the match's map too.
- The server no longer clamps aim to 800x600 in `validate.ts` (it only rejects nonsense, up to
  `MAX_MAP_COORD`); `inputEventFromWire` clamps to the match's map.
- Still hard-coded 800x600, to be done with the camera (0.2): the client's art and mouse mapping.

## 0.0.0-6 - 2026-10-14 21:00 AWST - Magma grace 25

First version of the new scheme. The Magma self-hit feature so far (6 commits): a caster who runs
the way they fired is no longer hit by their own bolts at once. Magma gives its caster a 25-tick
grace (`MAGMA_OWNER_GRACE_TICKS`) because it is slower than walking, and a Magma that explodes for
any reason (enemy, wall, its target) also hits a caster within its blast.

## Alpha

Versions before the reset, kept for history.

### 27.4.4 - 2026-10-14 20:40 AWST

- The caster's grace against their own Magma is 25 ticks again (10 was too short to run along with
  it). Exploding early still hits the caster, as in 27.4.3.

### 27.4.3 - 2026-10-14 20:25 AWST

- A Magma shot that explodes for any reason (hits an enemy, a wall, or reaches its target) now also
  hits its caster if they are within its blast, ending their grace early. A point-blank Magma on an
  enemy next to you hurts you both.

### 27.4.2 - 2026-10-14 20:05 AWST

- Fixed Magma never hurting a caster who runs after it. Magma (4 px/tick) is slower than walking
  (3.5), so a running caster never got clear of it and was immune for its whole flight. Its caster
  is now safe for the first 10 ticks only; after that it can hit them like anyone else.

### 27.4.1 - 2026-10-14 19:46 AWST

- Fixed projectiles hitting the caster who runs the way they fired. A shot now only counts as clear
  of its owner once it is beyond the hit circle plus two walking steps; before, Steam, Plasma, Ice,
  Storm and Magnetic bolts hit a running caster within two ticks and Magma within about 0.6 s.
- The menu version label (`client/index.html`) was stuck at 27.1.5; it now shows the current
  version.

### 27.4.0 - 2026-10-14 16:10 AWST

- New **traps**: middle click sets a rune of the loaded element or combo at the cursor (up to 380 px
  away, not inside anything solid). It arms after 1 s, lasts 20 s, and springs on the first wizard to
  step on it, the owner included. One trap at a time, 10 s cooldown, visible to both players.
  Fire, Water, Lightning, Steam, Plasma, Ice and Magnetic apply their usual hit and status at
  bomb strength (Ice freezes outright); Magma leaves a crater and Storm a static field.
- The **Earth trap is a prison**: whoever springs it can't walk or be pushed for 4 s (they can
  still cast). An Earth shield blocks it.
- Traps and prison state are in snapshots; your own trap shows instantly online (client
  prediction). `PROTOCOL_VERSION` is now 4.

### 27.3.0 - 2026-10-14 16:01 AWST

- Merged Mark's `test` branch: nine selectable arenas (solo play) and a map picker.
- New **Dark Wizards' Circle** arena (Old School RuneScape's Varrock stone circle) with real OSRS
  stone, ritual table and tree sprites. Its centre table and eight monuments are solid.
- Collision is now per arena (`shared/arenas.ts`, `SimState.obstacles`); every other map keeps the
  four pillars, and online play always uses them.
- Removed a stale duplicate map select from the menu; formatted the merged files with Prettier.

### 27.2.1 - 2026-10-14 13:32 AWST

- Online: casting the bubble now shows a dome at your feet instantly (client prediction, like
  shields), until the server's own bubble arrives in a snapshot. Damage stays server-side.

### 27.2.0 - 2026-10-14 13:29 AWST

- New **Reflective Bubble**: press Space twice quickly. A static 4 s dome (15 s cooldown) that
  bounces projectiles crossing its edge either way, stops Fire/Water/Lightning sprays (damage and
  animation), and makes bombs detonate on its edge with the blast kept outside.
- **Friendly fire**: projectiles (once clear of the caster), magma craters, storm zones and bomb
  blasts now hurt their owner too. A reflected projectile can hurt whoever fired it.
- Bubbles are in snapshots and the HUD; `PROTOCOL_VERSION` is now 3.
