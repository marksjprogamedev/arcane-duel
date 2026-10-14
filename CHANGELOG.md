# Changelog

One entry per change set, newest first: version, date and time (AWST), and a short summary. The
version lives in `package.json`, `server/index.ts` (`VERSION`) and the two labels in
`client/index.html`, with a short name for the patch (e.g. "Self-hit fix"); bump them together. Patch for fixes and tidy-ups, minor for new
gameplay, major for breaking changes.

## 27.4.1 - 2026-10-14 19:46 AWST

- Fixed projectiles hitting the caster who runs the way they fired. A shot now only counts as clear
  of its owner once it is beyond the hit circle plus two walking steps; before, Steam, Plasma, Ice,
  Storm and Magnetic bolts hit a running caster within two ticks and Magma within about 0.6 s.
- The menu version label (`client/index.html`) was stuck at 27.1.5; it now shows the current
  version.

## 27.4.0 - 2026-10-14 16:10 AWST

- New **traps**: middle click sets a rune of the loaded element or combo at the cursor (up to 380 px
  away, not inside anything solid). It arms after 1 s, lasts 20 s, and springs on the first wizard to
  step on it, the owner included. One trap at a time, 10 s cooldown, visible to both players.
  Fire, Water, Lightning, Steam, Plasma, Ice and Magnetic apply their usual hit and status at
  bomb strength (Ice freezes outright); Magma leaves a crater and Storm a static field.
- The **Earth trap is a prison**: whoever springs it can't walk or be pushed for 4 s (they can
  still cast). An Earth shield blocks it.
- Traps and prison state are in snapshots; your own trap shows instantly online (client
  prediction). `PROTOCOL_VERSION` is now 4.

## 27.3.0 - 2026-10-14 16:01 AWST

- Merged Mark's `test` branch: nine selectable arenas (solo play) and a map picker.
- New **Dark Wizards' Circle** arena (Old School RuneScape's Varrock stone circle) with real OSRS
  stone, ritual table and tree sprites. Its centre table and eight monuments are solid.
- Collision is now per arena (`shared/arenas.ts`, `SimState.obstacles`); every other map keeps the
  four pillars, and online play always uses them.
- Removed a stale duplicate map select from the menu; formatted the merged files with Prettier.

## 27.2.1 - 2026-10-14 13:32 AWST

- Online: casting the bubble now shows a dome at your feet instantly (client prediction, like
  shields), until the server's own bubble arrives in a snapshot. Damage stays server-side.

## 27.2.0 - 2026-10-14 13:29 AWST

- New **Reflective Bubble**: press Space twice quickly. A static 4 s dome (15 s cooldown) that
  bounces projectiles crossing its edge either way, stops Fire/Water/Lightning sprays (damage and
  animation), and makes bombs detonate on its edge with the blast kept outside.
- **Friendly fire**: projectiles (once clear of the caster), magma craters, storm zones and bomb
  blasts now hurt their owner too. A reflected projectile can hurt whoever fired it.
- Bubbles are in snapshots and the HUD; `PROTOCOL_VERSION` is now 3.
