Warning: truncated output (original token count: 46128)
Total output lines: 1981

# Changelog

## Mark, on 0.45.1-0 - 2026-10-26 AWST - Spell effects stop at obstacles

- Sprays and Lightning now render behind pillars when their effects are behind them. Moving Fire and Water spray particles stop at obstacle surfaces instead of drifting through them.
- Projectiles spawned with their collision radius already inside an obstacle now stop immediately. Lightning target selection now respects its wall endpoint, so it cannot hit through a pillar.
- Added regression coverage for blocked Lightning, projectiles spawned inside pillars, particle collision, and pillar glow occlusion.

## 0.45.1-0 - 2026-10-25 AWST - Greater Heal on E, E

- Greater Heal is now **E, then E again** (it was E, then 2). The first E loads healing as before (E then Space is still the Healing Shield); the second casts the heal. 2 after E now just loads Water and clears the healing. The tooltip and hint say so.
- Online, the second E now also counts as a spell action for the spell-delay readout (the old 2 did not, by an ordering slip).

## Mark, on 0.45.1-0 - 2026-10-26 AWST - Mage Makeover robe icon

- Replaced the Mage Makeover menu banner with the square parchment robe icon.
- Hide the button while the Practice menu is open, and restore it when returning to the main menu.

## Mark, on 0.45.1-0 - 2026-10-26 AWST - Floating grips for selected offhands

- Added atlas offhands 3, 6 and 10 to the Wizard Workshop with an independently editable,
  skin-tinted floating left-hand grip for each item. Developer Tools saves each grip layout
  separately, and the item and grip move together while walking in a match.

## Mark, on 0.45.1-0 - 2026-10-26 AWST - Update offhand grip skin tint

- Re-tint the floating offhand grip whenever the Workshop skin tone changes, including when
  reloading, randomising or resetting an appearance.

## 0.45.0-0 - 2026-10-25 AWST - Sword aims at the cursor; Tempest Bolt lag; hidden beam casters

- **Sword aim:** F now swings toward the cursor, not toward the nearest enemy, and hits every enemy within 80 pixels inside the quarter circle (45 degrees either side) of that direction, if no wall is between. A foe close by but outside the quarter is missed. The swing arc drawn is the same quarter. `SWORD` in `shared/constants.ts` holds the range and arc; `sword(game, wizard, aim)` takes an angle now (the AI aims at its target).
- **Tempest Bolt lag:** each bolt on screen applied a canvas filter and blurred shadow to its picture, and drew about 25 blurred strokes, every frame. The tinted, glowing comet is now drawn once into a bitmap and reused, and the small strokes have no blur. This is what pushed input delay to about 600 ms.
- **Beams from out of sight:** an enemy's beam was drawn from where that wizard was last seen, which can be anywhere (even behind you) when they fire from out of sight. A beam from a caster you can't see now starts where the server fired it.

## 0.44.9-0 - 2026-10-25 AWST - Small trash button for outfits

- Delete outfit is now a small red trash-can button on the same line as the "Outfits" title, at the right, so it no longer sits over the carousel. The second click is still needed: the icon turns into a tick for 3 s.

## 0.44.8-0 - 2026-10-25 AWST - Delete outfit button no longer clipped

- Fix: the Delete outfit button ran off the right edge of the Outfits box. Its right edge now lines up with the right arrow.

## 0.44.7-0 - 2026-10-25 AWST - Delete outfit button position

- The Delete outfit button now has space from the right edge and is lined up with the Outfits carousel's right arrow.

## 0.44.6-0 - 2026-10-25 AWST - Choose your appearance; Random changes colours too

- The Workshop's "Mix & Match" panel is now **Choose your appearance**, and the small explanation paragraphs under Skin tone and Item colour are gone ("Skin tone (new grayscale heads)" is just "Skin tone").
- Fix: **Random** only changed the parts. It now also picks a random skin tone and a random hat and robe colour (which can be the original colours).

## 0.44.5-0 - 2026-10-25 AWST - Tidier Outfits box

- The Wizard Workshop's Outfits box is now just the picture carousel with **Delete outfit** at its top right. The name box and the explanation paragraph are gone (the "N of 8" count too), so outfits can no longer be renamed in the Workshop; the rename code in `slots.ts` stays.

## 0.44.4-0 - 2026-10-25 AWST - No outfit dropdown in the lobby

