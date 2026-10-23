### [0.34.5-0] Spellbook page-turn corners (Jesse)

- [ ] **SP5** Main menu > Spellbook. Expect: the left and right arrows are folded parchment corners at the bottom of each page, with a gold fold line and no blue. Hover grows them slightly; Tab to one shows a light-blue fold line. Click through all spreads (both directions, wrapping). Expect: the page turns as before and the corner does not cover the page numbers or the last spell card. Check at 1366x768 and 1280x720. Section 7 (regression).

### [0.34.4-0] Calmer dropdown, Workshop button (Jesse)

- [ ] **UI4** Settings: the closed song dropdowns are a flat tan, not bright or shiny; the open list still looks right. Main menu: the Workshop button (bottom right) is a gold plate with stone end caps like the Duel / Practice buttons; hover lifts it; click opens the Workshop and Back returns. Check at 1366x768: it does not cover anything.

### [0.34.3-0] UI colour roles and styled dropdown (Jesse)

- [ ] **UI1** Open `/styleguide.html`. Expect: four button types in gold, beige, brown, red and green; no blue anywhere; green is a muted mossy green. The Map dropdown shows a parchment button; click it. Expect: a parchment list with a gold-highlighted row; arrows move, Enter picks, Esc closes, a click outside closes.
- [ ] **UI2** Main menu > Settings. Expect: both song dropdowns use the new look and the two play buttons are green; Back is brown. Pick a song, press play. Expect: it plays; the toggles are still gold. Section 7 (regression).
- [ ] **UI3** Lobby (host and a second browser as guest): the Map, Team size, Health and Death dropdowns work, and the guest's are greyed out and cannot open. Spellbook: Preview is green, Back is brown. Practice and Workshop: no blue buttons left, Back is brown.

### [0.34.2-0] Mark's Workshop changes merged (Jesse)

- [ ] **M8** Run Mark's Workshop sections below (Left Reaching Hand, pair alignments). Open the spellbook too: the open book and Preview still work. Section 7 (regression).

### [0.34.1-0] Spellbook as an open book (Jesse)

- [ ] **SP4** Main menu > Spellbook. Expect: an open book, two pages on a leather cover with a spine in the middle, Fire on the left and Water on the right, spells listed down each page, page numbers at the foot, turn arrows in the bottom corners. Turn through all five spreads (the last arrow wraps to the first). Click each bar icon. Expect: the book turns to that element's page. Click a spell on the right page, then PREVIEW. Expect: it demos that page's element. Check at 1366x768 and 1280x720: nothing cut off. Section 7 (regression).

### [0.34.0-0] Spellbook preview screen (Jesse)

- [ ] **SP1** Main menu > Spellbook. Expect: no demo arena on the page; spell cards, the element bar, Back at the bottom left and a small PREVIEW button at the bottom right. Unselected cards are gold, the selected card is cream with a gold outline. Click cards in a few elements. Expect: the highlight moves, the bar icons follow.
- [ ] **SP2** Pick Flamethrower (Fire), press PREVIEW. Expect: a separate screen with the arena, your wizard, the dummy and Back to spellbook. Cast at the dummy. Expect: the spell works, a cooldown readout shows under the arena and returns to Ready. Back to spellbook. Expect: the book is as you left it.
- [ ] **SP3** Change a pick and the element (◀ ▶, bar), then Preview again. Expect: it shows the element you were on with the new pick. Open Preview from the lobby's spellbook, then have the host press Start. Expect: both screens close and the match plays normally. Section 7 (regression).

### [0.33.19-0] Offhand None shows bare left hand (`test`)

- [ ] **WW55** Choose Offhand → None: the pixel-art left reaching hand appears (not the previous fist), with transparent edges and skin tint. It should appear only once.
- [ ] **WW56** Start Practice with Offhand None: confirm the same hand appears, sways at quarter-speed while walking, and flips with the wizard after casting left. Confirm other offhand choices still display normally.

### [0.33.19-0] Simplified offhand replacement (`test`)

- [ ] **WW53** Select Offhand → Left Reaching Hand in Wizard Workshop. Confirm the new simplified, pixelated grayscale hand with black outline appears on a transparent background, and skin tone still applies to the hand while preserving its dark border.
- [ ] **WW54** Walk in Practice and confirm the offhand sways at one quarter of its previous frequency, stopping smoothly. Verify position/scale/rotation, mirrored cast facing, staff motion and rematch animations still work.

### [0.33.19-0] Outlined offhand and walk sway (`test`)

- [ ] **WW50** In Workshop select Offhand → Left Reaching Hand: confirm darker gray, visible black outline, and fully transparent surroundings.
- [ ] **WW51** Change skin tones: the hand interior follows the head and staff grip while the outline stays dark. Confirm saved position/scale/rotation still work.
- [ ] **WW52** Walk in Practice: the left offhand gently sways side-to-side in sync with the feet, fades to stillness on stopping, and continues working after rematch. Confirm the staff's slower reverse animation and cast-triggered mirroring are unchanged.

### [0.33.19-0] Left reaching offhand skin tint (`test`)

- [ ] **WW46** Open Wizard Workshop → Offhand → Left Reaching Hand. Verify a transparent, no-outline, five-digit reaching hand appears in the offhand position, with no checkerboard background or cuff.
- [ ] **WW47** Change the skin swatch through all tones. Verify the new hand recolors with the grayscale head and staff-grip hand, preserving shadows and transparent pixels. Reset skin tone and check the hand resets.
- [ ] **WW48** Drag, scale and rotate the offhand, save the layout and reload. Confirm the hand is still selected and its placement survives. Enter Practice and confirm the same skin tone and layout apply in battle.
- [ ] **WW49** Switch to another offhand or None. Verify original offhand choices and the empty hand are unchanged; confirm staff-grip animation, foot shuffle, and cast-triggered facing still work.

### [0.33.19-0] Mark's rematch walking fix merged (Jesse)

- [ ] **M7** Run Mark's "rematch walking-animation" section below (walk, finish a round, Rematch, walk again: the feet move straight away). Section 7 (regression).

### [0.33.18-0] One UI folder, one art folder (Jesse)

Refactor; nothing should look different. Hard-refresh once.

- [ ] **R36** Walk every screen: main menu (art buttons, cursor, title), settings, spellbook, Workshop (all sprites, grey heads, staff grip), lobby, a match (action bar, cooldowns), results (art buttons with their glow). Expect: as before, no missing images.
- [ ] **R37** Open http://159.13.37.255:8082/styleguide.html. Expect: the style guide, styled. Section 7 (regression).

### [0.33.17-0] Mark's cast facing merged (Jesse)

- [ ] **M6** Run Mark's "post-cast wizard facing" section below: aim left without casting (no turn), cast left (your Workshop wizard turns left), sword doesn't turn it. Section 7 (regression).

### [0.33.16-0] Leave match button (Jesse)

- [ ] **L5** Main menu → Settings: no Leave match button.
- [ ] **L6** Solo match → Esc → Settings: Leave match shows. Click once: "Click again to leave"; wait 4 s: it changes back. Click twice quickly: back on the menu.
- [ ] **L7** Online (two windows): the joiner presses Esc → Leave match twice. Expect: the joiner is on the menu; the host keeps playing, sees "<name> left the match", the joiner's wizard tagged DISCONNECTED. Section 7 (regression).

### [0.33.15-0] Team wording (Jesse)

- [ ] **W1** 2v2 (four windows): win and lose a match. Expect: "Your team won!" / "Your team was defeated."; pressing Rematch shows "Waiting for the other players…".
- [ ] **W2** 1v1: the same texts as before ("You defeated the rival! …", "Waiting for the other player…"). Section 7 (regression).

### [0.33.14-0] Disabled hover (Jesse)

- [ ] **V1** Create a room and hover the greyed-out Start button while alone. Expect: it stays greyed out (no slate blue, no lift). Enabled buttons still brighten and lift on hover. Section 7 (regression).

### [0.33.13-0] Leaving on purpose (Jesse)

Two windows. Online there is no Leave button during play (see `docs/REFACTOR-ISSUES.md`), so leave from the results screen, or from the pause screen if your build shows one.

- [ ] **L1** 1v1: after a round, the joiner presses Main Menu on the results screen. Expect: the joiner is on the menu; the host stays, sees "<name> left the match"; Rematch starts with the joiner's wizard standing, tagged DISCONNECTED.
- [ ] **L2** The joiner tries to get back in (refresh, or join with the code). Expect: not let back in ("Match in progress." / back on the menu).
- [ ] **L3** The host leaves instead, then the joiner presses Back to lobby. Expect: the joiner is the lobby's creator and can start a new match with someone else.
- [ ] **L4** Lobby: a guest leaving frees the seat; the creator leaving closes the room (unchanged). Section 7 (regression).

### [0.33.12-0] Mark's sleeveless robe merged (Jesse)

- [ ] **M5** Run Mark's sleeveless-robe section below (pick it in the Workshop, Save layout, refresh, start Practice). Section 7 (regression).

### [0.33.11-0] Seat fixes (Jesse)

Two windows; the joiner is seat 1.

- [ ] **S1** Online 1v1: at the start the joiner's header and hint say "You <their own wizard> · Rival <the host's>"; the host's say the opposite. 2v2: "You <your wizard> · Enemy team" and "Team match, 2 vs 2" (or "2 vs 1" with an empty seat).
- [ ] **S2** As the joiner, pick a spell on the action bar right after the start. Expect: your own health and cooldowns, no flash of the host's.
- [ ] **S3** As the joiner, hold the attack button and press the sword key. Expect: no swing while holding (same as the host). Release, then sword: it swings.
- [ ] **S4** Solo duel and practice: start text and HUD as before. Section 7 (regression).

### [0.33.10-0] Canvas state put back (Jesse)

Refactor; nothing should change.

- [ ] **R35** Solo: particles from hits and bombs, a heal (green wave), status bars over heads with several statuses at once, name tags. Expect: transparency, glow and text as before. Section 7 (regression).

### [0.33.9-0] Clean-up from the issues list (Jesse)

Refactor; nothing should change.

- [ ] **R34** Solo: throw every element's bomb (blast size and damage as before), stand in a magma pool and a storm pool (damage and static as before), kill the mortal dummy (it comes back in the same place). Online: your own Magnetic and Earth casts look as before. Section 7 (regression).

### [0.33.8-0] Mark's staff grip and walking merged (Jesse)

- [ ] **M4** Run Mark's staff-grip and walking sections below on :8082 (Workshop "Staff grip" placement, skin tone on the hand, Save layout and refresh; in Practice walk in all directions). Section 7 (regression).

### [0.33.7-0] README code map (Jesse)

Docs only.

- [ ] **R33** Open the README on GitHub (branch `test-jesse`): the diagram draws, and the "Where do I change…?" paths open real files. Section 7 (regression) on :8082.

### [0.33.6-0] Stale comments, view size (Jesse)

Refactor; nothing should change.

- [ ] **R32** Solo match on an arena and on a battleground: walking into walls and pillars, shots stopping at pillars, the view size and camera as before. Section 7 (regression).

### [0.33.5-0] Clearer names in client code (Jesse)

Refactor; nothing should change.

- [ ] **R31** Online 1v1: your own casts appear instantly (previews), cooldowns on the action bar count down, the end of a round animates as before. Solo: wizards, bombs and effects drawn as before. Section 7 (regression).

### [0.33.4-0] Clearer wire names, protocol 18 (Jesse)

Refactor; nothing should change. An old open tab is asked to refresh.

- [ ] **R29** Online 1v1 in two windows: every element's attack, bomb and trap; statuses (Wet, Chill, MAG, OVER, STAT bars and floating text) and damage numbers on both screens as before. Bombs fly and land as before.
- [ ] **R30** A tab opened before the deploy: told to refresh. Section 7 (regression).

### [0.33.3-0] Clearer names in shared code (Jesse)

Refactor; nothing should change.

