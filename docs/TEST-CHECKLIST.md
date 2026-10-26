Warning: truncated output (original token count: 44624)
Total output lines: 1972

### [0.45.1-0] Spell effects stop at obstacles (Mark)

On https://mark.arcaneduel.duckdns.org/, Practice on the default arena. Place a pillar between the wizard and a target dummy.

- [ ] **SO1** Fire and Water sprays aimed through a pillar stop at its face. Their glow and particles stay behind the pillar, including while particles move. A target dummy behind the pillar shows no hit feedback.
- [ ] **SO2** Fire and Water sprays aimed past a pillar still hit a dummy in the open. Their effects draw in front of the pillar when they are in front of it.
- [ ] **SO3** Fire an Earth projectile while standing close to a pillar, aiming through it. The bolt stops at the pillar and cannot emerge on its far side or hit a dummy behind it.
- [ ] **SO4** Cast Lightning at a dummy in the open: it shows hit feedback. Put a pillar between wizard and dummy: the bolt ends at the pillar and the dummy shows no hit feedback. Lightning glow stays behind the pillar.
- [ ] **SO5** Regression: bolts, beams and sprays still work on the other arenas, including where no pillar is present.

### [0.45.1-0] Greater Heal on E, E (Jesse)

On https://jesse.arcaneduel.duckdns.org/, solo and online.

- [ ] **HE1** Get hurt, press E then E: Greater Heal casts (+25% HP, green burst) and its cooldown icon starts. Hover the heal icon: "Greater Heal (E, then E again)". The hint after the first E says to press E again.
- [ ] **HE2** E then 2: nothing heals, Water is loaded (the loaded display shows Water). E then Space still raises the green Healing Shield. A single E and then waiting does nothing until the next key.

### [0.45.1-0] Mage Makeover robe icon (Mark)

On https://mark.arcaneduel.duckdns.org/, main menu.

- [ ] **MM1** The Mage Makeover button appears as a small square parchment tile with a black robe icon and no visible text. Clicking it opens Mage Makeover.
- [ ] **MM2** Open Practice: Mage Makeover disappears for the full time the Practice menu is open. Click Back: it reappears on the main menu.
- [ ] **MM3** Tab to Mage Makeover and press Enter: it opens. Its accessible name and hover title remain "Open Mage Makeover" / "Mage Makeover".
- [ ] **MM4** Run section 7 regression.

### [0.45.1-0] Selected offhands and floating grips (Mark)

On https://mark.arcaneduel.duckdns.org/, Wizard Workshop; Developer tools on. For shared saves, use an account permitted to publish Workshop layouts.

- [ ] **OH1** Offhand offers the three selected atlas items (3, 6 and 10) as Offhand #3, #6 and #10; each shows only its extracted artwork. The other atlas items are not added.
- [ ] **OH2** Each selected item has a separate floating left-hand grip. It overlays the item, follows skin tone changes, and is shown in the preview and in Practice. Existing staff and staff grip still render.
- [ ] **OH3** In Developer Tools, choose Offhand grip and adjust position, size and tilt for each item. Save Layout, switch between the three items and reload: each grip and item retains its own saved placement. Import/export includes the handOff layout keys.
- [ ] **OH4** In Practice, walk around: each selected item and its grip move together and stay aligned. Switch offhands; the matching grip appears, and ordinary offhands do not get a floating grip. Run section 7 regression.
- [ ] **OH5** Change skin tone while each selected offhand is equipped, then switch tones and back. The floating grip immediately matches the selected tone, as do the head and staff grip; reload, Randomise and Reset also keep the grip tint in sync.

### [0.45.0-0] Sword aim, Tempest Bolt lag, hidden beam casters (Jesse)

On https://jesse.arcaneduel.duckdns.org/. The beam item needs two players and a map with fog (a battleground).

- [ ] **SA1** Practice against a dummy. Stand next to it and move the cursor to the side the dummy is on, press F: the swing points at the cursor and the dummy is hurt. Put the cursor on the opposite side or at a right angle (more than 45 degrees off the dummy) and press F: the swing points at the cursor and the dummy is not hurt. Step back past about 80 pixels with the cursor on it: no hit.
- [ ] **SA2** In a 2v2 (or the AI duel) with two enemies close by on different sides, F with the cursor between them hits both when both are inside the quarter, one when only one is. An Earth shield still shows BLOCKED!, a frozen foe still shatters for double. The pale swing arc is a quarter circle around the cursor direction.
- [ ] **TB1** Fire Tempest Bolt (Storm Shot in the spellbook) repeatedly, with several bolts on screen at once, in a duel and a 4v4 if you can. Expect: the frame rate stays smooth and the input delay stays low (no 600 ms stalls). The bolt still looks the same: grey-blue comet with a soft glow, sparks and a tail.
- [ ] **BM1** Two players on a battleground. One stands outside the other's sight and holds a Plasma or Magnetic beam at them. Expect: the beam on the target's screen starts at the caster's real position, in the direction the caster is aiming, never from behind the target or a stale place. Repeat with the caster walking in and out of sight. Section 7 (regression).

### [0.44.0-0, tiles in 0.44.1-0] Outfits, up to 8 appearance slots (Jesse; migration 3)

On https://jesse.arcaneduel.duckdns.org/ (the slot migrates its database on deploy). Use a test account; "another device" is a private window.

- [ ] **OS1** Wizard Workshop: the Outfits row shows one picture tile (a small wizard) selected, a dashed + tile after it, and no name box or explanation text below them. Pick a different head: it applies as before and the tile's picture follows. Click +: a second tile appears, selected, wearing the same look. Change the head, hat, robe colour: the preview and that tile follow. Click the first tile: the first look comes back in the preview and in every picker (head, hat, body, boots, colours); the second again: the second one. Hover a tile: its name shows. Each picture shows boots, robe, head, hat, staff (left) and shield or hand (right); change the boots, staff and offhand in Choose your appearance and the tile follows, and a no-hat / no-staff outfit shows without them.
- [ ] **OS8** (0.44.6-0) The right-hand Workshop panel is titled "Choose your appearance" with no grey explanation text under Skin tone or Item colour. Click Random several times: the skin tone, hat colour and robe colour change as well as the parts, the preview and the selected outfit tile follow, and the highlighted swatches match. Reset still returns the original colours.
- [ ] **OS2** Add outfits with +, up to 8: the + tile then greys out and the row scrolls with the arrows and wheel. There is no name box (outfits cannot be renamed here).
- [ ] **OS3** Delete outfit (small red trash button on the "Outfits" title line, at the right, not covering any tile or arrow): the first click turns the icon into a tick (tooltip "Click again to delete") (and goes back by itself after 3 s); the second deletes it and wears the selected one. With one outfit left Delete is greyed out.
- [ ] **OS4** Reload the page: the outfits and the selected one are still there. Random and Reset change the selected outfit only.
- [ ] **OS5** Log in on a second device: it gets the same outfits, the same one selected and wearing it. Switch outfit on one: the other follows within a couple of seconds (reload if the Workshop is open). With the other device's own outfits already saved, they are kept as the backup ("Use this device's look").
- [ ] **OS6** Lobby: there is no outfit dropdown (Leave room, Spellbook, Friends, Start only). Select an outfit in the Workshop, create a room, start: the other player sees that outfit; a change in the Workshop after the start applies from the next lobby.
- [ ] **OS7** A guest (not logged in) can make and use outfits; they stay in this browser. Sign up from there: the outfits go to the new account.
- [ ] **OS8** Regression: an old account with only a saved look still opens the Workshop with "Outfit 1" holding it; `/stats` and logging in still work after the migration.

### [0.43.3-0] Pictures in the head / body dropdown (Jesse)

On https://jesse.arcaneduel.duckdns.org/, Wizard Workshop, Developer tools on.

- [ ] **DI1** Heads on a body: the Body dropdown shows a body picture and its name. Open it: every body has a picture and a name, and the current one is marked. Hats on a head: the Head dropdown shows head pictures the same way.
- [ ] **DI2** Pick another entry (mouse, or arrow keys then Enter): the picture and name in the button change, the preview and the row list follow, and Escape closes the list.
- [ ] **DI3** Change the skin tone or robe dye in the main picker: the pictures in the dropdown button (and in the list the next time it opens) use the new colours. Other dropdowns (lobby map, settings) look the same as before, with no pictures.

### [0.43.2-0] Pair editor row icons (Jesse)

On https://jesse.arcaneduel.duckdns.org/, Wizard Workshop, Developer tools on.

- [ ] **PI1** Hats on a head: every row shows a small hat picture between the marker and the name, all names lined up. Heads on a body: every row shows a head picture.
- [ ] **PI2** Change the skin tone in the main picker: the head pictures in the list change colour at once. Change the hat dye: the hat pictures change.
- [ ] **PI3** Editing, Save pair, Save & next and Remove pair still work, and the rows' markers (not aligned / unsaved / aligned) still update after each. Switching between the three modes and picking another head or body redraws the list with its pictures.

### [0.43.1-0] Carousels for every part (Jesse)

On https://jesse.arcaneduel.duckdns.org/, Wizard Workshop, window about 1300 x 800.