- Removed the Outfit dropdown from the lobby footer: outfits are chosen in the Mage Makeover (Wizard Workshop) only, and the selected outfit is still the look other players see. The pure code it used (`setOptionIcons` for dropdown pictures) stays, as the pair editor's Head / Body dropdown uses it.

## 0.44.3-0 - 2026-10-25 AWST - Clicking an outfit shows it in the Mage Makeover

- Fix: clicking an outfit tile saved and switched the outfit, but the Workshop's pickers and preview kept showing the old one (only the saved look was reloaded). Putting on an outfit (a tile, the lobby dropdown, or the account's outfits arriving) now fires `arcane-wizard-outfit-worn`, and the Workshop redraws its pickers, colours, preview and editors from it.

## 0.44.2-0 - 2026-10-25 AWST - Whole wizard in the outfit pictures

- The outfit pictures now show the boots, the offhand (shield or bare hand in the outfit's skin tone) and the main-hand staff as well as the robe, head and hat, and the tiles are larger (`size: 'large'` for `createCarousel`, `.ui-carousel--large`). Empty choices (no hat, no staff, no offhand) are simply left out. The lobby dropdown shows the same picture.

## 0.44.1-0 - 2026-10-25 AWST - Outfits as picture tiles with a plus

- The Workshop's Outfits row is now a carousel of picture tiles, one small wizard per outfit (robe, head and hat in that outfit's own skin tone and dyes), instead of text buttons. A dashed **+** tile at the end adds an outfit (copying what you are wearing) and greys out at 8. The New outfit button is gone; the name box and Delete outfit stay under the row.
- The lobby's Outfit dropdown shows each outfit's picture before its name (`setOptionIcons`).
- `createCarousel` gets an optional `add` tile (the +). The picture is built by the pure `outfitLayers()` (`outfitLayers.ts`, tested) and drawn by `outfitIcon()` (`outfitIcon.ts`), styled by `.ui-outfit-icon` and `.ui-carousel__add` in `components.css`.

## 0.44.0-0 - 2026-10-25 AWST - Outfits: up to 8 saved appearances per player (migration 3)

- Players can keep up to 8 named outfits. The Wizard Workshop has a new **Outfits** row: pick one, rename it, **New outfit** (copies what you are wearing and selects it, so you can change it and keep the old one) and **Delete outfit** (two clicks; the last one cannot go). There is no Save button: picking a part edits the selected outfit, as the Workshop already saved as you click.
- The selected outfit is the look other players see: the lobby has an **Outfit** dropdown next to Spellbook (shown once you have two or more) to change it without opening the Workshop. It is locked at match start like any look.
- Outfits are saved in the browser and, for logged-in players, on the account and synced between devices like the look and spellbook (new `slots` part in `profileSync`, backed up and restored with the others). The account's `workshop` look is always the outfit in use, so older clients keep working. Database migration 3 adds `profiles.slots` (nullable). `save_profile` takes `slots` and `profile` carries it; no protocol bump (both additions are optional).
- Rules and the pure changes (add, rename, remove, select, edit, limits, name cleaning) are in `shared/wardrobe.ts`, used by the server to validate and the client to read storage. The sync comparison now handles nested data (the old one was for flat records).

## 0.43.3-0 - 2026-10-24 AWST - Pictures in the head / body dropdown

- The pair editor's Head / Body dropdown now shows a small picture of each head or body before its name, both in the closed button and in the open list. The names stay.
- This is a general feature of the styled dropdown: `setOptionIcons(select, option => element | null)` in `client/src/ui/select.ts` (documented in `docs/UI.md`, styled by `.ui-select__icon` in `components.css`). Any other select can use it the same way.

## 0.43.2-0 - 2026-10-24 AWST - Icons in the pair editor rows

- Each row of the pair editor (Developer tools) now shows a small picture of the hat or head beside its name, so a long list is quicker to work through. The pictures use the same `partIcon()` as the Workshop carousels, so they follow the skin tone and dye and are fitted into a new `.ui-list__icon` box (`components.css`, `docs/UI.md`).
- `partIcon()` takes an optional size and now forgets icons that have left the page, instead of the pickers clearing the whole list when they rebuild (which would have stopped the pair rows repainting).

## 0.43.1-0 - 2026-10-24 AWST - Every Workshop part is an icon carousel