- [ ] **R28** Solo duel with every element and a few combinations, a trap, a bubble, a heal. Expect: as before, floating damage numbers and statuses as before. Section 7 (regression).

### [0.33.2-0] game.p / game.e removed (Jesse)

Refactor; nothing should change.

- [ ] **R26** Solo: duel the AI, practice against each dummy (the mortal one respawns where it did before), open the spellbook demo (dummy in the same place). Expect: as before.
- [ ] **R27** Online 1v1 and 2v2: start positions on an arena and on a battleground as before. Section 7 (regression).

### [0.33.1-0] Mark's grey head fix merged (Jesse)

- [ ] **M3** Run Mark's "restored head edges" section below (Grey Heads 3 and 7 in the Workshop and in Practice), then section 7.

### [0.33.0-0] Disconnects and rejoining (Jesse)

The behaviour change. Use two browsers or a normal and a private window (two tabs of one browser are fine too).

- [ ] **D1** 1v1: start a match, then refresh the second player's tab. Expect: the first player sees "<name> disconnected · resuming in N…" with a countdown; the refreshed tab lands back in the match within a few seconds, play resumes, "<name> is back" in the hint line.
- [ ] **D2** 1v1: close the second player's tab. Expect: the countdown runs to 0, then play carries on; their wizard stands still with DISCONNECTED over its name and can be killed. Nobody is sent to the menu.
- [ ] **D3** After D2, open a new tab and try to join with the code. Expect: "Match in progress." (a new tab is a new player). The first player's match is unaffected.
- [ ] **D4** Late rejoin: drop a player (turn their network off for over 10 s, or refresh after the countdown ended, e.g. with the tab frozen in devtools), then bring them back. Expect: they take control again and the tag goes.
- [ ] **D5** 2v2 (four windows): drop one player. Expect: the other three see the banner and the pause; after 10 s their team plays a wizard short. Drop two at once: one line each, play resumes when both are back or both countdowns end.
- [ ] **D6** With a player away, press Rematch on the others. Expect: the rematch starts without them; they can still rejoin. Back to lobby with a guest away: their seat is free in the lobby.
- [ ] **D7** Leave on purpose (Main Menu) mid-match. Expect: as before, the room closes for everyone. Section 7 (regression).

### [0.32.12-0] Server rooms split (Jesse)

Refactor; online play should behave exactly as before.

- [ ] **R24** Two windows: create a room, join with the code, change map and team size, move a player between teams, start, play, rematch, back to lobby, start again. Expect: as before.
- [ ] **R25** Guest leaves in the lobby (seat frees, room stays); creator leaves (guest sent to the menu). Open `/version` on :8082: shows 0.32.12-0. Section 7 (regression).

### [0.32.11-0] update.ts split (Jesse)

Refactor; nothing about play should change.

- [ ] **R22** Solo: duel the AI to a win and a loss; practice against the moving dummy and the mortal dummy (kill it, it comes back). Expect: as before.
- [ ] **R23** Online team match with respawn and one with elimination: falls, respawns and the round end as before. Section 7 (regression).

### [0.32.10-0] Mark's grey heads merged (Jesse)

- [ ] **M2** Run Mark's grey-head sections below on :8082: pick a Grey Head, try several skin tones, refresh (choice kept), Reset (default skin), start Practice (your wizard has the tinted head). Section 7 (regression).

### [0.32.9-0] combat.ts split (Jesse)

Refactor; nothing about play should change.

- [ ] **R20** Solo duel against the AI: cast each element's attack, bomb and trap, a spell variant, shield, heal, bubble (reflect a shot back), sword and force. Expect: damage, statuses, knockback and reflections as before.
- [ ] **R21** Online 2v2 (four windows) or 1v1 with friendly fire: hits, heals and kills count as before. Section 7 (regression).

### [0.32.8-0] primitives.ts split (Jesse)

Refactor; nothing should look different.

- [ ] **R19** Solo match on the Enchanted Arena: trees and pillars, particles from hits, lightning and Plasma Beam arcs, Magnetic pull, a bubble, a trap, being imprisoned and knocked up, status bars over heads. Expect: as before. Section 7 (regression).

### [0.32.7-0] Projectile drawing split (Jesse)

Refactor; nothing should look different.

- [ ] **R17** Solo match: cast every spell's main attack (each element and combination), with the spell variants picked in the spellbook (Pyro Disc, Pebble Flurry, Fireball, Frost Shards). Expect: every projectile drawn as before, including charged and reflected ones (cast into a bubble).
- [ ] **R18** Online match in two windows: your own shots appear instantly as before. Section 7 (regression).

### [0.32.6-0] Bomb and zone drawing split (Jesse)

Refactor; nothing should look different.

- [ ] **R16** Solo match: throw a bomb of every element (right click with each element loaded), let them land and explode; cast Water Surge and Thundercloud; die once. Expect: bombs, landing rings, fuses, zones and the death animation as before. Section 7 (regression).

### [0.32.5-0] Wizard drawing split (Jesse)

Refactor; nothing should look different.

- [ ] **R14** Solo match: try several wizard looks (the Wizard style picker), swing the sword, charge a spell, raise a shield, get burned, frozen, wet and silenced by the AI. Expect: everything drawn as before (hats, staff, offhand, flames, ice shell and countdown, bars, name tag).
- [ ] **R15** With a Workshop look saved, start Practice. Expect: your wizard wears it, the AI keeps its own art. Section 7 (regression).

### [0.32.4-0] Client folders (Jesse)

Refactor; nothing should change.

- [ ] **R12** Play a solo match on an arena and on a battleground (Ruined Keep). Expect: map art, wizards, shots, particles, minimap and team panel as before.
- [ ] **R13** Online match in two windows, then section 7 (regression).

### [0.32.3-0] Old global CSS retired (Jesse)

Refactor; nothing should look different. Hard-refresh once.

- [ ] **R9** Hover, press and tab through the buttons on the menu, Practice cards, settings, lobby (Start disabled while alone: still turns slate on hover, as before), spellbook (slots, cards), Workshop and results (Rematch / Main Menu). Expect: same looks as before, text still bold.
- [ ] **R10** Open the lobby's map list. Expect: the group headings (Arenas, Battlegrounds) still dark purple with cream text.
- [ ] **R11** Results screen after a match: centred as before. Section 7 (regression).

### [0.32.2-0] One stylesheet per screen (Jesse)

Refactor; nothing should look different. Hard-refresh once (Ctrl+Shift+R).

- [ ] **R6** Walk every screen: main menu (hover the buttons), Practice panel, settings, spellbook (page through elements, run the demo), Workshop, lobby, a solo match (action bar, cooldowns, pause), the results screen (Rematch / Main Menu glow). Expect: looks exactly as before; nothing unstyled.
- [ ] **R7** Fullscreen during a match. Expect: same layout as before.
- [ ] **R8** Section 7 (regression).

### [0.32.1-0] Workshop code moved out of index.html (Jesse)

Refactor; everything should behave exactly as before.

- [ ] **R2** Open the Wizard Workshop. Pick a hat and a staff, Randomise, Reset, then pick again. Expect: the preview follows each change.
- [ ] **R3** In the layout editor move, resize and tilt one piece, Save layout, refresh the page, reopen the Workshop. Expect: the choices and the layout are kept. Start Practice: your wizard wears them. Escape and the close button shut the Workshop.
- [ ] **R4** Open the spellbook from the menu and close it with its back button. Expect: opens and closes as before.
- [ ] **R5** Section 7 (regression).

### [0.32.0-0] Refactor safety nets (Jesse)

Tooling only; nothing in the game changed.

- [ ] **R1** Open :8082, play a solo match and an online match in two windows. Expect: exactly as before (section 7).

### [0.31.5-0] Mark's Workshop editor merged (Jesse)

- [ ] **M1** Run Mark's Workshop sections below (WW17 to WW22, quarterstaff, head and robe) on :8082, then section 7 (regression).

### [0.31.2-0] Walking animation after rematch (Mark)

- [ ] **WW43** Start a Practice battle and walk to observe foot shuffles and staff/grip circular movement. Finish the battle, start another without refreshing, and confirm animations begin immediately.
- [ ] **WW44** Repeat across several battles of different lengths, including short and long rounds. Verify no frozen feet/staff, no sudden position jumps, and unchanged reverse one-third-speed cane motion.
- [ ] **WW45** After rematch, cast left/right and verify the entire wizard still flips only on firing, not aiming, while walking animations remain active.

### [0.31.2-0] Wizard facing after casting (Mark)

- [ ] **WW40** With the custom wizard equipped, move the mouse left and right without casting; character remains facing right initially. Fire a spell left; the complete character mirrors, including staff and gripping fist. Fire right; character returns to normal.
- [ ] **WW41** After firing left, walk in all directions, move the cursor and stand idle. The wizard remains mirrored until a successful cast right. Try casting during cooldown; it must not change facing. Sword swings must not flip the wizard.
- [ ] **WW42** Verify ordinary and variant spells, charged spells, and online local-player rendering; inspect whether mirrored foot shuffles and cane motion remain smooth and saved layout offsets remain intact.

### [0.31.2-0] Sleeveless blue robe (Mark)

- [ ] **WW38** Open Wizard Workshop, select Body → Sleeveless Blue Robe, and verify the new blue robe has a transparent background and no sleeves, wrist, hands or dark outline.
- [ ] **WW39** Adjust its position, scale and tilt; save, reload, and enter Practice. Confirm the new robe renders with the saved settings while the existing Stout Blue Robe and other body choices remain unchanged.

### [0.31.2-0] Reverse, slower staff circle (Mark)

- [ ] **WW36** Walk in Practice with the staff and grip equipped. Confirm the feet retain their existing shuffle while the staff and fist circle in the opposite direction at approximately one-third the foot cycle speed, moving together without slipping.
- [ ] **WW37** Stop, restart and reverse walking direction. Confirm staff/grip movement remains smooth and saved position/scale/rotation settings remain intact.

### [0.31.2-0] Wizard Workshop walking animation (Mark)

- [ ] **WW33** In Practice with a customized wizard, walk left, right, up and down. Verify the two feet alternate subtle shuffling steps, with no abrupt frame jumps.
- [ ] **WW34** Equip the quarterstaff, position the gripping fist, save layout, then walk in all directions. Verify the staff and grip move together without slipping; the cane rises, moves forward and plants in a seamless loop. The fist remains the foremost layer.
- [ ] **WW35** Stop and start walking repeatedly, then stand still and change directions. Verify the animation eases out at rest, does not jitter during stationary frames, and retains all saved offsets, scales and rotations. Check ordinary casting, shields, and multiplayer gameplay are unaffected.

### [0.31.2-0] Grayscale staff-grip hand (Mark)

- [ ] **WW30** Equip Plain Quarterstaff and select Staff grip in Position & Scale Editor. Verify the isolated hand appears in front of the staff without any sleeve, wrist or other sprite fragments. Drag, scale and tilt it to fit the staff.
- [ ] **WW31** Change skin tone with a gray head equipped. Verify head and staff hand change together while dark outlines remain dark. Change to another staff and adjust its grip separately, then switch back to confirm distinct placements.
- [ ] **WW32** Save Layout, refresh, start Practice, and compare staff-grip placement to Workshop. Copy Layout should include `handStaff:<staff index>` adjustments. No staff selected should hide the grip.

### [0.31.2-0] Grey heads 3 and 7 edge restoration (Mark)

- [ ] **WW28** Inspect Grey Heads 3 and 7 at 100% and 300% in Workshop, rotating and recoloring each. Verify full right-side face and nose silhouettes are visible without adjacent-head fragments. Compare Heads 1, 2 and 5 to confirm no changes.
- [ ] **WW29** Save either head, refresh and start Practice. Verify matching silhouette and masked recoloring in local gameplay.

### [0.31.2-0] Grey head silhouette cleanup (Mark)