- [ ] **PC1** Head, Hat, Body, Main hand, Offhand and Feet each show a row of icons (no text chips) with arrows. The picked one is highlighted and centred.
- [ ] **PC2** Scroll the long rows (head, main hand, feet) with the wheel and the arrows. The option panel does not get wider. At either end the wheel scrolls the page again; rows that fit show disabled arrows.
- [ ] **PC3** Pick a skin tone: the head icons and the bare-hand offhand icon change colour. Pick a robe dye: the body icons change. Switch the dye target to Hat and pick a dye: the hat icons change. The star restores the original colours.
- [ ] **PC4** Hat "None" and Main hand "None" show the empty-slot glyph. Hover (or a screen reader) gives the real names. Tab into a row and use the arrow keys: the pick changes and the preview follows.
- [ ] **PC5** Random and Reset: the highlighted icon in every row matches the preview and the rows scroll to it. Reload: the saved look is still highlighted.
- [ ] **PC6** Regression: the in-match wizard, the pair editor and the layout editor (Developer tools) still follow the picks. `/styleguide.html` shows the normal and tall carousel rows.

### [0.43.0-0] Other players see your look (Jesse)

On https://jesse.arcaneduel.duckdns.org/ with two browsers (one a private window, so one can be a guest), each choosing a different look in the Wizard Workshop first.

- [ ] **LK1** Create a room in browser A, join it in B, start. Expect each browser to see its own wizard and the other's wearing the look that player chose (head, hat, robe, colours, boots, staff), in the right places.
- [ ] **LK2** Repeat with A logged in and B a guest, then the other way round. Both looks show both ways.
- [ ] **LK3** In the lobby change your look in the Workshop, return to the lobby: the other browser sees the change in the next match. Change the look during a match (it cannot be opened mid-match): nothing changes until the next lobby.
- [ ] **LK4** Play a Rematch: both looks are still right. Reload one browser mid-match (resume): the wizards come back with the same looks.
- [ ] **LK5** A third browser joins as a spectator, also late (after the match started): it sees both looks.
- [ ] **LK6** Practice (solo) still shows your own look on your wizard and the built-in art on the dummy. Shadows sit under the feet of looked wizards and are not offset.
- [ ] **LK7** Use the Workshop's Random a few times before starting: the look the other player sees is the one you ended on.

### [0.42.3-0, fixed in 0.42.4-0] Boots carousel (Jesse)

On https://jesse.arcaneduel.duckdns.org/, Wizard Workshop.

- [ ] **BC1** The Boots group shows small boot icons in one row, not "Boots 1" names. Hovering one shows its name as a tooltip. The chosen one is gold and the preview wizard wears it.
- [ ] **BC2** At window width about 1300 the right arrow is visible beside the row. Click it: the row slides along; the left arrow is greyed at the start and the right one at the end.
- [ ] **BC3** Scroll the mouse wheel over the row: it moves sideways. At the end of the row the wheel scrolls the page again.
- [ ] **BC4** Tab to the boots and use the arrow keys: the choice changes and a focus ring shows. Random and Reset still change the boots and the highlighted icon.
- [ ] **BC5** Reload the Workshop with boots 8 to 10 saved: the row opens scrolled to the chosen pair. Also look at https://jesse.arcaneduel.duckdns.org/styleguide.html, section Carousel.

### [0.42.2-0] Developer tools layout (Jesse)

On https://jesse.arcaneduel.duckdns.org/, Wizard Workshop, window about 1300 x 800.

- [ ] **DT1** Turn Developer tools on. Expect a wide panel to the right of the preview with the picker on the left and the sliders and buttons on the right, all visible without scrolling, and the preview staying in view.
- [ ] **DT2** In Hats on a head / Heads on a body, only Save pair, Save & next and Remove pair show; Choose your appearance is hidden. In Single pieces, Save layout, Reset piece, Copy layout show and Choose your appearance is back.
- [ ] **DT3** Narrow the window (under 900 px): the panels stack and everything still works.

### [0.42.1-0] Pair alignment editor (Jesse)

On https://jesse.arcaneduel.duckdns.org/, logged in as a Workshop editor, Wizard Workshop, Developer tools on.

- [ ] **PA1** Click Hats on a head, choose a head. Expect a row per hat with aligned / not aligned, and the progress line ("n of m hats aligned").
- [ ] **PA2** Click a row, drag the hat, Save pair. Expect "Saved for everyone", the row turns aligned. Reload and in a second browser (guest): the same pair shows.
- [ ] **PA3** Save & next steps to the next gap; when all are aligned it says so. Clear pair makes the row "not aligned" again for everyone.
- [ ] **PA4** Heads on a body: choose a body, align each head. Same checks.
- [ ] **PA5** Two editors (two browsers) each Save a different pair without reloading. Expect both pairs kept after reload.
- [ ] **PA6** Single pieces returns to the old per-piece editing; a non-editor sees "session only" and nothing changes for others.

### [0.42.0-0] Workshop layouts on the server (Jesse; migration 2)

On https://jesse.arcaneduel.duckdns.org/. First run `arcane-admin jesse workshop-editor <your username>` on the server.

- [ ] **WS1** Logged in as the editor: Wizard Workshop, Developer tools on, adjust a piece, Save layout. Expect "Saved and published". Reload: the change is still there.
- [ ] **WS2** Open the Workshop as a guest, and in a second browser logged in as someone else. Expect the same alignments, including hat–head pairs, in the preview and in a practice match.
- [ ] **WS3** In the guest/other browser, Developer tools, change and Save a piece. Expect "Applied for this session only"; reload shows the shared layout again, and the first browser is unchanged.
- [ ] **WS4** As the editor, Save Pair for a hat–head pair and import a layout JSON. Expect both to publish and to show in the other browser after a reload.
- [ ] **WS5** Load `/api/workshop-layouts` in the address bar. Expect JSON with `shared` and `canEdit`; the page works with the server stopped (bundled layouts).

### [0.41.4-0] Shield bars and Workshop melee (Jesse)

On https://jesse.arcaneduel.duckdns.org/, practice match.

- [ ] **SB1** Raise each element shield (Water, Fire, Lightning, Earth). Expect three bars per ring in the combination colours (water: steam, storm, ice), starting bottom, top-left, top-right, evenly spaced.
- [ ] **SB2** Watch one shield to its end. Expect the bars to make exactly one full turn as it expires; the cast preview and the confirmed shield do not jump noticeably.
- [ ] **SB3** Healing shield still looks green; shield still blocks matching spells as before.
- [ ] **ML1** With a Workshop-styled wizard (not the default look), press the melee key near an enemy. Expect the sword swing and arc to show for you, and for the other player's client to see it too.

### [0.41.3-0] Dropdown stays open (Jesse)

- [ ] **UI7** Lobby (host): open the Map dropdown and scroll the list with the wheel and by dragging, hover rows near the top and bottom edges. Expect: the list stays open, and you can pick one of the lower maps. Keyboard arrows still move the highlight; clicking outside, Esc or scrolling the page behind it still closes it.

### [0.41.2-0] Wizard Workshop JSON import (Mark)

On https://mark.arcaneduel.duckdns.org/. Open Wizard Workshop.

- [ ] **WJ1** Import a JSON exported with Export All Alignments. Expect matching hat–head and head–body pairs to update, other saved pairs to remain, and the preview to reflect the selected pair.
- [ ] **WJ2** Import JSON copied with Copy layout. Expect the appearance, hat and robe colours, and layout adjustments to load and apply in a local match.
- [ ] **WJ3** Import malformed JSON and a valid but unsupported JSON shape. Expect a clear error message and no changes to the current wizard.

### [0.41.2-0] Shared Wizard Workshop layout (Mark)

On https://mark.arcaneduel.duckdns.org/. Use two browsers, one with a previously saved Workshop layout.

- [ ] **SW1** Open the Workshop in both browsers. Expect the same approved item alignments; old browser-specific layout and pair overrides are cleared from active settings, with pair data kept in a local backup.
- [ ] **SW2** Change and save a layout with Developer tools in one browser. Expect the edit to apply there for local testing; a fresh browser still receives the shared layout. Personal appearance and colour selections remain independent.

### [0.41.2-0] Charge ring centred on wizard (Mark)

On https://mark.arcaneduel.duckdns.org/. Solo practice, then an online match.

- [ ] **CR1** Hold a chargeable spell long enough to show the rune ring. Expect the circle to surround the wizard's body from head to feet and remain centred while moving. Check the Workshop model and another wizard; the charge orb still sits by the caster's staff.
- [ ] **CR2** Charge a spell online and confirm the ring follows the charging wizard. Section 7 (regression).

### [0.41.2-0] Wider, raised elemental shield (Mark)

On https://mark.arcaneduel.duckdns.org/. Wizard Workshop and a local practice match.

- [ ] **ES1** Cast an Earth shield over a custom wizard. The larger coloured outline is raised and centred over the model; the held offhand item is unchanged.
- [ ] **ES2** Check other elemental and healing shields, and confirm predicted online casts match the outline after the server confirms the shield.

### [0.41.2-0] Workshop defaults and main-hand choices (Mark)

On https://mark.arcaneduel.duckdns.org/. Wizard Workshop, clear saved Workshop appearance/layout data or use a fresh browser.

- [ ] **WD1** Fresh appearance is head 16, hat 13, body 14, staff 9, offhand 13 and feet 7. Hat and robe both use `#151a28`.
- [ ] **WD2** Main-hand choices contain neither None nor Staff 4. Existing saves using either unavailable choice fall back to Staff 9.
- [ ] **WD3** Check selected item alignment and hand placement for the wooden wand and Staff 9 against the approved offsets.

### [0.41.2-0] Collapsible Workshop developer tools (Mark)

On https://mark.arcaneduel.duckdns.org/. Open Wizard Workshop.

- [ ] **DW1** On first open, the Developer tools checkbox is unchecked and the position/scale editor is hidden.
- [ ] **DW2** Check Developer tools. The editor appears and position, tilt, mirror, size, pair alignment and save controls work as before.
- [ ] **DW3** Uncheck Developer tools. The editor and selected-piece outline disappear; dragging the preview does not change the wizard layout.