- Every part picker (head, hat, body, main hand, offhand, feet) is now an icon carousel like the boots: a scrollable row of sprite icons with side arrows and wheel scrolling instead of text chips. The icons follow your skin tone and the hat and robe dye and update as you change them (and when tinted images finish loading). "None" hats and staffs show an empty-slot glyph; the bare offhand shows the left hand. Each choice is still a labelled radio (the name is the tooltip and the screen-reader label).
- Adding a part or a choice needs only entries in the `parts.ts` tables: `partSprite()` (pure, `partSprite.ts`) decides which image and crop an icon uses and `partIcon()` (`partIcons.ts`) draws it, so `panel.ts` has one loop for all parts. New `.ui-carousel--tall` (staffs) and `.ui-carousel__icon--none` modifiers are in `components.css` and the style guide.

## 0.43.0-0 - 2026-10-24 AWST - Other players see your Workshop wizard

- Online matches now draw every wizard from the Workshop look its player chose, not just your own. Each player's look (parts, skin, robe and hat colours) is sent to the server with the new `set_look` message (guests included, only while in the lobby) and comes back to everyone as `looks` (by seat) in `lobby`, `start`, `rematch_start` and `resumed`. `PROTOCOL_VERSION` 26: tabs left open across the deploy are asked to refresh.
- The look is locked when the match starts (a change in the Workshop mid-match applies from the next lobby), and the server keeps each seat's look for the match, so a player who drops out, a spectator who joins late or someone resuming still sees the right wizards. A seat with no look sent is drawn with the built-in wizard as before.
- `client/src/workshop/inMatch.ts` keeps one `Outfit` per wizard (its look, its skin-tinted and dyed sprites, its own walking and facing state) instead of one global look. New pure `parseLook()` (`client/src/workshop/look.ts`) checks any look read from storage or received from the server and falls back slot by slot, so a retired part never breaks the draw. Practice and local matches still draw only your own wizard from the Workshop.

## 0.42.4-0 - 2026-10-24 AWST - Boots carousel scrolls

- Fix: the boots row stretched to show every pair, so it had nothing to scroll and the right arrow was pushed out of view. The option groups can now shrink (a `fieldset` will not by default) and the row scrolls inside them.
- Fix: the arrows were worked out while the Workshop was still hidden, so the right one stayed greyed out. They now update whenever the row gets a width, and the row opens scrolled to the chosen boots.

## 0.42.3-0 - 2026-10-24 AWST - Boots carousel with icons

- The Workshop boots are no longer a list of "Boots 1" to "Boots 10" names: each pair is a small icon cut from the sprite atlas, in a scrollable row with an arrow on each side. The mouse wheel also moves along the row (at either end it goes back to scrolling the page), and the keyboard arrow keys still pick between the boots. The old name is kept as the tooltip and the screen-reader label.
- New shared component `.ui-carousel` (`components.css`, `/styleguide.html`, `docs/UI.md`), built by `createCarousel()` and `atlasIcon()` in `client/src/workshop/carousel.ts`, so other parts can use it later.

## 0.42.2-0 - 2026-10-24 AWST - Developer tools redesigned to fit one screen

- Developer tools is now its own wide panel beside the preview (the page widens and the preview stays in view) instead of a long block stacked under it. The pair picker is on the left, the position controls (left/right, up/down, tilt, size, mirror) and the save buttons on the right, so everything shows at once on a normal window.
- Only the buttons that apply to the current mode are shown: pairs mode has Save pair, Save & next, Remove pair; Single pieces mode has Save layout, Reset piece, Copy layout. Removed Discard edit (click the row again to undo). Mix & Match is hidden while aligning pairs, since the pair picker chooses the pieces.

## 0.42.1-0 - 2026-10-24 AWST - Pair alignment editor, safe concurrent publishing

- Developer tools has a new Pair alignment editor (`client/src/workshop/pairEditor.ts`) in place of "select a combination, then Edit Pair": pick **Hats on a head** (choose the head) or **Heads on a body** (choose the body) and get a list of every hat or head with a marker for aligned / not aligned / unsaved. Click a row to edit that pair, drag or use the sliders, then **Save pair**, **Save & next unaligned** (steps to the next gap), **Clear pair** or **Discard edit**. Progress shows how many are aligned for that head or body.
- Publishing now sends only what changed since the copy was loaded (a patch), so Jesse and Mark working on different pairs or pieces never overwrite each other. The very first publish on a server sends the whole copy. A patch before that returns 409.
- Export All Alignments stays as a backup. Single-piece editing is under **Single pieces**.