- [ ] **WW26** Cycle Grey Heads 1–8 with different skin tones, including large zoom and rotation. Confirm heads 1, 2, and 5 remain unchanged; heads 3, 4, 6, 7, and 8 show no stray pixels or pieces of neighboring heads to their left.
- [ ] **WW27** Reload Workshop and start Practice with a cleaned head selected. Confirm transparent edges and skin recoloring remain correct in both preview and gameplay; inspect for any lost intended outline pixels.

### [0.31.2-0] Precise head extraction (Mark)

- [ ] **WW26** Cycle through Grey Head 1–8 at several skin tones, then increase scale to 300% and rotate through ±180°. Confirm no neighboring eyes, ears or head fragments appear.
- [ ] **WW27** Save each selected head and test in Practice; verify isolated heads match Workshop preview, with transparency and unmodified eyes/brows. Refresh and confirm settings persist.

### [0.31.2-0] Grayscale skin-tone heads (Mark)

- [ ] **WW23** In Wizard Workshop choose Grey Head 1–8, then select several skin swatches. Expect: skin and nose change tone with shading; white eyes, pupils, brows, and black outlines do not change; transparent sprite backgrounds remain clear.
- [ ] **WW24** Save appearance, reload and start a local Practice match. Expect: the same selected head and skin tone render in the Workshop and on the local wizard; changing hats, robes, and layout sliders still works.
- [ ] **WW25** Copy Layout and verify the JSON includes the selected skin color. Check older Head 1–8 and Eccentric Old Wizard still render and do not acquire unintended recoloring.

### [0.31.2-0] Wizard Workshop tilt (Mark)

- [ ] **WW21** Select a head and adjust Tilt between -180° and +180°. Expect: only that head rotates around its centre; zero restores its original orientation. Check the staff and robe separately.
- [ ] **WW22** Combine tilt, position and scale; Save Layout, reload, and start Practice. Expect: the same rotated asset placement in Workshop and the local match. Copy Layout should include rotation angles; older layouts without `rotate` should still work.

### [0.31.2-0] Wizard Workshop Position & Scale Editor (Mark)

- [ ] **WW17** Open Wizard Workshop. Select Head, drag the head in the preview, then change the X/Y and Size sliders. Expect: only the selected head moves/scales, live with crisp pixel edges. Try touch drag on mobile.
- [ ] **WW18** Change Head to another item, adjust it, then switch back. Expect: each head retains its own temporary position and scale. Check staff and both feet independently.
- [ ] **WW19** Click Save layout, refresh, return to Workshop. Expect: saved positions/scales persist. Start Practice: the local wizard uses the saved layout. Return and change a slider without saving; gameplay should still use the last saved layout.
- [ ] **WW20** Reset piece then Save layout: only the selected item's adjustments return to default. Copy layout: expect valid JSON with appearance and layout keys. Existing randomize/reset appearance controls still work.

### [0.31.2-0] Supplied head and robe; larger staff and player (Mark)

- [ ] **WW14** Wizard Workshop: select Eccentric Old Wizard head and Stout Blue Robe independently. Expect: the head and robe render as separate transparent layers, no black rectangle or checkerboard, with correct overlap at the collar.
- [ ] **WW15** Select Plain Quarterstaff. Expect: larger staff in preview, still held by detached bare hand on wizard's right; no overlap that obscures the face.
- [ ] **WW16** Start Practice with the new head, robe, and staff. Expect: larger local wizard, all three assets visible and animated as a unit. Change to original assets and verify no regression. Reload and verify saved selections persist.

### [0.31.2-0] Plain quarterstaff in Wizard Workshop (Mark)

- [ ] **WW11** Open Wizard Workshop and choose **Plain Quarterstaff** under Main hand. Expect: the bare hand grips a simple wooden staff, separate from the robe, on the wizard's right (viewer-left); no decorative orb, sleeve or opaque background.
- [ ] **WW12** Change robe/head/offhand while Plain Quarterstaff remains selected. Expect: staff remains independent; other parts render and no detached extra hand appears over the staff.
- [ ] **WW13** Start a local match with Plain Quarterstaff equipped. Expect: staff appears on the player's wizard and the character remains playable. Return to Workshop and select another staff; it should still work. Reload to confirm the selection persists.

### [0.31.2-0] Spellbook demo: in Flamethrower reach (Jesse)

- [ ] **SB10** Spellbook > Fire > Flamethrower, hold at the dummy. Expect: it reaches and burns the dummy; the Burn bar over its head is fully visible. Lightning the same. Stack a few statuses (Water Spray for Wet, then Ice, then Magnetic). Expect: every status bar over the dummy stays inside the arena. A straight shot at the dummy is never blocked; aiming up at the two pillars, shots stop at them.

### [0.31.1-0] Spellbook demo: closer dummy, cooldowns (Jesse)

- [ ] **SB7** Spellbook. Expect: the demo shows a close-up of the arena floor with your wizard and the dummy at the same size as in a match, the dummy clearly closer than before, and two pillars between them, one above and one below. Flamethrower held at the dummy reaches it. Aim at each pillar with Fireball. Expect: the shot stops at the pillar. Knock the dummy back (Water Surge). Expect: it stays in view.
- [ ] **SB8** Water > Water Surge, click at the dummy. Expect: the Water icon in the bar greys out, a blue fill rises from the bottom and the seconds count down to ready (about 5 s). Fire > Fireball: a short cooldown after each throw. Fire > Flamethrower: nothing while you hold; a brief one after you let go. Switch element mid-cooldown. Expect: the old icon clears.
- [ ] **SB9** Regression: start Practice on the Enchanted Arena and on the Temple. Expect: the four pillars are where they always were and still block shots.

### [0.31.0-0] Spellbook: one element at a time, with a demo arena (Jesse)

- [ ] **SB1** Main menu > Spellbook. Expect: no scrollbar; one element's spell cards (Fire first) between ◀ and ▶ buttons, a small arena below with your wizard on the left, a Mortal Dummy on the right with a 200/200 health bar and four pillars, then the bar of ten spell icons with Fire highlighted, and Back. Also check at a 1366x768 window: everything fits without scrolling.
- [ ] **SB2** With Flamethrower picked, hold the mouse button on the arena aimed at the dummy. Expect: flames for as long as you hold, the dummy's health bar drops and damage numbers float up. The hint under the arena says to hold.
- [ ] **SB3** Click Fireball. Expect: the arena resets (dummy back to full) and the hint says hold to charge. Hold, then release at the dummy. Expect: a charged fireball that hits for more than a quick tap does. Aim at a pillar instead. Expect: the shot stops at the pillar. Click Pyrodisk. Expect: the hint says click, and one click throws it.
- [ ] **SB4** Click icons in the bottom bar and use ◀ ▶ (both ends wrap round). Expect: the page switches to that element, its icon is highlighted, and the arena reloads with that element's picked spell. Try a beam (Plasma Beam or Magnetic Pull), Lava Pool and Thundercloud. Expect: each behaves as in a match. Hit the dummy until it falls. Expect: "DEFEATED!" and it respawns after about 2 seconds.
- [ ] **SB5** Pick something other than the first spell in a few elements, close the spellbook, start Practice > Stationary Dummy. Expect: the match starts normally on the arena picked in the menu (not forced to the Enchanted Arena) with the picks you made. Back in the main menu, the menu works as before.
- [ ] **SB6** Online lobby (two windows): the guest opens the spellbook, and the host starts the match while it is open. Expect: the spellbook closes and the match plays normally for both. Picks made in the lobby spellbook still reach the match.

### [0.30.3-0] Mark's work merged, Workshop on the shared UI (Jesse)

- [ ] **WS1** Main menu. Expect: a small blue Workshop button in the bottom right corner. Click it. Expect: the Wizard Workshop opens full screen on the sky backdrop with two parchment panels (the wizard preview on a light sky grid, and the Mix & Match chips). Pick other Head, Hat, Robe, Main hand, Offhand and Boots chips. Expect: the chosen chip turns gold and the wizard preview changes to match, with all parts lined up (hat on the head, boots under the robe, staff in hand). Randomise changes everything; Reset goes back to the first look. Esc and the Main Menu button close it.
- [ ] **WS2** Pick a distinctive hat and robe, close the Workshop, reload the page and open it again. Expect: the choices are remembered. Start Practice > Stationary Dummy. Expect: your wizard wears them.
- [ ] **WS3** Run Mark's Workshop and Winter Breath sections from his entries below (the freeze sound on first use, and the Workshop items) to confirm nothing changed in the merge.

### [0.30.2-0] Neon Rescue, formerly Shadow Rescue (Jesse)

- [ ] **MU7** Settings > Fight song. Expect: Random, Magicians March, Neon Rescue, Shadow Runes. Press ▶ with Neon Rescue chosen. Expect: it plays all the way and loops without a gap or click. Run several fights on Random. Expect: all three songs come up.

### [0.30.0-0] Music library (Jesse)

- [ ] **MU1** Main menu, click anywhere. Expect: menu music plays. Start a fight (Practice > Stationary Dummy). Expect: a fight song starts (Shadow Runes or Magicians March) and the menu music stops. Esc, Main Menu. Expect: menu music again. Run several fights in a row on Random. Expect: both fight songs come up, never the same one twice in a row.
- [ ] **MU2** Settings. Expect: a Menu song and a Fight song dropdown, each listing Random plus the songs by name (Menu Waltz; Magicians March, Neon Rescue, Shadow Runes), each with a ▶ button. Press ▶ beside Fight song with Magicians March chosen. Expect: it plays and the menu music stops; the button shows ■; press it (or Back) and the menu music returns.
- [ ] **MU3** Choose Magicians March as the Fight song, start fights several times. Expect: always that song. Reload the page. Expect: the choice is still there. Choose Random again.
- [ ] **MU4** Open Settings during a match (Esc or P online) and change Fight song and Music volume. Expect: the volume changes the music at once; the new song is used from the next fight (the current one carries on).
- [ ] **MU5** Mute music. Expect: silence, including ▶ previews, and the choices are kept.
- [ ] **MU6** Pause a solo match (Esc). Expect: the music stops; Resume continues from where it was.

### [0.29.0-0] Settings during a match (Jesse)