### [0.41.2-0] Flamethrower particle stream (Mark)

On https://mark.arcaneduel.duckdns.org/. Solo practice and a two-browser online match.

- [ ] **FT1** Hold Fire and aim across the arena. Expect flame-tongue particles to fill the full damage cone, from its centre to both edges, with tapered tips and glowing yellow cores. No plain circles, ovals or triangles. Damage, reach and cooldown feel unchanged.
- [ ] **FT2** Aim into an obstacle and a bubble. The visible flame ends at the first collision; no flame draws through either boundary.
- [ ] **FT3** In an online match, both players see the held Fire stream. Water spray still uses its existing visual. Section 7 (regression).

### [0.41.2-0] Shared hat and robe colours (Mark)

On https://mark.arcaneduel.duckdns.org/. Wizard Workshop, then a local practice match.

- [ ] **WC1** Choose each selectable hat and cycle the wardrobe colours. Expect the hat body to change colour while gold bands, stars, feathers, highlights and outlines retain their original detail.
- [ ] **WC2** Choose Hat, set a colour, then choose Robe and set a different colour. Expect both colours to remain independent. Original restores only the selected item's native colours; skin tone remains independent.
- [ ] **WC3** Save/reload the Workshop, then enter a local match. Expect both dyes to persist and match the Workshop preview.

### [0.41.1-0] Where friends are, lobby invites (Jesse; protocol 25)

On https://jesse.arcaneduel.duckdns.org/, off the work network. Two test accounts that are friends (A and B), two browsers.

- [ ] **FI1** B's Friends list shows A as "Online" (green) on the menu, "In a lobby" (amber) once A presses Duel, "In a match" (red) once A's match starts, "Online" again after A leaves, "Offline" (grey) when A closes the tab. Each change shows within a couple of seconds.
- [ ] **FI2** A in a lobby, B on the menu: A opens 👥 FRIENDS in the lobby; B's row has a green Invite. Press it: "Invited Morgana." and the button greys out for 30 s. On B: a toast "Merlin (@merlin) invites you to a lobby." with Join / Dismiss. Join: B is in A's lobby.
- [ ] **FI3** Invite again within 30 s (button disabled). Dismiss on B removes the toast. An invite left alone disappears after 2 minutes. On the menu (not in a lobby) friends have no Invite button; an in-match friend has none either.
- [ ] **FI4** B in a match when A invites: nothing shows during the match; after it ends (result screen or back on the menu) the invite appears if under 2 minutes old. Section 7 (regression).

### [0.41.0-0] Friends (Jesse; protocol 24)

On https://jesse.arcaneduel.duckdns.org/, off the work network. Two test accounts in two browsers (A and B).

- [ ] **FR1** Logged in: "👥 Friends" next to the account chip (not shown as a guest). A: Friends > add B's username. Expect on A: "request sent", B under Sent. On B within a second: a toast "… sent you a friend request", a red count on the Friends chip, A under Requests. B accepts: both see each other under Friends as "Name (@username)" with a green dot.
- [ ] **FR2** B closes the tab: on A, B's dot turns grey within a couple of seconds; B comes back: green again.
- [ ] **FR3** Typing mistakes: your own username ("That's you"), an unknown username ("No player has that username."), a bad one (`ab`): a message under the field, nothing sent. Decline a request; cancel a sent request (it disappears for the other player).
- [ ] **FR4** Remove (asks "Sure?" first): gone on both sides. Add again, then B blocks A: A loses B as a friend; A's new request to B looks sent but B never sees it; B unblocks under Blocked.
- [ ] **FR5** In a lobby, the "👥 Friends" button opens the same screen; Back returns to the lobby. Starting a match closes the screen. Section 7 (regression).

### [0.40.0-0] Your look and spells on the account (Jesse; protocol 23)

On https://jesse.arcaneduel.duckdns.org/, off the work network. Two browsers (or a normal and a private window).

- [ ] **PF0** As a guest: pick a different Fireball variant in the Spellbook, reload. Expect: the pick is still there (spell picks are now remembered on this device; before 0.40 they reset on reload).
- [ ] **PF1** As a guest, make a Workshop look and a spellbook pick, then sign up with a new test account. In the other browser, log in: same look in the Workshop and in a solo match, same spell picks.
- [ ] **PF2** Both browsers logged in: change the look (Workshop) or a spell pick in browser A. Expect: browser B shows it within a couple of seconds (open its Workshop or Spellbook to see). Log out in B: B keeps that look as its own.
- [ ] **PF3** In a fresh private window, make a different look as a guest, then log in to the account: the account's look replaces it, and Account > Profile shows "Use this device's look". Press it: the guest look comes back, here and (after a moment) in the other browser; the button disappears.
- [ ] **PF4** Online match between the two accounts: each player's spell picks are their saved ones. Section 7 (regression).

### [0.39.0-0] Your account in rooms (Jesse; protocol 22)

On https://jesse.arcaneduel.duckdns.org/, **not on the work network** (its firewall intercepts HTTPS): use a phone on mobile data or a home connection. Needs two browsers (or a normal and a private window) and the test account from 0.38.

- [ ] **ID1** Logged in, Duel: the lobby shows your display name. A guest joins (other browser, not logged in): they show as "Player 2 (guest)", you show without "(guest)". Start the match: the team panel, the name over each wizard and the start text use the same names. A guest who drops shows "Player 2" in the paused message.
- [ ] **ID2** Logged in on browser A in a lobby. Log in to the same account on browser B, Duel > join A's code. Expect: B is in the lobby in A's place (same team, still host); A goes back to the menu with "You opened this game in another tab or device."
- [ ] **ID3** Same as ID2 but during a running match: B joins the code and plays on in A's seat (the match is not paused for long); A returns to the menu with the same toast.
- [ ] **ID4** Logged in on A (in a lobby) and on B. On B: Account > Log out everywhere. Expect on A: back to the menu, "You were logged out (on another device).", chip says Log in; the other player in A's lobby stays and becomes host. Logging out in a tab itself shows only "Logged out." Change the password on B: A is signed out with "Your password was changed", B stays logged in.
- [ ] **ID5** Change your display name in Account while a friend sits in your lobby (open the lobby in another tab first): they see the new name. Section 7 (regression), as a guest: rooms, rejoin by code and reload-resume work as before.

### [0.38.0-0] Accounts: sign up, log in, Account screen (Jesse)

On https://jesse.arcaneduel.duckdns.org/. Use a test username (test slots have their own throwaway accounts). A second browser (or a private window) is "another device".

- [ ] **AC1** Main menu: top-right chip "👤 Log in". Sign up (Sign up tab): username, display name, password. Expect: the recovery code screen (XXXX-XXXX-XXXX-XXXX), Copy copies it, Continue only after ticking "I've saved it"; then the chip shows your display name. Reload: still logged in. A private window: "Log in" (not logged in).
- [ ] **AC2** Typing mistakes: username `ab` or `admin`, display name `x`, password `short` or `password1`: each shows a message under its field and nothing is sent. Signing up with a taken username says so under Username.
- [ ] **AC3** Log out (Account > Log out): chip says Log in. Log in with a wrong password: "Wrong username or password." Then the right one (any capitals in the username). Log in in a private window as well; "Log out everywhere" in the first window, then reload the private window: logged out there too.
- [ ] **AC4** Account > Name: change the display name (a rude word is refused); the chip updates. Password tab: wrong current password is refused under that field; a new password works at the next login. Recovery tab: needs your password, shows a new code.
- [ ] **AC5** Log out, Log in > Forgot password: username + recovery code (lowercase, without dashes is fine) + new password: logged in, a NEW code shown; the old code no longer works.
- [ ] **AC6** Six wrong passwords in a row for one username: "Too many wrong tries" with a wait time. On the VM, `arcane-admin test2 reset-password <username>` prints a password that logs in (install the command first, see "Accounts admin" in docs/DEPLOY-ORACLE.md); `arcane-admin test2 list` and `show <username>` show the account, never a hash.
- [ ] **AC7** Account > Delete: the red button stays disabled until your username and password are typed; after it, you are a guest and the same username can be signed up again.
- [ ] **AC8** `/privacy.html` reads well; `/styleguide.html` shows tabs, chip, toast, the list with presence dots and the code box. On plain http (e.g. a LAN address) the chip is hidden and the game works as a guest. Section 7 (regression), as a guest and logged in.

### [0.37.0-0] Database foundation, backups (Jesse; no visible change)

- [ ] **DB1** https://jesse.arcaneduel.duckdns.org/stats shows `"database": { "schemaVersion": 1, "bytes": ... }`. Push any change (or `arcane-deploy test2` on the VM): after the redeploy `/stats` still shows it and `ls -la /var/lib/arcane-duel/test2` still has the same `arcane.db` (not recreated; owned by ubuntu, folder mode 700).
- [ ] **DB2** On the VM `sudo arcane-backup test2`: prints the encrypted copy and "uploaded"; the file is in the `arcane-duel-backups` bucket in the Oracle console. On the laptop `scripts/pull-backup.sh --slot test2`: it decrypts to a `.db` that opens (`node -e "const {DatabaseSync}=require('node:sqlite');console.log(new DatabaseSync(process.argv[1]).prepare('PRAGMA user_version').get())" <file>` shows 1).
- [ ] **DB3** Restore rehearsal on test2 from that file, following "Database and backups" in `docs/DEPLOY-ORACLE.md`; `/stats` shows the database again. Then `arcane-deploy test2 reset-db`: the slot comes back with a fresh database; `arcane-deploy main reset-db` refuses.
- [ ] **DB4** `systemctl list-timers arcane-backup` shows the next run at 03:00 Perth time (19:00 UTC). Next morning: a new `arcane-main-*` file in `/var/backups/arcane-duel/` and in the bucket. Section 7 (regression) on jesse.