## 0.42.0-0 - 2026-10-24 AWST - Wizard Workshop layouts stored on the server

- The piece layout and the hat-head / head-body pair alignments are now one shared copy in the database (`workshop_shared`, migration 2), sent to every client, guests included, by `GET /api/workshop-layouts`. Until it arrives (or if the server has none, or is unreachable) the bundled `shared-workshop.json` and `DEFAULT_PAIR_ALIGNMENTS` are used.
- Browsers no longer keep their own layout or pairs, so two browsers can no longer differ. What an old browser had in localStorage is left untouched (and ignored); the pair backup key `arcane-wizard-pair-alignments-private-backup-2026-10` still holds Mark's old pairs.
- Only accounts listed in `workshop_editors` can publish (`PUT /api/workshop-layouts`, same-site and logged-in only, validated like an import). Add one with `arcane-admin <slot> workshop-editor <username>` (`--remove` to take it away). Developer tools Save layout, Save Pair and JSON import publish automatically for editors; for anyone else they apply for the session only.
- The layout and pair checks moved to `shared/workshopShared.ts`, used by both the server and the client.

## 0.41.4-0 - 2026-10-24 AWST - Shield bars show the combinations blocked, melee swing for Workshop wizards

- Each element shield now has three moving bars, coloured for the three combination spells it blocks (water: steam, storm, ice; fire: steam, plasma, magma; lightning: plasma, storm, magnetic; earth: magma, ice, magnetic). The healing shield uses soft greens.
- The bars start at the bottom, top-left and top-right of the ring and make exactly one turn over the shield's life (`SHIELD_LIFE` in `shared/constants.ts`), driven by the shield's remaining life rather than the clock.
- Fix: a player using a Workshop wizard saw no melee animation for their own swing (the Workshop sprite path drew neither sword nor swing arc). The sword and arc are now drawn over it.

## 0.41.3-0 - 2026-10-23 AWST - Fix: dropdown list closing by itself

- The styled dropdown (`.ui-select`) closed when its own list scrolled (including the scroll caused by hovering a row), so the lower maps could not be picked. Scrolling the list no longer closes it; scrolling the page behind it still does. Hovering no longer scrolls the list, and a lobby refresh while the list is open keeps its scroll position and highlight.

## Mark, on 0.41.2-0 - 2026-10-24 AWST - Shared Wizard Workshop layout

- Moved the shared Workshop layout into a bundled JSON file using the exported appearance, colour and layout format.
- Migrated existing browser-specific layouts and pair overrides to the shared alignment data, keeping previous pair data as a local backup.
- Developer edits remain local after migration.

## Mark, on 0.41.2-0 - 2026-10-24 AWST - Import Wizard Workshop JSON

- Added a visible JSON import control for saved pair alignments and copied Workshop layouts.
- Validates imported data before applying it; matching pairs update while other saved pairs remain.

## Mark, on 0.41.2-0 - 2026-10-24 AWST - Centre charge ring on wizard

- Moved the charge ring up to centre it around the wizard's body while keeping its progress, size and spell effects unchanged.

## Mark, on 0.41.2-0 - 2026-10-24 AWST - Elemental shield fit on custom models

- Enlarged and raised the elemental shield outline again so it centres better over taller custom wizards.

## Mark, on 0.41.2-0 - 2026-10-24 AWST - Wider, raised elemental shields

- Raised and widened the elemental shield outline around the wizard; the offhand shield items are unchanged.

## Mark, on 0.41.2-0 - 2026-10-24 AWST - Workshop selection and alignment update

- Removed Staff 4 and the None main-hand choice.
- Applied the approved default wizard, separate dark hat and robe colours, and submitted sprite alignments.
- Retained Staff 4's historical alignment data for saved layouts.

## Mark, on 0.41.2-0 - 2026-10-24 AWST - Collapsible Workshop developer tools

- Hid the position and scale editor behind a Developer tools checkbox, off by default.
- Disabled drag-to-adjust while developer tools are hidden.

## Mark, on 0.41.2-0 - 2026-10-24 AWST - Independent hat and robe colours

- Added a single colour palette with Hat and Robe targets, so each item keeps its own dye.
- Saved hat colour separately while preserving existing robe colours.