- [ ] **ES1** Practice > Stationary Dummy. Press Esc. Expect: the pause screen with Resume, Settings and Main Menu. Click Settings. Expect: the settings page with a "Back to match" button. Move the Effects slider; hover and click a menu button later. Expect: the chime and click follow it (0 is silent). Esc. Expect: back on the pause screen. Resume. Expect: the match continues.
- [ ] **ES2** Online duel with a second window. During the match press Esc. Expect: the settings page opens over the match with a light dim, the note "The match is still running.", and no pause screen. Hold W or D while it is open. Expect: your wizard stops and does not move for the whole time (check from the other window); the other wizard keeps playing and can hit you. Esc or Back to match. Expect: it closes and your keys work again without re-pressing anything.
- [ ] **ES3** Same online match, press P. Expect: the same settings page. In fullscreen (Settings > Fullscreen), press Esc once. Expect: the browser leaves fullscreen (that is the browser's Esc); then Esc or P opens settings.
- [ ] **ES4** Open settings in a match, flip Classic action bar. Expect: the action bar changes at once and the tick box above the bar matches. Let an online match end (or have the other player quit) with settings open. Expect: the page closes and the result screen shows.
- [ ] **ES5** Mute music and the music sliders still work from the settings in a match, and the choices are still there after a reload.

### [0.28.5-0] Lobby refresh icon (Jesse)

- [ ] **UI11** Main menu > Duel. Expect: next to the room code are Copy and a round ↻ icon button, and no CREATE LOBBY button. Click ↻. Expect: a different code appears. Join from a second window with the code. Expect: the ↻ is greyed out for the host (tooltip explains), and greyed out for the guest. The join box with JOIN LOBBY still works.

### [0.28.4-0] Practice option cards (Jesse)

- [ ] **UI10** Main menu > Practice. Expect: the scene behind goes darker, and a parchment panel shows three cards in a row: Duel AI (red), Stationary Dummy (gold), Moving Dummy (blue), each with an icon and a line of text, plus a Back button. Each card starts its mode (AI duel, still dummy, moving dummy). Back returns to the four main buttons and the scene brightens. Narrow the window under 700 px. Expect: the cards wrap into a stack and nothing is cut off.

### [0.28.2-0] Spellbook and results on the shared UI (Jesse)

- [ ] **UI8** Main menu > Spellbook. Expect: the sky backdrop, the Spellbook banner, parchment spell cards with the same gold and brown as the Practice panel, a blue Back button at the bottom. Pick spells in each family. Expect: the selected card is highlighted, the strip at the bottom shows the choices, nothing overlaps. Scroll the list. Expect: Back stays in view. Back closes it. Open it from the lobby and from a narrow window too.
- [ ] **UI9** Finish a match (Practice, Stationary Dummy, or an online duel). Expect: the Victory or Defeat art, Rematch and Main Menu with their glow and sparkles as before, and a blue "Back to lobby" button between them in online games (hidden offline). All three work.

### [0.28.1-0] Settings, pause and lobby on the shared components (Jesse)

- [ ] **UI4** Main menu > Settings. Expect: sky backdrop, a parchment panel, the music slider fills gold as you drag and its number follows, Mute and Fullscreen switches flip, a blue Back button closes it (Esc too). Mute stops the menu music; fullscreen toggles.
- [ ] **UI5** Start Practice > Stationary Dummy, press Esc. Expect: PAUSED over the match, a green Resume (resumes) and a red Main Menu (returns to the menu).
- [ ] **UI6** Main menu > Duel. Expect: the lobby on the sky backdrop with the room code and Copy (the button briefly reads COPIED), the join box, a Match panel, the team panels and a green Start, with everything visible without scrolling at 1280x720. Join from a second window with the code. Expect: the second player appears in a team, the host's Start enables and the match starts. Host: click the ⇄ icon next to the other player. Expect: they move to the other team. Pick team size 2 v 2 and 4 v 4. Expect: the friendly fire switch and the fall rule appear, seats fill the teams, nothing is cut off (the screen scrolls if the window is short). Lobby Spellbook opens the spellbook; Leave Room returns to the menu.
- [ ] **UI7** Hover and click buttons on all three screens. Expect: the staff cursor, the chime on hover and the press sound.

### [0.28.0-0] UI design system foundation (Jesse)

- [ ] **UI1** Open the main menu. Expect: the title and the Duel, Practice, Spellbook and Settings art buttons look and sit exactly as before (compare with :8081 or main). Hover each. Expect: it rises a little and brightens, the staff cursor shows, and the chime plays. Click the edge of a button (the outer 12%). Expect: nothing happens; click the middle. Expect: it opens.
- [ ] **UI2** Click Practice. Expect: a parchment panel with three gold buttons (Duel AI, Stationary Dummy, Moving Dummy) and a blue Back button. Each starts its mode; Back returns to the four buttons. Resize the window narrow (under 700 px) and short (under 650 px). Expect: nothing overlaps or is cut off.
- [ ] **UI3** Open `/ui/styleguide.html`. Expect: four button types in four colours, a menu stack, a panel with fields, a toggle and a slider, a screen sample and the art button. Hover and click buttons; tab through them. Expect: a clear focus ring.

### [0.27.3-0] Loaded spell icon in the action bar (Jesse)

- [ ] **LS2** Start a match. Expect: the small gold-bordered icon sits just right of the two element slots in the action bar, and the top right ability row no longer has one. Pick elements and variants. Expect: it follows them and does not overlap the spell tiles. Tick Legacy bar. Expect: the icon is not shown.

### Workshop menu preview alignment (Mark)

- [ ] Confirm the boot pair is centred beneath the robe across several Feet choices.
- [ ] Confirm the head rests on the robe collar across all head and robe combinations.
- [ ] Confirm the main-hand weapon appears in front of the head and robe in the Workshop preview.
- [ ] Confirm the Workshop preview keeps its subtle bob and the in-game character remains unchanged.

### Wizard Workshop alignment and draw order (Mark)

- [ ] Check all heads overlap the body collar with no visible gap in the Workshop and in-game.
- [ ] Check feet sit symmetrically beneath robes and do not drift apart.
- [ ] Check the staff renders in front of the head and robe; head renders in front of body.
- [ ] Check gentle bobbing moves the entire character as one unit without independent limb animation.
- [ ] Verify original dummy, spells, and section 7 regression remain unaffected.

### Wizard Workshop offhand behaviour (Mark)

- [ ] Workshop has no independent Hands equipment category.
- [ ] Selecting Offhand None shows one visible hand on the offhand side in preview and matches.
- [ ] Selecting any offhand item hides that hand in preview and matches.
- [ ] No separate floating hand appears on the staff side.
- [ ] Switching outfits and refreshing does not restore the removed Hands selector.

### Wizard Workshop scale and animation regression (Mark)

- [ ] Compare customised player size beside the original stationary dummy and confirm proportions are similar.
- [ ] Verify customised wizard hands, feet, body, and head stay static during movement and idle.
- [ ] Verify Workshop preview is static and no Walk / Shuffle button remains.
- [ ] Verify dummy rendering, combat, spells, and section 7 regression remain unchanged.

### [0.27.2-0] In-game Workshop appearance (Mark)

- [ ] **WW6** Select a robe, head, hat, staff, hands and boots in Workshop; enter a solo match and confirm the local player uses those sprites.
- [ ] **WW7** Return to menu and reopen Workshop; confirm the selection is retained after refresh.
- [ ] **WW8** Test movement, charge, spells, shield, hitboxes and freeze overlays with the customised player.
- [ ] **WW9** In an online match, confirm only the local player's artwork changes, without affecting the opponent or simulation.
- [ ] **WW10** Run section 7 regression before merging to another branch.

### [0.27.2-0] Wizard Workshop atlas integration (Mark)

- [ ] **WA1** Upload `game-atlas.png` and reload `test`; Workshop displays pixel-art sprites rather than SVG placeholders.
- [ ] **WA2** Check all 8 heads, 10 hats, 10 robes, 12 staffs, 10 offhand items, 11 hand sets and 10 boot sets for transparency, clipping and alignment.
- [ ] **WA3** Verify detached hands and independent boot motion in Walk / Shuffle; Randomise and Reset still work.
- [ ] **WA4** Confirm closing the Workshop returns to the main menu without a page navigation; matches remain unaffected.

### [0.27.2-0] Experimental Wizard Workshop (Mark)

- [ ] **WW1** From the illustrated main menu, tap the small Workshop button in the bottom corner; an in-game overlay opens without navigation.
- [ ] **WW2** On mobile and desktop, choose different heads, hats, bodies, hands, feet, main-hand and offhand items; all parts change without breaking alignment.
- [ ] **WW3** Walk/Shuffle moves each hand and foot independently; Stop walking stops the animation.
- [ ] **WW4** Randomise and Reset work, and Back to Main Menu closes the overlay without reloading the game.
- [ ] **WW5** Confirm the existing menu buttons, solo/online matches, and section 7 regression remain unchanged.

### [0.27.2-0] Winter Breath freeze-onset SFX (Mark)

- [ ] **WB1** In a solo match, reach 100% Chill and verify Winter Breath plays once when the target becomes frozen.
- [ ] **WB2** Remaining frozen does not replay the sound every frame; thawing then freezing again plays it again.
- [ ] **WB3** Test being frozen yourself, and freezing another player online; each audible transition plays once despite 30 Hz snapshots.
- [ ] **WB4** Pausing and restarting a match does not cause unwanted repeats; match starts with no stray freeze sound.
- [ ] **WB5** Enemies hidden by fog of war do not trigger audible freeze cues.
- [ ] **WB6** Confirm music, menu sounds, battle controls and section 7 regression remain unchanged.

### [0.27.2-0] Loaded spell icon (Jesse)

- [ ] **LS1** Start a match. Expect: a gold-bordered icon to the left of the sword icon shows the loaded spell. Press 1 then 3. Expect: it changes to Plasma; click a tile on the action bar and it follows. Hover for the name and keys. Equip a variant (Plasma Beam, Water Surge) and load it. Expect: the icon shows the variant's art. Repeat online and with the legacy bar.

### [0.27.1-0] Smaller action bar, team HUD, wider sight (Jesse)

- [ ] **SB1** Start a match. Expect: the action bar is about half its old width, with the two element slots centred just above four small spell tiles and no labels. Tiles, keys, cooldown fills and the Legacy bar tick box still work; the legacy bar is unchanged.
- [ ] **TH1** Start a 2v2 (or bigger) online match. Expect: the top left shows only the team panel, with no "YOU 200/200" text on top of it, and its last line says "ENEMIES STANDING n" and drops as enemies fall. Solo and 1v1 still show "YOU" and the health in the corner.
- [ ] **FG1** On a battleground (Ruined Keep, Dev Battleground). Expect: you see about a third further than before (585 units): the fog only closes in at the far edges and corners of the screen, enemies appear and vanish further out, and Thundercloud follows enemies out to that range.

### [0.27.0-0] New action bar (Jesse)

- [ ] **AB1** Start a match. Expect: the bar shows four tiles (Fire, Water, Lightning, Earth) and the "Legacy bar" tick box is above its top right corner, unticked.
- [ ] **AB2** Press 1 (or click Fire). Expect: the other tiles become Steam, Plasma and Magma, Fire stays highlighted. Press 3. Expect: Plasma is highlighted and loaded ("Loaded PLASMA"); left click casts it. Repeat for 2, 3 and 4 as the first element.
- [ ] **AB3** With Fire loaded click the Water slot (Steam). Expect: Steam loads. Click the Fire tile. Expect: the bar goes back to the four elements, Fire still loaded. Click Earth. Expect: Earth is loaded and the tiles show Earth's combinations.
- [ ] **AB4** Press E (heal armed). Expect: the four elements are shown. Cast a shield with Space. Expect: the bar returns to the four elements.
- [ ] **AB5** Tick "Legacy bar". Expect: the old bar with all ten spells appears at once, nothing else changes; reload the page, it stays ticked. Untick it and the new bar returns. Pressing Space afterwards still raises a shield (the tick box does not keep the keyboard).
- [ ] **AB6** On both bars, with a variant equipped (Water Surge, Plasma Beam), hold or cast it. Expect: the tile shows the variant's artwork and its cooldown fill, as before. Repeat online.

### [0.26.6-0] Separate cooldowns and the bottom of the map (Jesse)

- [ ] **CV1** Choose Plasma Beam, load Fire + Lightning and hold the beam. Expect: only the Plasma tile shows the short wait after you let go; the Fire tile never flickers. Same for Magnetic Pull (Earth tile) and Frost Shards (Earth tile).
- [ ] **CV2** Equip Water Surge and Thundercloud, cast one then the other straight away. Expect: both cast; each tile counts down its own cooldown (Surge 5 s, Thundercloud 8 s).
- [ ] **VW1** On every map, walk to the bottom edge. Expect: your wizard stops with a clear gap above the action bar and never goes behind it; the strip under the map is plain dark. Check solo and online, and that the minimap and aiming still line up.

### [0.26.5-0] Thundercloud and fog of war (Jesse)

- [ ] **TF1** On a fogged map (Ruined Keep), cast a Thundercloud with every enemy out of your sight. Expect: the cloud stays where it landed. Walk so an enemy comes into your sight. Expect: it drifts after them, and stops again when they leave your sight.
- [ ] **TF2** In a 2v2 with a teammate who can see an enemy that you cannot. Expect: your cloud does not move towards that enemy.
- [ ] **TF3** On a map with no fog, cast a Thundercloud. Expect: it follows the nearest enemy as before.

### [0.26.4-0] No ring on the sword online (Jesse)

- [ ] **SW1** Online, press F (also while the sword is on cooldown, and while frozen). Expect: only the blade swing, with no purple ring around you. Q still shows its Force ring.

### [0.26.3-0] Spells with no bomb (Jesse)

- [ ] **NB1** Load Magma (Fire + Earth), with the default and then the Lava Pool variant. Right click and press B. Expect: nothing is cast, the hint says "MAGMA has no bomb", and the bomb cooldown does not start. Left click still works. Repeat online.
- [ ] **NB2** Switch to Fire and right click. Expect: a bomb is thrown as normal (no cooldown was spent by the Magma attempts).

### [0.26.2-0] Water Surge shoves bombs like players (Jesse)

- [ ] **BS1** Throw a bomb, let it land, and cast Water Surge from a few steps away. Expect: the bomb slides away fast then slows to a stop, about 330 px in all (as far as a shoved player), with no teleport. Repeat online: it should look just as smooth.
- [ ] **BS2** Cast Water Surge at a bomb still in the air. Expect: it keeps its arc, slides along, and lands where the whole throw has moved to.
- [ ] **BS3** Push a bomb into a wall and into an enemy bubble. Expect: it stops at the wall, and is turned back by the bubble's edge.

### [0.26.1-0] Spell tile cooldowns online (Jesse)

- [ ] **CD1** Online with 2 players, load Fire, hold the attack for a second, then let go. Expect: the Fire tile fills from the bottom with a seconds counter for about 1 s. Repeat with Water, Lightning, Plasma Beam and Magnetic Pull.
- [ ] **CD2** Online, load Pebble Flurry and fire it. Expect: after the flurry ends (or you let go) the Earth tile shows its 5 s cooldown filling.
- [ ] **CD3** Online, cast a normal spell (Magma, Bomb). Expect: its tile cooldown still shows, and nothing flickers while you hold a spray.

### [0.26.0-0] Blue-orb staff cursor and tighter menu hitboxes (Mark)

- [ ] **SC1** On the main menu, Practice, lobby, Spellbook and Settings, the approved blue-orb staff appears as a crisp small cursor; the orb centre is the interaction point.
- [ ] **SC2** During a battle, the original aiming cursor and canvas input remain unchanged.
- [ ] **SC3** On each of the four main menu buttons, the leftmost and rightmost 12% are not clickable; the centre 76% still works and artwork is unchanged.
- [ ] **SC4** Hover/click sounds, keyboard navigation and touch interactions still work; no clicks on adjacent empty space.
- [ ] **SC5** Check reload, narrow viewports and browser fallback if the staff PNG cannot load; run section 7 regression.

### [0.26.0-0] Narrow illustrated menu click areas (Mark)

- [ ] **MB1** On the home menu, the extreme left and right edges of the illustrated Duel, Practice, Spellbook and Settings buttons do not respond to mouse hover/click.
- [ ] **MB2** Clicking the central 82% of each illustrated button still performs the correct action and plays the existing hover/click audio.
- [ ] **MB3** Button artwork remains its original full size, with unchanged vertical alignment and spacing.
- [ ] **MB4** Keyboard Tab, Enter and Space still activate the buttons; touch activation works on the central area.
- [ ] **MB5** Check Practice, lobby and in-battle controls are unchanged; run section 7 regression.

### [0.26.0-0] Rune Press menu selection audio (Mark)

- [ ] **RP1** Click each main menu, Practice, lobby, spellbook and settings button: hear one short wooden Rune Press with faint magical resonance.
- [ ] **RP2** Hover without clicking: the original Magical Hover chime is unchanged.
- [ ] **RP3** Click Duel, Practice modes, Spellbook and Settings: hidden delegated legacy button clicks do not trigger duplicate click sounds.
- [ ] **RP4** Activate buttons with Enter and Space, then test mouse/touch; controls still work if audio is blocked or unavailable.
- [ ] **RP5** Run section 7 regression and check menu music remains audible.

### [0.26.0-0] Illustrated menu loading and hover sound (Mark)

- [ ] **MH1** On a fresh cache and a throttled connection, the menu shows a single loading cover, then background, title and four button PNGs appear together; no plain-text title flashes.
- [ ] **MH2** Reload normally and switch between home and Practice; no partial menu artwork or layout jumps.
- [ ] **MH3** Hover each main menu and Practice button, then buttons in lobby, spellbook and settings: one subtle crystalline chime per entry, no repeated note while moving within the same button.
- [ ] **MH4** Check first hover before any click, then after a click: browsers that block autoplay may require a gesture before the chime is audible.
- [ ] **MH5** Confirm mouse clicks, keyboard navigation, touch controls, and menu music still work. Run section 7 regression.

### [0.26.0-0] Ice Wizard directional sprite animation (Mark)

- [ ] **IW1** Choose Frost Scholar in solo play; confirm the illustrated white-haired Ice Wizard appears instead of the drawn wizard, with no atlas background or clipping.
- [ ] **IW2** Face all eight directions, move, charge/cast, take damage, and lose; check idle/walk/cast/hit/defeat animation frames and facing.
- [ ] **IW3** Check a Frost Scholar opponent and online match, including team rings, health bars, status effects, shields, charge ring, and sword swing.
- [ ] **IW4** Verify other wizard skins and dummy art remain unchanged; with the atlas request blocked, the original Frost Scholar illustration appears as fallback.
- [ ] **IW5** Run section 7 regression checks, including fog of war and respawn.

# Manual test checklist: Arcane Duel

### [0.26.0-0] Exact approved result buttons (Mark)

- [ ] **ARB1** On Victory, verify blue Rematch and purple Main Menu match the user's exact supplied images with no duplicate text or CSS-generated borders.
- [ ] **ARB2** Click Rematch and Main Menu; both retain their original actions.
- [ ] **ARB3** Check hover, glow/sparkle, keyboard focus, small screens and reduced-motion mode.

### [0.26.0-0] Result button PNG integrity fix (Mark)

- [ ] **RBF1** Win and lose matches; confirm actual illustrated blue Rematch and purple Main Menu graphics are visible, not just the animated glow.
- [ ] **RBF2** Confirm neither browser cache nor a failed image load leaves an invisible clickable button; labelled fallback appears when PNG is unavailable.
- [ ] **RBF3** Verify Rematch and Main Menu retain their click/keyboard actions, and animations stay subtle.

### [0.26.0-0] Approved result button art (Mark)

- [ ] **RBC1** Victory and Defeat result screens show the blue Rematch and purple Main Menu artwork, with no older red Rematch button showing.
- [ ] **RBC2** Test both buttons with mouse, touch and keyboard; Rematch and Main Menu keep their existing actions.
- [ ] **RBC3** Confirm subtle glow/sparkles, hover/press states, and disabled Rematch appearance.
- [ ] **RBC4** Check stage scaling, fullscreen, narrow viewports, and reduced-motion preference.

**Living document.** Every feature (`docs/MAPS-PLAN.md`, `docs/TEAMS-PLAN.md`) adds its manual test
items here, in a section tagged with the version that introduced it, and the "Tested version" line
below is bumped. Items from earlier versions stay, because they are the regression checks. Rule for
developers: a feature is not finished until its items are in this file.

**Tested version:** 0.26.0-0 (fullscreen switch; pending manual verification). Sections are tagged `[0.x.y]` with the version that added them.

## Short run (about an hour, 2+ people)

Full list is long. For a quick session, run these in order and skip the rest: section 0 (setup), the 0.12.2x sections below
(UI1 to UI10, BR1 to BR6), section 2 and 3 (lobby and synced map), section 7 (regression). With 4+ people add section 35 (2 v 2).
Sections 8, 18 to 20 are technical and optional. Sections 25 and 33 are historical. IDs that repeat in later sections carry a
`.<section number>` suffix (e.g. `B1.44`), so each ID is unique when you report.

### [0.26.0-0] Illustrated Rematch and Main Menu buttons (Mark)

- [ ] **RBTN1** Win and lose solo matches: the purple Rematch and Main Menu artwork appears below the illustrated result banner, without broken images or overlarge borders.
- [ ] **RBTN2** Click/tap Rematch and Main Menu; confirm original restart and home actions work. Repeat online and verify Back to Lobby remains functional.
- [ ] **RBTN3** Confirm soft idle glow and occasional sparkles; hover and press give restrained feedback and do not obscure lettering.
- [ ] **RBTN4** Test keyboard focus, small screens/fullscreen, and reduced-motion preferences; button hit areas and readability remain usable.

### [0.26.0-0] Animated victory and defeat result banners (Mark)

- [ ] **RB1** Win an AI duel: the compact blue Victory emblem shows over the dimmed arena, with intermittent gem glows and gently moving wisps. No duplicate text or clipped artwork.
- [ ] **RB2** Lose a duel: the purple Defeat emblem appears instead. Test that only one outcome is shown, including after a rematch.
- [ ] **RB3** Confirm Rematch, Main Menu, and online Back to Lobby continue to work and remain clickable; a new game hides the result panel.
- [ ] **RB4** Check fullscreen and a small/mobile-sized window. Artwork and buttons fit within the stage; no image blocks clicks.
- [ ] **RB5** Enable reduced-motion preference and verify the artwork remains visible without moving or pulsing effects.

### [0.26.0-0] Shadow Runes V25 updated battle soundtrack (Mark)

- [ ] **BMV25-1** Start AI duel and stationary/moving/mortal dummy games. V25's 96-second theme (not V16) starts and menu waltz stops.
- [ ] **BMV25-2** Listen through the strings/choir and brass return, then the loop boundary, including a second pass. No gaps, stuck playback or jarring repeats.
- [ ] **BMV25-3** Confirm solo pause/resume, results/home and music mute/volume remain unchanged; check online round music versus lobby music.

### [0.26.0-0] Shadow Runes V16 battle soundtrack (Mark)

- [ ] **BM1** Open main menu and lobby. Only the menu waltz plays after the first interaction; Shadow Runes is silent.
- [ ] **BM2** Start AI duel, moving/stationary dummy and mortal dummy. Shadow Runes starts, menu waltz stops; neither overlaps.
- [ ] **BM3** Listen through the 38.4-second battle-theme boundary twice. Expect uninterrupted, gapless looping without duplicated drum hits.
- [ ] **BM4** Solo pause stops battle music; resume continues from the paused position. End a duel or return home: battle music stops.
- [ ] **BM5** Create/join an online match: battle music plays only during rounds, not the lobby, and stops on end, return to lobby, leaving room or disconnecting.
- [ ] **BM6** Change Settings music volume and mute during a fight. Expect battle music volume to update immediately. Missing audio should not block gameplay.

### [0.26.0-0] Bigger window and a fullscreen switch (Jesse)

- [ ] **FU1** On a 1920x1080 and a laptop-sized window, start a match. Expect: the stage is as large as the window allows with the title above and the two hint lines below, and the page does not scroll.
- [ ] **FU2** Main menu, SETTINGS, switch Fullscreen on. Expect: the browser goes fullscreen, the stage fills the screen (bars only on a screen that is not 16:9), the title and connection line are hidden, and the hint line floats at the top centre. Start a match: the HUD scales and the action bar is fully visible.
- [ ] **FU3** Press Esc (or F11) while fullscreen, then reopen Settings. Expect: the switch is off again and the page layout is back.
- [ ] **FU4** In fullscreen, aim at the screen edges and click. Expect: the spell goes where the crosshair is.

### [0.25.0-0] Sharp rendering (Jesse)

- [ ] **SR1** Play at 1920x1080 and compare with the previous build. Expect: wizard names, damage numbers and outlines look crisp, not soft.
- [ ] **SR2** Resize the window while a match runs, while paused and on the end screen. Expect: the picture stays visible and crisp at the new size, with no blank flash lasting more than a frame, and aiming still matches the cursor.
- [ ] **SR3** Use browser zoom 50% and 200%, or move the window between a HiDPI and a normal screen. Expect: the picture stays sharp and the crosshair stays under the mouse.
- [ ] **SR4** Play a busy fight at 1920x1080 and on a 4K or HiDPI screen. Expect: it stays smooth; if it stutters, note the screen size (the agent measured only software rendering: 44 fps at dpr 1, 21 fps at dpr 2, so check on real hardware).
- [ ] **SR5** The minimap, fog layer and the Dark Wizards' Circle background may look slightly soft at high DPR (they are drawn at logical resolution and scaled); note it, it is a known limit.

### [0.24.0-0] Widescreen view and wider arenas (Jesse)

- [ ] **WS1** Open the game in a 1920x1080 window and start a Duel AI match on the Enchanted Arena. Expect: the arena fills the stage with no black bars at the sides, the title and hints are visible without scrolling, and the action bar, cooldown icons and health text sit inside the stage.
- [ ] **WS2** Repeat in 1366x768, 1280x720 and a roughly 4:3 window. Expect: the stage stays 16:9 and centred, bars appear only above and below on non-16:9 windows, and nothing is clipped.
- [ ] **WS3** Start a solo match on each of the ten arenas. Expect: floor, edge decorations and background cover the whole width with no empty or visibly stretched areas; the four pillars are mirrored left and right and block walking.
- [ ] **WS4** On the Dark Wizards' Circle walk into the table and each monument. Expect: you are blocked and bolts stop at them.
- [ ] **WS5** Start an online duel and a 2v2 on an arena. Expect: both sides spawn mirrored about the middle, each team's slots are inside the floor, and nobody can leave the floor ellipse.
- [ ] **WS6** Play on the Ruined Keep or Development Battleground. Expect: the camera follows you, fog and the minimap still work, and the fog edge is visible at the left and right of the screen.
- [ ] **WS7** Check the main menu, lobby, spellbook and end screens at 1920x1080 and 1280x720. Expect: they fit the 16:9 stage and stay usable (scrolling inside the panel if short).
- [ ] **WS8** Click to cast at a spot well off-centre. Expect: the spell goes where the crosshair is, at every window size.
- [ ] **WS9** Old-tab check: a tab from before this build is told to refresh (protocol 16).

### [0.23.0-0] Water bomb knockback glides (Jesse; two browser windows)

- [ ] **WK1** Throw a Water bomb at a foe standing next to it with open floor behind them. Expect: they slide away about 350 px over roughly half a second, visibly moving the whole way, not appearing at the end spot; both windows see the same slide.
- [ ] **WK2** Get hit by the bomb yourself. Expect: you glide away smoothly with no rubber-banding or snap when it ends, and can walk during and after the slide.
- [ ] **WK3** Stand with a wall close behind you when it goes off. Expect: you slide to the wall and stop there, with no jitter.

### [0.22.0-0] Fire melts the frozen (Jesse)

- [ ] **FM1** Freeze a wizard (Ice bomb, or a full Frost Shards volley), then hit them with Fireball, Flamethrower or a Fire bomb. Expect: they thaw at once with MELTED!, can move and act again, and are burning. Earth still shatters the ice for double damage. A Water hit does not thaw them.

### [0.21.0-0] Countdown from the lobby only (Jesse)

- [ ] **CD1** Start a match from the lobby. Expect: the 5 second countdown (see FS3). After the match, both press REMATCH: the next round starts at once, with no countdown.

### [0.20.0-0] Key numbers on the action bar (Jesse)

- [ ] **KB1** Start any match and look at the spell tiles. Expect: Fire, Water, Lightning and Earth show 1, 2, 3 and 4; Steam, Plasma, Magma, Storm, Ice and Magnetic show 1+2, 1+3, 1+4, 2+3, 2+4 and 3+4. The numbers stay readable while a tile recharges.
- [ ] **KB2** Hover a tile. Expect: the tooltip shows the spell name with its keys and its cooldown state; pressing those keys loads that spell.
- [ ] **KB3** Resize the window (see HS1). Expect: the numbers scale with the bar and are never clipped.

### [0.19.0-0] A frozen wizard can do nothing (Jesse)

- [ ] **FZ1** Get frozen (Ice bomb, or a full Frost Shards volley). Press 1 then Space, 1-2 and click, E, F, Q, T, B and right click. Expect: nothing happens for any of them (no shield, no spell, no bomb or trap, no sword, no Force, no heal, no bubble) and the hint says you are frozen; the action bar loads no elements.
- [ ] **FZ2** Online, repeat FZ1 and watch the other window. Expect: no shield, projectile or bomb ever appears from the frozen wizard.
- [ ] **FZ3** Hold a spray (Flamethrower) when the ice lands. Expect: it stops firing while frozen. After the freeze ends, everything works again at once (load, shield, cast).

### [0.18.0-0] Settings page and menu theme (Jesse)

- [ ] **SE1** On the main menu click SETTINGS. Expect: a gilded purple page opens with a music slider at 42 and Mute off; the menu music keeps playing.
- [ ] **SE2** Drag the slider while the music plays. Expect: the volume changes live, the number updates, and 0 is silent.
- [ ] **SE3** Switch Mute on and off. Expect: the music stops and resumes at the slider volume, and the slider position is kept.
- [ ] **SE4** Click BACK, or press Esc. Expect: the menu returns and its buttons work.
- [ ] **SE5** Reload the page and reopen Settings. Expect: the volume and mute state are as you left them.
- [ ] **SE6** Open the Arena, Wizard, Dummy HP, Lobby map, Team size, Health and Death-rule dropdowns (in Chrome and Firefox). Expect: purple controls with a dark purple list and cream text, readable and consistent in the menu and lobby.

### [0.17.0-0] HUD and scaling (Jesse)

- [ ] **HS1** Resize the window from small to very large during a match (try 1920x1080 and a narrow window). Expect: the arena grows to fit at 4:3; the action bar, top-right icons and "YOU hp" scale with it and nothing is clipped.
- [ ] **HS2** Aim and fire at the canvas corners and edges at a small and a large window size. Expect: the crosshair and shots land at the mouse position at every size.
- [ ] **HS3** Start on Ruined Keep and watch the bottom-right at several window sizes. Expect: the minimap sits fully above the action bar and never touches it.
- [ ] **HS4** Fire a plain Icicle (or another charged spell) and watch its tile. Expect: it fills and shows "x.x" seconds under 10 s and whole seconds above. Flamethrower, Lightning Bolt and Water Spray tiles show no fill and no number (except the 1 s fill after release, see TB3); Pebble Flurry shows both after the flurry.
- [ ] **HS5** Hover each top-right icon (Sword, Force, Heal, Bubble, Trap). Expect: a tooltip with the name, key and a short sentence, plus "Ready." or the seconds until ready.
- [ ] **HS6** Start an online 2v2 on Ruined Keep and look at the top-left team panel at the start. Expect: both enemies read "Enemy" with "?" and no health.
- [ ] **HS7** Walk until an enemy is in sight, then out of sight again. Expect: while in sight their name and health show; once out of sight their last known health stays but dimmed.
- [ ] **HS8** Play a duel on the Enchanted Arena and another arena (for example Frozen Lake). Walk behind a pillar and past its sides and front. Expect: a wizard behind a pillar is partly hidden by it, one in front is drawn over it, and shots stop at the pillar's face.
- [ ] **HS9** In a real 2v2, check the top-left team panel against the "YOU hp" text. Expect: they do not overlap (the agent saw an overlap that existed before this change and left it alone).

### [0.16.0-0] Thundercloud, beams and burn numbers (Jesse; 2v2 or more for the first item)

- [ ] **TB1** Cast a Thundercloud in a 2v2 or 4v4 with one enemy next to you and another close to where the cloud lands. Expect: the cloud drifts toward the enemy nearest to the cloud, not the one nearest to you.
- [ ] **TB2** Hold Flamethrower and flick the cursor to the opposite side. Expect: the flame sweeps round over about a second instead of snapping, and your own preview matches what the foe sees. Repeat with Lightning Bolt, Plasma Beam and Magnetic Pull.
- [ ] **TB3** Hold a spray, release and press again straight away. Expect: nothing fires until about 1 s after release, and the spell-bar tile shows a cooldown fill for that second only; while you hold it there is no fill. Pebble Flurry keeps its own flurry cooldown and shows it as before.
- [ ] **TB4** Set a wizard alight, then let them fall or die. Expect: no more flame numbers appear over the fallen wizard.

### [0.15.0-0] Bombs, traps and bubbles (Jesse; two browser windows; rules in `docs/BUBBLES.md`)

- [ ] **BT1** Throw a Water bomb at a foe close by. Expect: the foe is shoved away from the blast and WET 100% shows.
- [ ] **BT2** Throw Fire, Steam, Magnetic and Storm bombs at a foe. Expect: BURN 100% (burns for 3 s), SCALD 100%, MAG 100% (your shots home in on the foe), and DISCHARGE! straight away for Storm.
- [ ] **BT3** Throw an Earth bomb at a foe. Expect: the foe walks at about a quarter speed for 3 s and is not frozen. Spring an Earth trap: it still imprisons for 4 s, as before.
- [ ] **BT4** Throw a Magnetic bomb at a foe running away from it. Expect: the foe is dragged into the bomb's centre for about half a second and cannot walk out of it.
- [ ] **BT5** Spring a Water trap on a foe, and on yourself. Expect: the wizard is drawn lifted above a shadow with water rings for 1 s; they cannot walk or be pushed but can still fire a spray; walking resumes afterwards with no rubber-banding for the victim.
- [ ] **BT6** Set a trap in a 1v1 online and watch from the other window. Expect: the foe sees the rune for 2 s, then it vanishes; your own window always shows it; the foe still springs it by stepping on it.
- [ ] **BT7** Throw a bomb at someone inside a bubble, and out of your own bubble. Expect: it turns at the edge and lands back on the thrower's side; it never goes off inside the bubble.
- [ ] **BT8** Cast Water Surge near a landed bomb and near one in flight. Expect: the bomb slides smoothly away from you (a fast start that slows, about as far as a shoved player) and goes off in its new place. See also BS1.
- [ ] **BT9** Old-tab check: a tab from before this build is told to refresh (protocol 15).

### [0.14.0-0] Force start and start countdown (Jesse; needs three or four browser windows)

- [ ] **FS1** Create a room on :8082, set team size 2v2 and have two more windows join (3 players, one seat open). Expect: START is enabled and the status reads "3/4 players here. Press START to play with uneven teams, or wait for more." With only the host, or everyone on one team, START is disabled and the status asks for players.
- [ ] **FS2** Start that 2v1. Expect: only 3 wizards appear, the team panel lists 3 names and ENEMIES STANDING counts only real players. When the lone player's team falls the round ends; when one of the two falls it continues.
- [ ] **FS3** Press START. Expect: every window shows a large 5, 4, 3, 2, 1 over the dimmed arena, then play begins. Nobody can move early.
- [ ] **FS4** During the countdown press WASD and click or right-click. Expect: nothing moves or fires, and everything works the moment the countdown ends.
- [ ] **FS5** In the lobby open the spellbook and leave it open, then the host presses START. Expect: it closes in your window and the countdown shows.
- [ ] **FS6** After a match both players press REMATCH. Expect: the next round starts at once, with no countdown (0.21.0-0).
- [ ] **FS7** Keep a tab from before this build open across the deploy and try to create or join. Expect: a "please refresh" message.
- [ ] **FS8** Duel, training and AI modes start immediately with no countdown.

### [0.13.0-0] Input and charge fixes (Jesse)

- [ ] **IN1** Click quickly with a charge spell (for example Icicle) while walking. Expect: no slowdown at all.
- [ ] **IN2** Hold a charge spell and walk for more than 0.2 s. Expect: walking slows once the charge meter appears; online there is no rubber-banding when the charge starts or ends.
- [ ] **IN3** Hold a charge until the meter is full and keep holding for 3 s. Expect: the spell fires by itself at full power; releasing afterwards fires nothing extra, offline and online (one projectile only).
- [ ] **IN4** Online, right click to throw a bomb. Expect: no purple orb or ghost projectile on your screen; only the real bomb appears, and the opponent sees the same.
- [ ] **IN5** Equip the Lava Pool variant and right click. Expect: a Lava Pool lands at the cursor, no Magma Shot flies. With default Magma, right click still throws a Magma Shot.
- [ ] **IN6** Hold the left button, drag the pointer outside the canvas or browser window and release there. Expect: the wizard stops attacking and does not auto-attack, offline and online.
- [ ] **IN7** Regression: Flamethrower, Water Spray, Lightning Bolt, Pebble Flurry and Plasma Beam still work; they are not slowed and not auto-released.

### [0.12.27-0] Menu illustration load fix (Mark, 2026-10-18)

- [ ] Hard refresh :8081 and verify uploaded Arcane Duel illustration appears behind menu buttons with the painted title visible.
- [ ] Check menu buttons, spellbook and customisation panels still work and are readable.
- [ ] Check online lobby and in-duel screens retain their previous styling and menu music stops in combat.

### [0.12.27-0] Illustrated main menu (Mark, 2026-10-18)

- [ ] Upload `arcane_duel_battle_above_the_clouds.png` to `client/public/ui/` on `test` and verify full artwork and embedded title display on :8081.
- [ ] Verify old border/title no longer appear and menu controls remain legible at desktop/mobile widths.
- [ ] Test create/join room, wizard settings, spellbook, duel and dummy modes.
- [ ] Confirm menu music continues working and stops during duels.

### [0.12.27-0] Gapless menu music (Mark, 2026-10-18)

- [ ] Load menu and interact once: music starts, including if the OGG has not finished decoding.
- [ ] Listen across 49.65-second boundary: no silent restart gap or double attack.
- [ ] Enter lobby: music continues; enter match: stops immediately; return to menu: resumes after the browser has been unlocked.
- [ ] With a blocked autoplay policy, no sound before interaction; no console crash if the file is missing.

### [0.12.27-0] Menu theme playback (Mark, 2026-10-18)

- [ ] After adding the final OGG to client/public/audio/, open the main menu and interact once: menu theme starts and loops.
- [ ] Enter online lobby: music continues; start solo or online duel: menu music stops immediately.
- [ ] Check that paused matches never play menu music, and returning to the menu restores it on interaction.
- [ ] Check missing audio assets fail gracefully with no gameplay errors.

### [0.12.26-0, 0.12.27-0] Spell-bar cooldowns: all click spells show, hold-to-fire spells do not (Jesse)

- [ ] **UI9** Fire each spell on the action bar and watch its tile: spells you click (Earth Shot, Vapor Blast, Plasma Flare, Gravity
      Shot, Icicle, Fireball, Pyrodisk, Frost Shards, Water Surge, Lava Pool, Thundercloud, Pebble Flurry) grey out and fill up from
      the bottom while they recharge, however short the wait. It is the spell bar's fill, not the clockwise sweep (that is only for
      Sword, Force, Heal, Bubble and Trap above).
