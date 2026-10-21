# Music library and in-game settings: plan

Decided with Jesse on 2026-10-21. **B is built (0.29.0-0)**, A is not. Build B first (smaller, more urgent), then A.

## Where things stand

- Two tracks, both Web Audio buffers looped: `client/src/audio/menuMusic.ts` (waltz, menu and lobby) and
  `battleMusic.ts` (Shadow Runes, matches). They share `musicVolume` and `musicMuted` in `settings.ts`.
- Escape pauses only solo and practice (`flow.ts` `pause()`); online it shows "Pausing is disabled during online matches".
- There are no combat sound effects. The only effects sounds are the menu hover chime and click in `illustratedMenu.ts`.

## B. Settings during a game (built in 0.29.0-0)

1. **One settings panel, two homes.** The `#settings` screen becomes a reusable panel opened from the main menu
   and from a match. Opening it never pauses anything by itself.
2. **Solo and practice:** Esc still pauses. The pause screen gets a Settings button (above Resume and Main Menu).
3. **Online: Esc opens the panel over the live match.** The match keeps running. While it is open, wizard input
   is ignored (no casting by accident); closing it (Esc or Back) returns focus to the canvas. Held movement keys
   are cleared on open so the wizard does not run on its own. P also opens it online, because a browser keeps Esc to leave fullscreen.
   Built: `openGameSettings` in `flow.ts`, `showSettings` in `ui/settingsPanel.ts`, `game.settingsOpen` in `state.ts`.
4. **Contents:** music volume and mute, effects volume, fullscreen, classic action bar. The tick box above the action bar
   is still there (kept in step); it can go once nobody misses it.
5. **Effects volume:** new `sfxVolume` (0 to 100, default 70). It scales the UI sounds now (hover chime, click) through one
   shared gain node (`effectsBus` in `ui/illustratedMenu.ts`; move it to `audio/sfx.ts` when combat sounds arrive); combat sounds plug into it when they exist.
6. **Tests:** settings parsing (new keys, bad values fall back). Checklist items for Esc in solo, practice, online and the
   input guard.

## A. Music library and choosing songs

Decisions: random song each fight with a picker; the menu has its own shuffled list; songs are auto-detected from folders.

1. **Folders are the list.** Songs live in `client/src/audio/music/menu/*.ogg` and `client/src/audio/music/battle/*.ogg`
   and are found at build time with `import.meta.glob('./music/battle/*.ogg', { query: '?url', import: 'default', eager: true })`.
   No script and no list to edit: drop a file in and it appears. The title is the filename (`shadow_runes.ogg` is
   "Shadow Runes"); the id is the filename without the extension. Order is alphabetical. The two existing tracks move
   there from `client/public/audio/`.
2. **One player for both.** `audio/music.ts` replaces the two files' playback code: it takes a playlist, plays one track
   at a time through a Web Audio buffer and exposes `startBattle()`, `pause()`, `stop()` and menu start/stop with the same
   visibility rules `menuMusic.ts` has now.
3. **Shuffle.** A pure `nextTrack(ids, history, rng)` in `audio/shuffle.ts`: a bag shuffle that plays every track once
   before any repeats and never plays the same one twice in a row, even across a refill. A new battle song is picked at
   the start of each fight. A single-song folder just repeats.
4. **Settings.** `musicMode`: `shuffle` (default) | `off`. `menuTrack` and `battleTrack`: a song id or `random`
   (default `random`); an id whose file is gone falls back to `random`.
5. **Picker** in Settings, a "Music" section: two `ui-field` selects (menu song, battle song) with "Random (shuffle)"
   first, and a ▶ preview `ui-btn--icon` next to each. Preview stops when the panel closes or a match starts.
6. **Loading.** Tracks are about 1 MB each, so fetch and decode only the track about to play and prefetch the next one
   while it plays. Never decode the whole folder at startup.
7. **Tests:** shuffle (no immediate repeat, every track before a repeat, one track, empty list), track-name parsing from
   file names, settings parsing.

## Order

1. B1 to B5: settings panel reused, Esc behaviour, `sfxVolume`.
2. A1 to A3: folders, one player, shuffle for battles, no picker yet.
3. A4 to A5: settings keys and the picker.