### [0.36.0-0] HTTPS on arcaneduel.duckdns.org (Jesse)

- [ ] **HT1** Open https://arcaneduel.duckdns.org/, https://jesse.arcaneduel.duckdns.org/, https://mark.arcaneduel.duckdns.org/ and https://adnan.arcaneduel.duckdns.org/. Expect: each shows the game with a padlock (valid certificate, no warning), and the version on the menu is that slot's branch.
- [ ] **HT2** On https://jesse.arcaneduel.duckdns.org/: Duel > a lobby with a room code; a second browser joins with the code; play a match (it runs over `wss://`). Copy in the lobby copies the code.
- [ ] **HT3** Old addresses: http://159.13.37.255/ goes to https://arcaneduel.duckdns.org/, and http://159.13.37.255:8081/, :8082/ and :8083/ go to mark., jesse. and adnan. (with any path kept, e.g. `:8082/styleguide.html`).
- [ ] **HT4** In the browser console on an https slot: `isSecureContext` is `true` and `crypto.randomUUID()` returns an id. Section 7 (regression).

### [0.35.6-0] Workshop label (Jesse)

- [ ] **UI8** Main menu: the wizard icon and "Workshop" sit centred on the plate with a gap to both stone ends, at 1366x768 and at a large window.

### [0.35.5-0] Host leaves the lobby (Jesse)

- [ ] **HS3** Three people in a lobby (host Player 1, then Player 2, then Player 3). The host presses Leave room. Expect: the room stays open, Player 2 is now host (★, can change settings and start), nobody is kicked to the menu. Player 2 leaves: Player 3 becomes host. Player 3 leaves: the room is gone (its code no longer joins).

### [0.35.4-0] Watching host leaves and returns (Jesse)

- [ ] **HS1** Host presses Spectate, two others play. Host leaves the match (Esc > Leave match), rejoins with the code (still watching). When the match ends and everyone goes back to the lobby: the host is still ★ host with the same "Player N" name and can change settings.
- [ ] **HS2** Same, but the host stays away until the lobby, then joins the lobby by code. Expect: the same name (not Player 5), someone else is host (★) and can change settings.

### [0.35.3-0] Fix lobby over http (Jesse)

- [ ] **RJ0** On the slot URL (plain http, not localhost): Duel > a lobby opens with a room code and your name under Team 1; ↻ gives a new code and stays in the lobby; a second browser can join with the code. Then run RJ1-RJ3 below.

### [0.35.2-0] Rejoin a running match (Jesse)

- [ ] **RJ1** Two players in a running match. Player B opens Settings (Esc) and presses Leave match, then goes Duel > "Join a different lobby", enters the same code. Expect: B is back in their own seat (hint "Reconnected · back in the match"), player A sees them return; B can move and cast.
- [ ] **RJ2** Player B refreshes the page mid-match: still back in their seat (as before). B closes the tab and opens a new one, joins with the code: expect to be a spectator (new tab = new player).
- [ ] **RJ3** A third person joins the code of a running match. Expect: they watch ("Spectating" in the hint), cannot act, and when the match ends see MATCH OVER with Back to lobby. Section 7 (regression).

### [0.35.1-0] Workshop button size (Jesse)

