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
3. **"Can't sword while holding" only checks seat 0** (`shared/sim/combat.ts:401`:
   `w.seat === 0 && game.input[0].holding`). Online, seats 1 and up can sword while holding the button.
4. **Only seat 0's `holding` is cleared at round end** (`shared/sim/wizard.ts:199`).
5. **Dead default** in `cast()` (`shared/sim/combat.ts:1015`): `k = w.seat === 0 ? game.input[0].attack : w.spell`;
   every caller passes `k`.
6. **The training dummy respawns at `map.spawns.e`**, not `game.starts[1]` (`shared/sim/update.ts:396-398`).
   Harmless today.
7. **Joining a running match is allowed** (`server/rooms.ts`, `join` has no phase check). In a team match
   started with an open seat, a newcomer gets that seat and every player is sent `lobby`, which tears down
   their match view; the newcomer never gets `start`. Pinned in `tests/server/rooms.test.ts`. **To be fixed in
   the disconnect step (8).**
8. **A dropped player can't come back, and blocks the room** (`server/rooms.ts`). The resume token lives only
   in memory, so a refresh loses it. The dropped seat keeps its dead socket, so joining with the code says
   "full". After 10 s the whole room closes. `rematch_ready` waits for the dead socket too. **To be fixed in
   step 8.**
9. **Client and server reconnect windows are separate constants** that happen to match
   (`RECONNECT_FOR_MS = 10_000` in `client/src/net/client.ts`, `reconnectGraceMs` in `server/rooms.ts`).
10. **`peer_back` / `resumed` messages say "the duel continues"** even in team matches (`net/client.ts`).

## Code and naming

11. **`net.visualP` / `net.visualE` are backwards**: `visualP` is "the first other wizard", `visualE` is "our own
    drawn position" (`client/src/state.ts:52-53`). Renamed in step 9.
12. **`SimState.winner: boolean` means "team 0 won"**, which the name doesn't say.
13. **Seat-0 assumptions written without the aliases**: `input.ts:35` (hints go to seat 0 only; intended, see
    `server/match.ts:263`).
14. **Circular import** `shared/sim/wizard.ts` ↔ `shared/sim/combat.ts` (`burst` / `immortal`). Removed in step 6.
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
20. **`tests/smoke.mjs` is stale**: it clicks `[data-mode="duel"]`, which the illustrated menu hides
    (`display:none !important` since 0.27/0.30), so it times out. The menu's own buttons should be used.
    It also needs the server URL as an argument, which `README.md` doesn't say.