## Mark, on 0.41.2-0 - 2026-10-24 AWST - Shared hat and robe colours

- Added fabric recolouring for every selectable hat, preserving bands, stars, highlights and outlines.
- The wardrobe dye palette now applies to both hats and robes; complexion remains independently adjustable.

## Mark, on 0.41.2-0 - 2026-10-24 AWST - Flame particles fill Fire cone

- Spread flame-tongue particles across the full Flamethrower damage cone so the visual fills the spell's area of effect.
- Each ray remains clipped at obstacles and bubbles; Fire damage, reach, cooldown and Water Spray are unchanged.

## Mark, on 0.41.2-0 - 2026-10-24 AWST - Flame-shaped Flamethrower particles

- Replaced the oversized sprite stream with overlapping, animated flame-tongue particles, including tapered edges and soft yellow cores.
- Kept the Fire stream clipped at obstacles and bubbles; damage, reach, cooldown and Water Spray are unchanged.

## Mark, on 0.41.2-0 - 2026-10-23 AWST - Much wider Flamethrower plume

- Increased the sprite's drawn thickness from 128 to 384 game units (200% wider); widened the loading fallback to match.
- Fire damage, reach, cooldown and collision clipping are unchanged.

## Mark, on 0.41.2-0 - 2026-10-23 AWST - Thicker Flamethrower stream

- Widened the Flamethrower sprite and its loading fallback by about 50% so the stream reads as a fuller plume.
- Fire damage, reach, cooldown and collision clipping are unchanged.

## Mark, on 0.41.2-0 - 2026-10-23 AWST - Flamethrower sprite stream

- Replaced the scattered fire spray particles with an animated, layered flame-stream sprite.
- The stream still clips at arena obstacles and bubbles; fire damage, range, cooldown and water visuals are unchanged.

## Mark, on 0.41.2-0 - 2026-10-23 AWST - Preserve Workshop settings and add exported build layouts

- Added the supplied body, hat, shield and staff positions to the permanent per-asset Workshop defaults, including the staff mirror setting.
- Existing fresh-browser defaults and earlier layout entries remain unchanged; the exported build can be selected without replacing the previous settings.

## Mark, on 0.41.2-0 - 2026-10-23 AWST - New shields and Golden Star Wizard Hat

- Added the uploaded Round Shield and Tall Shield as selectable offhand sprites, preserving the existing separate-hand behaviour for Offhand None.
- Added the uploaded Golden Star Wizard Hat as a new hat sprite with transparent bounds and the same head-pair editing, saved alignment and horizontal mirroring support as the existing hats.
- Added regression coverage for the new stable IDs and head–hat pair records.

## 0.41.2-0 - 2026-10-23 AWST - Docs brought up to date for HTTPS and accounts

- README, ARCHITECTURE (new section 13: accounts), HANDOFF, ROADMAP, DEPLOY-ORACLE and WORKFLOW describe the four HTTPS slots, the per-slot database and backups, accounts, friends and invites, and the new folders; nothing says two test slots, plain http or anonymous-only any more.
- `package.json` needs Node 24.7 or later (`engines`): the server uses `crypto.argon2` and `node:sqlite`.

## 0.41.1-0 - 2026-10-23 AWST - Where friends are, lobby invites (protocol 25)

- **Where friends are**: each friend shows Online (green), In a lobby (amber), In a match (red) or Offline (grey), updated live. The server works it out from the player's rooms after every room change (joins, leaves, match start, back to lobby, disconnects); in-match movement traffic skips the check.
- **Invite to your lobby**: in a lobby, 👥 FRIENDS shows a green Invite next to friends who are online or in a lobby. They get a toast "… invites you to a lobby." with Join (joins your room code) and Dismiss; it lasts 2 minutes, at most once every 30 seconds per friend. An invite that arrives during a match waits until the match ends. Up to 3 invite toasts stack.
- Toasts now stack at the bottom centre; toasts with buttons (`.ui-toast--actions`) are new in the style guide, as are the lobby and match presence dots.
- The Add-friend field says "Username".
- This is the last step of `docs/ACCOUNTS-PLAN.md` (0.36.0 to 0.41.1).

## 0.41.0-0 - 2026-10-23 AWST - Friends (protocol 24)

