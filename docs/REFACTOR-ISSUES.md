# Issues found during the 0.32 clean-up

Bugs and oddities noticed while restructuring the code (0.32.x). The refactor steps don't change behaviour,
so these are listed here, not fixed, unless a step says otherwise. Each one becomes its own change only when
Jesse says so. Newest at the bottom; mark an entry **fixed in <version>** when it is dealt with.

## Gameplay and online

1. **"You" is always seat 0 in the start text** (`client/src/flow.ts:227-248`). Online, the "🟢 you · 🔴 rival"
   line and "Your wizard: … Rival: …" use `game.p` / `game.e` (seats 0 and 1). The player in seat 1 is told the
   host is their wizard; in a team match only seats 0 and 1 are named.
2. **HUD briefly shows seat 0 online** (`client/src/ui/hud.ts:398-408`). `hud()` reads `game.p`; online it is
   reached from `selectActionBarSpell` (`input.ts:120`), so seat 0's health and cooldowns flash until the next
   snapshot.
3. **"Can't sword while holding" only checks seat 0** (`shared/sim/combat/abilities.ts:51`, was `combat.ts:401`:
   `w.seat === 0 && game.input[0].holding`). Online, seats 1 and up can sword while holding the button.
4. **Only seat 0's `holding` is cleared at round end** (`shared/sim/wizard.ts:199`).
5. **Dead default** in `cast()` (`shared/sim/combat/cast.ts:16`): `k = w.seat === 0 ? game.input[0].attack : w.spell`;
   every caller passes `k`.
6. **The training dummy respawns at `map.spawns.e`**, not `game.starts[1]` (`shared/sim/update.ts:396-398`).
   Harmless today.
7. **Joining a running match is allowed** (`server/rooms/lobby.ts` `handleJoin`, no phase check). In a team match
   started with an open seat, a newcomer gets that seat and every player is sent `lobby`, which tears down
   their match view; the newcomer never gets `start`. Pinned in `tests/server/rooms.test.ts`. **To be fixed in
   the disconnect step (8).**
8. **A dropped player can't come back, and blocks the room** (`server/rooms/reconnect.ts`). The resume token lives only
   in memory, so a refresh loses it. The dropped seat keeps its dead socket, so joining with the code says
   "full". After 10 s the whole room closes. `rematch_ready` waits for the dead socket too. **To be fixed in
   step 8.**
9. **Client and server reconnect windows are separate constants** that happen to match
   (`RECONNECT_FOR_MS = 10_000` in `client/src/net/client.ts`, `config.reconnectGraceMs` in `server/rooms/state.ts`).
10. **`peer_back` / `resumed` messages say "the duel continues"** even in team matches (`net/client.ts`).

## Code and naming

11. **`net.visualP` / `net.visualE` are backwards**: `visualP` is "the first other wizard", `visualE` is "our own
    drawn position" (`client/src/state.ts:52-53`). Renamed in step 9.
12. **`SimState.winner: boolean` means "team 0 won"**, which the name doesn't say.
13. **Seat-0 assumptions written without the aliases**: `input.ts:35` (hints go to seat 0 only; intended, see
    `server/match.ts:263`).
14. **Circular import** `shared/sim/wizard.ts` ↔ `shared/sim/combat.ts` (`burst` / `immortal`). **Fixed in 0.32.9-0** (`burst` moved to `effects.ts`).
15. **Stale "800x600" and "1v1" comments** (`shared/types.ts:1`, `shared/simState.ts:28`, `shared/maps.ts:16`,
    `protocol.ts`, `match.ts`, `snapshot.ts`, `net/client.ts`); `VIEW_W`/`VIEW_H` repeat `ARENA_WIDTH`/`HEIGHT`;
    `ARCHITECTURE.md` points to a non-existent `presentation/onGameEvent.ts`. Fixed in step 11.

## UI and CSS

16. **A hovered disabled `.ui-btn` turns slate `#4c6e86`**: left over from the old global `button:hover` rule.
    Visible on the lobby's Start button while you are alone, and on the disabled refresh icon. Kept in 0.32.3-0
    as `.ui-btn:disabled:hover` + `--ui-disabled-hover` so nothing changed; delete both to fix.