- [ ] **UI7** Main menu at a large window (1920x1080 and fullscreen) and at 1366x768: the Workshop button is the same modest size (about the width of one menu button's frame), text fits inside the plate.

### [0.35.0-0] Teams, spectators, host anywhere (Jesse)

- [ ] **TM1** Host plus one guest in a 2 v 2 lobby. Expect: under each team one button ("Your team" disabled, or "Switch to Team N"); the host has a ★ next to their name and "(you)" on their own row. Click Switch on the guest: they move, the host sees it at once. The host switches teams too; the ★ moves with them and the host can still change settings and start.
- [ ] **TM2** Fill a team (two players), have a third player look at it. Expect: that team's button reads "Team full" and is disabled; nothing happens on click. Free a seat; the button becomes Join / Switch.
- [ ] **TM3** Press Spectate (as guest, then as host). Expect: you leave your seat and appear in the Spectators panel with "You are spectating"; the other players see you listed; Join Team N brings you back. A 5th joiner to a full 2 v 2 room appears in Spectators.
- [ ] **TM4** Start a match with a spectator in the room (also with the host spectating). Expect: the spectator sees the match with "Spectating" in the hint, moves, clicks and spell keys do nothing, and there is no YOU HAVE FALLEN banner. When it ends, the result says "MATCH OVER", with Back to lobby and no Rematch; Back to lobby returns everyone and the spectator is still a spectator.
- [ ] **TM5** A host who leaves mid-match: the others carry on; after Back to lobby, one of them is host (★, settings and Start work). Section 7 (regression).

### [0.34.8-0] Plate button, join row, Esc focus (Jesse)

- [ ] **UI5** Main menu: the Workshop button (bottom right) looks like the Duel / Practice buttons (same stone-capped plate) with "Workshop" and the wizard icon in dark text; hover lifts it; click opens the Workshop.
- [ ] **LB4** Lobby: "Join a different lobby" with its code box and JOIN LOBBY button is visible without clicking anything.
- [ ] **UI6** Start a solo or online match, press Esc. Expect: Settings opens and BACK TO MATCH has no blue focus ring; Tab then shows the ring. Esc again closes it.

### [0.34.7-0] Lobby in three zones (Jesse)

- [ ] **LB1** Duel > create a lobby (host) and join it from a second browser (guest). Expect: the code strip across the top (code, COPY, new-code arrow, status line); teams on the left with blue TEAM 1 and red TEAM 2 ribbons; a Lobby settings card on the right; red LEAVE ROOM, SPELLBOOK and a green START at the bottom. Check at 1366x768 and 1280x720: nothing cut off, including 4 v 4.
- [ ] **LB2** Host changes Map, Team size, Health, Friendly fire and When a wizard falls. Expect: the guest's card updates and its controls are greyed and cannot be opened. The host's ⇄ button still moves a player between teams. START is green and only the host sees it.
- [ ] **LB3** Click "Join a different lobby", enter another room's code, press JOIN LOBBY. Expect: you move to that room; a wrong code shows an error under the input. Copy copies the code; ↻ gives a new code only while alone. Section 7 (regression).

### [0.34.6-0] Practice banners (Jesse)

- [ ] **PR1** Main menu > Practice. Expect: the logo is hidden; a "Practice" title, three hanging banners (red Duel AI, beige Stationary Dummy, beige Moving Dummy) each with a green PLAY pill, and a brown Back below. Click each banner. Expect: Duel AI starts a fight with the AI, Stationary starts an immortal dummy, Moving starts a running dummy. Back returns to the menu with the logo. Check at 1366x768 and 1280x720: nothing cut off; narrow window (under 700px): banners wrap.
- [ ] **PR2** Settings: the song dropdowns fill the row next to the green play button. Workshop: the part dropdown in the layout editor is full width.

### [0.34.5-0] Spellbook page-turn corners (Jesse)

- [ ] **SP5** Main menu > Spellbook. Expect: the left and right arrows are folded parchment corners at the bottom of each page, with a gold fold line and no blue. Hover grows them slightly; Tab to one shows a light-blue fold line. Click through all spreads (both directions, wrapping). Expect: the page turns as before and the corner does not cover the page numbers or the last spell card. Check at 1366x768 and 1280x720. Section 7 (regression).

### [0.34.4-0] Calmer dropdown, Workshop button (Jesse)

- [ ] **UI4** Settings: the closed song dropdowns are a flat tan, not bright or shiny; the open list still looks right. Main menu: the Workshop button (bottom right) is a gold plate with stone end caps like the Duel / Practice buttons; hover lifts it; click opens the Workshop and Back returns. Check at 1366x768: it does not cover anything.

### [0.34.3-0] UI colour roles and styled dropdown (Jesse)

- [ ] **UI1** Open `/styleguide.html`. Expect: four button types in gold, beige, brown, red and green; no blue anywhere; green is a muted mossy green. The Map dropdown shows a parchment button; click it. Expect: a parchment list with a gold-highlighted row; arrows move, Enter picks, Esc closes, a click outside closes.
- [ ] **UI2** Main menu > Settings. Expect: both song dropdowns use the new look and the two play buttons are green; Back is brown. Pick a song, press play. Expect: it plays; the toggles are still gold. Section 7 (regression).
- [ ] **UI3** Lobby (host and a second browser as guest): the Map, Team size, Health and Death dropdowns work, and the guest's are greyed out and cannot open. Spellbook: Preview is green, Back is brown. Practice and Workshop: no blue buttons left, Back is brown.

### [0.34.2-0] Hat tilt position fix (Mark, 2026-10-23 AWST)

- [ ] **WW64** Save a Head–Body Pair with nonzero X/Y offsets, then select a hat without a saved Hat–Head Pair. Choose Hat in Edit piece. Sweep Tilt left/right repeatedly: Horizontal position and Vertical position remain unchanged and the hat rotates around a fixed centre. Mirror and Size also leave X/Y unchanged. Save layout and reload: no extra shift.
- [ ] **WW65** With that head–body alignment active, enter Hat–Head Pair editing, tilt, save, exit and reopen several times. The hat must not jump or drift; switching pairs and exporting must preserve each pair's X/Y. Check the same saved hat in Practice and section 7 (reg…24624 tokens truncated…- [ ] **V5** Floating damage numbers and particles near the edge show normally.
- [ ] **V6** Online: the opponent walks into view from off-screen without popping or flickering,
      and the health bar over their head shows as they enter.
- [ ] **V7** Performance: while fighting on the battleground, the game feels as smooth as on an arena.
      Optional: open the browser's performance overlay or dev tools and check the frame rate stays
      near your display's refresh rate.
- [ ] **V8** Arenas still look exactly as before (spot-check Enchanted Arena and Dark Wizards' Circle),
      with spells, particles and floating text all showing.
- [ ] **V9** [0.2.2-1] Projectiles on the battleground: stand near the left spawn and fire a bolt
      straight to the right across the map (and up/down toward the far corners). Expect: it
      keeps flying the whole way, past where an arena would end (about 800 units, a bit less than
      one screen away from the map's left side), until it hits a stone or the map edge. Test fire,
      earth and a charged spell. (Before the fix, shots disappeared at the old arena edge.)
- [ ] **V10** Online, same test from both players' windows. Expect: the opponent's shots also fly
      the whole way and hit you if aimed at you from far away.

## 12. [0.3.0] Spawns

- [ ] **P1** Solo, **DUEL AI** on an arena (e.g. Enchanted Arena). Expect: you start on the left, the
      opponent on the right, as before, and your wizard is facing right.
- [ ] **P2** Online, Development Battleground. Expect: the host starts at the far left and the guest
      at the far right of the map (the camera shows each player their own side), far apart and not
      standing in a stone.
- [ ] **P3** Training mode on the Development Battleground with a dummy that respawns (mortal
      dummy). Kill it. Expect: it comes back at its starting spot on the right, not at the old
      arena position (a fixed spot near x=645, which would be in the middle of the big map).
- [ ] **P4** Start a rematch a few times on an arena and on the battleground. Expect: spawns are the
      same every time and no arena changed.

## 13. [0.3.1] Obstacle lookup (no visible change: this is a regression check)

- [ ] **O1.13** Walk around every stone on the Development Battleground (solo training). Expect: you
      are blocked by each stone exactly as before, including stones near the edges of the map and
      ones close together, with no walking through or sticking on empty ground.
- [ ] **O2** Fire bolts at stones from near and far on the Development Battleground. Expect: shots
      stop at the stone they hit, and shots past a stone's edge keep flying.
- [ ] **O3** Place a trap (middle click) next to and on a stone on the battleground. Expect: it is
      refused on the stone and works beside it.
- [ ] **O4** Arenas, spot-check Enchanted Arena and Dark Wizards' Circle (table, monuments, pillars):
      same blocking of walking and shots as before.

## 14. [0.3.2] The Ruined Keep (first real battleground)

- [ ] **K1** The menu's MAP picker lists **Ruined Keep** under **Battlegrounds**, next to the
      Development Battleground. Pick it (menu background may stay as it was).
- [ ] **K2** Solo, **DUEL AI** on Ruined Keep. Expect: mossy ground, a dirt road heading right from
      your wizard, broken stone walls and mossy stones. The camera follows you; the whole map is much
      bigger than the screen.
- [ ] **K3** Walk east along the road. Expect: you reach a wall across the road with a gap you can
      walk through (the gatehouse), then the walled keep in the middle with a flagstone courtyard and
      a big stone in the centre. The keep has a gap in the middle of each side.
- [ ] **K4** Walls block walking and shots from every side (try all four sides of a wall, and the
      ends). Stones block as well. Shots stop at the wall's drawn edge, not visibly before or after.
- [ ] **K5** Online: host creates a room, picks Ruined Keep, guest joins and sees it (picker greyed),
      START. Expect: host starts at the far left and guest at the far right, both facing the keep, on
      the same map with the same walls.
- [ ] **K6** Online fight: use the walls and the keep for cover. Expect: nothing walks through walls,
      the opponent's shots stop at the same walls you see, and no stuck spots (try walking along a
      wall into its corner and out again).
- [ ] **K7** The map is fair: walk from your spawn to the keep and back from the other side; the
      layout is a mirror image left to right.
- [ ] **K8** Performance: smooth on Ruined Keep, like the Development Battleground.

## 15. [0.4.0] Vision radius (data only: a regression check, fog comes in 0.4.1 and 0.4.2)

- [ ] **R1.15** Nothing visible changes yet: on an arena and on both battlegrounds you still see the
      opponent, their shots and effects wherever they are on the map (solo and online).
- [ ] **R2.15** Optional, for a technical check: the match plays exactly as in 0.3.2 on Ruined Keep
      (walls, spawns, camera). The vision radius (585 units on battlegrounds, none on arenas) exists
      in the map data and is not used by the game yet.

## 16. [0.4.1] Server-side culling. Needs two windows, Ruined Keep, online

The server now leaves out what you can't see. There is no fog drawing yet (0.4.2), so things simply
appear and disappear at the edge of your sight (585 units, wider than the screen's half-width).

- [ ] **C1.16** Host picks Ruined Keep, guest joins, START. At the start the rival is far away. Expect:
      the rival is not drawn for either player (so there is no health bar or number for them).
- [ ] **C2.16** Both players walk toward each other along the road, through the gatehouse gap. Expect:
      the rival comes into view (fading in from the dark) when about a screen away, a health bar with **200/200** beside it appears over them, and the
      rival stays in the right place with no sliding in from a wrong position.
- [ ] **C3.16** Walk away from each other until the rival is out of sight again, then back. Expect: they
      vanish and return cleanly each time and appear where they really are.
- [ ] **C4.16** Cast from far away (just out of sight) at the rival. Expect: you do not see their effects
      (shots, sparks, text) until they come into sight; hits still count.
- [ ] **C5.16** Duel on an arena (e.g. Enchanted Arena) online. Expect: exactly as before; the rival is
      always visible.
- [ ] **C6.16** At the end of a round on Ruined Keep (if you can finish a fight at range, e.g. a burn
      kills the rival out of sight), the death and result show normally for both players.
- [ ] **C7.16** An old tab left open from before the deploy is told to refresh.

## 17. [0.4.2] Fog of war (client). Ruined Keep and Development Battleground, solo and online

- [ ] **F1** Solo, **DUEL AI** on Ruined Keep. Expect: the edges and corners of the screen are dark, the
      area around your wizard is clear. Your sight is about 585 units; the sides of
      the screen are almost black, the top and bottom still partly lit.
- [ ] **F2** Walk around. Expect: the fog moves with you and is centred on your wizard; walls, stones and
      the keep appear out of the dark as you get near. HUD, spell legend and cooldown boxes are not
      darkened.
- [ ] **F3** Same on the Development Battleground.
- [ ] **F4** Arenas (any, solo and online): no fog at all, exactly as before.
- [ ] **F5** Online, two windows, Ruined Keep. Approach each other. Expect: the rival fades in out of the
      dark as they come into sight (no sudden pop-in), and fades out again as you move apart.
- [ ] **F6** Get shot from the dark: have the other player fire at you from just out of sight (the
      server hides them at 440 + 100 units, but spells reach 450). Expect: a red **arrow at the edge
      of the screen** points toward where the shot came from and fades after about 1.5 s. Bombs, burns
      and zones give no arrow.
- [ ] **F7** A hit from a rival you can see does not show the arrow.
- [ ] **F8** Casting at the dark: your own shots and effects look right while flying out into the fog
      (they darken as they leave your sight) and still hit (check the damage numbers).
- [ ] **F9** Performance: the fog does not slow the game; it feels as smooth as before.

## 18. [0.5.0] Split map data (no visible change: a regression check)

- [ ] **D1** Nothing looks or plays differently: on every arena, the Development Battleground and the Ruined
      Keep, the map still loads with the same walls, spawns and fog, solo and online.
- [ ] **D2** Online on the Ruined Keep, both players see the same walls and the shots stop at them
      (map data comes from the server's side of the code only).

## 19. [0.5.1] Caddy serves the client (only after Jesse has applied `caddy.sh` on the server)

Ask Jesse whether the new Caddy config is live before running this; if it is not, these checks pass
either way (Node still serves the client).

- [ ] **H1.19** Hard-refresh the page. Expect: the menu, map art and everything else load as before, with no
      broken images (check a few arenas in the map picker).
- [ ] **H2.19** Open the browser's network tab, reload. Expect: the page and scripts are served
      **compressed** (`content-encoding: zstd` or `gzip`), and play works.
- [ ] **H3.19** Open `<slot URL>/version` and `<slot URL>/stats`. Expect: the version text and the stats JSON
      (they come from the game process, not from Caddy's files).
- [ ] **H4.19** Play a full online match (create room, join, START, fight, rematch). Expect: no change
      from before; multiplayer still connects (WebSocket through Caddy).
- [ ] **H5** Open `<slot URL>/nope.js`. Expect: a plain "not found", not the game page and not an error page.

## 20. [0.5.2] Server load under real play (technical, Jesse)

- [ ] **T1** With two people in a match on Ruined Keep, open `<slot URL>/stats` a few times during the
      fight. Expect: `lastSecond.ticks` close to 60 and `tickMsMax` well under 16 (ms); bytes out
      per second in the same range as in `docs/ROADMAP.md` (tens of KB/s per match).
- [ ] **T2** Same with two matches at once if you can. Expect no stutter in either; if one appears,
      note the `/stats` numbers (the Micro VM is 1/8 of a core).

## 21. [0.6.0] Mark's wizard designs and balance (merged from `test`)

- [ ] **W1** Menu: a **YOUR WIZARD** picker (Random plus eight wizards). Pick one, **DUEL AI**. Expect:
      you play that wizard (check the name above it and the look); the AI gets a different one.
      Online, characters are still assigned by the server.
- [ ] **W2** Look at several wizards (each hat, robe, staff, glow). Expect: all eight look distinct
      and nothing is cut off or drawn badly; staff charge effects come out of the staff tip.
- [ ] **W3** Charge a projectile spell (hold the mouse). Expect: damage grows smoothly with the
      hold, from 1x (a tap) to 3x (a full charge), with no jump at a short hold.
- [ ] **W4** Lightning does about 40 damage per second to a dry wizard, and about 80 at full Wet
      (soak them with water first). The ELECTROCUTION text shows on a wet target.
- [ ] **W5** Fire against a shield that blocks it. Expect: **BLOCKED!** shows at most about once a
      second instead of flooding the screen; other spells still show it on every block.

## 22. [0.6.1] Minimap (battlegrounds only)

- [ ] **N1** Solo on Ruined Keep. Expect: a small map in the bottom-right corner showing the walls and
      stones, a green dot for you, a rectangle for the part of the map on screen, and a red dot for
      the rival while they are in sight (inside the fog's radius).
- [ ] **N2** Walk around. Expect: your dot and the screen rectangle move with you; the minimap does
      not flicker or darken in the fog.
- [ ] **N3** Online, two windows. Expect: the rival's red dot appears only while you can see them
      and vanishes when they go out of sight (it must never show where a hidden rival is).
- [ ] **N4** The Development Battleground also has a minimap, arenas have none.

## 23. [0.6.2] Sides swap on a battleground rematch (online)

- [ ] **Z1** Online, Ruined Keep: round one, the host starts on the left and the guest on the right.
- [ ] **Z2** Rematch. Expect: the host now starts on the right and the guest on the left, the camera
      and walls are right, and nothing jumps oddly on the first frames.
- [ ] **Z3** Rematch again: back to the first sides. Arenas never swap sides.

## 24. [0.6.3] Clean-up (a regression check: nothing should look or play differently)

- [ ] **U1** Solo on Ruined Keep: the fog, minimap, both wizards (drawn in the right order when one walks
      past the other, so the lower one is in front) and walking all behave as before.
- [ ] **U2** One online match on an arena and one on Ruined Keep, start to finish, including a rematch.

## 25. [0.6.5] Mark's spell variants (solo prototype; superseded by sections 39 and 40, skip unless you have time)

> Historical: the SPELL LOADOUT panel became the SPELLBOOK (section 39) and variants now work online (section 40), so "online ignores them" below is out of date.

- [ ] **S1.25** Menu: a **SPELL LOADOUT** panel with a variant per spell (Earth: Pebble Spray, Fire: Fireball,
      Water: Water Surge, Ice: Frost Shards; each defaults to the original). Online ignores them.
- [ ] **S2.25** Pick all four variants, **DUEL AI**. Expect: the HUD shows the variant names, and each spell
      behaves as described: pebbles are a spray (hold to keep firing) and the water surge an instant ring, the fireball and
      frost shards are single projectiles with their own sprites.
- [ ] **S3.25** Choose the originals again. Expect: spells behave exactly as before, including charging.
- [ ] **S4** Start a new match after changing the loadout. Expect: it is locked in for each match (a match
      keeps the loadout it started with).

## 26. [0.7.0] A match is a list of wizards (no visible change: a regression check)

- [ ] **L1.26** Solo **DUEL AI** and **IMMORTAL DUMMY**, then a **mortal dummy** and kill it. Expect: everything as
      before, the dummy respawns, the HUD and menu background look the same.
- [ ] **L2.26** One online match (two windows) on an arena and on Ruined Keep, start to finish with a
      rematch. Expect: no difference from before.

## 27. [0.7.1] Targeting for teams (a regression check, plus one fix)

Nothing should change in a 1v1. These check every attack type still lands and the new trap fix.

- [ ] **G1.27** Solo **DUEL AI**: fire and water sprays, lightning, a projectile spell, a charged shot, a bomb, a
      force push (space), the sword, a bubble and a trap each still hurt the AI as before.
- [ ] **G2.27** Online (two windows), arena: the same attacks hit the other player and not yourself, and your own
      bomb or reflected shot can still hurt you.
- [ ] **G3.27** **Fix:** on **Ruined Keep** (solo or online), set a trap (middle click) far from the left edge, in the
      middle and right side of the map. Expect: it is placed where you aimed (up to its range), not
      stuck near x=760.
- [ ] **G4.27** Magnetic spells still curve toward the other wizard.

## 28. [0.7.2] Seats and protocol 8 (a regression check; the wire format changed)

Nothing should look different. These cover everything the new snapshot and messages touch.

- [ ] **Q1** Online (two windows), arena: create, join, start. Expect: each player sees themselves on their
      own side, the rival on the other, your health top left, and the rival's health beside their bar ("200/200").
- [ ] **Q2** Fight to the end. Expect: the loser's screen says **DEFEAT**, the winner's **VICTORY**, with
      the right wizard falling over (the one that lost, on both screens).
- [ ] **Q3** Rematch twice, then back to the lobby and start again. Expect: no errors, sides correct each time
      (they swap on a battleground).
- [ ] **Q4** Cast from both players: your own spells show your colours/effects instantly, the rival's show
      when they arrive; lightning, sprays, bubbles, traps and bombs from the rival appear and are theirs.
- [ ] **Q5** Reconnect: close one tab mid-match and reopen it quickly (or refresh): you come back in the
      same seat. A tab left open from before the deploy is told to refresh.
- [ ] **Q6** Ruined Keep: the rival is hidden in the fog at the start and appears when close, as before.

## 29. [0.7.3] The client draws a list of wizards (a regression check; end of stage 0.7)

Stage 0.7 is now complete: the whole game works on a list of wizards, still with two. Please run a
proper two-person match on :8082, because the client's drawing, interpolation and fog all changed.

- [ ] **C1.29** Online, Ruined Keep, two windows: the rival is hidden at the start (HUD "RIVAL out of sight"),
      appears when you get close and moves smoothly (no jumping), vanishes again when you part. The
      minimap shows their red dot only while you see them.
- [ ] **C2.29** Wizards overlap correctly: when one walks past the other, the one lower on the screen is in
      front, and a dying wizard falls over (the right one, on both screens).
- [ ] **C3.29** The hit arrow (from out of sight) and the fog still work (sections 16 and 17).
- [ ] **C4.29** At the end of a won match the result says "Remaining health" with **your** health (it used to
      show the rival's).
- [ ] **C5.29** Your own spells preview instantly and stop at walls and at the rival if they are in the way;
      a rival you cannot see does not stop them.
- [ ] **C6.29** Solo: DUEL AI and the training dummies look and play as before, with the rival in the minimap.
- [ ] **C7.29** Colours: your team is green and the other team red, in solo and online (this changed in 0.10.0; online
      you used to be the red wizard).

## 30. [0.8.0] Team spawns (no visible change yet: a regression check)

Team spawns only matter in a 2v2 (section 35), so this just checks that duels did not change.

- [ ] **T1.30** Online duel on an arena and on Ruined Keep: spawns where they were (left and right), sides swap
      on a rematch on the battleground, nothing else different.
- [ ] **T2.30** Solo duel and dummies: unchanged.

## 31. [0.8.1] Rooms by seat (a regression check for duels; the team lobby is section 32)

This checks duels still work through the room code that now handles seats, and the lobby status text.

- [ ] **E1.31** Create a room, join from a second window, start (arena and Ruined Keep). Expect: lobby shows
      "Share the code…" then "Your opponent is here" with START enabled for the creator only.
- [ ] **E2.31** Change the map in the lobby (creator): the guest sees it change. The guest leaving puts START
      back to disabled; joining again re-enables it.
- [ ] **E3.31** Rematch and back to lobby still work; closing a tab mid-match and reopening keeps your seat
      (reconnect). A tab from before the deploy is told to refresh.

## 32. [0.8.2] The team lobby (needs up to four browser windows)

Set up and look at a 2v2 lobby (the match itself is section 35).

- [ ] **B1.32** Window A: create a room. The lobby shows MAP, TEAM SIZE (1 v 1 up to 4 v 4) and two team columns
      (TEAM 1: Host (you) + open seat; TEAM 2: two open seats). With 1 v 1 there are only two seats and no
      rules rows.
- [ ] **B2.32** A picks **2 v 2** and **Ruined Keep**. Expect: four seats, the Friendly fire checkbox and the
      "When a wizard falls" choice appear, and the map list stays as it is (every map takes every team size).
- [ ] **B3.32** Windows B, C, D join with the code. Expect: they fill seats in turn: the second joiner goes to
      TEAM 2 (Player 3), the third to TEAM 1 (Player 2), the fourth to TEAM 2 (Player 4). Everyone sees the
      same lobby with "(you)" on their own seat, and the status counts (n/4) until full.
- [ ] **B4.32** Joiners see the options greyed out (read-only). The host changes friendly fire and the fall rule:
      all four windows update.
- [ ] **B5.32** The host presses **⇄** next to a player: they move to the other team (into an open seat, or
      swapping with a player there). The host has no ⇄ and cannot be moved; non-hosts have no buttons.
- [ ] **B6.32** A joiner leaves (LEAVE ROOM or closes the tab): their seat shows "Open seat" and START is disabled
      again for the host. Switching A back to **1 v 1** with more than two players seated does nothing (the
      room keeps 2 v 2); after players leave so only two remain it works and they become Host and Player 2.
- [ ] **B7.32** Host presses **START** with all four seated on a 2 v 2: the match starts for everyone (section 35).
      With a seat empty START is disabled. A **1 v 1** still starts normally.
- [ ] **B8.32** Everything else in the lobby still works as before: copy button, map change in 1 v 1, rematch.

## 33. [0.8.3] Mark's spell variants, second batch (solo prototype; superseded by sections 39 and 40)

> Historical: variants now work online (section 40), so "online ignores them" below is out of date.

- [ ] **V1.33** Menu: the spell choices (now in the **SPELLBOOK**, see section 39) have a variant for every spell (Fire, Water, Lightning, Earth,
      Steam, Plasma, Magma, Storm, Ice, Magnetic). Online ignores them.
- [ ] **V2.33** Pick a few new variants (e.g. Plasma Beam, Magnetic Pull, Lava Pool, Frost Shards) and
      play **DUEL AI**. Expect: each behaves as its name says, has its own look, and hits the AI; held beams
      retract when you let go.
- [ ] **V3.33** With all variants on default the game plays exactly as the originals.
- [ ] **V4.33** Online duel: spells are the originals, nothing changed.

## 34. [0.9.0 to 0.9.2] Team rules (a duel regression check; the team rules themselves are in section 35)

The elimination and respawn rules, friendly fire and team vision only show in a 2 v 2 (section 35), so
these confirm that duels did not change.

- [ ] **R1.34** Online duel to the end on an arena and on Ruined Keep: the first fall ends the round, the right
      player gets VICTORY and the other DEFEAT, rematch works.
- [ ] **R2.34** Fog on Ruined Keep in a duel: the rival is hidden until close, as before (vision per team is
      the same as per player in a duel).
- [ ] **R3** Solo duel, and training dummies (including the mortal dummy that respawns): unchanged.

## 35. [0.10.0] Playing a 2v2 (needs four browser windows; the big one to eyeball)

Team matches can now be started from the lobby. Four windows on http://159.13.37.255:8082/: A creates a
room (pick **Ruined Keep**, **2 v 2**), B, C and D join. Seats: A and C are one team, B and D the other.

- [ ] **P1.35** START works. Each window says "Online 2v2 · Your team is GREEN"; the top bar shows
      "ENEMIES STANDING 2"; a team panel (top-left) lists you ("YOU ·"), your teammate (green) and the two
      enemies (red), the enemies as "Enemy ?" until you have seen them.
- [ ] **P2.35** Teams start on opposite sides (left and right), two to a side, with different wizard looks. Your
      teammate is always visible on screen and on the minimap (green dots); enemies only when your team
      can see them (red dot).
- [ ] **P3.35** **Shared sight:** stand so that your teammate can see an enemy and you cannot. The enemy appears
      for you too (fog clears around your teammate as well as you), and the minimap shows them.
- [ ] **P4.35** Fight. Spells hit the enemies, and not your teammate (friendly fire off); hits from out of sight
      still show the red arrow.
- [ ] **P5** **Elimination** (default): when a wizard falls the round goes on. In the fallen player's window
      "YOU HAVE FALLEN / Watching your team", the camera follows a standing teammate, and their row in the panel says
      FALLEN. Everyone's panel shows them FALLEN; the top bar's enemy count drops if it was an enemy.
- [ ] **P6** The round ends when one whole team has fallen: that team's windows show DEFEAT, the other VICTORY, and
      everyone gets the end screen with REMATCH (sides swap) and BACK TO LOBBY.
- [ ] **P7** **Respawn** (set "Comes back after a delay" in the lobby): a fallen wizard shows "Back in n s", returns at their
      start with full health, the score "a – b · first to 10" at the top is right from both teams' points of view, and
      the first team to 10 kills wins.
- [ ] **P8** **Friendly fire** (tick it in the lobby): your spells now hurt your teammate, and theirs hurt you.
- [ ] **P9** A player closes their tab mid-match and reopens it: the match pauses for everyone for a few seconds and
      they come back in their seat (if they do not, the room closes for all, as in a duel).
- [ ] **P10** Duels (1 v 1) still work as in section 29 and look the same apart from the green/red colours.

## 36. [0.10.5] 2 v 2 on the arenas

- [ ] **A1** In the lobby choose any **arena** (e.g. Enchanted Arena, Dark Wizards' Circle) and **2 v 2**: the choice
      stays (no switching back to 1 v 1), and players joining see 2 v 2 too.
- [ ] **A2** START and play on an arena: two wizards a side, teammates start together on the left (or right), all
      four wizards visible all the time (arenas have no fog), team panel and rules as in section 35.
- [ ] **A3** Try a few arenas, the Dark Wizards' Circle especially (its monuments are close to the start).

## 37. [0.11.0] 3 v 3 (needs six windows, or a few windows and the scripted players below)

- [ ] **H1.37** The lobby's TEAM SIZE now lists **3 v 3**. Pick it: six seats, three to a team column, the status
      counts n/6, and the seats fill alternating teams (host, then team 2, team 1, team 2, ...).
- [ ] **H2.37** START with all six seated, on an arena and on the Ruined Keep: six wizards, three a side, the team
      panel lists six rows (yours green, three enemies red), nothing overlaps or runs off the screen.
- [ ] **H3.37** Play a round of each rule (elimination and respawn): falls, spectating, the score and the end screen
      work as in the 2 v 2, with more people.
- [ ] **H4.37** It stays smooth: no stutter with six players (check `<slot URL>/stats`: `lastSecond.ticks` near 60 and
      `tickMsMax` well under 16 ms).

## 38. [0.12.0] 4 v 4 (eight players: windows plus scripted players)

- [ ] **J1** TEAM SIZE now lists **4 v 4**: eight seats, four to a column, status n/8, seats alternate teams.
- [ ] **J2** START on an arena (chaos: eight wizards in a small space) and on the Ruined Keep. The team panel lists
      eight rows with eight different wizard looks; your team's four are green. The fog shares sight between all
      four teammates on a battleground.
- [ ] **J3** Falls, spectating, respawn and the end screen still work at this size.
- [ ] **J4** Server health: with eight players `<slot URL>/stats` should still show `lastSecond.ticks` near 60 and
      `tickMsMax` well under 16 ms. A second 4 v 4 at the same time is the hard case on the small VM: note it if
      either match stutters.
- [ ] **J5** A player dropping out of an 8 player match pauses everyone for a few seconds (see the open item in
      `docs/HANDOFF.md`): note how disruptive that feels.

## 39. [0.12.1] Mark's spells merged: Pyrodisk, spellbook, magnetic bomb (solo prototype)

- [ ] **P1.39** Menu: **SPELLBOOK** opens a modal with a description for every variant; Fire offers Fireball and
      Pyrodisk, Water only Water Surge. There is no Flame Wave or Tidal Surge anywhere.
- [ ] **P2.39** Pick Pyrodisk, **DUEL AI**. Expect: a flaming ring flies out, hits the AI at most twice on the way (out
      and back), turns for home at max range or when it hits a pillar or wall (the map edge does not turn it), and returns to you. You cannot throw a
      second one until it is back, and it cannot be charged.
- [ ] **P3.39** Stand the AI behind your Bubble shield or let it use one, and throw Pyrodisk at it. Expect: the disc is reflected
      at the bubble edge; nobody inside is hurt. A disc that meets a pillar or bubble on the way back just vanishes.
      (0.12.22-0: your own bubble reflects your disc too; see BR1 and B3.)
- [ ] **P4.39** Magnetic bomb with a Lightning shield up: one "BLOCKED!" label, and no pull. Without the shield: the
      bomb pulls you in and hurts less than before.
- [ ] **P5.39** Plasma Beam: tap, hold and release repeatedly. Expect: the beam starts fresh each press, damage numbers
      appear about five times a second, and silence builds slowly.
- [ ] **P6.39** The spell action bar (under the arena) shows your equipped spells, highlights the selected one, and does not
      flicker while you play. (Replaced the old top-left legend in 0.12.20-0.)

## 40. [0.12.2] The spellbook online (needs two browser windows)

- [ ] **O1.40** Create a room and join it. In the lobby each window has a **📖 SPELLBOOK** button. Pick variants in both
      (e.g. host: Pyrodisk and Plasma Beam; guest: Pebble Flurry and Magnetic Pull). Each seat in both windows
      shows that player's picks, or "Original spells".
- [ ] **O2.40** START. Cast each variant at the other player. Both windows see the same spell with its own look (Pyrodisk
      ring, Frost Shards, beams, the surge ring, the cloud), and your own variant shots show as well as theirs. The action bar names
      your variant.
- [ ] **O3.40** Plain spells (no variant picked) still show instantly for you with no double image. A variant may appear a
      moment after the click (one round trip) rather than instantly: note if that feels bad.
- [ ] **O4.40** After the match, go back to the lobby: the picks are still there and can be changed. Rematch keeps them.
- [ ] **O5** In a 2v2, all four players picking different variants: everyone sees everyone's spells, no errors.
- [ ] **O6** The spellbook modal opens above the lobby and closes back to it. Picks made in the menu before creating a
      room are sent when the lobby opens.
- [ ] **O7** Server health with variants flying: `<slot URL>/stats` still shows `lastSecond.ticks` near 60.

## 41. [0.12.3] Very high health option (two browser windows)

- [ ] **H1.41** The lobby has a **HEALTH** setting (Normal 200, Very high 1000). The host can change it; the guest sees it
      but cannot.
- [ ] **H2.41** Pick Very high, START. Your top-left readout starts at 1000/1000 and the number by the rival's bar reads `/1000`; health bars start
      full and shrink in proportion as you are hit. A heal restores a quarter of 1000, not of 200.
- [ ] **H3.41** In a team match everyone starts at 1000; with the respawn rule a returning wizard comes back at 1000.
- [ ] **H4.41** Go back to the lobby and rematch: the setting is kept. Set it back to Normal: back to 200.

## 42. [0.12.7] Water Surge (replaced Water Bullet)

- [ ] **W1.42** Pick Water Surge, **DUEL AI** (or an online room) and stand near the target. Click: a ring of water grows out
      from you and fades, and a second cast only works about 5 seconds later. The Water Surge tile on the spell bar fills from below while it recharges (UI9).
- [ ] **W2.42** The target is hurled back a very long way (about 330 px) when the ring reaches them, ends up at about 75% wet (the wet meter), and
      takes no damage. A target out of the ring's reach, behind a pillar or inside a bubble is untouched, and one holding a
      water shield is neither soaked nor pushed.
- [ ] **W3.42** A Lightning hit right after a Water Surge does extra ELECTROCUTION damage.
- [ ] **W4.42** Set yourself on fire (stand in a Fire spray or Lava) and cast Water Surge: your own fire goes out.

## 43. [0.12.5] Pebble Flurry, lightning and wall fixes

- [ ] **F1.43** Pick Pebble Flurry (Earth), hold the button at a close target. Stones fly fast and hit hard for 1.5 seconds
      (about 12 damage each), then stop even if you keep holding. A ring under your health bar empties over those 1.5 seconds,
      and the other player sees it too.
- [ ] **F2.43** You can't start another flurry for about 5 seconds. Letting go early also starts the 5 second wait.
- [ ] **F3.43** Online, cast plain Lightning and hold: you see every bolt you cast, as often as the other player sees them.
- [ ] **F4.43** On any arena map, walk straight up between the top pillars: you can go past the line of the pillars, nearly to
      the top edge of the floor, and the wall now follows the edge of the floor.

## 44. [0.12.6] Bubble reflections online (two browser windows)

- [ ] **B1.44** One player raises a Bubble (Space twice); the other fires a projectile at it (Steam, Magma or any bolt). The
      shot stops at the bubble's edge with the purple bounce effect and comes back. Neither player ever sees it cross
      the bubble first. Check from both windows.
- [ ] **B2.44** Aim straight at the bubble owner: the reflected shot returns along its path and hurts the caster (their HP drops
      once, when it reaches them, not before).
- [ ] **B3.44** A Pyrodisk thrown at an enemy bubble is reflected off its edge like any other shot, flies back out, and can hit
      the one who threw it (not the bubble's owner). It then simply ends at the end of its reach: it never turns back to the
      bubble. Thrown from inside your own bubble it is reflected too (0.12.22-0: no exception for the Pyrodisk).
- [ ] **B4.44** Both players see a reflected projectile all the way back, the bubble's owner as well as the caster; it never vanishes
      for one of them.

## 45. [0.12.7] Thundercloud (a moving cloud) and Gale Force removed

- [ ] **T1.45** Pick Thundercloud (Storm), load Water + Lightning (2, 3) and click. A dark cloud with flashes of lightning appears
      where you aimed (no further than a few hundred pixels) and drifts toward the nearest enemy at half their walking speed.
- [ ] **T2.45** Anyone under the cloud is struck about every half second: small damage and the Static bar fills (and discharges).
      Teammates and you are struck too if you stand under it, friendly fire or not; it never chases them. It fades after about 5 seconds; a second cast within 8 seconds does nothing.
- [ ] **T3** Gale Force is gone from the spellbook: Storm offers only Tempest Bolt (formerly Storm Shot) and Thundercloud.
- [ ] **T4** Online, the other player sees the cloud move and the strikes, from both windows.

## 46. [0.12.10] Nine variants removed

- [ ] **V1.46** The spellbook has no Lightning or Steam variant entries beyond the base spells. Fire offers Fireball and Pyrodisk, Water Water Surge, Earth
      Pebble Flurry, Magma Lava Pool, Ice Frost Shards, Plasma Plasma Beam, Storm Thundercloud, Magnetic Magnetic Pull.
      None of Stone Lance, Chain Lightning, Static Discharge, Scalding Mist, Steam Burst, Unstable Orb, Molten Shrapnel,
      Glacial Spike or Iron Swarm appear anywhere.
- [ ] **V2.46** Each remaining variant still casts and looks right, solo and online.
- [ ] **V3.46** Plain Lightning (Lightning Bolt) and plain Steam (Vapor Blast) work as the originals.

## 47. [0.12.11] Knockback glide and the bubble tap (two browser windows)

- [ ] **K1.47** Get hit by an opponent's Water Surge (stand within its reach, not in a bubble). On your own screen you slide away
      quickly; you never blink to the end spot. The other player sees the same slide.
- [ ] **K2.47** Press 1, Space, 2, Space quickly: two shields (the second replaces the first) and no bubble; the bubble cooldown
      stays READY. Space, Space still casts the bubble, even with a WASD key pressed between.
- [ ] **K3.47** Get silenced (Plasma Overcharge to 100): load an element and press Space. No shield appears, the element stays
      loaded, and Space works again once SILENCED is gone. A frozen wizard cannot shield (see FZ1).

## 48. [0.12.13] Bubble beam reflection, label spam, Frost Shards, Plasma width (two browser windows)

- [ ] **X1** One player raises a Bubble; the other fires a Plasma Beam straight at it. The beam stops at the bubble's edge and
      comes straight back and hurts its caster. Aimed at a slant it bounces off at the opposite angle and misses. The same
      for Lightning (a bolt) and Magnetic Pull (which drags the caster toward the bubble).
- [ ] **X1b** Stand far from a bubble and fire a beam, bolt or projectile at it: the reflection still travels its full
      range and comes all the way back to you, even though most of the range was used getting there.
- [ ] **X2** Block a continuous beam or spray with a shield: BLOCKED! shows about once a second, not a stream.
- [ ] **X3** Hold to charge Frost Shards before firing at a target: a full charge hurts far more than a tap and chills 17% per
      shard (7% for a tap); one full volley (about 85%) does not freeze the target, a second one does.
- [ ] **X4** The Plasma Beam keeps its normal look (about 30 px wide) but hits a target that is slightly off its line.
- [ ] **X5** Pick Magma Lava Pool. Lob it at a bubble from far away: the lob stops at the edge and flies its whole original
      distance back (not the remainder), landing its pool near the caster.

---

## Results log (newest first; the AI assistant adds an entry per test session)

```
Tester: Jesse (with Claude), on the VM and the laptop
Browser(s) / device(s): ssh + curl (no browser items in this run)
Date and time: 2026-10-23 14:30 AWST
Version tested (from S2): 0.37.0-0 on test2 (jesse.arcaneduel.duckdns.org)
Totals: PASS 3  FAIL 0  SKIP 1

PASS: DB1 (schema 1 in /stats, data folder ubuntu/700, survives redeploy), DB2 (backup uploaded to the
bucket, pulled and decrypted on the laptop, integrity ok, 6 tables), DB3 (restore from that backup, then
reset-db on test2; main reset-db refused).

SKIPPED:
- DB4: nightly run not due yet (03:00 Perth).

NOTES:
- First upload failed with SignatureDoesNotMatch: backup.sh dropped the secret key's trailing "=" (fixed),
  then a new key needed a few minutes to work (documented in DEPLOY-ORACLE.md).
- Found: the server does not close the database on stop, so recent writes stay in arcane.db-wal and the
  restore steps delete that file. Harmless for a restore (the file is replaced), but to fix in 0.38.0.
- HT1-HT4 (0.36.0) not yet run in a browser.
```

## Final report template (copy into the log and the chat)

```
Tester:
Browser(s) / device(s):
Date and time:
Version tested (from S2):
Totals: PASS __  FAIL __  SKIP __

FAILURES:
- <ID>: expected ... / saw ... / repeats on refresh? ... / notes ...

SKIPPED:
- <ID>: reason
```

### [0.41.2-0] New shields and Golden Star Wizard Hat (Mark, 2026-10-23 AWST)

- [ ] **WW69** Open Workshop. Hat offers Golden Star Wizard Hat alongside the existing approved hats; Offhand offers Round Shield and Tall Shield alongside None. Each uploaded PNG has transparent edges and appears as a single item without an extra hand layered over it.
- [ ] **WW70** Select Golden Star Wizard Hat, choose Hat in Edit piece, and adjust position, size, tilt and Mirror. Enter Hat–Head Pair editing, save the pair, switch heads and return: the saved alignment remains specific to that head and hat. Export All Alignments includes the new hat ID.
- [ ] **WW71** Select each shield and start Practice. Confirm the shield appears in the same offhand position as the Workshop preview, follows the wizard while walking and casting, and does not remove or duplicate the main-hand staff or its grip. Run section 7 (regression).

### [0.41.2-0] Exported Workshop build layouts (Mark, 2026-10-23 AWST)

- [ ] **WW72** Confirm the previous fresh-browser wizard look still loads after a reset. Select the exported build manually: Grey Head 2, Golden Star Wizard Hat, Burgundy Battlemage, Staff 8, Tall Shield and Boots 10. The body, hat, shield, staff and staff grip use the supplied saved positions, size, tilt and staff mirror setting.
- [ ] **WW73** Switch between the previous pieces and the exported build, then reload. Each asset keeps its own layout; selecting the exported build does not alter the earlier settings. Set the robe colour to dark navy (`#151a28`) and confirm the colour persists with the build.