- **Friends** for logged-in players (step 6 of `docs/ACCOUNTS-PLAN.md`): a "👥 Friends" button by the account chip and in the lobby opens Friends / Requests / Sent / Blocked. Add someone by their exact username; they get a toast and a count on their button and can accept or decline. Asking someone who already asked you makes you friends at once. Remove and Block ask to confirm.
- **Online or not**: each friend has a green or grey dot that changes live. (In lobby / in match and inviting to a lobby come in 0.41.1.)
- **Block** ends the friendship and any requests, and is never revealed: a blocked player's requests look sent but go nowhere.
- Limits: 100 friends, 20 waiting requests, 20 requests an hour. No chat.
- Protocol 24: `friend_request`, `friend_answer`, `friend_remove`, `block`, `unblock`; the server sends `friends` (the whole list, on every change) and `friend_error`. New UI component `.ui-badge`.

## 0.40.0-0 - 2026-10-23 AWST - Your look and spells on the account (protocol 23)

- **Workshop look and spellbook picks follow the account**: log in on another device and your wizard looks the same and has the same spells; a change on one device reaches your other open ones within a couple of seconds. Step 5 of `docs/ACCOUNTS-PLAN.md`.
- **Signing up keeps what you made as a guest** (it is copied to the new account). Logging in on a device with its own look replaces it with the account's, but keeps a copy: Account > Profile > "Use this device's look" brings it back. Logging out leaves the look on the device.
- **Spell picks are now remembered on the device** (`arcane-duel-loadout`); before, they reset on every reload.
- The Workshop layout and pair alignments (developer tools) stay per browser. The server checks a look's shape and size only; the client drops unknown parts when it loads one (the full part check moves to `shared/` once other players see your look).
- Protocol 23: `save_profile` (client) and `profile` (server, after `welcome` and when another of your connections saves). A logged-in player keeps a game connection open on the main menu. The Account screen's "Name" tab is now "Profile".

## 0.39.0-0 - 2026-10-23 AWST - Your account in rooms (protocol 22)

- **Names**: a logged-in player is shown by their display name in the lobby, in the match (team panel, name over the wizard, start text) and in "paused"/"left" messages; guests stay "Player N" and are marked "(guest)" in the lobby.
- **One place per account**: the server knows who a game connection is from the login cookie sent with the WebSocket (and refuses WebSockets opened by other sites). If the same account joins a room from another tab or device, that one takes over the seat (or spectator spot, and the host role) and the first goes back to the menu ("You opened this game in another tab or device"). In a running match this is how you move to another device: join the code.
- **Sessions ending**: logging out (here or everywhere), changing the password or deleting the account takes that session's game connections out of their rooms, with a message; the session that changed the password stays. A display-name change shows in the lobby at once. The client opens a fresh connection after logging in or out.
- Protocol 22: `welcome`, `signed_out`, `replaced`; `names` in `start`/`rematch_start`/`resumed`; `guests` in `lobby`. Rooms recognise a returning player by account (any device) or, for guests, by tab as before. `/stats` shows `onlineAccounts`.
- Lobby names are now written as text (`textContent`), not HTML, since players choose them.

## 0.38.0-0 - 2026-10-23 AWST - Accounts: sign up, log in, Account screen