17. **Dead CSS and markup**: selectors for removed elements (`.legend*` head/title/toggle, `.boxes`, `.small`,
    results-button fallback classes, …) and a spell-description script that only wrote into hidden selects
    (deleted in 0.32.1-0).
18. **Prettier was bypassed on `test`**: Mark's `client/index.html` and `render/workshopWizard.ts` arrived
    unformatted (formatted in 0.31.5-0). His git hooks may be off (`npm run prepare` turns them on).
19. **The spellbook's legacy "Training Dummy" / "Legacy bar" checkbox is visible** in a still-dummy practice
    match (seen in the screenshots). Probably intended; check.
20. **Fixed in 0.32.4-0.** **`tests/smoke.mjs` was stale**: it clicks `[data-mode="duel"]`, which the illustrated menu hides
    (`display:none !important` since 0.27/0.30), so it times out. The menu's own buttons should be used.
    It also needs the server URL as an argument, which `README.md` doesn't say.
21. **`tests/client` is not type-checked**: the root `tsconfig.json` includes `tests/sim` but not `tests/client`,
    so type errors in client tests only show when vitest runs them.
22. **`client/src/render/world/iceWizard.ts` is dead code**: nothing imports `drawIceWizard`. Delete it, or wire
    it up if the Ice Wizard sprite is still wanted (Mark's).
23. **Per-frame allocations in the wizard and bomb drawing** (HANDOFF "Rendering clean-up"): still there after
    the split, now in `render/world/wizard/statusEffects.ts`. The HANDOFF note about a bare `{ ... }` block in
    `actor.ts` was already out of date and is removed.
24. **Dead branches in the bomb drawing**: `render/world/bombs/fallback.ts:9-10` has `EARTH` and `ICE` palette
    entries that are never reached (those elements have their own files); the `FIRE` / `MAGNETIC` checks in
    `bombs/index.ts` sit behind a "not FIRE and not MAGNETIC" test, so the last one is really an `else`; the
    Magnetic blast radius (`165 : 85`) is written twice in `bombs/index.ts`.
25. **Small leftovers in the projectile drawers**: `render/world/projectiles/magnetic.ts` sets `shadowBlur = 0` and
    `lineCap = 'round'` twice in a row; `net/prediction.ts` can draw a predicted EARTH or LIGHTNING shot that
    `guestFXAt` never creates (dead branch).
26. **Canvas state leaks between drawers**: `bar` (`render/shapes.ts`) sets `textAlign` and `font` without
    resetting them; `renderParticle` and `drawWave` set `globalAlpha` without save/restore, so every caller has to
    reset it. Works today; fragile when adding drawing code.
27. **Small leftovers in the combat code**: two stacked doc comments before `variantSpray`
    (`shared/sim/combat/variantCasts.ts:11-12`, one belongs to a removed function); `blocked` checks
    `w.shield && shieldStops(...)` though `shieldStops` already checks it (`combat/damage.ts`); unused imports
    `SPELL_ICONS` (`client/src/ui/hud.ts:25`) and `canChargeSpell` (`shared/sim/update.ts:14`).
28. **Tuning numbers still inline in the tick**: `explode()` radius 100 and 2.5x damage
    (`shared/sim/update/bombs.ts`), the zone tick's 24 / 4 / 13 / 18 and the Storm bomb zone `r: 75`, `life: 175`
    (`update/zones.ts`). AGENTS rule 9 says these belong in `shared/constants.ts`.
29. **The moving and mortal dummy only look at `game.e`** (`shared/sim/update/ai.ts`): fine for solo, where the
    dummy is always seat 1.
30. **Stale compiled files on the slots** (fixed in 0.32.12-0): the build never cleaned `dist/`, so after a file
    became a folder (`update.ts` → `update/`, `rooms.ts` → `rooms/`) Node kept loading the old compiled file.
31. **`resume` first calls `leaveRoom` for the resuming socket** (`server/rooms/reconnect.ts`): if that socket
    is somehow in another room, that room is closed or its seat freed. Look at it in the disconnect step.