- [ ] **UI10** Spells you hold down to keep firing (Flamethrower, Water Spray, Lightning Bolt, Plasma Beam, Magnetic Pull) never show
      a cooldown fill on their tile, however long you hold; the tile stays bright and its tooltip says ready.

### [0.12.24-0] Ability cooldown icons with a clockwise sweep (Jesse)

- [ ] **UI6** Top right of the arena is a row of five small icons (Sword, Force, Heal, Bubble, Trap), not the old wide bars.
      There are no Magma or Earth icons: those cooldowns belong to the spell bar.
- [ ] **UI7** Use each ability. Its icon darkens and a dark cover sweeps away clockwise from twelve o'clock as it recharges, like a
      cooldown in World of Warcraft; at the end it is bright again. Abilities with a wait over two seconds (Force, Heal, Bubble,
      Trap) also show the seconds left on the icon; Sword just sweeps.
- [ ] **UI8** Hover an icon: the tooltip names the ability and its key, and says "ready" or how many seconds are left. Works solo
      and online (online it follows the server's cooldowns).

### [0.12.23-0] A cleaner screen around the arena (Jesse)

- [ ] **UI1** Under the arena there is no row of element buttons (1 FIRE, 2 WATER, ...), and no EARTH / SWORD / FORCE / SHIELD / KILLS
      line. Only the connection line (LOCAL TEST / MULTIPLAYER ... ping) and the hint remain. Above the arena there is no
      YOU / RIVAL health line.
- [ ] **UI2** In a match your health shows top left of the arena as "YOU 200/200" and counts down as you are hit; heal and it goes up.
      Online team match: a second line says ENEMIES STANDING n. Mortal dummy: a line says DUMMY RESPAWNING while it is down.
- [ ] **UI3** The rival's health shows as a number beside their health bar ("143/200"; "∞" for an immortal dummy). Yours has no
      number there. Behind fog the rival (and the number) is simply not drawn.
- [ ] **UI5** Starting an online match no longer throws a console error (the `spell` label that does not exist any more).

### [0.12.22-0] Bubble reflection, one rule for everything (Jesse; rules in `docs/BUBBLES.md`; two browser windows)

- [ ] **BR1** Cast a Bubble, then fire each of Fireball, Pyrodisk, Boulder, Vapor Blast, Plasma Flare, Icicle, Frost Shards, Gravity Shot,
      Tempest Bolt and Molten Core out of it: every shot is reflected at the edge and comes back (the Pyrodisk too: it no longer
      passes through your own bubble). No shot ever crosses the edge. Check from both windows.
- [ ] **BR2** Aim each of those at an enemy's bubble: reflected, and it hurts you (the caster), never the one inside the bubble.
- [ ] **BR3** Two bubbles facing each other with a Pyrodisk between them: it keeps bouncing between them and is freed when a
      bubble expires (about 4 seconds). There is no other limit on its flight.
- [ ] **BR4** Cast Water Surge on the outside of an enemy's bubble from about 150 px away: the drawn ring is a true circle, stops at
      the bubble edge (it is not drawn crossing it), and a second ring starts at the point of contact and washes back over you
      (you are soaked and shoved; the person inside is not). The first ring keeps growing in the other directions.
- [ ] **BR5** Cast Water Surge while standing inside your own bubble with an enemy next to you inside it: the enemy is soaked and
      shoved the normal amount; the ring stops at the wall, and a new ring starting at the wall shoves you too.
- [ ] **BR5b** Two bubbles facing each other with a Water Surge cast between them: rings keep bouncing between them until they
      expire, never more than a handful at once, and the game does not slow down.
- [ ] **BR6** The exceptions still hold (they are listed in `docs/BUBBLES.md`): Flamethrower and Water Spray are blocked at the edge,
      bombs go off at the edge, and the sword and Force ignore bubbles.

### [0.12.21-0] Third test slot (Jesse, after the server is set up)

- [ ] `ssh ubuntu@159.13.37.255 arcane-deploy status` lists `test3` with its URL on port 8083.
- [ ] After `arcane-deploy test3 test-adnan`, http://159.13.37.255:8083/ loads and shows the version label.
- [ ] Pushing to `test-adnan` redeploys `test3`, and the other slots (80, 8081, 8082) still load.

### [0.12.20-0] Spell bar long cooldown indicators (Mark, 2026-10-18)

- [ ] Confirm Pebble Flurry, Molten Core, Water Surge, Lava Pool and Thundercloud show their progress overlay while cooling down.
- [ ] (0.12.26-0: changed) Spells with cooldowns of 2 seconds or less (Earth Shot, Vapor Blast, Plasma Flare, Gravity Shot, Icicle, Pyrodisk, Frost Shards, Fireball) now show the same fill-from-below overlay as the long ones; see UI9.
- [ ] Confirm short cooldowns still prevent premature casting; hover title still reports readiness and remaining time; verify solo and online.

### [0.12.20-0] Default combo projectile cooldowns (Mark, 2026-10-18)

- [ ] Cast Vapor Blast, Plasma Flare, Icicle and Gravity Shot individually: each fires, shows ~0.33 s cooldown in spellbook and becomes ready again.
- [ ] Confirm their projectiles deal damage and casts during cooldown do not produce extra shots (solo and online).
- [ ] Check their cooldowns are independent of each other and Earth, Magma, Fireball and Frost Shards remain unchanged.
- [ ] Verify online local preview matches authoritative casts without duplicate or missing shots.

### [0.12.20-0] Tempest Bolt storm-mass projectile (Mark, 2026-10-17)

- [ ] Fire Tempest Bolt: confirm predominantly charcoal/grey moving cloud with distinct rainy streaks, wispy wake, restrained blue-purple internal flashes and no solid purple oval.
- [ ] Check projectile tracking, collisions, damage, speed, and Thundercloud remain unchanged.

### [0.12.20-0] Eight renamed spell labels (Mark, 2026-10-17)

- [ ] Confirm Lightning Bolt, Boulder, Vapor Blast, Plasma Flare, Tempest Bolt, Icicle, Molten Core and Gravity Shot display correctly in spellbook and action bar.
- [ ] Confirm all eight still show their original sprites (including individual PNGs and atlas sprites) and spell selection, damage, cast type and multiplayer sync are unchanged.

### [0.12.20-0] Enchanted bronze spellbook scrollbar (Mark, 2026-10-17)

- [ ] Spellbook scrollbar has dark engraved bronze track, gold bevelled grip and subtle centre rune; hover/drag glow remains tasteful.
- [ ] Check mouse wheel, track clicks, thumb dragging, keyboard scrolling and mobile scrolling work as before; Firefox uses gold/bronze native fallback. Other screens unchanged.

### [0.12.20-0] Combined element spellbook icons (Mark, 2026-10-17)

- [ ] Spellbook headings show bespoke art for Steam, Plasma, Magma, Storm, Ice and Magnetic; primary four icons unchanged.
- [ ] Verify spell variant selection and equipped cards unchanged, icons readable on mobile.

## Flamethrower visuals [0.12.20-0, Mark, 2026-10-17]

(Five rounds of Mark's tweaks, merged into one set of checks.)

- [ ] **FLAME-1** Cast Flamethrower, moving and turning. **Expect:** a wide cone of small pointed triangles, ovals and circles (about a third each, no teardrops), mostly dark orange with some yellow and dark red; no stutter.
- [ ] **FLAME-2** Hit a training dummy at the centre and edge of the cone. **Expect:** direct-hit splash is seven small round particles in orange, yellow and dark red; the burn/ignite effect looks as it always did; damage, range and hit detection unchanged.
- [ ] **FLAME-3** Repeat online with a second player. **Expect:** both see the same look and direction. Run section 7 regression.

## Steam Shot vapour visuals [0.12.20-0, Mark, 2026-10-17]

- [ ] **STEAM-V1:** Cast Steam Shot in training mode. **Expect:** concentrated pale steam with animated curling wisps and trailing translucent vapour rather than isolated circles.
- [ ] **STEAM-V2:** Check movement, collision and impacts against dummy and obstacle. **Expect:** trajectory, hit detection, damage and original impact unchanged.
- [ ] **STEAM-V3:** Try Steam Shot with two players online and run section 7 regression. **Expect:** visual works for both clients without stuttering or gameplay changes.

> **INSTRUCTIONS FOR THE AI ASSISTANT (e.g. ChatGPT) READING THIS FILE**
>
> This is the manual test plan for a browser game. You were pointed here from the repo (README.md /
> AGENTS.md) because the user asked to test the game, so the user will not paste anything: **you
> run the test session from this file.** The tester is usually Mark. Do this:
>
> 1. Walk him through the sections **in order**, one section at a time. Do not skip ahead. Sections tagged with a version newer than the one he is testing do not exist yet; ignore them. If he has tested an older version before, he may skip to sections tagged newer than that, but should still run section 7 (regression).
> 2. For each item, tell him exactly what to do and what he should see (the "Expect" text).
> 3. Ask him to answer **PASS**, **FAIL** (plus what he saw) or **SKIP** (plus why) for each item.
> 4. Fill the checklist in as you go. If you can edit files in the repo, tick the boxes in this file
>    (on the branch you are testing, see the slot table; never on someone else's) and commit; otherwise keep the tally in the chat. Use the checkboxes below (`[ ]` untested, `[x]` pass, `[!]` fail,
>    `[-]` skipped). Show the updated list whenever he asks "where am I?".
> 5. If an item fails, record the item ID, what he saw, the browser, and whether it repeats on a
>    refresh. Do not try to fix it; continue with the next item, unless a later item depends on it
>    (marked "needs").
> 6. At the end, add a dated entry to the **Results log** at the bottom of this file (commit it if you
>    can) and output a **FAILURE REPORT**: every `[!]` item with its ID, expected vs. actual,
>    and any notes, ready to give to Jesse.
>
> Setup he needs: two browser windows (or one normal and one incognito window, or two devices),
> both open at **your slot URL** (table below). He is the **host** in one window and the
> **guest** in the other. Sections 32, 35 and 36 (team lobby, 2 v 2) need **four** windows; 37 and 38 (3 v 3, 4 v 4) need six and eight,
> or a few windows plus scripted players (the lobby fills from any client that joins the room code).

> **Which slot?** Run `git branch --show-current` and use the slot for that branch: `test-jesse` ->
> http://159.13.37.255:8082/, `test` -> http://159.13.37.255:8081/, `main` -> http://159.13.37.255/.
> The Results log entry records tester, branch and version. Only Jesse edits the "Tested version"
> line; Mark's sessions go in the log only.
>
> **When to run this:** after pushing a feature (new sections + section 7), before merging (on your
> own slot) and after merging (section 7, on the merged branch).

---

## 0. Setup

- [ ] **S1** Open your slot URL in window A and window B. Expect: the menu loads in both.
- [ ] **S2** The version label (top corner and in the menu) reads the **Tested version** above (e.g. v0.10.5-0). If it
      shows something older, hard-refresh (Ctrl+Shift+R). If still wrong, stop and report: the deploy
      has not finished.
- [ ] **S3** Optional, for a technical check: open `<slot URL>/stats` in a third tab.
      Expect a `"version"` starting `Arcane Duel v` and the **Tested version** number, and `"protocolVersion": 16`.

## 1. [0.1.3] Menu and solo play (window A only)

- [ ] **M1** The map picker is labelled **MAP**. Expect: two group headings, **Arenas** with 10 maps
      and **Battlegrounds** with two maps, **Ruined Keep** (0.3.2) and **Development Battleground** (added in 0.2.1; real
      battlegrounds come later).
- [ ] **M2** Default selection is **Enchanted Arena**.
- [ ] **M3** Change the picker through every map. Expect: the background behind the menu changes
      each time and none is blank or broken.
- [ ] **M4** The small text under the picker says the room creator picks the map online. It does not
      say "Online uses the original arena".
- [ ] **M5** Choose **Dark Wizards' Circle**, press **DUEL AI**. Expect: a table in the middle and
      monuments; walking into them is blocked, and spells hit them.
- [ ] **M6** Choose another map (e.g. Frozen Lake) and start a training mode. Expect: it plays on
      that map (four pillars block movement and shots).
- [ ] **M7** Return to the menu. Expect: the game does not crash and the picker still works.

## 2. [0.1.1, 0.1.3] Lobby (window A = host, window B = guest)

- [ ] **L1** Window A: **Create Private Room**. Expect: a lobby appears with a 6-letter room code
      and a COPY button.
- [ ] **L2** Press **COPY**. Expect: it either copies (you can paste elsewhere) or the code gets
      selected with a hint to copy it. The site is HTTP, so the fallback is normal.
- [ ] **L3** Window A: **START** is disabled, and the status says to share the code and wait.
- [ ] **L4** Window B: join with the code. Expect: B shows the lobby with the map picker greyed out
      (read-only) and the text "The host chooses the map." A's status says the opponent is here and
      START becomes enabled. **(needs L1)**
- [ ] **L5** The picker in the lobby shows the same two groups as the menu (Arenas, and Battlegrounds with the Development Battleground).
- [ ] **L6** Window A changes the map several times. Expect: window B's picker follows each change
      live, within about a second.
- [ ] **L7** Window B tries to change the picker. Expect: it can't (disabled).
- [ ] **L8** No text in the lobby says "the match still uses the original arena".

## 3. [0.1.2] Synced map. Needs L4

Do this once with **Dark Wizards' Circle** and once with a second map (e.g. Frozen Lake).

- [ ] **Y1** Host picks **Dark Wizards' Circle** and presses START. Expect: both windows start the
      match at the same time, on the same background, each showing the table and monuments.
- [ ] **Y2** Each player walks into the table and a monument. Expect: blocked in both windows,
      and the other player sees you stopped at the same place (no walking through things on one screen).
- [ ] **Y3** Fire spells at the table and monuments from both sides. Expect: they hit the obstacles
      in both views.
- [ ] **Y4** Spawn positions: you start on the left, the opponent on the right, in both windows
      (mirrored view of the same fight).
- [ ] **Y5** Repeat Y1 to Y4 with **Frozen Lake**. Expect: the four pillars, not the table and
      monuments, on both screens.
- [ ] **Y6** Finish the match (let someone die). Both press rematch. Expect: the **same map** again.
- [ ] **Y7** On the end screen use **BACK TO LOBBY** (either player). Expect: both return to the
      lobby with the previous map still selected.
- [ ] **Y8** In the lobby, host picks a different map and starts. Expect: the new map is used by both.

## 4. [0.1.1] Lobby edge cases

- [ ] **E1** Guest leaves while in the lobby (LEAVE ROOM). Expect: the host's lobby stays open, START
      disabled again, status asks for an opponent.
- [ ] **E2** A guest joins again with the same code. Expect: it works.
- [ ] **E3** Host leaves the lobby. Expect: the room closes; the guest is told the peer left and goes
      back to the menu.
- [ ] **E4** Try to join with a wrong code. Expect: a clear error, no crash.
- [ ] **E5** Join a room that is already full (use a third tab). Expect: an error, existing players
      unaffected.

## 5. [0.1.2] Reconnect (during a match)

- [ ] **R1** In a running match, turn off the network in one window for about 3 s (browser dev tools
      -> Network -> Offline, or Wi-Fi off), then back on. Expect: the other player sees "Opponent lost
      connection", then both continue on the **same map** with correct collisions.
- [ ] **R2** Stay offline for more than 15 s. Expect: the match ends or the player is told they were
      disconnected; no frozen or broken screen on the other side.

## 6. [protocol] Outdated client

- [ ] **O1** Leave a tab open from before the update (if one exists). Expect: it tells you to
      refresh the page. Do not worry if you have no old tab.

## 7. [always] Regression: normal play

- [ ] **G1** Movement (WASD / keys) feels smooth online, no rubber-banding on your own wizard.
- [ ] **G2** The opponent moves smoothly, no stutter.
- [ ] **G3** Spells cast, travel and hit as before. Try a few elements and a charged spell.
- [ ] **G4** Bombs, traps and the reflective bubble work.
- [ ] **G5** The HUD (health, cooldowns) updates correctly.
- [ ] **G6** The end screen shows the right winner on both sides.

## 8. [always] Server health (optional, technical)

While a match is running, open `<slot URL>/stats`.

- [ ] **H1** `matchesRunning` is 1, `playersAway` is 0.
- [ ] **H2** `lastSecond.ticks` is about 60.
- [ ] **H3** `lastSecond.tickMsMax` is well below 16 (a good result is under 2).
- [ ] **H4** `memoryMb` is not climbing past roughly 100 over a few minutes.

Reference reading from Jesse's own session: ticks 60, tickMsAvg 0.124, tickMsMax 0.288, bytesOut
~46 KB/s, memory 73 MB. Similar numbers are good.

## 9. [0.2.0] Camera

On every arena nothing should look or feel different from before. The camera code is new, so this
section checks that it stays out of the way. (The big map is tested in section 10.)

- [ ] **C1** On Enchanted Arena (online and solo), the whole arena is visible and does not scroll or
      shift while you walk to every edge and corner.
- [ ] **C2** Repeat on Dark Wizards' Circle and one other arena. Expect: same, no shifting.
- [ ] **C3** Aim accuracy: put the cursor on the opponent (or the dummy) and fire. Expect: the spell
      goes exactly where the crosshair is, at both far corners and in the centre.
- [ ] **C4** The crosshair sits exactly under the real mouse pointer everywhere on the canvas.
- [ ] **C5** Resize the browser window (small, large, tall and narrow). Expect: the game scales as
      before, aim stays accurate, and you never see more of the arena than at normal size.
- [ ] **C6** Spell effects (lightning, heal, force rings, bombs, traps) appear at the right places
      in both windows, and the death animation plays where the wizard died.
- [ ] **C7** Return to the menu and start another match. Expect: the view is normal, with no leftover
      offset from the previous match.

## 10. [0.2.1] Development battleground (a big map, 2400x1800, with a following camera)

Do it solo first (window A), then online (host in A, guest in B, host picks **Development Battleground**
in the lobby). The map is plain on purpose: a green tiled field, a light border, grey stones.

- [ ] **B1** Solo: pick Development Battleground in the menu, press **TRAINING** or **DUEL AI**.
      Expect: the view scrolls with you. Your wizard stays in the middle of the screen while you walk,
      and stops scrolling when you reach a map edge (then the wizard moves off-centre).
- [ ] **B2** Walk to all four edges and corners. Expect: you can't leave the map, the light border
      is visible at the edge, and the camera never shows empty space beyond it.
- [ ] **B3** Walk into several grey stones. Expect: they block you and slide you around them, as
      pillars do on arenas.
- [ ] **B4** Aim: move the mouse without moving, then walk. Expect: the crosshair stays under your
      mouse pointer all the time, and spells go to the crosshair even while the view scrolls.
- [ ] **B5** Fire at a stone from a distance. Expect: the spell stops at the stone.
- [ ] **B6** Cast a long-range spell (e.g. lightning, bomb, trap) at the far edge of the screen and
      past it while scrolling. Expect: it lands where the crosshair was; effects are drawn in the
      right place on the map (not stuck to the screen).
- [ ] **B7** Online: host starts the match. Expect: you spawn on the **left** side and the opponent
      on the **right**, a long way apart. Each window follows its own wizard.
- [ ] **B8** Online: walk toward each other. Expect: the opponent appears at the screen edge, comes
      into view smoothly, and walking feels as smooth as on an arena (no rubber-banding while the
      camera scrolls).
- [ ] **B9** Online: fight. Spells hit, stones block shots for both players, and the end screen and
      rematch work. The rematch is on the same battleground.
- [ ] **B10** Back to the menu and pick an arena. Expect: the view goes back to normal with no
      offset, and arena checks C1 to C4 still pass.
- [ ] **B11** Known limits, not failures: the whole map is visible to the enemy wizard's snapshot
      (no fog yet; that is 0.4), and the AI walks straight lines, so do not judge the AI here.

## 11. [0.2.2] Drawing only what is visible

The map is now painted in cached tiles and things off screen are not drawn. Nothing should look
different. The risks are visible seams, things missing near the screen edge, and a stutter when
walking into new parts of the map. Use the Development Battleground, solo and online.

- [ ] **V1** Walk slowly in every direction across the whole battleground. Expect: no visible seams
      or lines in the ground where tiles meet (tiles are 512 units square), no flashes of blank
      background, and no stutter while new areas come into view.
- [ ] **V2** Stones near the screen edge appear smoothly as you walk, never popping in suddenly, and a
      stone cut by the screen edge is drawn whole once it is in view.
- [ ] **V3** Fire spells so they fly off the screen edge and keep going. Expect: when they hit
      something off-screen nothing odd shows; shots reappear normally when they come back into view.
- [ ] **V4** Cast a big effect (bomb, trap, magma pool, bubble, lightning) near the screen edge.
      Expect: the part that is on screen is drawn completely, with no half-cut circles.
- [ ] **V5** Floating damage numbers and particles near the edge show normally.
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

_No sessions yet._

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