- **Accounts** (step 3 of `docs/ACCOUNTS-PLAN.md`): username + password, no email. The username is permanent; the display name can be changed. Sign-up shows a one-time **recovery code** for a forgotten password. Guests play exactly as before. Accounts don't do anything in rooms yet (0.39.0).
- **Screens**: a chip at the top right of the main menu ("Log in" or your name), Log in / Sign up (tabs), the recovery code screen, Forgot password, and Account (name, password, new recovery code, delete, log out, log out everywhere). `/privacy.html` says in plain words what is stored. Shown only over HTTPS (on plain http the game stays guest-only).
- **Server** (`server/accounts/`): `/api/*` JSON routes. Passwords hashed with argon2id (Node's built-in `crypto.argon2`, OWASP settings, one hash at a time, ~130 ms on the VM) and refused if among the 2,000 most common; sessions are a random token in a `__Host-session` cookie (HttpOnly, Secure, SameSite=Lax, 30 days, renewed on use), stored only as a hash. Requests from another site are refused (Origin check). Rate limits: 10 logins a minute per IP, 5 sign-ups an hour per IP, 5 wrong passwords per username lock it for 15 minutes. Contract and shared name rules: `shared/accountApi.ts`.
- **New UI components**: `.ui-tabs`, `.ui-chip`, `.ui-toast`, `.ui-list` with `.ui-dot`, `.ui-form-field`, `.ui-code`, `.ui-link` (style guide and `docs/UI.md`); the lobby's copy fallback is now `ui/clipboard.ts`.
- **Admin command** on the VM: `arcane-admin <slot> list | show | reset-password | rename | ban | unban | delete` (`server/admin.ts`, `deploy/oracle/arcane-admin`; docs in `DEPLOY-ORACLE.md`).
- The server now closes the database when it stops, so its last writes are in `arcane.db` itself (found in the 0.37.0 restore rehearsal). `/stats` shows `accounts` and `hashQueue`.

## 0.37.0-0 - 2026-10-23 AWST - Database foundation and nightly backups (no visible change)

- **Each slot has a SQLite database** (`server/db/`, Node's built-in `node:sqlite`), kept in `/var/lib/arcane-duel/<slot>/arcane.db`, outside the checkout, so deploys never touch it. Locally it is `data/arcane.db` (gitignored); `ARCANE_DB_PATH` chooses the file. Step 2 of `docs/ACCOUNTS-PLAN.md`; nothing uses it yet.
- **Migrations** (`server/db/migrations.ts`) run on start in one transaction; migration 1 creates the account tables (users, sessions, profiles, friends, friend requests, blocks). An existing file is copied before it changes (newest three kept). A server that finds a newer database than it knows refuses to start; `arcane-deploy <slot> reset-db` starts a test slot afresh (refused on main and from GitHub Actions).
- `/stats` shows `database.schemaVersion` and `database.bytes`.
- **Backups:** `deploy/oracle/backup.sh` takes a consistent snapshot, gzips and encrypts it with `age` (the VM holds only the public key), keeps 7 on the VM and uploads to Oracle Object Storage. `backup-timer.sh` runs it for main every night at 03:00 Perth time. `scripts/pull-backup.sh` fetches and decrypts the newest on the laptop. Setup and restore steps in `docs/DEPLOY-ORACLE.md`.
- Fix: `backup.sh` dropped the trailing `=` of the Object Storage secret key when reading `backup.env`, so uploads failed with `SignatureDoesNotMatch`.
- `deploy/oracle/service.sh` writes the systemd unit (data folder, `ARCANE_DB_PATH`, `MemoryHigh=200M` per slot); `setup.sh` uses it.

## 0.36.1-0 - 2026-10-23 AWST - DuckDNS token setup fix

- The DuckDNS token is now put on the VM with an editor (`docs/DEPLOY-ORACLE.md`): the hidden `read` prompt over ssh saved an empty token, with and without `ssh -t`. `duckdns.sh` now refuses a token that is not 36 characters instead of installing a timer that fails.

## 0.36.0-0 - 2026-10-23 AWST - HTTPS on arcaneduel.duckdns.org

- **Every slot is served over HTTPS** with a free DuckDNS name and Let's Encrypt certificates that Caddy renews by itself: `https://arcaneduel.duckdns.org/` (main), `https://jesse.arcaneduel.duckdns.org/`, `https://mark.arcaneduel.duckdns.org/` and `https://adnan.arcaneduel.duckdns.org/`. The game connects over `wss://`. The old `http://159.13.37.255[:808x]/` addresses redirect to the new names. First step of `docs/ACCOUNTS-PLAN.md`.
- `deploy/oracle/caddy.sh` names the slots by person, passes `/api/*` to Node (for accounts later), adds `X-Frame-Options: DENY` and `Referrer-Policy: same-origin`, and saves the domain. `CADDY_PRINT=1` prints the config without applying it (tested in `tests/deploy/caddy.test.ts`).
- New `deploy/oracle/duckdns.sh`: a weekly timer re-sends the IP to DuckDNS (token in `/etc/arcane-duel/duckdns-token`, never in the repo). `arcane-deploy` prints the new URLs.
- All docs (AGENTS, WORKFLOW, HANDOFF, README, UI, DEPLOY-ORACLE with the DuckDNS fallback) use the new URLs.

## 0.35.8-0 - 2026-10-23 AWST - Accounts plan: DuckDNS name chosen

- `docs/ACCOUNTS-PLAN.md`: the DuckDNS name is `arcaneduel`, with how to change it later.

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
- The three hats share a de…26128 tokens truncated…: every seat walks and its timers tick,
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
