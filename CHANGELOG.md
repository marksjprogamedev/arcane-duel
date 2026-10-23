# Changelog

## 0.35.7-0 - 2026-10-23 AWST - Accounts and HTTPS plan (docs only), Mark's `test` merged

- **`docs/ACCOUNTS-PLAN.md`**: draft plan for HTTPS on a DuckDNS name (slots by person) and username + password accounts (SQLite on the VM, argon2id, no email), saved Workshop look and loadouts, friends with presence and invites. Rollout in six versions (0.36.0 to 0.41.1), each with its checklist items. Not built yet.
- **Merged `origin/test`** (Mark's entries below): approved hats, horizontal mirroring, hat tilt fix, four recolourable robes with robe dye.

## 0.35.6-0 - 2026-10-23 AWST - Workshop label fits its plate

- The Workshop button's text is smaller (it scales with the plate width, so it always fits) and sits centred with even space either side.

## 0.35.5-0 - 2026-10-23 AWST - Host leaves the lobby: the next in the queue becomes host

- When the host leaves (or drops from) the lobby, the player who joined next becomes host, instead of the room closing for everyone. The queue is join order ("Player N") across players and spectators. The room closes only when the last person leaves. The same order picks the new host when a host who left a match is replaced at Back to lobby.

## 0.35.4-0 - 2026-10-23 AWST - Fix: a watching host who leaves no longer leaves the room without a host

- A host who was spectating, then left the match and came back, was recorded as a stranger ("Player 5") and the old host role pointed at their old connection, so nobody could change the settings. Now the room always checks its host is still in it: a returning host (same tab) keeps their number and, if they rejoin the running match, their role; if they stay away until the lobby, the lowest connected player (else the first spectator) becomes host. A returning tab also keeps its "Player N" name in the lobby.

## 0.35.3-0 - 2026-10-23 AWST - Fix: lobby broken over plain http

- **0.35.2-0 broke going online on the test slots.** The new tab id used `crypto.randomUUID()`, which only exists on https and localhost; the slots are plain http, so connecting threw before the server was greeted: empty room code, no teams, ↻ and Duel fell back to the main menu. The id now comes from `crypto.getRandomValues`, which works everywhere, with unit tests for the no-`randomUUID` and blocked-storage cases.

## 0.35.2-0 - 2026-10-23 AWST - Rejoin a running match by its code (protocol 21)

- **Joining with the code of a running match** now either gives you your seat back or lets you watch. If you left it on purpose or dropped, and it is the same tab (even after a refresh), you take your seat back with a new resume token. Anyone else joins as a spectator. Before, it said "Match in progress."
- How the server knows: each tab sends a random `clientId` in `hello` (kept in sessionStorage; a new tab is a new player), and the room records who sat in each seat when the match started.
- A resume token still stops working when you leave on purpose; the code is the way back.

## 0.35.1-0 - 2026-10-23 AWST - Workshop button size fix

- The Workshop plate button was far too wide on big screens: its side padding was a percentage, which CSS takes from the parent (the whole menu), not the button. Padding is now a fraction of the button's own `--plate-w` (220px), so it is the same size at any window size.

## 0.35.0-0 - 2026-10-23 AWST - Pick your team, spectate, host can play anywhere (protocol 20)

- **One button per team.** Under each team: Join / Switch to Team N, or a disabled "Team full" / "Your team". Any player, host included, can move themselves; nothing silently fails. Replaces the host-only ⇄ swap button (`move_seat` is gone, `set_team` replaces it).
- **Spectators.** A Spectators panel under the teams lists who is watching, with a Spectate button. A joiner to a full room becomes a spectator. In a match, spectators watch read-only through the lowest connected player's view (their inputs are ignored); the result screen says which team they followed and has Back to lobby but no Rematch.
- **The host is a role, not seat 0.** `Room.host` picks the options and starts the match from any seat or from the spectators, marked with a ★. If the host leaves a match, the lowest connected player becomes host at `back_to_lobby`. Players are labelled "Player N" for the whole room.
- Lobby message carries `names`, `hostSeat`, `spectators`, `youHost` and the player's current `youToken`; `PROTOCOL_VERSION` is 20.

## 0.34.8-0 - 2026-10-23 AWST - Workshop plate button, join row always shown, no ring on Back

- **Workshop button** is now built on a blank copy of the main-menu plate art (`art/menu/plate-blank.png`, the stone end caps with the plate stretched between), with the label as live text. New `.ui-btn--plate` replaces the CSS-only `.ui-btn--stone`.
- **Lobby:** "Join a different lobby" is always visible beside the room code again (no longer collapsed).
- **Settings opened with Esc in a match:** Back no longer shows the keyboard focus ring on open.

## 0.34.7-0 - 2026-10-23 AWST - Lobby in three zones

- **Lobby layout:** the room code, copy and new-code buttons and the status line sit in a strip across the top; "Join a different lobby" is collapsed beside it. Below, the two teams (blue and red ribbon headers) sit left, and a compact **Lobby settings** card (label left, control right; read-only for guests as before) sits right. Footer: red Leave, Spellbook, green Start.
- New shared components, in the style guide: `.ui-ribbon` (`--b` for the red team), `.ui-form-row` and `.ui-disclosure`, with `--ui-team-*` tokens.
- `tests/smoke.mjs` opens the "Join a different lobby" row before filling in the code.

## 0.34.6-0 - 2026-10-23 AWST - Practice screen as hanging banners

- **Practice** is three tall hanging banners on the backdrop instead of a parchment panel: Duel AI (red), Stationary Dummy and Moving Dummy (beige), each with a pennant bottom, a rod across the top and a green PLAY pill. The logo steps aside while it is open. New shared `.ui-card--banner` component (art slot `--ui-card-art` in `__icon`), shown in the style guide.
- Styled dropdowns now fill the width the native select had (settings song pickers, Workshop editor).

## 0.34.5-0 - 2026-10-23 AWST - Spellbook page-turn corners

- The spellbook's ◀ ▶ arrows are now folded page corners (parchment with a gold fold line and a brown arrow) in the bottom corners of the pages, not blue buttons. New shared `.ui-pageturn` component (`--prev` / `--next`) with `--ui-curl-*` tokens, shown in the style guide.

## 0.34.4-0 - 2026-10-23 AWST - Calmer dropdown, Workshop button matches the menu

- **Dropdown:** the closed `.ui-select` is now a flat, muted tan (`--ui-select-bg`) with no gradient or shine.
- **Workshop button** (main menu, bottom right): gold plate with dark stone end caps and an outline, like the art buttons above it. New `.ui-btn--stone` modifier, shown in the style guide. It is CSS-only until art for it exists.

## 0.34.3-0 - 2026-10-23 AWST - UI colour roles and the styled dropdown

- **Colour roles.** Blue buttons are gone. Beige (`is-beige`) is the neutral colour for Copy, arrows and secondary actions; brown (`is-brown`) is for leaving a screen (Back, Close); green is a mossy forest green for go/confirm (Preview, the settings song play buttons, Start, Resume); gold and red are unchanged. The role table is in `docs/UI.md`.
- **Styled dropdown** (`.ui-select`, `client/src/ui/select.ts`). Every `select.ui-field` now shows a parchment button and a leather-bordered list with a gold highlight. The native `<select>` stays hidden underneath, so `value`, `disabled`, options and `change` work as before. Keyboard: arrows, Enter/Space, Esc.
- The style guide shows all four button types in all five colours and the new dropdown.

## Mark, on 0.34.2-0 - 2026-10-23 AWST - Hat tilt no longer accumulates position offsets

- Fixed tilt edits moving hats when a head–body alignment was active. The editor had copied the rendered head-follow offset into the hat's stored position, then applied it again on the next draw. Editable coordinates now stay separate from rendered attachment offsets.
- Fixed the same position jump when entering, saving or reopening Hat–Head Pair editing. Preview and match rendering continue to follow the head once, while tilt, mirror and size edits leave the saved X/Y position intact.

## Mark, on 0.34.2-0 - 2026-10-23 AWST - Three approved hats and Workshop mirroring

- Added Blue Pointed Hat, Plum Floppy Hat and Green Feathered Hat from the approved transparent PNGs. Their new IDs preserve all previous saved piece and pair identities; Hat None remains available.
- Added **Mirror horizontally** to the piece editor. The preview and in-match renderer mirror the selected sprite around its centre, with position, size and tilt preserved. Save layout and Save Pair both retain the setting, including in exported alignments. Older saves keep their original orientation.
- The three hats share a default brim height and can be individually positioned or paired with each grey head.

## Mark, on 0.34.2-0 - 2026-10-23 AWST - Curated Wizard Workshop pieces

- Workshop choices now contain Grey Head 1–8, Hat None, Sleeveless Blue Robe, Main hand None and Staff 1–12, Offhand None (the existing bare reaching hand), and all ten boots. Plain Quarterstaff and the other head, hat, body and offhand choices are retired.
- Randomise uses only these choices. Saved appearances using retired pieces fall back to the approved defaults in both the preview and matches. Original piece IDs are retained so existing layouts and pair alignments keep their meaning.

## 0.34.2-0 - 2026-10-22 AWST - Mark's `test` merged: Workshop hands and head-hat alignments

- **Merged `origin/test`** (Mark's entries below): the Left Reaching Hand offhand with skin tint and walking sway, the approved default wizard look, and per-combination head-hat / head-body alignments with the developer pair editor.

## 0.34.1-0 - 2026-10-22 AWST - Spellbook looks like an open book

- Two parchment pages with a spine down the middle and a leather cover, like the WoW spellbook. Each spread holds two elements (Fire and Water, Lightning and Earth, ...) with their spells listed down the page and a page number at the foot. The corner arrows turn the spread; the element bar turns to its page.
- Click a page (or one of its spells) to pick which element PREVIEW demos; its title is underlined.
- A restyle only: the same cards, picks and Preview screen as 0.34.0-0.

## 0.34.0-0 - 2026-10-22 AWST - Spellbook is a book again; Preview is its own screen

- The spellbook page is just the book: spell cards, the element bar and Back. The demo arena is gone from it.
- A small **PREVIEW** button (bottom right, opposite Back) opens the demo arena on its own screen with a **Back to spellbook** button. It shows the element you were on, with your picks, and a cooldown readout under the arena (replaces the fill on the bar icon). Closing the spellbook, or a match starting, closes the preview too.
- Spell cards: colours swapped. Unselected cards are now gold, the selected card is cream with the gold outline.

## 0.33.19-0 - 2026-10-22 AWST - Bare offhand uses left-hand sprite (`test`)

- Offhand **None** now displays the new grayscale, skin-tinted left reaching hand rather than the previous placeholder fist. This applies in the Workshop preview and the in-match wizard.
- Removed the overlapping old hand sprite in this selection; preserved the quarter-speed walking sway, skin tinting, layout adjustments, and the explicit Left Reaching Hand option.

## 0.33.19-0 - 2026-10-22 AWST - Simplified pixel-art offhand (`test`)

- Replaced the Wizard Workshop Left Reaching Hand artwork with the user's latest simplified, lower-resolution grayscale sprite, including a black outline and actual transparent PNG pixels. The new 72×45 asset preserves existing offhand customization and skin-tone tinting.
- Reduced the offhand's walking sway frequency to one quarter of its prior rate without changing foot or staff animations.

## 0.33.19-0 - 2026-10-22 AWST - Outlined left offhand and walking sway (`test`)

- Replaced the left reaching offhand asset with the approved darker-gray hand, retaining its black outline and transparent background.
- Skin-tone tinting preserves the dark outline while recoloring the shaded grayscale interior.
- Added a gentle horizontal offhand sway synchronized to the existing foot-shuffle phase, fading smoothly to rest. Staff and grip movement remains unchanged.

## 0.33.19-0 - 2026-10-22 AWST - Left reaching offhand in Wizard Workshop (`test`)

- Added the user's transparent, grayscale, five-digit reaching left-hand artwork as a selectable **Left Reaching Hand** offhand option, without replacing existing equipment.
- The hand inherits the chosen skin swatch (shared with grayscale heads and staff grip), preserves its original transparency and shading, and can be positioned, scaled and rotated in the existing Workshop editor. It also renders in the local character in battle.
- Kept this change on `test` only. The new PNG is a 72×45 optimized game sprite derived from the user's attached image.

## 0.33.19-0 - 2026-10-22 AWST - Mark's `test` merged: walking animation after a rematch

- **Merged `origin/test`** (Mark's entry below): your Workshop wizard's walking animation restarts properly after a rematch (it froze until the new match's clock caught up). Ported into `client/src/workshop/inMatch.ts`.

## 0.33.18-0 - 2026-10-22 AWST - One UI folder, one art folder

Refactor, no visible change (every screen pixel-identical, no missing files, smoke test passes). There were three "ui" folders; now there is one:

- **`client/src/ui/`** holds all UI code and its CSS: `menus/` (main menu, lobby, settings, spellbook and its demo, results styles, the Leave confirm, end-of-match texts), `hud/` (in-match HUD, action bar, cooldowns, the disconnect banner), and the shared look `theme.css`, `components.css` and `page.css`. The Workshop's CSS sits with its code in `client/src/workshop/workshop.css`.
- **`client/public/art/`** holds the images: `art/menu/` (menu art and the backdrop), `art/results/`, `art/workshop/` (Workshop sprites). `client/public/arena/` and `spells/` stay.
- `client/public/ui/`, `client/public/screens/` and a stray `client/ui/` (a duplicate atlas) are gone.
- The CSS is now bundled by Vite in the same order as before, so the hand-edited `?v=` numbers on stylesheets and images are gone (Vite names its files by content).
- The style guide is at `/styleguide.html` (was `/ui/styleguide.html`).
- Docs, `AGENTS.md` rule 11 and the README code map follow the new paths.

## 0.33.17-0 - 2026-10-22 AWST - Mark's `test` merged: wizards face their last cast

- **Merged `origin/test`** (Mark's entry below): a wizard's facing changes only when a spell is actually cast (not when aiming or when a cast fails on cooldown), and your Workshop wizard turns to face left after a cast to the left.
- Ported by hand: the sim change went into the split combat files (`cast.ts` sets the facing after a successful cast; `variantCasts.ts` and `beams.ts` no longer set it on their own), the mirroring into `client/src/workshop/inMatch.ts`.

## 0.33.16-0 - 2026-10-22 AWST - Leave match button in the in-match settings

- **Leave match** (red, next to Back to match) in the settings you open during a match (Esc online, Settings on the pause screen solo). Because leaving an online match can't be undone, the first click turns it into "Click again to leave" for 3 seconds; a second click leaves. Online your wizard stays in the match tagged DISCONNECTED for the others (as since 0.33.13-0); solo you go back to the menu. Hidden when settings is opened from the main menu.
- `.ui-btn[hidden]` now really hides a button (`.ui-btn`'s `display` used to override `hidden`). The two-click logic is `client/src/ui/confirmClick.ts` (tested).

## 0.33.15-0 - 2026-10-22 AWST - Team matches no longer talk about "the rival"

Visible text (`docs/REFACTOR-ISSUES.md` #36); 1v1 text is unchanged. In team matches:

- End of a match: "Your team won!" / "Your team was defeated." (was "You defeated the rival! Remaining health: …" / "The rival wizard defeated you.").
- Rematch: "Waiting for the other players to accept the rematch…".
- A room closing because someone left the lobby: "A player disconnected. …" (was "Opponent disconnected. …").
- The lobby, the start text and the drop/leave messages were already team-aware. Text builders in `client/src/ui/matchText.ts` (tested).

## 0.33.14-0 - 2026-10-22 AWST - A disabled button keeps its look on hover

Small visual fix (`docs/REFACTOR-ISSUES.md` #16): a disabled button, like the lobby's Start while you are alone or the disabled refresh icon, no longer turns slate blue when the mouse is over it; it keeps its greyed-out look. The rule and the `--ui-disabled-hover` token that kept the old behaviour are gone.

## 0.33.13-0 - 2026-10-22 AWST - Leaving a match on purpose no longer ends it for everyone

Behaviour change (from `docs/REFACTOR-ISSUES.md`, plan item 3). Before, a player who left mid-match (Main Menu) closed the room and sent everyone to the menu.

- The leaver's wizard stays where it stood with DISCONNECTED over its name, as a dropped player's does after the 10 s, but without the pause: the others play on at once and see "<name> left the match".
- The leaver can't rejoin (their rejoin key is replaced). The room closes only when nobody connected is left.
- If the room's creator left, Back to lobby makes the lowest remaining seat the new creator, so the room isn't stuck.
- In the lobby nothing changed (a guest leaving frees the seat, the creator leaving closes the room).
- New server message `peer_left_match`; protocol version 19 (open tabs are asked to refresh). New `tests/server/leave.test.ts` (11 tests).
- The plan for the rest of the open entries now also lists step 4: one UI folder (`client/src/ui/`) and one art folder (`client/public/art/`).

## 0.33.12-0 - 2026-10-22 AWST - Mark's `test` merged: sleeveless blue robe

- **Merged `origin/test`** (Mark's entry below): a Sleeveless Blue Robe in the Wizard Workshop, drawn on your wizard in local matches. Ported from the old inline script and `render/workshopWizard.ts` into `client/src/workshop/` (`SLEEVELESS_ROBE` in `parts.ts`, `preview.ts`, `inMatch.ts`).

## 0.33.11-0 - 2026-10-22 AWST - Seat fixes: the right "you" online, sword rule for every player

Bug fixes from `docs/REFACTOR-ISSUES.md` (#1 to #4); solo play is unchanged.

- **Start text online** names your own wizard: "🟢 You Frost Scholar · 🔴 Rival Grove Keeper" in a duel, "🟢 You … · 🔴 Enemy team" and "Team match, 2 vs 2" in a team match (empty seats not counted). Before, everyone was told seat 0 was their wizard. Built by `client/src/startText.ts` (tested).
- **HUD online** shows your own health and cooldowns straight away; before, seat 0's flashed up until the next snapshot when you picked a spell.
- **Sword while holding the attack button** is refused for every player, as it always was for seat 0; online, seats 1 and up could swing while holding.
- **End of a round** releases the held button for every player, not just seat 0.
- New tests: `tests/sim/seat-holding.test.ts`, `tests/client/startText.test.ts`.

## 0.33.10-0 - 2026-10-22 AWST - Drawers leave the canvas as they found it

No visible change (every screenshot identical; 96 frames of a busy solo match identical apart from the usual cooldown-sweep noise). `bar` (status bars) puts back the text alignment and font it changed, and `renderParticle` and `drawWave` put back the transparency, so new drawing code no longer depends on what the previous drawer left behind (issue #26). Two leaks are left on purpose because the picture depends on them today (particle glow carrying into the heal preview's wave; listed in `docs/REFACTOR-ISSUES.md`).

## 0.33.9-0 - 2026-10-22 AWST - Clean-up from the refactor issues list

No change in play or looks (586 scripted matches identical, every screen identical). Entries from `docs/REFACTOR-ISSUES.md`:

- **Dead code removed**: `render/world/iceWizard.ts` and its unused atlas (`client/public/ice-wizard/`), unreachable bomb palette entries and the own-cast preview branch for Earth (Earth casts are never previewed), duplicate canvas settings in the Magnetic projectile, a stale doc comment, unused imports and the unused `net.castPreviewCooldown`.
- **Tuning numbers to `shared/constants.ts`** (values unchanged): bomb blast radius and damage multiplier, the Storm bomb's pool, and the magma and storm pools' pulse, damage and static (`BOMB`, `POOL`).
- `cast()` needs its spell passed; the training dummy respawns at its own start (`game.starts[1]`, the same point).
- `tests/client` is now type-checked by `npm run typecheck`.

## 0.33.8-0 - 2026-10-22 AWST - Mark's `test` merged: staff-grip hand and walking animation

- **Merged `origin/test`** (Mark's entries below): a skin-tinted hand gripping the staff, placed on its own in the Workshop's layout editor ("Staff grip") and drawn over every other part, and a walking animation for your wizard in local matches (feet shuffle, the staff moves like a cane at a third of the foot pace).
- Built in the old places again (the inline Workshop script and `render/workshopWizard.ts`), so ported into `client/src/workshop/`: sizes and slot in `parts.ts`, the tint in `skinTone.ts` (shared with the grey heads), the layout key in `store.ts`, the preview in `preview.ts`, the match drawing and walk cycle in `inMatch.ts`. Checked against a build of his branch: the same saved layout and pixel-identical Workshop screens and walking frames (the first moving frame differs by start-up timing on his build too).

## 0.33.7-0 - 2026-10-22 AWST - README code map, docs brought up to date

Docs only; last step of the clean-up (0.32.0 to 0.33.7).

- `README.md` has a **code map** (every top-level folder and the main subfolders, one line each), a **diagram** of how the browser, the server and the shared simulation fit together (Mermaid, drawn by GitHub), and a **"Where do I change…?"** table (a spell's damage or look, a bomb, a hat, a menu screen, buttons and colours, a map, room rules, disconnects, what is sent to players, the Workshop).
- `docs/HANDOFF.md` says where things stand at 0.33.7 (the clean-up, the disconnect change, the three checking tools) and points to `docs/REFACTOR-ISSUES.md` for what was found but not fixed. `docs/ARCHITECTURE.md` (who owns what, naming), `docs/UI.md` and `docs/ROADMAP.md` follow the new layout.

## 0.33.6-0 - 2026-10-22 AWST - Stale comments, the view size and old defaults

Refactor, no change in play or looks (both traces and every screen unchanged).

- Comments that still described the 800x600, 1v1-only game now match today's code: matches are 1v1 to 4v4, arenas are `ARENA_WIDTH` x `ARENA_HEIGHT`, battlegrounds are bigger. `ARENA_STRETCH` says it is on purpose (the art is drawn 800 wide and stretched). No game logic assumes 800x600.
- `VIEW_W` / `VIEW_H` are taken from `ARENA_WIDTH` / `ARENA_HEIGHT` instead of repeating 1067 and 600.
- The line-of-sight, collision and movement helpers no longer fall back to the first arena's map or pillars when no map is passed; every caller passes `game.map`, so a forgotten argument is now a type error.
- `shared/types.ts` explains why a wizard is an `x`/`y` point like every other entity (one set of helpers for all of them, and flat `x`/`y` in snapshots).

## 0.33.5-0 - 2026-10-22 AWST - Clearer names in the client code

Refactor, no visible change (the renderer's canvas calls, every screen and the smoke test unchanged). Nothing on the wire changed.

- The canvas context exported from `client/src/dom.ts` is `ctx` (was `g`), the usual name for it.
- Your own online cast previews: `guestFXAt` → `showCastPreview`, `drawGuestFX` → `drawCastPreviews`, `guestSelect` → `previewSelect`, and the `net.guest*` fields named for what they hold (`net.castPreviews`, `net.selectedSpell`, `net.spellCooldowns`, `net.endAnnounced`, ...). Previews have a type (`CastPreview` in `net/prediction.ts`).
- Wizard and bomb drawing: the shared per-wizard values are `paint.wizard`, `paint.style`, `paint.styleIndex` (were `c.w`, `c.s`, `c.v`); bombs use `BombPaint`.
- `bar(x, y, v, c, k)` → `bar(x, y, value, color, label)`, typed. About 100 short locals written out (`a` angle → `angle`, `q` → `particle` / `label` / `preview`, `s` / `b` / `z` → `shot` / `bomb` / `zone`, ...).

## 0.33.4-0 - 2026-10-22 AWST - Clearer field names on the wire (protocol 18)

Refactor, no change in play (586 scripted matches identical on every tick, the renderer's calls unchanged, smoke test passes). Short field names that are also sent to the browser are spelled out, so the protocol version is now 18 and open tabs are asked to refresh:

- `k` → `spell` on shots, bombs, zones and traps.
- Status buildups `mag` / `over` / `stat` → `magnetized` / `overload` / `static` (also as status keys). What players see stays MAG, OVER and STAT.
- Bomb `u` → `flightProgress` (the bomb's `flight` is its length in ticks).
- Effects: `c` → `color`, `n` → `count`, label `s` → `text`; damage numbers and the death record use `wizard`, `amount`, `color` instead of `w`, `n`, `c`.
- Snapshots are about 3% bigger (1v1 about 1.24 KB each, 4v4 about 3.6 KB); measured on a busy scripted match.

## 0.33.3-0 - 2026-10-22 AWST - Clearer names in the shared game code

Refactor, no change in play (586 scripted matches identical on every tick, the renderer's calls unchanged). Names left over from the single-file days are spelled out in `shared/`; nothing sent over the network changed:

- Constants: `COL` → `SPELL_COLOR`, `PART` → `SPELL_ELEMENTS`, `pairs` → `COMBO_OF`, `names` → `ELEMENT_NAMES`, `emoji` → `ELEMENT_EMOJI`.
- Functions: `make` → `createWizard`, `comb` → `combineElements`, `float` → `addFloatingText`, `walk` → `moveWithCollision`, `ray` → `firstObstacleHit`, `clear` → `hasLineOfSight`.
- State: `Wizard.rest` → `statusDelay`, `SimState.winner` → `team0Won` (it meant "team 0 won").
- Short locals: `k` meaning a spell → `spell` (or `statusKey`, `shieldType`), `a` meaning an angle → `angle`, shots, bombs, bubbles and zones written out (`s`, `b`, `z` → `shot`, `bomb`, `zone`), `o` → `obstacle` / `solid` / `wall`, `n` → `amount`, and others. Maths conventions stay (`x`, `y`, `dx`, `dt`, `a`/`b` for two points, quadratic `a`/`b`/`c`, `u` for a ray parameter).

## 0.33.2-0 - 2026-10-22 AWST - game.p and game.e removed

Refactor, no change in play (586 scripted matches identical on every tick, the renderer's calls and every screen unchanged). The seat aliases `game.p` and `game.e` (seats 0 and 1, left over from the 1v1 days, and the cause of the 0.10.4 team bug) are gone:

- Code that means "every player" already loops `game.wizards`. Solo and training code now names its roles: `soloPlayer(game)` and `soloOpponent(game)` in `shared/sim/teams.ts`, or locals like `player` and `dummy`. Tests use `game.wizards[0]` / `[1]`.
- `MapDef.spawns { p, e }` is gone: every map's duel starts were already the first slot of each team in `teamSpawns` (checked on all 12 maps), which is now required. `spawnsFor(map)` returns the two duel starts as a pair.
- The client's `net.visualP` / `net.visualE` (named the wrong way round) are now `net.drawnOther` / `net.drawnSelf`.
- Two places that showed seat 0 as "you" online keep doing so, now written out and pointing to `docs/REFACTOR-ISSUES.md` (#1, #2).

## 0.33.1-0 - 2026-10-22 AWST - Mark's `test` merged: grey heads 3 and 7 restored

- **Merged `origin/test`** (Mark's entry below): grey heads 3 and 7 have their full silhouettes back. His change to the image versions was made in the old Workshop script and `render/workshopWizard.ts`; it is applied in `client/src/workshop/parts.ts` instead.

## 0.33.0-0 - 2026-10-22 AWST - Disconnects: refresh to rejoin, a short pause, then play carries on

The one behaviour change in the clean-up. Before, if someone refreshed or closed their tab mid-match, everyone was sent to the main menu after 10 s and the code said the room was full.

- **Refresh to rejoin.** Your room and rejoin key are kept for this tab (`sessionStorage`), so after a refresh you land straight back in the match. A new tab or another browser is a new player.
- **A drop pauses the match for up to 10 s** for everyone, with a banner at the top: "Grove Keeper disconnected · resuming in 8…" (one line per dropped player, each with its own countdown). It resumes as soon as they're back.
- **After 10 s play carries on.** The dropped wizard stays where it stood, does nothing, and can be hit and killed. It shows DISCONNECTED over its name. The room is never closed because of a drop.
- **Rejoin any time until the match ends** (rematches keep the seat). A player who comes back after the match ended sees the result.
- **Joining a running match is refused** ("Match in progress."). Before, joining a team match with an open seat tore down everyone's match view.
- Rematch only waits for the players who are connected. Back to lobby frees the seats of players who are away. If the room's creator is away, Back to lobby waits for them. A room with nobody connected closes after 60 s. Leaving on purpose still closes the room, as before.
- How: `server/rooms/reconnect.ts` (grace timers per seat, away seats), `server/match.ts` (an away seat gets no input), new snapshot field `away`, `client/src/net/session.ts` and `ui/awayOverlay.ts`. The 10 s, 60 s and the client's 2-minute retry limit are in `shared/constants.ts`. Protocol version 17: open tabs are asked to refresh. New `tests/server/reconnect.test.ts` (15 tests).

## 0.32.12-0 - 2026-10-22 AWST - Server rooms split into server/rooms/; clean server builds

Refactor, no change in how rooms behave (room and online-match tests and the browser smoke test pass unchanged).

- `server/rooms.ts` is now `server/rooms/`: `index.ts` (routes each message to its handler), `state.ts` (the rooms, codes, tokens, settings), `lobby.ts` (create, join, seats, options, start), `reconnect.ts` (drops and resume), `matchMessages.ts` (inputs, rematch, back to lobby). The other server files were already small and stay as they are.
- **Build fix:** `npm run build` now clears `dist/server` and `dist/shared` before compiling. Without it, an old compiled file (`dist/shared/sim/update.js`, `dist/server/rooms.js`) stayed next to the new folder of the same name and Node loaded the old one, so a server built over an old `dist/` (as on the Oracle slots) could run stale code. The game logic was unchanged in those steps, so nothing behaved differently.

## 0.32.11-0 - 2026-10-22 AWST - update.ts split into shared/sim/update/

Refactor, no gameplay change (586 scripted matches identical on every tick). `shared/sim/update.ts` (770 lines) is now `shared/sim/update/`: `index.ts` (`update()`, which now reads as the list of what happens in one tick), `players.ts` (walking, charging, beams, flurry), `ai.ts` (the moving dummy and the duel AI), `shots.ts`, `bombs.ts`, `zones.ts` (Water Surge, Thundercloud, magma), and `deaths.ts` (deaths, eliminations, respawns). `resolveDeaths` is imported from `update/deaths.ts`.

## 0.32.10-0 - 2026-10-22 AWST - Mark's `test` merged: grey heads with a skin-tone palette

- **Merged `origin/test`** (Mark's entries below, "Mark, on 0.31.2-0"): eight grey heads in the Wizard Workshop with a skin-tone palette that recolours only the skin, and the tinted head drawn on your wizard in local matches.
- Mark built it in the old places (the inline Workshop script and `render/workshopWizard.ts`, both moved in 0.32.1-0), so his code was ported into `client/src/workshop/`: the palette and URLs in `parts.ts`, the chosen skin in `store.ts` (saved in the same place and format), the tinting in a new `skinTone.ts` (shared by the preview and the match, where his branch had two copies), the swatches and Reset in `panel.ts`, the drawing in `preview.ts` and `inMatch.ts`. Checked against a build of his branch: the same saved data at every step and pixel-identical Workshop previews.

## 0.32.9-0 - 2026-10-22 AWST - combat.ts split into shared/sim/combat/

Refactor, no gameplay change: 586 scripted matches give the same simulation state on every tick before and after. `shared/sim/combat.ts` (1,027 lines) is now `shared/sim/combat/`: `damage.ts` (damage, statuses, shields stopping things, a shot hitting), `abilities.ts` (shield, heal, bubble, sword, force), `traps.ts`, `knockback.ts` (shove, pull), `reflect.ts` (bubbles reflecting shots and bombs), `projectiles.ts` (launching shots, magma, bombs), `beams.ts` (sprays and beams, beam bounces), `areas.ts` (craters, Water Surge, Thundercloud), `variantCasts.ts` (spell variants), `cast.ts` (which of these a cast uses). Every caller imports from the real file.

- `burst` moved to `shared/sim/effects.ts`, which ends the import loop between `wizard.ts` and the combat code.
- `PYRO_DISC_REACH`, `FLURRY_TICKS` and `FLURRY_COOLDOWN_TICKS` moved to `shared/constants.ts` with the other tuning numbers (values unchanged).
- New tool `scripts/sim-trace/` records the simulation tick by tick over those 586 matches and compares two recordings (usage in `README.md`).

## 0.32.8-0 - 2026-10-22 AWST - primitives.ts split by what it draws

Refactor, no visible change (same canvas calls in all traced cases, screens pixel-identical). `render/primitives.ts` is gone: `render/shapes.ts` (ellipse, polygon, status bar), `render/effects/particles.ts` and `render/effects/lightning.ts` (lightning arcs and waves), `render/world/controlEffects.ts` (bubble, trap rune, prison, knock-up), `render/arena/scenery.ts` (trees, pillars, the Enchanted Arena scenery). The render split is finished: every file in `client/src/render/` is now named after what it draws.

## 0.32.7-0 - 2026-10-22 AWST - Projectile drawing split into render/world/projectiles/

Refactor, no visible change (same canvas calls in all traced cases, screens pixel-identical). `render/world/projectile.ts` (803 lines, one function) is now `render/world/projectiles/`: `index.ts` (`drawProjectile`: the shared setup and which drawer a shot uses) and one file per variant (`pyroDisc`, `pebbles`, `fireball`, `shards`) and per spell (`magma`, `steam`, `plasma`, `storm`, `ice`, `magnetic`, `earth`). An unused `pulse` value was dropped. The trace tool now also covers your own predicted shots online.

## 0.32.6-0 - 2026-10-22 AWST - Bomb, zone and death drawing split out of scene.ts

Refactor, no visible change (same canvas calls in all 330 traced cases, screens pixel-identical). `render/scene.ts` went from 1,179 lines to 181 and now reads as the frame's draw order. Bombs are drawn by `render/world/bombs/` (`index.ts`: shadow, landing ring, motes and fuse; one file per element: `water`, `ice`, `lightning`, `earth`, `plasma`, `steam`, `fire`, `magnetic`, and `fallback` for Magma), zones (storm cloud, Water Surge) by `render/world/zones.ts`, and the death animation by `render/world/death.ts`.

## 0.32.5-0 - 2026-10-22 AWST - Wizard drawing split into render/world/wizard/

Refactor, no visible change: the renderer makes exactly the same canvas calls as before in all 330 traced cases, and the screens are pixel-identical.

- `render/world/actor.ts` (1,245 lines, one function) is now `render/world/wizard/`: `index.ts` (`drawWizard`: the order things are drawn in), `body.ts` (robe, collar, face, texture, glow), `hats.ts`, `staff.ts`, `emberMage.ts`, `offhand.ts`, `sword.ts` (swing, swing arc, team ring), `statusEffects.ts` (charge, shield, burn, frozen, wet, flurry), `overhead.ts` (health bar, name, silenced, status bars), and `context.ts` (the values every part shares for one wizard).
- New tool `scripts/render-trace/` records every canvas call for every wizard style and status, every spell's shots and bombs and every map, and compares two recordings (usage in `README.md`). Every render split from here on is checked with it.

## 0.32.4-0 - 2026-10-22 AWST - Client folders: render/world, render/arena, render/hud, client/src/fx

Refactor, no game change (screens pixel-identical). Files moved, only import paths changed:

- `client/src/render/world/`: what is drawn in the world (`actor.ts` wizards, `projectile.ts`, `iceWizard.ts`).
- `client/src/render/arena/`: map art and the map picker (`maps.ts`, `ruins.ts`, `darkCircle.ts`, `chunks.ts`, `devBattleground.ts`, `pillarMath.ts`).
- `client/src/render/hud/`: canvas overlays (`minimap.ts`, `teamHud.ts`, `countdown.ts`).
- `render/` keeps `scene.ts` (the draw order), camera, fog, interpolation and (until it is split) `primitives.ts`.
- `shared/fx/cosmetics.ts` is now `client/src/fx/cosmetics.ts`: only the browser uses it. It is still type-checked strictly (`tsconfig.strict.json`, part of `npm run typecheck`).
- `tests/smoke.mjs` works again: it uses the illustrated menu's buttons (Practice, Duel, the lobby's join box) and prints its usage when run without the server URL.

## 0.32.3-0 - 2026-10-22 AWST - Old global button, select, panel and overlay CSS retired

Refactor, no visible change (every screenshot pixel-identical, and the computed style of every visible button and select matches before and after, including hover, focus, pressed and disabled).

- **Deleted** `screens/legacy.css`: the global `button`, `select`, `.overlay` and `.btns` rules, plus `.panel`, `.boxes` and `.small`. What their last visible users took from them now sits on those elements: bold text on `.ui-card`, the spellbook slots and cards, and the results buttons; the results screen's centring on `.arcane-results`. The `overlay`, `btns` and `panel` classes are gone from the markup.
- **Dead CSS removed**: the old legend's head, title, toggle, spell and icon rules, three unused spellbook selectors, and the results buttons' never-used fallback classes.
- **Inline styles** for the header version and `#netdiag` moved into `screens/page.css`.
- Kept on purpose, so nothing looks different: a disabled button still turns slate on hover (`--ui-disabled-hover`; noted in `docs/REFACTOR-ISSUES.md` as probably unintended), and the lobby's map list keeps its purple group headings (`--ui-optgroup-bg`).
- New `docs/REFACTOR-ISSUES.md`: bugs and oddities found during this clean-up, not fixed by it.

## 0.32.2-0 - 2026-10-22 AWST - One stylesheet per screen in client/public/screens/

Refactor, no visible change (every screen pixel-identical). `client/styles.css` (1,840 lines) is split by screen into `client/public/screens/`: `page.css`, `legacy.css`, `hud.css`, `spellbook.css`, `results.css`. Also moved there: `illustrated-menu.css` (now `menu.css`), `ui/workshop.css`, and `ui/screens.css` (split into `settings.css` and `lobby.css`). `client/public/ui/` now holds only the shared look (theme, components, style guide). No rule changed and the cascade order is kept; only comments that described nothing in their new file were dropped. The old styles were bundled by Vite; the new files are served as they are, like the other stylesheets. Where each screen's CSS lives is listed in `docs/UI.md`.

## 0.32.1-0 - 2026-10-22 AWST - index.html is markup only: Workshop code in client/src/workshop/

Refactor, no game change (every screen pixel-identical, and the same Workshop actions give the same saved data and in-match wizard as before).

- **Wizard Workshop** code moved out of the inline script in `index.html` into `client/src/workshop/`: `parts.ts` (part lists, defaults, atlas positions), `store.ts` (saving the look and layout in this browser, and telling the match), `preview.ts` (drawing the preview), `layoutEditor.ts` (position, size and tilt per piece), `panel.ts` (choices, Randomise / Reset, open and close), and `inMatch.ts` (was `render/workshopWizard.ts`: draws your look in a match). The preview and the match now share one copy of the atlas positions, sizes and part limits; they were identical.
- **Spellbook** open and close moved from `onclick=` attributes into `ui/spellbook.ts`.
- **Deleted** the spell-description script: it only wrote into the hidden legacy variant selects, which are never shown.
- `scripts/screenshots.mjs` hides the version label, so two versions can be compared.

## 0.32.0-0 - 2026-10-22 AWST - Refactor safety nets: screenshot diff and room tests

First step of the clean-up (no game change). Before code moves, two checks that prove it didn't change anything:

- **`scripts/screenshots.mjs`** captures every screen (menu, settings, spellbook with its demo, Workshop, lobby, a solo match frame, a cast, pause, results, style guide) with a frozen clock, seeded randomness and paused CSS animations, and `--compare` reports pixel differences. Two captures of the same code match (up to 30 pixels of frame-timing noise per screen). Usage in `README.md`.
- **`tests/server/rooms.test.ts`** pins today's room flow (create, join order, the "full" error, lobby leaving, creator rights, start, rematch, back to lobby, a drop during a match), including two things the disconnect fix will change: a third player is told the room is full while a dropped player's seat waits, and joining a running team match with an open seat is allowed. The server tests now share one test client (`tests/server/helpers.ts`).

## 0.31.5-0 - 2026-10-22 AWST - Mark's `test` merged: Workshop layout editor

- **Merged `origin/test`** (Mark's entries below under "Mark, on 0.31.2-0"): the plain quarterstaff, a new head and robe, a larger local wizard, and the Wizard Workshop's per-piece position, scale and tilt editor. Only `CHANGELOG.md` conflicted; both sides kept. No other change.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Restore walking animations on rematch

- Reset the Wizard Workshop walking animation's cached tick, position, phase, direction and blend when the simulation clock rewinds at the start of a new battle. Previously the animation could freeze until the new match's tick count caught up with the previous match.
- Preserved the approved alternating foot shuffle, reverse one-third-speed cane circle, and spell-triggered left/right facing.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Face the direction of fired spells

- The customized Wizard Workshop character now faces right normally and mirrors the entire assembled sprite (robe, head, feet, staff and gripping fist) after firing a spell to the left. Firing right restores its normal orientation.
- The facing is retained while walking or merely moving the cursor; only successful casts update the spell-facing direction, not blocked cooldown attempts. Sword swings do not change the Workshop character's facing.
- Reuses the wizard's existing facing angle, without adding new network fields or altering the spell damage, speed, or targeting rules.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Sleeveless blue robe in Wizard Workshop

- Added the new transparent, outline-free blue robe as an additional selectable body asset (`Sleeveless Blue Robe`) while preserving the existing Stout Blue Robe and all original body options.
- The new robe uses the same preview and local-match body placement and per-asset Position & Scale Editor settings; no sleeves or attached hands are included.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Slower reverse cane motion

- Kept the approved alternating foot shuffle unchanged. Staff and gripping fist now share a separate animation phase that circles in the opposite direction at one-third the foot cadence, retaining their locked relative placement and saved layout adjustments.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Walking feet and cane animation

- Added a client-side movement-driven walking cycle for the locally customized Wizard Workshop character. Left and right feet now shuffle independently with alternating small forward steps and lifts.
- The equipped staff and its grayscale grip fist use the same seamless elliptical motion transform, moving forward in the walking direction, lifting, and planting together. Animation eases in and out and preserves saved individual sprite placement, scale, tilt, and painter order.
- This affects rendering only: no changes to movement, collision, combat, multiplayer synchronization, or the original uncustomized character art.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Recolorable staff-grip hand

- Extracted the approved top-left grayscale clenched fist as an independent transparent PNG without wrist, sleeve, or staff. Added an optimized game sprite at `client/public/ui/wizard-workshop/greyscale_staff_grip.png`.
- Staff-grip hand is a foreground layer on equipped staves, tinted using the same selected skin tone as the head while retaining dark outlines and shading. It can be independently dragged, scaled and rotated in the Workshop editor.
- Layout keys are staff-specific (`handStaff:<staff index>`), so the grip position can be customized separately for each staff; saved positions are used in local matches and exported via Copy Layout. Multiplayer appearance syncing remains unchanged.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Restore grey heads 3 and 7 right edges

- Re-extracted Grey Heads 3 and 7 directly from the full-resolution source sheet instead of trying to recover pixels already lost to the 32px cropped atlas. Fit complete silhouettes within their existing isolated 32×44 cells and rebuilt corresponding skin-only masks. Other six heads remain unchanged. Updated asset cache keys.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Clean head extraction artifacts

- Preserved approved Grey Heads 1, 2, and 5 unchanged. Removed disconnected neighboring-head fragments from Grey Heads 3, 4, 6, 7, and 8 using eight-connected alpha component analysis, keeping the largest silhouette in each 32×44 sprite cell.
- Applied the exact same cleanup to skin-tone masks so no discarded fragments reappear after recoloring. Cache-busted head asset URLs to avoid stale browser imagery.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Precise head extraction

- Replaced background-position cropping of grayscale heads with exact pixel extraction into eight independent transparent 32×44 sprites after skin-mask tinting. Workshop and in-game renderer both use isolated canvases, preventing neighboring atlas cells from bleeding into scaled or rotated head sprites.
- Preserves existing skin tones, selected heads, layout edits and compatibility with previous saved appearances.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Masked skin-tone head sprites

- Added eight new mouthless, nose-bearing grayscale head sprites as a transparent 4×2 atlas, with a separate grayscale skin mask; existing head options remain intact.
- Wizard Workshop now offers nine skin tone swatches, including fantasy tones. The selected skin tone is saved alongside the appearance and exported via Copy Layout. Skin-only pixels are palette-tinted in the preview and in the local game renderer; eyes, dark brows and outlines retain their original appearance.
- Skin tone does not change existing non-maskable head sprites. This is a first batch of eight new heads; the other sheet variants and independent mouth choices are not yet implemented.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Wizard Workshop per-asset tilt

- Added a Tilt slider (-180° to +180°) to the Wizard Workshop layout editor, rotating the selected asset about its centre without changing other pieces.
- Saved layouts and Copy Layout now include the `rotate` angle per asset; the local in-game renderer matches the preview rotation. Existing saved layouts without a rotation field load with a 0° angle.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Wizard Workshop position and scale editor

- Added a per-item Position & Scale Editor in Wizard Workshop: select any head, hat, robe, staff, offhand, free hand or individual foot; drag the sprite or adjust X/Y and size sliders (25–300%). Layouts are stored per selected asset rather than per slot, so different items retain independent adjustments.
- Save layout stores adjustments in browser localStorage and updates the local in-game wizard renderer. Reset piece discards the current item's adjustment (save to persist). Copy layout exports the current appearance and adjustments as JSON for review and incorporation into defaults.
- Existing selections and layouts remain unaffected until the user saves a new layout; multiplayer remote players still see default appearances.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - New head and robe, larger wizard

- Added the supplied eccentric old wizard head and stout blue robe as independently selectable transparent PNGs in Wizard Workshop. Both were converted to compact, nearest-neighbour, limited-palette pixel sprites for consistent chunky artwork.
- Enlarged the plain quarterstaff in the Workshop preview and increased local-player wizard rendering scale from 0.28 to 0.32; custom parts use adjusted placement.

## Mark, on 0.31.2-0 - 2026-10-22 AWST - Plain quarterstaff character-builder asset

- Added a cropped, genuinely transparent low-resolution PNG of a simple wooden quarterstaff with a detached bare right hand (no sleeve, orb, ornament, or dark outline).
- Added **Plain Quarterstaff** as a separate main-hand option in Wizard Workshop, with a PNG preview and local-player match rendering. New workshop defaults select this staff; existing saved appearances are preserved.

## 0.31.4-0 - 2026-10-22 AWST - main rewritten: one commit per feature version

Process only, no game change. `main`'s history was rebuilt (once) from 889 commits into 97: an initial import plus one commit per feature version from 0.0.0 to 0.31.2, titled `<version> - <title>` without the `-N` suffix, with the final code unchanged. `test`, `test-jesse` and `test-adnan` were restarted from the new `main`. From now on each squash merge into `main` is titled the same way. Re-clone any copy made before the rewrite and never push from it. Rules and consequences in `docs/WORKFLOW.md` ("Merging into `main`") and `docs/HANDOFF.md`.

## 0.31.3-0 - 2026-10-22 AWST - PRs into main are squash-merged

Process only, no game change. From PR #34 on, pull requests into `main` are squash-merged so `main` gets one clean commit per release. Because a squash leaves the branch's own commits off `main`, the old step "fast-forward `test` and `test-jesse` to `main`" no longer works: instead merge `origin/main` back into the branch after the PR (no conflicts, the trees match), so the next PR shows only new work. `docs/WORKFLOW.md` and `docs/HANDOFF.md` updated.

## 0.31.2-0 - 2026-10-22 AWST - Spellbook demo: dummy in Flamethrower reach, wizards stand low

- The dummy is 240 units from your wizard (was 300, exactly the Flamethrower's and Lightning's reach, so they fell just short). Both wizards now stand near the bottom of the demo arena, so the status bars that stack over their heads (Burn, Wet, Chill, ...) stay in view. The two pillars moved above the line of fire, between the wizards, so nothing blocks a straight shot.

## 0.31.1-0 - 2026-10-22 AWST - Spellbook demo: a small arena at match size, cooldowns on the bar

- **Smaller arena, not a shrunken one.** The demo no longer shows the whole Enchanted Arena scaled down. It shows a small patch of its floor (520 x 270 units, about one unit per pixel), so wizards and spells are their match size. The dummy stands 300 units away instead of 400, two pillars stand between them (above and below the line of fire), and walls keep both wizards in view (`DEMO_MAP` in `spellDemoMath.ts`). Arena pillars are now drawn from the map's own round obstacles (`frontPillars` in `render/maps.ts`), which for every real arena are the same four pillars as before.
- **Cooldowns.** After a cast, the loaded spell's icon in the spellbook's bar greys out, fills from the bottom and counts down the seconds, the same way the in-match action bar does. Held spells (sprays, beams) show it only for the wait after you let go, as in a match. The cooldown rules are shared with the match bar (`cooldownDisplay` in `ui/hud.ts`).

## 0.31.0-0 - 2026-10-22 AWST - Spellbook: one element at a time, with a demo arena

- **One element per page.** The spellbook shows one element's spell cards at a time (Fire first) instead of all ten in a scrolling list. The ◀ ▶ buttons step through the elements, wrapping round at both ends, and the action bar's ten icons are now buttons that jump to that element (the shown one is highlighted).
- **Demo arena.** Under the cards is a small arena with your wizard, standing still, and a Mortal Dummy with a real wizard's 200 health, plus the Enchanted Arena's four pillars to show shots stopping at obstacles. The picked spell is loaded: aim with the mouse, then click, hold or charge exactly as in a match (it runs the real simulation; the hint below says how). Picking another card or element resets the arena with that spell. Only main attacks: bombs and traps don't depend on which spell you pick.
- **How:** the demo borrows the menu's idle game state (no match runs while the spellbook is open) and draws it with the match renderer onto its own canvas; `client/src/dom.ts`'s `g` can now be pointed at another context (`drawOn`). Closing the spellbook, or a match starting while it is open (an online start from the lobby), stops the demo and gives the menu its state and picked map back. Code in `client/src/ui/spellDemo.ts`, pure helpers in `spellDemoMath.ts` (tested).

## 0.30.4-0 - 2026-10-21 AWST - Neon Rescue replaced with the full-length track

`neon_rescue.ogg` was the wrong (shorter) export; it is now the right one, about twice the size.

## 0.30.3-0 - 2026-10-21 AWST - Mark's `test` merged in, Wizard Workshop on the shared UI

- **Merged `origin/test`** (Mark's 43 commits, entries below under "Mark, on ..."): the Wizard Workshop (an in-game menu to mix and match head, hat, robe, staff, offhand and boots from a 71-sprite atlas, saved on this browser and drawn on your own wizard in local matches), the Winter Breath freeze sound, and the new wizard renderer. The merge conflicted only in `CHANGELOG.md`, `docs/TEST-CHECKLIST.md` and `client/index.html`; both sides were kept.
- **Workshop restyled** with the shared components, with no change to how it works: its own inline stylesheet (dark navy, raw colours) moved to `client/public/ui/workshop.css` with every colour taken from the theme; the page is a `ui-screen` on the menu's sky, the two sides are `ui-panel`s, the buttons are `ui-btn`s (Randomise green, Reset and Main Menu blue), and the part choices are gold-when-picked chips. Every id, class and sprite-layer position the Workshop script uses is unchanged. The menu's Workshop link is a `ui-btn--secondary` in the bottom right corner.

## 0.30.2-0 - 2026-10-21 AWST - Shadow Rescue renamed Neon Rescue

`shadow_rescue.ogg` is now `neon_rescue.ogg` ("Neon Rescue" in the Fight song dropdown). Anyone who had picked it as their fight song goes back to Random.

## 0.30.1-0 - 2026-10-21 AWST - New fight song: Shadow Rescue

Added `shadow_rescue.ogg` to `client/src/audio/music/battle/`. It joins the fight shuffle and the Fight song dropdown as "Shadow Rescue". There are now three fight songs (Magicians March, Shadow Rescue, Shadow Runes) and one menu song.

## 0.30.0-0 - 2026-10-21 AWST - Music library: song folders, shuffle, song pickers

Second build step of `docs/AUDIO-PLAN.md`.

- **Songs are files in folders.** Drop an `.ogg` into `client/src/audio/music/menu/` or `music/battle/` and it is in the game after the next build, with no list to edit. The file name is the id and the title is the name with underscores as spaces (`magicians_march.ogg` is "Magicians March"). The two existing songs moved there as `menu_waltz` and `shadow_runes`, and **Magicians March** is a new fight song.
- **Shuffle.** Each fight picks a song: every song plays once before any repeats, and the same song never plays twice in a row (`audio/shuffle.ts`, tested). The menus have their own shuffled list, one song per visit.
- **Settings.** A **Menu song** and a **Fight song** dropdown (Random first, then every song by title), each with a ▶ button to listen, which stops the other music while it plays. Choosing a menu song switches to it at once. A song that is no longer in its folder falls back to Random. Saved as `menuTrack` and `battleTrack`.
- **Loading.** Only the song about to play and the next one are fetched, not the whole folder. One audio context and volume is shared by the menu music, fight music and previews (`audio/musicPlayer.ts`), replacing the two separate ones.
- Songs are now build assets (hashed file names) rather than files in `public/audio/`.

## 0.29.0-0 - 2026-10-21 AWST - Settings during a match (Esc), effects volume

First build step of `docs/AUDIO-PLAN.md`.

- **Online:** Esc (or P, because a browser keeps Esc to leave fullscreen) opens the settings page over the live match. There is no pause online, so the match keeps running behind a light dim with a "The match is still running." note. Held movement keys and buttons are released when it opens (also on the server), and the match gets no keys or clicks until it closes. Esc or "Back to match" closes it.
- **Solo and practice:** Esc still pauses. The pause screen has a new Settings button; Esc closes the settings and returns to the pause screen.
- **Settings page:** new **Effects volume** slider (`sfxVolume`, default 70, saved with the other settings). It scales the interface sounds (hover chime and click) through one shared effects gain; combat sounds will use it when they exist. New **Classic action bar** switch, which stays in step with the tick box above the bar.
- The settings page closes by itself if the match ends or you leave it while it is open.

## 0.28.5-0 - 2026-10-21 AWST - Lobby: "Create lobby" is now a refresh icon beside the code

Pressing Duel already makes a room (that is where the code comes from), so the separate CREATE LOBBY button only ever swapped it for a new one. It is now a small ↻ icon button next to Copy that gets a new code. It is disabled for a guest, and for the host once another player has joined (a new code drops the old room). The join box keeps JOIN LOBBY.

## 0.28.4-0 - 2026-10-21 AWST - Practice menu: dimmed backdrop and option cards

- **Practice** now dims the scene behind it like every other screen, and the three modes are option cards (icon, name, one-line description) in a row instead of a plain list of buttons: Duel AI (red), Stationary Dummy (gold), Moving Dummy (blue). They stack on a narrow window.
- New shared component `ui-card` (with `ui-card__icon`, `__name`, `__text` and the same colour classes as buttons), added to the style guide and `docs/UI.md`, for any future "pick one of these".

## 0.28.3-0 - 2026-10-21 AWST - UI rules written down

Step 5 of the UI design system. Nothing changes on screen.

- `docs/UI.md` now lists what is on the system and what is not yet (results Rematch and Main Menu art, spell cards, the in-match HUD, the old global button rules the HUD still uses).
- `AGENTS.md` has a new rule 11: menu UI is built from the `.ui-*` components; no hard-coded colours, no new `button` rules, no inline looks. A missing component is added to `components.css` and the style guide. The attribution rule is now 12.
- The last inline `style=""` attributes in the (hidden) main-menu controls are removed.

## 0.28.2-0 - 2026-10-21 AWST - Spellbook and results on the shared UI

Step 4 of the UI design system (`docs/UI.md`).

- **Spellbook.** It uses the shared screen backdrop (the main menu's sky) instead of the dark teal overlay, and its Back button is the shared blue secondary button (it stays in view while the list scrolls) instead of the hand-drawn arrow. The spell cards, the selected-spell highlight and the loadout strip take their colours from the theme, so they follow it when it changes. The spell art, card sizes and layout are unchanged.
- **Results.** "Back to lobby" is the shared secondary button. The Rematch and Main Menu buttons keep their own artwork, glow and sparkles for now.
- **Cleanup.** The old purple spellbook button skin, the spellbook frame and gradient rules that never applied (the screen did not carry their class) and the generic results button skin are removed from `styles.css`, now 1,784 lines (from 2,886 before the UI work).

## 0.28.1-0 - 2026-10-21 AWST - Settings, pause and lobby on the shared UI components

Step 3 of the UI design system (`docs/UI.md`).

- **One backdrop.** Every `ui-screen` now sits on the main menu's sky art (dimmed), so Settings, Lobby and the other menus share the look of the main menu instead of the old dark teal and purple.
- **Settings.** A parchment `ui-panel` with the shared slider and toggle switches and a blue Back button. The old settings CSS is gone.
- **Pause.** "PAUSED" title, a green hero Resume button and a red Main Menu button.
- **Lobby.** The room code, join box and team seats are in the left column, the match options (map, team size, health, friendly fire, fall rule) in the right, and the actions along the bottom (Spellbook, a green hero Start, a red Leave Room). The lobby used to run off the bottom of the stage and hide its buttons; it fits now. The seat "move to the other team" button is an icon button.
- **Code.** New `client/public/ui/screens.css` holds per-screen layout (tokens only). The staff cursor and the hover and click sounds now cover every `ui-screen`. About 195 more lines of old CSS removed from `styles.css`.
- **New components behaviour.** Buttons no longer wrap their label; a tall screen scrolls from the top instead of being cut off; sliders show a gold fill driven by `--fill`.

## 0.28.0-0 - 2026-10-21 AWST - UI design system foundation, main menu moved onto it

The first step of one consistent look for every menu (plan: `docs/UI.md`).

- **Tokens.** `client/public/ui/theme.css` holds every colour, size, radius, font and motion value the menus use, including four button colour sets (gold, blue, red, green). Changing the feel of the menus means editing this one file.
- **Components.** `client/public/ui/components.css` has four button types (`ui-btn--hero`, `--menu`, `--secondary`, `--icon`) with colour classes (`is-gold`, `is-blue`, `is-red`, `is-green`), plus `ui-screen`, `ui-panel`, `ui-stack`, `ui-row`, `ui-field`, `ui-toggle`, `ui-slider`, `ui-title` and `ui-note`. Finished button art can replace the CSS look through the art slot (`ui-btn--art`, `--ui-btn-art`).
- **Style guide.** `/ui/styleguide.html` shows every component in every colour, for a graphic designer.
- **Main menu.** Duel, Practice, Spellbook and Settings are now `ui-btn--menu ui-btn--art` buttons, and the Practice panel is a `ui-panel` with menu buttons. It looks the same as before.
- **Cleanup.** About 780 lines of old main-menu CSS (frame corners, jewels, sparkles, four layers of overrides) are gone from `styles.css`, and `illustrated-menu.css` dropped its `!important` layers, from 541 to about 210 lines.

## 0.27.3-0 - 2026-10-20 AWST - Loaded spell icon moved into the action bar

The loaded spell icon is now in the action bar, just to the right of the two chosen elements, instead of the top right ability row. It is shown on the new bar only (the legacy bar already highlights the spell). Same artwork, border and tooltip.

## Mark, on current test version - 2026-10-21 AWST - Wizard Workshop preview alignment

Adjusted the customisation menu preview: centred the boot pair under the robe, increased head/collar overlap, and aligned the fallback preview artwork and sprite-atlas layer order. In-game render sizing and gameplay remain unchanged.

## Mark, on current test version - 2026-10-21 AWST - Workshop alignment and draw order

Moved the head down over the robe collar and adjusted boot positions. The robe renders behind the head, with the main-hand weapon drawn foremost; offhand and hat layering is preserved. Reintroduced a small unified idle bob for the in-game character and Workshop preview, without independent limb animation.

## Mark, on current test version - 2026-10-21 AWST - Simplified workshop hands

Removed the independent Hands equipment selector and the floating main-hand sprite. Equipped offhand items now replace the offhand completely; selecting None shows a single default hand instead. The preview and local-player renderer share the same behaviour. Future held-item artwork can incorporate a hand directly into the item sprite.

## Mark, on current test version - 2026-10-21 AWST - Wizard scale and static artwork

Increased the customised in-game wizard rendering scale from 0.24 to 0.28 to better match existing wizard silhouettes (such as the stationary dummy). Disabled bobbing and independently animated hands/feet for the customised player, and removed the Workshop shuffle control and animation. Original dummy artwork is unchanged.

## Mark, on 0.27.2-0 - 2026-10-21 AWST - Workshop outfits in local matches

The Wizard Workshop now persists appearance choices and renders the selected atlas pieces on the local player's wizard in-game. This is visual-only and client-side: opponents continue to see the original character art, and combat, collisions, and networking are unchanged.

## Mark, on 0.27.2-0 - 2026-10-21 AWST - Workshop sprite atlas support

Wired the in-game Wizard Workshop selectors to the 71 transparent sprites from the extra-spaced source package using a compact lossless atlas and original per-sprite dimensions. The sprite renderer keeps proportions, supports detached hands/boots, and retains placeholder fallback until `client/ui/wizard-workshop/game-atlas.png` is uploaded. Gameplay remains unchanged.

## Mark, on 0.27.2-0 - 2026-10-21 AWST - Wizard Workshop in-game overlay

The discreet Workshop button now opens a modal inside the game instead of navigating to a separate HTML page. The separate prototype file was removed; existing gameplay and character selection remain unchanged.

## Mark, on 0.27.2-0 - 2026-10-21 AWST - Experimental Wizard Workshop

Added a small corner link on the illustrated main menu to an isolated /wizard-customiser.html sandbox. The prototype has interchangeable heads, hats, bodies, main-hand and offhand items, floating hands and feet, and a walk/shuffle preview. It does not affect existing characters, game state, or online matches.

## Mark, on 0.27.2-0 - 2026-10-20 AWST - Winter Breath on freeze

Added a short, crystalline Winter Breath sound when a wizard becomes frozen (100% Chill): delicate high frost tingles followed by a soft fading hiss, with no loud bell. The effect plays once per freeze onset, not continuously; supports solo and online snapshots, respects hidden enemies, and resets between matches. Gameplay and music are unchanged.

## 0.27.2-0 - 2026-10-19 AWST - Loaded spell icon

A small icon with a gold border at the left of the ability icons (top right of the screen) shows the attack that is loaded now, with the artwork of the equipped variant (for example the Plasma Beam if that is chosen). It follows the number keys and the action bar, and its tooltip gives the name and keys.

## 0.27.1-0 - 2026-10-19 AWST - Smaller action bar, team corner HUD fixed, wider sight

- **Action bar.** The new bar is about half its old size (392 px wide, four small tiles). The two chosen elements sit in the middle just above the spells, with no "ELEMENTS" or "SPELLS" labels. The legacy bar keeps its old layout.
- **Team games.** The corner HUD ("YOU 200/200" and "ENEMIES STANDING n") was drawn on top of the team panel in the same corner. In a team match it is now hidden, and the team panel lists "ENEMIES STANDING n" as its last line instead.
- **Fog of war.** Sight on battlegrounds is 33% wider, 440 to 585 (`BATTLEGROUND_VISION`). The sight the server sends and the Thundercloud's follow range use the same number. Tests with enemies placed near the old edge were moved out.

## 0.27.0-0 - 2026-10-19 AWST - New action bar: four elements that expand into combinations

The action bar now shows only the four elements (Fire, Water, Lightning, Earth). Pick one (key 1 to 4, or click its tile) and the other three tiles turn into the combinations with it: with Fire loaded they read Steam, Plasma and Magma. Click one (or press the second element's key) to load that spell. The loaded element's own tile stays as the element on its own; clicking it takes you back to the four elements. Picking an element again, or Heal (E), also starts over. The highlighted tile is now the spell you have loaded.

A **Legacy bar** tick box above the bar's top right corner brings back the old bar with all ten spells at once. The choice is saved with the other settings (`legacyActionBar`, off by default). Cooldown fills, variant artwork and key hints work the same on both. The tile list is worked out in `client/src/ui/actionBarMath.ts`, which has unit tests.

## 0.26.6-0 - 2026-10-19 AWST - Own cooldowns for every spell variant, and the view clears the action bar

- **Cooldowns.** Spell variants that belong to another spell used that spell's timer, so holding the Plasma Beam kept re-arming Fire's cooldown (the Fire tile flickered), Magnetic Pull used Earth's, Frost Shards used Earth's, and the Thundercloud used Water's (so it and Water Surge blocked each other). Now Plasma Beam uses `plasmaCD`, Magnetic Pull `magneticCD`, Frost Shards `iceCD`, and the Thundercloud has a new `stormCD`. Variants of the same spell (Fireball and Pyrodisk with Fire, Pebble Flurry with Earth) still share, as before.
- **View.** At the lowest point a wizard can walk to, the wizard was drawn behind the action bar. The camera now runs a little past the bottom of the map (just enough for `ACTION_BAR_CLEARANCE` above the bar), and the strip below the map is filled dark. Arenas scroll at most 24 px at the very bottom; the bigger maps scroll as far as they need.

## 0.26.5-0 - 2026-10-19 AWST - Thundercloud only follows enemies its caster can see

On a map with fog of war, a Thundercloud used to drift after the nearest enemy wherever they stood. It now only follows an enemy the caster can see on their own (inside `map.vision` of the caster); a teammate's sight does not count. An enemy in the fog is ignored, so the cloud picks the nearest visible enemy instead, or stays put if there is none. On maps without fog nothing changes. `nearestFoeTo` takes an optional filter for this.

## 0.26.4-0 - 2026-10-19 AWST - No purple ring when you use the sword online

Pressing F online drew a purple expanding ring around your wizard as an instant preview. The sword has no ring in the simulation (only the swing of the blade, which the server sends), so it was a cast effect that never really happened, and it showed even when the sword was on cooldown or blocked. The preview is removed; the swing animation is unchanged. Force (Q) keeps its ring, since the server draws one too.

## 0.26.3-0 - 2026-10-19 AWST - A spell with no bomb no longer casts its left-click spell

Right click or B on Magma used to lob a Magma Shot (or a Lava Pool), the same spell as left click. Magma has no bomb, so it now does nothing, shows "MAGMA has no bomb" and costs no bomb cooldown. This is a rule in `hasBomb()` (`shared/sim/variants.ts`, the list `NO_BOMB`), so a future spell without a bomb only needs adding there. Every other spell still throws its bomb.

## 0.26.2-0 - 2026-10-19 AWST - Water Surge slides bombs like players

Water Surge now shoves bombs the way it shoves wizards. Before, a bomb it swept over was moved 140 px in a single tick, so it teleported and went less far than a player (about 330 px). A bomb now gets a knockback speed (`SURGE.BOMB_KNOCKBACK`, 60, the same as a wizard's) that fades by 0.82 a tick, so it slides smoothly the same distance. A bomb in flight carries its whole arc along, a wall stops it, and a bubble edge turns it back. `SURGE.BOMB_PUSH` is gone.

## 0.26.1-0 - 2026-10-19 AWST - Spell tile cooldowns shown online

Online, the spell tiles at the bottom never redrew their cooldown fill after the first frame, because only the offline loop called the tile update. The snapshot handler now refreshes the tiles, so the wait after letting go of a spray, beam or Pebble Flurry shows in multiplayer as it does against the AI. `flurryCD` is also added to the snapshot's own-wizard fields, since the client never received the Pebble Flurry cooldown.

## Mark, on 0.26.0-0 - 2026-10-20 AWST - Blue-orb staff menu cursor and tighter button hitboxes

Installed the approved uploaded blue-orb staff image as a custom cursor for the illustrated main menu, Practice, lobby, Spellbook and Settings only. At startup, the 145x209 PNG is drawn at a crisp 32x46 cursor-safe size, with the orb centre as its click hotspot. The battle canvas and battle controls are untouched. Reduced the four home menu buttons' horizontal hit zones from 82% to 76% (12% inset per side), retaining their artwork dimensions, sounds and keyboard access.

## Mark, on 0.26.0-0 - 2026-10-20 AWST - Narrow illustrated menu click areas

Restricted the pointer-interactive horizontal area of the four illustrated home menu buttons to their central 82%, leaving the displayed PNG dimensions and button positions unchanged. Preserved keyboard focus, existing hover and Rune Press audio, and all in-battle controls. The approved blue-orb staff sprite was separately extracted as a transparent PNG for review; it is not yet installed as the menu cursor.

## Mark, on 0.26.0-0 - 2026-10-20 AWST - Rune Press menu click sound

Added the approved Rune Press selection effect: a 65 ms filtered wooden tap with a low triangle tone and faint higher magical resonance, approximately 0.16 seconds overall. It plays on user-initiated menu, Practice, lobby, Spellbook and Settings button activation, including keyboard clicks. The existing Magical Hover chime remains unchanged; programmatically forwarded legacy clicks are excluded to avoid duplicate sounds. No gameplay or version changes.

## Mark, on 0.26.0-0 - 2026-10-20 AWST - Atomic illustrated menu loading and magical hover sound

Removed the visible fallback text title, preserving the accessible heading. Preload the menu background, illustrated title and four button images before revealing the full menu, with a simple loading cover while assets settle. Added a short three-harmonic crystalline hover chime to menu, Practice, lobby, spellbook and settings buttons, with browser audio-unlock handling and a short overlap guard. No game mechanics or version changes.

## Mark, on 0.26.0-0 - 2026-10-19 AWST - Ice Wizard directional sprite atlas

Connected the uploaded 152-frame Ice Wizard PNG atlas to the existing Frost Scholar character in the canvas renderer on the `test` branch. Eight directions and idle/walk/cast/hit/defeat animations are selected visually from the wizard's facing, movement, casting and damage state. Unrelated characters, shared simulation, spell mechanics and multiplayer protocol are untouched. If the atlas has not loaded, the previous Frost Scholar illustration remains as fallback. Manual checks are recorded in the checklist. This change does not merge other branches or bump the version.

## Mark, on 0.26.0-0 - 2026-10-19 AWST - Restore exact approved result button PNGs

Installed the user's two original, unmodified transparent PNG files as separate Rematch and Main Menu assets. The result buttons now display the PNGs as actual image elements, overriding prior broken sprite sheets and synthetic CSS gradients/borders/labels. Preserved existing native button click handlers and subtle glow/sparkle interactions; versioned the asset URLs to avoid stale caches.

## Mark, on 0.26.0-0 - 2026-10-19 AWST - Repair invisible result button artwork

Rebuilt the previously invalid PNG sprite with correct PNG chunk checksums and trailer. Bumped image/style cache versions; added a labelled, theme-coloured fallback if the decorative PNG cannot load, so interactive Rematch and Main Menu never disappear behind their sparkle effects. Existing button actions unchanged.

## Mark, on 0.26.0-0 - 2026-10-19 AWST - Approved blue and purple result buttons

Replaced the previous red/purple result button visuals with a transparent PNG atlas derived from the approved simplified artwork (blue Rematch, purple Main Menu). The existing clickable native buttons, Rematch/Main Menu handlers, subtle glow and sparkle animation, keyboard focus styling and reduced-motion behaviour remain in use. Cache-busted CSS so the image change loads on test.

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

## Mark, on 0.26.0-0 - 2026-10-19 AWST - Illustrated interactive result buttons

Replaced the plain Rematch and Main Menu result controls with the matching approved purple transparent PNG artwork. Their existing button IDs/classes and rematch/home handlers remain intact; online Back to Lobby is unchanged. Added understated idle glow, staggered gem sparkles, hover and pressed feedback, keyboard focus and reduced-motion support. Button images are optimized for the small end-of-match UI.

## Mark, on 0.26.0-0 - 2026-10-19 AWST - Illustrated animated victory and defeat results

Replaced plain text match results with compact transparent Victory (wizard hat and staff) and Defeat (purple void) emblem artwork. Layered independently animated gemstone highlights and drifting magical wisps above the existing button area. The result overlay remains centred over the arena, with accessible result text and reduced-motion support; rematch, lobby and home actions are unchanged. Added manual checks for both outcomes, restart, and responsive layouts.

## Mark, on 0.26.0-0 - 2026-10-19 AWST - Shadow Runes V25 battle-theme replacement

Replaced the original V16 battle-only theme with Shadow Runes V25 (96 seconds, strings and choir interlude, root-note trumpet and harmonica, decorated percussion and subdued bells). Updated the battle-music asset URL with a versioned filename to prevent browser caching of V16. The battle-music controller, menu soundtrack and mute/volume behaviour remain unchanged. Deleted the unused V16 audio asset.

## Mark, on 0.26.0-0 - 2026-10-19 AWST - Shadow Runes V16 battle-only loop

Added the original 38.4-second Shadow Runes V16 OGG to the test client and a sample-accurate Web Audio battle-music controller. Music starts with solo/online rounds, loops while fighting, stops on results, lobby/home/disconnection, and pauses with solo matches. Menu/lobby waltz remains unchanged; both obey existing music-volume and mute settings. No in-duel sound effects were changed.

## Mark, on 0.12.27-0 - 2026-10-18 AWST - Menu illustration load fix

Rendered the uploaded title-screen PNG as an explicit image element below menu controls, rather than relying on a CSS background, and refreshed stylesheet cache. The generated art remains isolated to the main menu; lobby, spellbook and combat screens are unchanged.

## Mark, on 0.12.27-0 - 2026-10-18 AWST - Illustrated Arcane Duel menu

Replaced the main menu's decorative CSS border and typed title with an image-backed layout. Buttons, spellbook and menu music remain DOM-managed. Artwork will display once `client/public/ui/arcane_duel_battle_above_the_clouds.png` is uploaded to `test`.

## Mark, on 0.12.27-0 - 2026-10-18 AWST - Gapless menu music playback

Replaced HTML audio-element looping with decoded Web Audio buffer looping, removing playback restart delays. Music begins after a browser-permitted interaction, continues across menu/lobby, and stops during duels. Browser autoplay restrictions remain in effect.

## Mark, on 0.12.27-0 - 2026-10-18 AWST - Menu theme playback preparation

Added a menu/lobby-only OGG playback controller, gated on browser user interaction. Music stops on match start and never plays during duels. The OGG asset itself still needs to be uploaded to client/public/audio/ before playback works.

## 0.26.0-0 - 2026-10-18 AWST - Fullscreen switch

The game now takes more of the window: the title row, hints and page margins are slimmer, so the 16:9 stage is as large as the window allows (about 90% of the height of a 1080p window, up from 87%). The Settings page has a Fullscreen switch that gives the stage the whole screen, with the title and connection lines hidden and the hint line floating over the top edge; it follows Esc and F11, and is hidden where the browser has no fullscreen.

## 0.25.0-0 - 2026-10-18 AWST - Sharp rendering

The game canvas now draws at the window's real pixel size (up to 2560 pixels wide, and on high-density screens too) instead of a small picture stretched by the browser, so text, lines and sprites are sharper on large windows. It follows window resizes, and aiming still matches the cursor. If this is slow on a large or HiDPI screen, lower `MAX_BACKING_WIDTH` in `client/src/render/cameraMath.ts` to 1920.

## 0.24.0-0 - 2026-10-18 AWST - Widescreen view

The game view is now widescreen: everyone sees the same 16:9 area (1067 x 600) instead of 4:3, so wide windows no longer show black bars at the sides, and the HUD scales with it. All ten arenas were widened to fill it, with the pillars, spawn points, Dark Wizards' Circle monuments and the arena art stretched in proportion; battlegrounds simply show more to the sides. The page layout fits the window as large as it can without clipping the title or hints. Spawns, bounds and arena size changed, so the wire protocol is now 16 and tabs from before are told to refresh.

## 0.23.0-0 - 2026-10-18 AWST - Water bomb glide

The Water bomb's knockback is now a long, gentle slide instead of a near-instant jump: it starts slower (28 instead of 45) and fades slowly, carrying a wizard about 350 px over roughly half a second, so you can see them being thrown. A new `glide` timer keeps the client's movement prediction in step with the server.

## 0.22.0-0 - 2026-10-18 AWST - Fire melts the frozen

Fire now melts a frozen wizard: any Fire hit (Fireball, Flamethrower, the Fire bomb or trap) thaws the target at once, clears their Chill and shows MELTED!, and still burns and hurts them as normal. Earth still shatters ice for double damage.

## 0.21.0-0 - 2026-10-18 AWST - Countdown from the lobby only

The 5 second start countdown now happens only when the host starts a match from the lobby. A rematch starts the next round at once.

## 0.20.0-0 - 2026-10-18 AWST - Key numbers on the action bar

Every spell tile on the action bar now shows the number keys that load it in its top-left corner: 1 to 4 for the four elements, and 1+2, 1+3, 1+4, 2+3, 2+4 and 3+4 for the combination spells. The tile tooltip names the keys too.

## 0.19.0-0 - 2026-10-18 AWST - Frozen means frozen

A frozen wizard can no longer shield: a frozen wizard now cannot load elements, shield, heal, bubble, bomb, trap, use the sword or Force, or cast, until the ice thaws (walking was already blocked). A fire shield therefore no longer thaws you. Online, the client ignores those keys while frozen too, so the action bar does not show a load the server refused.

## 0.18.0-0 - 2026-10-18 AWST - Settings and menu theme

The main menu has a Settings page with a music volume slider (0 to 100, default 42, the old volume) and a mute toggle, both saved in the browser and applied to the menu music as you move them; more sliders need only a setting and one row. The dropdown lists in the menu, lobby and settings now use the menu's purple instead of white with yellow text.

## 0.17.0-0 - 2026-10-18 AWST - HUD and scaling

The arena window is now as large as fits the browser at 4:3, and the action bar, ability icons and player info scale with it. The minimap sits above the action bar, so they never overlap. Spell tiles show the seconds left while recharging (hold-to-fire spells still show nothing). The five top-right ability icons have tooltips saying what they do. Enemies your team has not seen yet show "?" in the team panel instead of their health, and are not drawn. Arena pillars are drawn in front of wizards and shots standing behind them, and now stand where wizards and shots are actually stopped (the art moved 30 px down; the collision is unchanged).

## 0.16.0-0 - 2026-10-18 AWST - Thundercloud, beams and burn numbers

The Thundercloud now follows the enemy closest to the cloud itself, not the one closest to its caster. Beams and sprays (Flamethrower, Water Spray, Lightning Bolt, Plasma Beam, Magnetic Pull and Pebble Flurry) turn toward the cursor at a limited speed, so flicking the mouse no longer whips them round. After you let go of a beam or spray it needs 1 second before it can fire again, and its spell-bar tile shows a cooldown fill for that second only (no fill while you hold it, as in 0.12.27-0). Burn damage numbers no longer appear over wizards who have fallen or died.

## 0.15.0-0 - 2026-10-18 AWST - Bombs, traps and bubbles

Every bomb and trap now gives the full effect of its element: Water soaks to 100%, Fire burns to 100%, Steam and Magnetic fill their meters, and a Storm bomb discharges at once. The Water bomb shoves everyone in its blast away, and the Water trap knocks its victim up for a second (no walking, but they can still cast). The Earth bomb slows its target by 75% for 3 seconds. The Magnetic bomb drags its victims into its centre and overrides their walking while it pulls. Traps become invisible to enemies 2 seconds after they are set (the server stops sending them), though they still spring. Bubbles now reflect bombs back at the thrower instead of letting them go off on the edge (`docs/BUBBLES.md` updated). Water Surge pushes bombs, in flight or landed, away. The wire protocol is now 15, so tabs from before are told to refresh.

## 0.14.0-0 - 2026-10-18 AWST - Force start and countdown

The host can now start a team match without a full lobby: two players, one on each team, are enough, and empty seats simply stay empty (a 2v1 is fine, no AI fills in). After START every player sees a big 5 second countdown while the match is held and input is ignored; a rematch counts down the same way. Any open spellbook closes when the match starts. This changes the wire protocol (version 14), so tabs from before are told to refresh.

## 0.13.0-0 - 2026-10-18 AWST - Input and charge fixes

A plain click no longer slows the wizard: the charge slowdown starts only once a charge is really building, at the same point the charge meter appears, and online prediction matches the server. A charge held for 3 seconds after reaching full power now casts by itself, so it cannot be held forever. Right click online no longer shows a purple ghost orb (bombs now show only their real, server-driven visuals). Right click with the Lava Pool variant lobs a Lava Pool instead of a Magma Shot. Releasing the left button outside the canvas or browser no longer leaves the wizard stuck holding.

## 0.12.27-0 - 2026-10-18 AWST - No cooldown fill on hold-to-fire spells

Spells you hold down to keep firing (Flamethrower, Water Spray, Lightning Bolt, Plasma Beam, Magnetic Pull) no longer show the spell bar's cooldown fill: their tiny cooldown is just the rate of fire and the fill flickered constantly. Every other spell, including the quick click spells, still shows it. Pebble Flurry is held-to-fire too but has a real cooldown after each flurry, so it still shows.

## 0.12.26-0 - 2026-10-18 AWST - Every spell-bar cooldown shows

The spell bar's fill-from-below cooldown overlay used to appear only for cooldowns over two seconds. It now shows for every spell, so the Earth Shot's short cooldown (and Fireball, Vapor Blast and the other quick ones) show too. The clockwise sweep stays for the special ability icons only (Sword, Force, Heal, Bubble, Trap).

## 0.12.25-0 - 2026-10-18 AWST - No Earth icon in the cooldown row

The Earth shot's cooldown is a spell-bar cooldown, so its icon left the top-right row (now Sword, Force, Heal, Bubble, Trap). (The spell bar hid short cooldowns at the time; 0.12.26-0 shows them.)

## 0.12.24-0 - 2026-10-18 AWST - Ability cooldown icons with a clockwise sweep

The wide cooldown bars at the top right became a row of small icons (Earth, Sword, Force, Heal, Bubble, Trap). While one recharges, a dark cover sweeps away clockwise from twelve o'clock like a World of Warcraft cooldown, with the seconds left on abilities that wait longer than two seconds. Magma is gone from there (it is on the spell bar). Tooltips name the ability, its key and its time left.

## 0.12.23-0 - 2026-10-18 AWST - A cleaner screen around the arena

- Removed the element key row, the EARTH / SWORD / FORCE / SHIELD / KILLS line, and the YOU / RIVAL health line above the arena. The connection line and hint stay.
- Your health is now top left of the arena; the rival's health is a number beside their health bar. Team matches keep an "enemies standing" line there, and a respawning mortal dummy says so.
- EARTH, SWORD and FORCE cooldowns joined the on-screen cooldown panels (top right), each with a meter.
- Fixed a leftover write to a label that no longer exists (`spell`), which threw an error at the start of every online match. Smoke test updated.

## 0.12.22-0 - 2026-10-18 AWST - One bubble rule for every spell

Bubble behaviour is now written down (`docs/BUBBLES.md`) and tested for every projectile (`tests/sim/bubble-matrix.test.ts`).

- **Bubbles reflect everything, including your own shots.** The Pyrodisk used to pass through its caster's own (and its team's) bubble while every other shot bounced off it; it is reflected like the rest, and a reflected disc can hurt its caster.
- **Water Surge is reflected.** The ring cannot cross a bubble edge; where it first touches one, a new ring starts from the point of contact (owned by the bubble's owner, so it shoves the caster) while the first ring carries on growing. New rings bounce off other bubbles in turn. Each ring bounces off each bubble once, and one cast keeps at most `SURGE.MAX_RINGS` (6) rings alive at once, so overlapping bubbles cannot pile rings up. Cast from inside a bubble, it still soaks and shoves everyone inside first. The ring is now drawn as a true circle, clipped at bubble edges (it was a flattened ellipse drawn across them).
- Clients no longer let a Pyrodisk pass its own team's bubble when drawing between snapshots.
- The deliberate exceptions (sprays blocked, bombs detonate at the edge, sword, Force, traps, Lava Pool and Thundercloud ignore bubbles) are listed in `docs/BUBBLES.md`.

## 0.12.21-0 - 2026-10-18 AWST - Third test slot (port 8083)

New deploy slot `test3` on port 8083 for Adnan's branch `test-adnan` (any branch can use it). `arcane-deploy`, its CI wrapper, `caddy.sh`, `setup.sh` and the Deploy workflow know the slot; docs list it. No game changes. Server steps: widen the Oracle security list to 8081-8083, re-run `setup.sh`, then `arcane-deploy test3 test-adnan`.

## 0.12.20-0 - 2026-10-18 AWST - Visual art pass (Mark's `test` work, merged)

Mark's visual work from `test`, merged as grouped changes instead of 370 small commits.

- **Main menu** restyled as a gilded fantasy title screen with a battlefield backdrop; arena and practice settings fold away.
- **Spellbook** now shows illustrated sprite cards (new icons, banner, descriptions, back arrow, bronze scrollbar, icons for all ten elements).
- **Action bar** replaces the spell legend: spell art, two element slots, and a cooldown overlay for cooldowns over two seconds.
- **Eight spells renamed** (Lightning Bolt, Boulder, Vapor Blast, Plasma Flare, Tempest Bolt, Icicle, Molten Core, Gravity Shot). Variant IDs and art are unchanged.
- **Gameplay: Steam, Plasma, Ice and Magnetic bolts now have a 20-tick cooldown** (new `steamCD`, `plasmaCD`, `iceCD`, `magneticCD` timers). Online they are drawn from server snapshots, not predicted.
- **Visuals:** new Flamethrower, Steam, Magnetic, Plasma, Tempest Bolt, Thundercloud and Earth effects; ice-prison shatter shards; new Fire, Water, Lightning, Ice, Plasma, Steam and Earth bomb art. The Earth colour is now brown.
- **Tests:** seeded AI-versus-AI balance benchmark (`tests/ai-balance.test.ts`). Fixed Mark's type errors and the tests his changes broke.
- Mark's own 0.12.18 to 0.12.21 labels were never released; they are folded into this one version.

## 0.12.19-0 - 2026-10-16 AWST - Handoff refresh

`docs/HANDOFF.md` brought up to 0.12.19-0 (spell work, `test` merged, release steps). Checklist item X5: a reflected Magma lob flies its whole distance back.

## 0.12.18-0 - 2026-10-16 AWST - Jesse's own future ideas file

Added `FUTURE_IDEAS_JESSE.md` so Jesse's ideas stay separate from Mark's `FUTURE_IDEAS.md` (merged in from `test`). Docs only.

## 0.12.17-0 - 2026-10-15 AWST - A reflected Pyrodisk just bounces and ends

A reflected Pyrodisk used to belong to the bubble's owner and so, at the end of its reach, turned for home to them. Now a
reflected disc flies out from the bubble, can hit whoever it passes (each up to twice), and simply ends at the end of its reach
or at an obstacle: it never returns to anyone. A reflected disc also no longer counts as its new owner's disc, so the
bubble's owner can throw their own while it flies. Tests in `tests/sim/pyro-disc.test.ts`.

## 0.12.16-0 - 2026-10-15 AWST - Reflected shots stay visible; the Pyrodisk reflects

- **Reflected projectiles vanished for the bubble's owner.** A bubble hands the shot to its owner, and a client skips drawing the
  shots it owns because its own prediction draws them. But the owner never predicted a reflected shot, so nothing drew it. Shots
  now carry `reflected` (set by `reflect`, sent in snapshots only when true), and `isPredictedShot` says a client draws only
  plain shots it cast itself; variants, Earth and reflected shots come from the server.
- **Pyrodisk reflects off an enemy bubble** like any projectile instead of stopping and turning home: it is mirrored, now belongs
  to the bubble's owner, flies out again from the edge with a fresh outward flight (`PYRO_DISC_REACH`, hit counts cleared), and
  can hurt whoever threw it. Meeting a bubble on the way home reflects it too. Its own team's bubbles still let it through.
- Tests in `tests/sim/pyro-disc.test.ts`, `snapshot.test.ts` and `tests/client/earthVisibility.test.ts`.

## 0.12.15-0 - 2026-10-15 AWST - A reflection resets the range; the surge puts out your fire

- **Reflection starts the flight again.** A projectile a bubble sends back gets its whole range (and enough life to fly it)
  again instead of what was left, so a shot fired from far away still comes all the way home. A reflected Magma lob flies its
  whole original distance back (`MagmaShot.reach`) with a fresh lifetime. A reflected beam or bolt leg (Plasma Beam, Magnetic
  Pull, Lightning) is its full length again, not the remainder of it. Still one bounce per beam.
- **Water Surge puts out the caster's own fire** as it is cast.
- Tests for each in `tests/sim/bubble.test.ts`, `beam-bounce.test.ts` and `water-surge.test.ts`.

## 0.12.14-0 - 2026-10-15 AWST - Frost Shards chill toned down; Plasma Beam looks as before

- **Frost Shards:** a fully charged shard chilled 42%, so one point-blank volley froze. Now 7% uncharged and 17% at full charge
  (`shardChill`, in between for a half charge), so all five shards of a full volley give 85% and a second volley is needed to
  freeze. The damage scaling (up to 6x) is unchanged.
- **Plasma Beam:** the drawing is back to its original size (the outer layer 30 px wide, the portal as before); only the
  hitbox stays doubled (0.11 radians).

## 0.12.13-0 - 2026-10-15 AWST - Bubbles reflect beams; fewer BLOCKED! labels; stronger Frost Shards; wider Plasma Beam

- **Bubbles reflect beams.** A Plasma Beam, Magnetic Pull or Lightning bolt that meets a bubble's edge bounces off it like light
  off a mirror and carries on for the rest of its length. The reflected leg belongs to the bubble's owner, so it hits whoever
  fired it (aimed straight at the bubble, that is the caster); at a slant it flies off at the mirrored angle. A wizard in front
  of the bubble still takes the beam without a bounce. The reflected leg is drawn from the bubble's edge (no portal there).
  The Magnetic Pull's reflected leg pulls its target toward the bubble.
- **BLOCKED! spam.** A shield stops a beam every tick, so the label (and its burst) came up constantly. Now at most one label a
  second and one burst per 10 ticks on a wizard, for every spell (before, only Fire was limited).
- **Frost Shards charge.** Charging now multiplies each shard's damage up to 6x (it was 3x), and its chill too (7 per shard, up
  to 42 when charged), so three fully charged shards freeze. The shot carries its `power` for this.
- **Plasma Beam is twice as wide:** the hitbox angle 0.055 to 0.11 radians, and the beam drawn twice as thick.
- Tests: `tests/sim/beam-bounce.test.ts` (reflection for each beam, the slanted bounce, no bounce for a wizard in front,
  the wider plasma hitbox, the label limit) and `tests/sim/frost-shards.test.ts`.

## 0.12.12-0 - 2026-10-15 AWST - A silenced wizard can't shield

Heal, bubble, trap, force, bomb and spells already checked for silence; shields didn't. `shield()` now refuses a silenced
wizard (it returns false, which also stops the AI), and Space while silenced raises nothing and keeps the loaded element for
when the silence ends. The client's prediction follows the same rule. A frozen wizard can still shield on purpose (a fire
shield thaws them). Tests in `tests/sim/input.test.ts`.

## 0.12.11-0 - 2026-10-15 AWST - Knockback glides on your own screen; bubble needs two Space presses in a row

- **Knockback teleport (victim's screen):** your own wizard is predicted locally and corrected towards the server's position.
  A Water Surge throws you about 330 px, most of it before the snapshot that tells you arrives, and a correction over 140 px was
  treated as a teleport and snapped. While the server still has you flying (knockback speed above 2 px per tick) the limit is
  now 600 px, so you slide to the new spot at the push's own speed. A real teleport (respawn) still jumps.
- **Bubble from two shields:** "1, Space, 2, Space" quickly counted as a double tap and cast a bubble. Now only Space presses in a
  row count: loading an element, E, F, Q, B or T between them starts the count again (moving doesn't). Same rule on the
  server (`applyKey`) and in the client's prediction.
- Tests: a 330 px knockback in `tests/client/movePrediction.test.ts`; the shield sequence and moving between taps in
  `tests/sim/bubble.test.ts`.

## 0.12.10-0 - 2026-10-15 AWST - Nine spell variants removed

Removed Stone Lance, Chain Lightning, Static Discharge, Scalding Mist, Steam Burst, Unstable Orb, Molten Shrapnel, Glacial
Spike and Iron Swarm: their casting code, sprites, arc styles and spellbook entries. What is left: Fire (Fireball, Pyrodisk),
Water (Water Surge), Earth (Pebble Flurry), Magma (Lava Pool), Ice (Frost Shards), Plasma (Plasma Beam), Storm (Thundercloud),
Magnetic (Magnetic Pull). Lightning and Steam have no alternatives, so they left the spellbook (`VARIANT_SPELLS` lists the
spells that still have some). Saved loadouts naming a removed variant play as the original spell.

While there, `listed` (the check that a variant belongs to its spell) now compares only variant ids; before, a display name
such as "Water Surge" in a loadout would have passed as a variant.

## 0.12.9-0 - 2026-10-15 AWST - The Thundercloud strikes everyone under it

The cloud still only chases the nearest enemy, but its strikes now hit every wizard beneath it: teammates and the caster too,
whether or not friendly fire is on. (Before, it spared the caster and, without friendly fire, teammates.) Tests cover a 2v2
with friendly fire on and off.

## 0.12.8-0 - 2026-10-15 AWST - Surge and cloud tuning

Water Surge's knockback doubled (30 to 60, about 330 px) and its radius up 50% (230 to 345). The Thundercloud's speed is now
half a wizard's walking speed (was three quarters).

## 0.12.7-0 - 2026-10-15 AWST - Water Surge, a moving Thundercloud, Gale Force removed

- **Water Surge** replaces Water Bullet. An instant cast: a ring of water grows out from the caster (a `WATER` zone, radius 20 to
  230 over 45 ticks, then it expires) and soaks every wizard it reaches to 75% wet and hurls them back about 165 px, once
  each, with no damage. Pillars, bubbles and a water shield stop it; teammates are spared unless friendly fire is on.
  Cooldown 5 s (on the water timer, not shown).
- **Thundercloud** is no longer a projectile. It summons a storm cloud (a `STORM` zone with `follow`) where you aim, up to
  300 px away, that drifts after the nearest enemy at 0.75 of a wizard's walking speed for 5.5 s and strikes anyone under it
  every half second (6 damage, plus the Static build-up that discharges for 18). One cloud per caster, cooldown 8 s. Storm
  zones are now drawn with a cloud and the odd flash of lightning.
- **Gale Force removed.** Storm has one alternative. Saved loadouts naming a removed variant play as the original spell.
- Tests in `tests/sim/water-surge.test.ts` and `tests/sim/thundercloud.test.ts`; the Pebble Flurry tests moved to
  `tests/sim/pebble-flurry.test.ts`.

## 0.12.6-0 - 2026-10-15 AWST - Bubble reflections drawn correctly online

The server already reflected shots at a bubble's edge correctly; the clients drew them wrong, in two places:

- **The caster** drew a predicted copy of their own shot that flew straight on through the bubble, while the real, reflected
  shot came back. The predicted shot now ends at the bubble edge, like it does at a pillar or a wizard.
- **Everyone** carries each shot forward from the newest snapshot (up to 8 ticks) to draw it where it is now, and that
  carried it through the bubble before the reflection arrived. `extrapolatedShot` now stops it at the edge (a Pyrodisk still
  passes its own team's bubbles). Tests in `tests/client/shotExtrapolation.test.ts`.

## 0.12.5-0 - 2026-10-15 AWST - Pebble Flurry, bigger Water Bullet, lightning and wall fixes

- **Water Bullet:** knockback doubled (6 to 12), the bullet twice as wide (hitbox radius 7 to 14) and drawn longer, cooldown
  1.25 s (was 2 s).
- **Pebble Spray is now Pebble Flurry:** hold to fire for 1.5 s (`FLURRY_TICKS`), 3x the pebble damage (3.9 to 11.7 each),
  then a 5 s recharge (`FLURRY_COOLDOWN_TICKS`). Letting go early also starts the recharge. A ring under the health bar
  empties over the 1.5 s; `Wizard.flurryTime` is in the snapshot so everyone sees it. The recharge isn't shown.
- **Lightning fix:** the caster couldn't see all their own bolts online, because their client predicted lightning on its own
  clock and hid the server's arcs, and the two drifted apart. Default Lightning is no longer predicted; the server's arcs
  are drawn for the caster too (one round trip behind, but every bolt that does damage is shown).
- **Arena wall fix:** the invisible wall at the top of arena maps sat on the pillar line (`bounds.top` 175). It is now 120,
  the floor's top edge minus the same 39 px margin the bottom has.
- Tests for the flurry's timing, early release and recharge, and the top bound.

## 0.12.4-0 - 2026-10-15 AWST - Water Bullet, stronger Pebble Spray

- **Water Bullet** replaces Pressure Jet (Water's alternative). It is a single fast projectile (speed 14, 18 damage, reach 480) with a two second cooldown on the water timer, which the UI doesn't show. A hit soaks the target 40% wet and shoves them
  back along the bullet's path (`WATER_BULLET_KNOCKBACK`, skipped when a shield stops it). It does not charge or spray:
  `isUncharged` covers it and Pyrodisk. A saved `jet` loadout plays as Water Spray.
- **Pebble Spray** does 50% more damage per pebble (2.6 to 3.9) and reaches 30% further (220 to 286).
- Tests in `tests/sim/water-bullet.test.ts`.

## 0.12.3-0 - 2026-10-15 AWST - Very high health option

The lobby has a HEALTH setting, Normal (200) or Very high (1000), for testing spells without anyone dying. `PROTOCOL_VERSION`
is 13. It is a match rule (`MatchRules.wizardHp`, default 200) chosen by the host in `LobbyOptions.wizardHp`, kept for
rematches, and the validator accepts only the listed choices (a missing one means 200). `resetMatch` gives every wizard
that health, so heals, respawns and the health bars follow it; the HP labels read the wizard's own maximum instead of
a fixed 200. Solo matches stay at 200.

## 0.12.2-0 - 2026-10-15 AWST - The spellbook online

Spell variants now work in online rooms. `PROTOCOL_VERSION` is 12.

- **Picking:** every player opens the SPELLBOOK in the lobby (the same modal as the menu). A change goes to the server as
  `set_loadout`, which keeps only real variants of the right spell (`sanitizeLoadout`, also used by `spellVariant`),
  and the lobby shows every seat's picks. Picks are locked once the match starts and kept for rematches.
- **Sim:** `resetMatch` takes `loadouts` by seat; the server passes each player's, and the client gets them in `start`
  and `rematch_start` so its own HUD and sprites match. The lobby message carries them too.
- **Seeing each other's spells:** a snapshot shot carries its `variant` (only when it has one, so plain shots cost
  nothing). Beams, arcs and sprays already travelled as events with their variant.
- **Prediction:** a variant is not predicted (the original's look would flash); your own variant shots, beams and arcs
  are drawn from the server instead, one round trip behind. Plain spells predict as before. Beams online no longer wait
  on the local input state, which other players' clients never had.
- **HUD:** the online legend and spell name show the variant.
- Tests: `set_loadout` validation, lobby, start and lock over a real socket, per-seat loadouts in `MatchRunner`, the
  snapshot's variant, stale loadouts. Checked in two real browsers (Pyrodisk, Stone Lance, Plasma Beam, Chain Lightning,
  Pressure Jet seen by both sides, no page errors) and under load (20 players: 16.5% of one core, 603 KB/s out).

## 0.12.1-0 - 2026-10-15 AWST - Spells and style: Mark's batch merged

Mark's `test` branch merged into the team build (57 commits), hand-merged where it met the seat and team code:

- **Pyrodisk** replaces Flame Wave on Fire: a spinning fire ring that pierces wizards, hits each foe up to twice (out
  and back), and is limited to one disc per wizard. It flies on past the map edge, then returns to its caster at the end
  of its reach. Hitting a pillar, wall or enemy bubble turns an outbound disc for home, and a returning disc that meets
  one expires (the map edge is not an obstacle). Bubbles stop it at the edge, so nobody inside is hurt. It hits every foe
  through `targetsOf`, never the caster.
- **Tidal Surge and Solar Pulse removed.** Water has one alternative (Pressure Jet). The dead Tidal Surge code is gone
  and a saved loadout naming a variant a spell no longer offers falls back to the original spell.
- **Spellbook**: variants are picked in a dedicated modal with a description for each; the loadout panel in the menu
  is gone. The in-game spell legend shows the loadout, collapses, and only redraws when the loadout or selection changes.
- **Magnetic bomb**: wider, less damage, pulls inward, with an implosion effect and a horseshoe sprite. The pull checks
  the shield without a second "BLOCKED!" label.
- **Plasma beam**: silence builds slowly (10 per hit), the beam resets cleanly on every release and press; damage
  numbers batch every 0.2 s (was 0.5 s) for all spells.
- Prettier formatting kept; the variant test now allows Water's single alternative; new `tests/sim/pyro-disc.test.ts`.

## 0.12.0-3 - 2026-10-15 AWST - ARCHITECTURE fog paragraph

The fog paragraph in `docs/ARCHITECTURE.md` still described `Snapshot.p`, one viewer and `net.opponentHidden`; it
now describes team sight, `Snapshot.others` and `net.hiddenSeats`. No code change.

## 0.12.0-2 - 2026-10-15 AWST - HANDOFF fixes

`docs/HANDOFF.md` still said stages 0.7 to 0.10 and "2v2", described the fog with the old `Snapshot.p` and
`net.opponentHidden`, listed the server check twice, and its lobby note predated seats. Fixed. No code change.

## 0.12.0-1 - 2026-10-15 AWST - Docs touch-up

The roadmap still said 3v3 and 4v4 came after the release, the plan's title and the checklist's tested-version note
named only 2v2, and the setup note did not say 3v3 and 4v4 need six and eight windows. Fixed. No code change.

## 0.12.0-0 - 2026-10-15 AWST - 4 v 4

The lobby takes **4 v 4** (`MAX_TEAM_SIZE` 4, eight seats), and the arenas get a fourth start slot a side (a corner
one), so every map takes four a side. Eight players need eight different looks and there are exactly eight. Tests: an
eight player room seats `0,4,1,5,2,6,3,7`, starts with the right rules, and each player's snapshot has their three
teammates and none of the far-off enemies; a 4 v 4 on an arena starts eight wizards with eight different looks;
every start slot is in bounds and clear of scenery on every map (including the Dark Wizards' Circle). One browser with
seven scripted players showed an eight wizard match with an eight row team panel and no errors. Load, this machine:
Ruined Keep 4v4 500 KB/s and 7% of a core (one room), Enchanted Arena 4v4 (no fog) 711 KB/s and 7%, two 4v4 rooms
(16 players) 810 KB/s and 10.5%. Checklist section 38.

## 0.11.0-0 - 2026-10-15 AWST - 3 v 3

The lobby takes **3 v 3** (`MAX_TEAM_SIZE` 3, a new option in the picker, six seats). Arenas get a third start slot
a side (the leader, one below, one above); the battlegrounds already had four. Code written for N players
needed nothing else: seating, targeting, team vision, the team panel and the minimap all scale. Tests: a six
player room seats `0,3,1,4,2,5`, starts with the team size in the rules and sends every player a snapshot with five
others; a 3 v 3 on an arena starts six wizards and a request for 4 v 4 is held to the map's limit; slots stay in
bounds and clear of scenery on every map. Load (one room): Ruined Keep meet 283 KB/s and 6% of a core,
Enchanted Arena (no fog, everyone visible) 405 KB/s and 7%. Checklist section 37.

## 0.10.5-1 - 2026-10-15 AWST - Docs and checklist brought up to date

No code change. The checklist said team matches could not be started, that the lobby was duels-only, and used
old version numbers; fixed (sections 0, 30 to 34), with a note that sections 32, 35 and 36 need four windows.
`HANDOFF.md` rewritten (state, what is left for `1.0.0-0`, the seats and `game.p`/`game.e` warning),
`ARCHITECTURE.md` (the lobby and room diagram for seats, a team matches section), `README.md` (the lobby,
the load script), `TEAMS-PLAN.md` (a status block) and `ROADMAP.md`.

## 0.10.5-0 - 2026-10-15 AWST - 2 v 2 on the arenas

Every map now takes 2 v 2: the arenas have two start slots a side (the leader as before and a second one below,
mirrored for the other team) in `teamSpawns`; their `maxTeamSize` is 2. The server no longer needs to move a room
to another map when 2 v 2 is chosen (the 0.10.4-1 workaround is removed: it keeps the team size and the map).
Tests: all start slots on every map are in bounds and clear of scenery, a 2 v 2 on an arena starts four wizards,
and a room set to 2 v 2 on an arena keeps it when a player joins. Four browsers played a 2 v 2 on the Enchanted
Arena. Checklist section 36.

## 0.10.4-1 - 2026-10-15 AWST - Fix: 2 v 2 switched back to 1 v 1

Choosing **2 v 2** while an arena was the selected map (the default) was refused by the server, which quietly
made the room a duel again; the lobby then showed 1 v 1, and anyone joining found a duel. Now asking for bigger
teams on a map that cannot take them moves the room to the Ruined Keep, so the choice sticks (picking an arena
while the teams are big still shrinks the teams, and a room never shrinks below the players in it). Tests: 2 v 2
chosen on an arena, and a player joining such a room sees 2 v 2 on the Ruined Keep. I could not make a join
itself undo a 2 v 2 on a map that takes teams (checked with four windows and with simulated lag); if it
still happens, tell me the order of the clicks.

## 0.10.4-0 - 2026-10-15 AWST - Fix: team 2 could not move

Found by the first playtest of a 2v2: the second team's players were stuck at their spawn. The update loop
still gave only seats 0 and 1 their per-tick work, so seats 2 and 3 never walked, cast, or held a spray, and
their cooldowns, burns and other timers never counted down. Now every wizard is ticked, and every human-controlled
wizard walks and sprays (`update.ts`). Tests that fail on the old code: every seat walks and its timers tick,
and a held spray from seat 3 hits. Four scripted players on the Ruined Keep all walk (seats 0 to 3).

## 0.10.3-0 - 2026-10-15 AWST - 2v2 checked and measured

Last steps of stage 0.10 (0.10.1 to 0.10.3), nothing visible changes.

- Hit arrow and effects for teams: already correct (the arrow follows the shot that hit you from any enemy; fx
  are culled by the team's shared sight), checked in the 2v2 runs.
- The Ruined Keep for four: a search shows every team start slot can walk to every other, on top of the clear and
  mirrored slots already tested.
- `tests/load.mjs` takes a team size (`node tests/load.mjs 1,2 10 ruins meet 2`). A 2v2 room is about 115 KB/s and
  4 to 5% of a core (`docs/ROADMAP.md`); no change to the snapshot format is needed.

## 0.10.0-0 - 2026-10-15 AWST - The client for team matches

First step of stage 0.10: team matches can be started and played. `PROTOCOL_VERSION` is now 11 (`start` and
`rematch_start` carry the whole `rules`). The switch that blocked team matches (`teamMatches`) is on.

- Colours: your team is green and the other red, in solo and online (the old "you are red online" is gone).
  The hint says "Your team is GREEN".
- A team panel on the canvas (`render/teamHud.ts`): both teams' wizards with health, "?" for enemies not seen,
  FALLEN or the wait to respawn; the kill score in a respawn match; and a banner when you have fallen. The top
  bar shows "ENEMIES STANDING n".
- Fog is a shared layer with a clear hole around you **and every standing teammate**; the minimap shows
  teammates always (green) and enemies only when the team sees them (red).
- A fallen player's camera follows a standing teammate; fallen wizards are not drawn and a fallen player's
  keys, casts and previews do nothing.
- Other changes: the end text, the HUD lines and the hit arrow work for a team of any size; a hidden enemy's
  name is not shown.
- Checked with four real browsers (2v2 start, panel, minimap, shared fog) and a scripted bot team killing a
  browser player: the fallen banner and camera, the panel, and the respawn rule (score 0 - 1, "Back in 4 s").
  Checklist section 35, which asks you to play it.

## 0.9.2-0 - 2026-10-15 AWST - Team vision

Third step of stage 0.9. The server culls snapshots by the **team's** combined sight: an enemy, their shots
and effects are sent if any standing member of the viewer's team could see them; the team's own wizards and
things are always sent; a fallen teammate no longer shares sight; everything is shown at the end of a round.
In a duel nothing changes. Tests for each case. Checklist section 34.

## 0.9.1-0 - 2026-10-15 AWST - The respawn rule

In a respawn team match a fallen wizard scores for the other team, waits 5 seconds (`TEAM_RESPAWN_TICKS`,
`Wizard.returnIn`) and comes back at their start with full health (`game.starts`, kept per seat); the round
ends when a team reaches `rules.killTarget` kills (10). `game.score` is in the snapshot. A duel with the
respawn rule is still one life. Tests: scoring, the wait, coming back, being untouchable while down, reaching
the target, the snapshot.

## 0.9.0-0 - 2026-10-15 AWST - Elimination

First step of stage 0.9. `Wizard.fallen`: when a wizard's health runs out they are out of the round
(`resolveDeaths` handles every wizard, not just seats 0 and 1). The round ends only when a team has no
one left, with the winner by team; before that a `fall` event, a burst and "FALLEN!" and the snapshot's
`fallen` flag tell everyone. A fallen wizard cannot be hit or targeted (`untouchable`), walk, charge or cast, and
`nearestFoe` skips them. Friendly fire is tested for sprays, bombs and traps, on and off. In a duel the first
fall still ends the round. Tests in `tests/sim/team-rules.test.ts`.

## 0.8.3-0 - 2026-10-15 AWST - Mark's spell variants, second batch, merged

Merged `origin/test` (44 commits from Mark) into `test-jesse`. Conflicts in `combat.ts`, `update.ts`,
`types.ts`, `flow.ts` and a test were resolved by keeping both: his variants run through the team
targeting (`targetsOf`), so area and beam variants hit every enemy they should (beams the nearest one).
Two type errors in his code were fixed (`hit` on the lightning arc, a dead comparison). Written from his commits.

## Mark, on 0.8.2-0 - 2026-10-15 AWST - More spell variants

- A variant for every spell in the solo loadout (Fire, Water, Lightning, Earth, Steam, Plasma, Magma, Storm,
  Ice, Magnetic): Pebble Spray, Stone Lance, Fireball, Flame Wave, Pressure Jet, Tidal Surge, Chain Lightning,
  Static Discharge, Lava Pool, Molten Shrapnel, Frost Shards, Glacial Spike, Plasma Beam, Unstable Orb,
  Scalding Mist, Steam Burst, Thundercloud, Gale Force, Magnetic Pull, Iron Swarm.
- Held beams (plasma, magnetic) travel out and retract on release; per-variant sprites and effects.
- Checklist section 33.

## 0.8.2-0 - 2026-10-15 AWST - The team lobby

Last step of stage 0.8. `PROTOCOL_VERSION` is now 10. A 2v2 can be set up and looked at but not started yet.

- Lobby screen: MAP, TEAM SIZE (1 v 1 or 2 v 2), and for team matches **Friendly fire** and **When a wizard
  falls** (out until the round ends, or back after a delay), then the two team columns with named seats
  (Host, Player 2...). The creator changes everything; joiners see it read-only. Maps that do not take the
  team size are greyed out. The host moves a player across with **⇄** (into an open seat, or swapping with
  whoever sits there); the host's own seat stays put.
- Protocol: `LobbyOptions` gains `friendlyFire` and `deathRule`; new `move_seat {from, to}` (creator only);
  `MAX_TEAM_SIZE` is 2 for now (3v3 and 4v4 are `1.1.0` and `1.2.0`). The rules reach the sim as
  `game.rules` (friendly fire already works in the targeting; the death rule comes in 0.9).
- Starting a team match is switched off (`teamMatches` in `server/rooms.ts`, on in tests): the creator gets
  "Team matches cannot be started yet" until the rules and the client are ready (0.9 and 0.10). A duel is
  unaffected.
- The client sends a change to its stored options straight away, so two quick changes do not overwrite each other.
- Tests: seat moves (swap, into an empty seat, creator-only, creator fixed), the start switch, validation of
  the new options and `move_seat`. Four real browsers: filling the lobby, moving a player, options syncing to
  everyone, greyed-out arenas, the START message. Checklist section 32.

## 0.8.1-0 - 2026-10-15 AWST - Rooms by seat

Second step of stage 0.8. `PROTOCOL_VERSION` is now 9. The lobby screen still shows a duel (team size comes in 0.8.2).

- A room has `2 x teamSize` seats and a new option, `teamSize` (1 to 4; a map takes up to its
  `maxTeamSize`, so an arena makes it a duel again). Joining fills the next free seat in `joinOrder`: the creator
  (team 0), then team 1's first seat, then team 0's second, and so on, so a room stays balanced.
- Changing the team size re-seats the players (resume tokens go with them) and is refused if the new room would
  have fewer seats than players. A player leaving the lobby frees their seat; the match starts only when every
  seat is taken.
- Messages: `lobby` now has `seats` (taken or not, by seat) and `youSeat` instead of `guestPresent`; `start`
  and `rematch_start` carry `teamSize`; `set_options` carries it too (validated 1..4). The client sends the
  whole options object back with a map change (`net.lobbyOptions`) and its lobby text counts seats ("Share the
  code and wait for players (2/4)").
- Tests: seating order across four players, starting only when full, a 2v2 start with the right seats and
  team size and four-wizard snapshots, re-seating and refusing a size that does not fit, a map's limit,
  validation, and the join order. A duel through the real client (lobby, fog, kill, DEFEAT screen) still works.
  Checklist section 31.

## 0.8.0-0 - 2026-10-15 AWST - Team spawns and N-wizard matches

First step of stage 0.8 of the team matches plan (reordered: spawns first). A duel plays as before; there is
no way to start a team match from the menu yet.

- `MapDef.teamSpawns`: four start slots per team on both battlegrounds (the leader in front), the right
  team a mirror of the left; `maxTeamSize(map)` (1 for arenas) and `startPositions(map, teamSize,
round)`, which swaps the teams' sides every other round like the duel does.
- `resetMatch` starts `2 x teamSize` wizards (team size from `rules`, kept within what the map takes):
  seats `0..T-1` are team 0, the rest team 1, each with an input facing the other team, and styles taken by
  seat. `MatchSetup.styles` is a list now. `MatchRunner.start(round, map, rules)` shuffles all eight
  looks so everyone in a match looks different.
- Tests: a 2v2 starts four wizards on the right sides with different looks, swaps sides on rematch, is a
  duel on arena maps and capped on small ones, slots are clear of scenery and mirrored; the server runner
  runs a 2v2 and each seat gets its own snapshot with its teammate. Checklist section 30.

## 0.7.3-0 - 2026-10-15 AWST - The client draws a list of wizards

Last step of stage 0.7 of the team matches plan. Still 1v1, and it should look and play the same.

- The client keeps `game.wizards` indexed by seat, like the sim (online it no longer reshuffles them
  into "rival = `p`, you = `e`"). New helpers in `client/src/state.ts`: `me()`, `others()`, `rival()`,
  `isHidden(w)`, `mySeat()`, `localInput()`, and `greenSide(w)` (the old colour convention).
- Fog and interpolation are per seat: `net.hiddenSeats`, `net.samples` and `net.visual` replace the
  single "opponent" fields (`net.visualP` / `visualE` stay for the test scripts); a wizard out of sight
  keeps its last seen state in the list. `interpolatedPosition(seat, now)` replaces `interpolatedOpponent`.
- Drawing, the minimap, the hit arrow, cast previews and the HUD loop over wizards instead of naming
  two of them; wizards are drawn in order of height with a reused array.
- Fix: the end-of-match text "Remaining health" showed the rival's health online; it shows yours.
- Checked in two real browsers (fog, appearing, death and the DEFEAT screen) and a solo match.
  Checklist section 29, which asks for a real two-person match.

## 0.7.2-0 - 2026-10-15 AWST - Seats and protocol 8

Third step of the team matches plan. `PROTOCOL_VERSION` is now 8. Play is still 1v1 and should look the same.

- `WizardId` ('p' | 'e') is gone: a wizard is identified by its **seat** (a number, an index into
  `SimState.wizards`), in the sim, the events, the rooms and on the wire. `SimState.input` is indexed by
  seat. The update loop treats every human-controlled wizard the same way (`humanControlled`, one
  `walkAndSpray`), so it no longer special-cases `p` and `e`.
- Snapshots: `you` (your wizard, with cooldowns) and `others` (every other wizard you can see; a
  hidden one is simply missing), no more `p`/`e` swap and no fx flipping. Wizards carry `seat` and
  `team`; owners, fx events and the death record use absolute seats.
- Messages: `created`, `joined`, `resumed`, `start` and `rematch_start` carry your `seat`;
  `death_start` has the loser's seat, and `winner` in `death_start` / `finished` now simply means "your team won"
  (the client used to invert it).
- Rooms hold players, tokens and away timers by seat (two seats for now). The client keeps its own
  seat in `net.seat` and draws the rival as `game.p` and itself as `game.e` until 0.7.3 moves it to a list.
- Tests moved to seats and the new snapshot (about 230 lines touched). Two real browsers, plus a
  browser against a scripted player that kills it: the death messages and the DEFEAT screen are right.
  Checklist section 28.

## 0.7.1-0 - 2026-10-15 AWST - Targeting for teams

Second step of the team matches plan. No behaviour change in a 1v1.

- New `shared/sim/teams.ts`: `canHurt` (enemies always, teammates with friendly fire), `targetsOf`
  (who an owner's attacks can hurt, optionally including the owner), `nearestFoe` and `untouchable`
  (the dummy waiting to respawn). Every "the other wizard" in the sim now goes through them: projectiles,
  bombs, zones, traps, sprays, the jet, lightning, force, the sword's target, magnetic homing.
- Attacks that cover an area now loop over everyone they can hurt: the fire and water sprays and the
  jet hit every enemy in the cone, force pushes every enemy in reach, a bomb or zone hurts every enemy in
  range, and lightning strikes the nearest wizard in its path. `force` no longer takes a target.
- Fix: traps were clamped to the old 800x600 area (x up to 760) on every map, so on a battleground
  they could not be set past that; the sim and the client's preview now use the map's size.
- The `input` record and `WizardId` stay as they are; they move to seats with the wire format in
  0.7.2 (the plan says so).
- Tests (`tests/sim/teams.test.ts`) use a 2v2 on the Ruined Keep: who can be hurt with and without
  friendly fire, each attack against several wizards, the dummy, and the trap fix. Two browsers online
  again. Checklist section 27.

## 0.7.0-0 - 2026-10-15 AWST - A match is a list of wizards

First step of the team matches plan (`docs/TEAMS-PLAN.md`). No behaviour change; 1v1 only.

- `SimState.wizards` is the list of everyone in the match, indexed by seat; `Wizard` gets `seat` and
  `team` (0 or 1); `game.rules` holds the match rules (`teamSize`, `friendlyFire`, `deathRule`, from
  `MatchSetup.rules`, default a duel). `make()` takes the seat and team.
- `game.p` and `game.e` are now aliases for `wizards[0]` and `wizards[1]` (`withSeatAliases`). They are
  accessors that spreads and JSON skip, so the client calls it again after copying the state. They
  go away as the sim and client move to the list (0.7.1 to 0.7.3). A dummy that respawns keeps its seat.
- `WizardId` ('p' | 'e'), the keyed `input` and the wire format are unchanged for now; the plan's
  0.7.0 and 0.7.2 steps were adjusted to say so.
- Tests: seats and teams, the aliases both ways and after a spread, the dummy respawn, rules defaults
  and per-match rules. Also checked in two real browsers (online) and a solo match. Checklist section 26.

## 0.6.9-0 - 2026-10-15 AWST - 1.0.0 means a full 2v2 lobby

No code change. `docs/TEAMS-PLAN.md` spells out what `1.0.0-0` needs: a complete team lobby (teams,
named seats, moving players, all options, start when full, rematch), 2v2 playing properly online with
shared vision, both death rules and per-seat reconnect, and the checklist run by two or more people.
3v3 and 4v4 are minor updates (`1.1.0-0`, `1.2.0-0`) after it.

## 0.6.8-0 - 2026-10-15 AWST - Team plan renumbered

No code change. The team-match plan (`docs/TEAMS-PLAN.md`) now continues the 0.x line: stages are 0.7
(N wizards), 0.8 (rooms and lobby), 0.9 (team rules) and 0.10 (playing it); `1.0.0-0` is 2v2 playable,
`1.1.0-0` 3v3, `1.2.0-0` 4v4. The earlier "1.0.0" label for the maps work is dropped in the other docs.

## 0.6.7-0 - 2026-10-15 AWST - Plan for team matches

No code change. `docs/TEAMS-PLAN.md`: 2v2 first (2.0.0), then 3v3 and 4v4, with the decisions made
(humans only; friendly fire and death rule as lobby options; shared team vision), the design (seats
and teams, `canHurt`, per-viewer snapshots, spawns per team, protocol 8) and the steps 1.1 to 2.2. PR #13
(the road to 1.0.0) is merged into `main`; `test-jesse` is fast-forwarded to it.

## 0.6.6-0 - 2026-10-15 AWST - Docs brought up to date

No code change. Ahead of the pull request into `main`.

- `docs/HANDOFF.md` rewritten for the current state (branches and owners, workflow, what is left),
  `README.md` (layout, tests, workflow, hooks, Caddy), `docs/ARCHITECTURE.md` (maps, vision, snapshot
  culling, file list), `docs/ROADMAP.md` (next).
- `docs/MAPS-PLAN.md` is kept as it was written, with its status saying it was carried out and what
  changed on the way.
- Removed what was out of date: the old 210-test count, 22 KB/s and arena-only wording, Render
  hosting notes, the `latency-test` version note and the finished clean-up items.
- Checklist: tested version is 0.6.6-0.

## 0.6.5-0 - 2026-10-15 AWST - Mark's spell variants merged

Merged `origin/test` (Mark) into `test-jesse`; conflicts in `shared/sim/match.ts` and `input.ts`
(spawn rounds vs his loadout, charge power) resolved by keeping both. Written from his commits.

## Mark, on 0.4.2-0 - 2026-10-15 AWST - Spell variants (solo prototype)

- A per-match **spell loadout**: Earth Pebble Spray, Fire Fireball, Water Pressure Jet, Ice Frost
  Shards, each an alternative to the original (`shared/sim/variants.ts`, mechanics in `combat.ts`).
  Chosen in the menu for solo matches and locked for the match; online keeps the original spells.
- The HUD shows the equipped variant; new pebble fireball and frost shard sprites.
- Tests: `tests/sim/spell-variants.test.ts`. Checklist section 25.

## 0.6.4-0 - 2026-10-15 AWST - Git hooks, wizard art formatted

Process. Prettier is now enforced automatically.

- `.githooks/pre-commit` formats the staged files; `.githooks/pre-push` runs the Prettier check, the
  typecheck and the tests. `npm install` turns them on (`prepare` script); `npm run prepare` does it
  by hand. `--no-verify` skips them.
- `client/src/render/actor.ts` (Mark's wizard art) is now formatted and no longer in `.prettierignore`
  (removed). **Mark:** if you have unmerged edits to this file, merge `test-jesse` first and expect
  whitespace-only conflicts; resolve by taking your version and running `npx prettier --write` on it.
- `AGENTS.md` and `docs/WORKFLOW.md` say so.

## 0.6.3-0 - 2026-10-15 AWST - Clean-up

No behaviour change.

- Comments on the new map, vision, fog, minimap and test-tool code cut to what the code does not say.
- Fog: the colour stops are worked out once per radius, not every frame. Wizards are drawn with two
  calls instead of building, filtering and sorting arrays each frame.
- Removed: `styleFromIndex` (unused), an unused import, `CHARGE_POWER_MIN_TICKS` (0.6.0). The minimap
  reuses `isRect` from `shared/sim/obstacles.ts`.
- Moved `earthVisibility.ts` next to the prediction code that uses it (`client/src/net/`); renamed
  the predicted shot's `confirmed` to `hitSomething` (it meant "hit something").
- Not touched: the wizard art (`actor.ts`, Mark) and the bomb sprites in `scene.ts`; their per-frame
  arrays are still on the list in `docs/HANDOFF.md`. Checklist section 24.

## 0.6.2-0 - 2026-10-15 AWST - Sides swap on a battleground rematch

Spawn fairness. Both battlegrounds are laid out the same on both sides, but nobody should always start
on the same side. On a battleground the creator and the guest swap start positions every other
round (`spawnsFor` in `shared/maps.ts`, from the room's round number); arenas never swap.
Server-side only: the first snapshot puts everyone in place. The Ruined Keep already is an exact
mirror image (tested). Tests: the swap rule, the match start, the server's rematch. Checklist
section 23.

## 0.6.1-0 - 2026-10-15 AWST - Minimap

A corner map on battlegrounds (`client/src/render/minimap.ts`, maths in `minimapMath.ts`): the
walls and stones (painted once per map), the part of the map on screen, you, and the rival only
while they are in sight, so it shows nothing the fog hides. Tests for the scaling. Checked by eye
in a solo match. Checklist section 22.

## 0.6.0-0 - 2026-10-15 AWST - Mark's wizard designs and balance merged

Start of the polish stage. Merged `origin/test` (Mark) into `test-jesse`; no conflicts. Mark did not
add changelog entries or checklist items for these, so they were written from his commits.

## Mark, on 0.4.2-0 - 2026-10-15 AWST - Balance: charge damage and lightning

- Charged projectiles: damage now grows linearly from 1x (a tap) to 3x (full charge, 90 ticks); the
  jump at 20 ticks (1.5x) is gone. `CHARGE_POWER_MIN_TICKS` removed.
- Lightning: 40 damage per second (was 15 per hit), and 80 per second at full Wet (the Wet bonus
  is `1 + wet/100`, was `1 + 1.5*wet/100`).

## Mark, on 0.4.2-0 - 2026-10-14 AWST - Wizard designs and solo wizard choice

- Eight canvas wizard designs with matching staves, textures, glowing staves, idle offhand
  artifacts, and charge effects anchored to the staff tip (`client/src/render/actor.ts`);
  painted Ember Mage.
- Menu: a **YOUR WIZARD** picker for solo matches (online styles stay server-assigned).
- Blocked Fire shows its BLOCKED! label at most once a second per wizard.
- Left out of the merge, by Mark: the AI difficulty selector and the Temple art prototype. His
  menu restyling was reverted.
- `client/src/render/actor.ts` is listed in `.prettierignore` so the merge does not reformat it
  (Mark edits it daily); format it in a commit of its own and delete the entry.
- Checklist section 21.

## 0.5.2-0 - 2026-10-15 AWST - Measured

Sixteenth step of the road to 1.0.0: the measuring step of the server-decoupling stage. No game change.

- `tests/load.mjs` takes a map and a scenario: `node tests/load.mjs 1,2 10 ruins meet`. `wander` is
  the old random walking (on a big map the players rarely see each other); `meet` has both walk
  straight at each other (the busiest case on a battleground). The host picks the map in the lobby.
- Results in `docs/ROADMAP.md`: arenas are unchanged in bandwidth (55 vs the 54 KB/s baseline); fog of
  war cuts about 30% off when players are out of sight of each other and still comes in under an
  arena when they meet; about 4-5% of a core per match. No binary or delta snapshot format is
  needed yet.
- Checklist section 20: Jesse checks `/stats` during a real two-person match.

## 0.5.1-0 - 2026-10-15 AWST - Caddy serves the client

Fifteenth step of the road to 1.0.0. Deployment only; the game itself is unchanged.

- `deploy/oracle/caddy.sh` writes the server's Caddyfile: Caddy serves each slot's `dist/client`
  itself (compressed with zstd/gzip) and passes only `/ws`, `/stats` and `/version` to that
  slot's Node process, so Node spends its time on matches. It validates the config before
  replacing the old one and keeps the old as `/etc/caddy/Caddyfile.previous`. `setup.sh` runs it
  after the first deploy. `docs/DEPLOY-ORACLE.md` says how to apply it and how to go back.
- Caching, fixed: only the hashed files in `assets/` are cached for good. The page and the images in
  `arena/` (no hash in their names) are now revalidated, so changed artwork shows up without a hard
  refresh. Both Caddy and the Node fallback (`server/static.ts`) do this.
- Node still serves the client when run alone (`npm start`), and an old proxy-only Caddy config
  keeps working, so nothing breaks if the new config is not applied yet.
- Tests: the Node fallback's caching, 404 and path handling (`tests/server/static.test.ts`). The Caddy
  config could not be run here (no Caddy on the dev machine); `caddy.sh` validates it on the
  server first. **Not yet applied to the Oracle server** (needs Jesse: see DEPLOY-ORACLE.md). Checklist
  section 19.

## 0.5.0-0 - 2026-10-15 AWST - Split map data

Fourteenth step of the road to 1.0.0. The split already held (map data in `shared/`, art in
`client/`); this makes it a checked rule. No code or behaviour change in the game.

- `tests/server/boundary.test.ts` reads the real import graph from `server/index.ts` and fails if the
  server can reach anything outside `server/` and `shared/` (the client or any art), if anything
  it loads touches the browser (`document`, `window`, canvas, `Image`), or if the map data files
  import anything but other shared files. It was checked against a deliberate bad import.
- The same test fails if a map id has no picker entry (name, icon) in the client, or the client lists
  a map the shared data doesn't have.
- Documented where each part of a map lives (`docs/ARCHITECTURE.md`). Checklist section 18.

## 0.4.2-0 - 2026-10-15 AWST - Fog of war

Thirteenth step of the road to 1.0.0. Client only; no protocol change.

- A dark ring closes in around your wizard on maps with a vision radius: clear in the middle,
  solid black at the radius (`client/src/render/fog.ts`, the maths in `fogMath.ts`). Anything in the
  world beyond your sight, rival or scenery, disappears into it; the HUD is not darkened. Solo
  battlegrounds get it too, and the server's culling (0.4.1) does the real hiding online.
- `BATTLEGROUND_VISION` is now 440 (was 560): 560 reached past every edge of the 800x600 screen, so the
  fog could not be seen. At 440 the sides of the screen are nearly black and the top and bottom
  partly lit. Spells reach further (450), so you can be shot from out of sight.
- A hit from out of sight: the shot that hit you (found among the previous snapshot's enemy
  shots) gives the direction, and a red arrow at the edge of the screen points back along its path
  for about 1.5 s. Bombs, burns and zones have no direction and show no arrow.
- Fix: your own predicted shots (guest-side effects) were only drawn inside the old 800x600
  area; they now follow the map's size.
- Tests: fog darkness curve, arrow position on the screen edge, direction from shots. Checked by
  eye in a solo match on the Ruined Keep. Checklist section 17.

## 0.4.1-0 - 2026-10-15 AWST - Server-side culling

Twelfth step of the road to 1.0.0. `PROTOCOL_VERSION` is now 7.

- On maps with a vision radius (the battlegrounds), `serializeSnapshot` only sends what the viewer can
  see plus a 100-unit margin (`VISION_MARGIN`): the opponent (`Snapshot.p` is `null` while they are
  out of sight), their shots, bombs, zones, traps, bubbles and effects. A modified client can no
  longer read the enemy's position out of the network traffic. Your own things are always sent, and
  everything is shown once the round is ending. Arenas are unchanged.
- Client: while the opponent is hidden, `game.p` keeps where they were last seen, they are not drawn
  or used in predicted shot collision, the HUD says "RIVAL out of sight", and their position
  history is dropped so they appear in the right place when they return (`net.opponentHidden`).
- Fix found while testing: the Ruined Keep's gatehouse gap was off the road; it now lines up with
  the spawns.
- Tests: the opponent and each kind of object are culled and kept as expected (including big
  zones whose edge reaches into sight and lightning with one end in sight), nothing about a hidden
  opponent is in the JSON, round end shows all, arenas unchanged; two real browsers on the Ruined
  Keep saw "out of sight" at the start and the rival after walking together. Load test
  (`node tests/load.mjs 1 2`, arena, so no culling): ~5.5% of a core, 50 KB/s, 60 MB. Checklist
  section 16.
- Not yet: the fog drawing and fade (0.4.2).

## 0.4.0-0 - 2026-10-15 AWST - Vision radius

Eleventh step of the road to 1.0.0, start of fog of war. Data and rules only; nothing is hidden yet.

- `MapDef.vision`: how far a wizard sees, in game units. `null` on arenas (everything visible), 560
  (`BATTLEGROUND_VISION`) on both battlegrounds: it reaches a little past the sides of the 800x600
  screen and fades toward its corners.
- `canSee(map, viewer, target, extra)` in `shared/sim/vision.ts`: the one rule the server (0.4.1,
  what to send) and the client (0.4.2, the fog) will both use.
- Tests: arenas see everything, battlegrounds see up to the radius and not beyond, the margin widens
  it, and the two spawns of a battleground cannot see each other. Checklist section 15.

## 0.3.2-0 - 2026-10-15 AWST - The Ruined Keep

Tenth step of the road to 1.0.0: the first real battleground. Online and solo, no fog yet (that is 0.4).

- **Ruined Keep** (`ruins`, 2400x1800): a ruined stronghold with a walled keep in the middle (a gap
  in each side), a gatehouse wall across each approach road, low walls cutting the north and south
  routes and mossy standing stones. The first map to use rectangle obstacles (0.3.1).
- Authored as the left half and mirrored (`shared/ruinsMap.ts`), so both spawns get the same cover.
  Spawns far apart at left and right, like the development battleground.
- Art in `client/src/render/ruins.ts`: mossy ground, dirt roads, flagstone courtyard, stone walls,
  cached in tiles like the development battleground.
- In the menu and lobby under **Battlegrounds**, next to the Development Battleground.
- Tests: mirror image, everything inside the world, spawns clear, and a wizard can walk from one
  spawn to the other (a search over the map). Checklist section 14.

## 0.3.1-0 - 2026-10-15 AWST - Obstacle lookup

Ninth step of the road to 1.0.0. Nothing should look different.

- Walking, shots, spell checks and trap placement used to test every obstacle in the map. They now
  ask a spatial grid (`shared/sim/obstacles.ts`, 128-unit cells, built once per map) for the
  obstacles near them, so the cost no longer grows with the map. Maps with fewer than 12 obstacles
  (all arenas) skip the grid.
- Rectangle obstacles (`RectObstacle`: centre, half width, half height) work next to circles for
  walking, shots (`ray`) and spell placement. `MapDef.obstacles` is a list of `Solid`s. No map uses
  rectangles yet; the first real battleground (0.3.2) will.
- Tests: rectangles block walking, shots and placement; on 300 random circles and rectangles the grid
  gives the same answers as testing everything (2000 shots, 3000 points). Checklist section 13.

## 0.3.0-0 - 2026-10-15 AWST - Spawns

Eighth step of the road to 1.0.0. Per-map spawns already existed (0.1.0); this removes the last
fixed arena positions from the simulation so they really are per map.

- A defeated dummy respawns at the map's spawn (it was a fixed `645, 300`, the middle of the
  development battleground).
- Each wizard's starting aim is the other's spawn, so they face each other on any map (arenas look
  the same: both still face inward).
- Tests: spawns are far apart on every map (over half the map's width on battlegrounds), starting
  aim, dummy respawn on the development battleground. Checklist section 12.

## 0.2.3-0 - 2026-10-15 AWST - Team workflow

Process, no gameplay change. Rules so Jesse and Mark (and their AI assistants) work in step.

- `AGENTS.md` (also loaded by Claude through `CLAUDE.md`): ten short rules: branch check, pull and
  merge at session start, push at session end, Jesse owns versions, changelog format for Mark
  (`## Mark, on <version> - ...`), test checklist, checks, slots, merging, code rules.
- `docs/WORKFLOW.md`: the detail, the fast-forward hand-off and the testing prompts.
- `npm run check-version` (`scripts/check-version.mjs`): fails if the version places or the newest
  changelog entry disagree.
- `docs/TEST-CHECKLIST.md`: branch-to-slot table and "your slot URL" instead of a hard-coded 8082.

## 0.2.2-1 - 2026-10-14 AWST - Projectiles on big maps

Fix. The simulation removed any projectile that left a fixed 800x600 area (`shared/sim/update.ts`),
so on a battleground every shot vanished as soon as it passed x=840 or y=640, in solo and online.
It now uses the match map's size (plus the same 40-unit margin). Tests: a shot keeps flying past
800 on the development battleground and goes out at its real edge; on an arena it is still removed
just past the edge.

## 0.2.2-0 - 2026-10-14 AWST - Draw only what is visible

Seventh step of the road to 1.0.0, client only. Nothing should look different.

- Big backgrounds are painted once into 512-unit tiles (`client/src/render/chunks.ts`) and only the
  tiles in view are copied each frame. The development battleground uses it; the arenas are one
  screen and are drawn as before.
- Zones, traps, wizards, bombs, shots, bubbles, particles and floating text outside the viewport
  (with a margin for big effects) are not drawn. Lightning arcs and waves are not culled yet.
- Tests for the visibility rule.

## 0.2.1-0 - 2026-10-14 AWST - Development battleground

Sixth step of the road to 1.0.0. The first big map, so the camera has something to follow.

- **Development Battleground** (`devbattle`): 2400x1800, 40 stones scattered by a fixed generator,
  spawns far apart on the left and right. It appears under **Battlegrounds** in the menu and lobby.
  The art is a placeholder (tiled field, border, stones; only what is in view is drawn).
- Aim in world space: the crosshair and spell targets already go through the camera (0.2.0); this
  map is where that is exercised. The simulation needed no change, because it already reads size,
  bounds and spawns from the map.
- Tests: the camera moves on a big map, a wizard can walk across it, stones stay inside the world
  and off the spawns, a server match runs on it.

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
