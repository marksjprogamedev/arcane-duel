# Manual test checklist: Arcane Duel

**Living document.** Every feature (`docs/MAPS-PLAN.md`, `docs/TEAMS-PLAN.md`) adds its manual test
items here, in a section tagged with the version that introduced it, and the "Tested version" line
below is bumped. Items from earlier versions stay, because they are the regression checks. Rule for
developers: a feature is not finished until its items are in this file.

**Tested version:** 0.12.18-0 (Lightning Bomb fuse art; pending manual verification). Sections are tagged `[0.x.y]` with the version that added them.

### [0.12.18-0] Lightning Bomb artwork
- [ ] Throw Lightning Bomb: dark spherical cartoon casing, yellow lightning insignia, and short decorative fuse appear clearly.
- [ ] Confirm its normal detonation timing, blast, and damage are unchanged, and Firebomb / Magnetic Bomb still look the same.

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
      Expect a `"version"` starting `Arcane Duel v` and the **Tested version** number, and `"protocolVersion": 13`.

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

- [ ] **O1** Walk around every stone on the Development Battleground (solo training). Expect: you
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

- [ ] **R1** Nothing visible changes yet: on an arena and on both battlegrounds you still see the
      opponent, their shots and effects wherever they are on the map (solo and online).
- [ ] **R2** Optional, for a technical check: the match plays exactly as in 0.3.2 on Ruined Keep
      (walls, spawns, camera). The vision radius (440 units on battlegrounds, none on arenas) exists
      in the map data and is not used by the game yet.

## 16. [0.4.1] Server-side culling. Needs two windows, Ruined Keep, online

The server now leaves out what you can't see. There is no fog drawing yet (0.4.2), so things simply
appear and disappear at the edge of your sight (440 units, about the width of the screen).

- [ ] **C1** Host picks Ruined Keep, guest joins, START. At the start the rival is far away. Expect:
      the rival is not drawn for either player, and the HUD says **RIVAL out of sight** (instead of
      the rival's health).
- [ ] **C2** Both players walk toward each other along the road, through the gatehouse gap. Expect:
      the rival comes into view (fading in from the dark) when about a screen away, the HUD shows **RIVAL 200/200**, and the
      rival stays in the right place with no sliding in from a wrong position.
- [ ] **C3** Walk away from each other until the rival is out of sight again, then back. Expect: they
      vanish and return cleanly each time and appear where they really are.
- [ ] **C4** Cast from far away (just out of sight) at the rival. Expect: you do not see their effects
      (shots, sparks, text) until they come into sight; hits still count.
- [ ] **C5** Duel on an arena (e.g. Enchanted Arena) online. Expect: exactly as before; the rival is
      always visible.
- [ ] **C6** At the end of a round on Ruined Keep (if you can finish a fight at range, e.g. a burn
      kills the rival out of sight), the death and result show normally for both players.
- [ ] **C7** An old tab left open from before the deploy is told to refresh.

## 17. [0.4.2] Fog of war (client). Ruined Keep and Development Battleground, solo and online

- [ ] **F1** Solo, **DUEL AI** on Ruined Keep. Expect: the edges and corners of the screen are dark, the
      area around your wizard is clear. Your sight is about a screen wide (440 units); the sides of
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

- [ ] **H1** Hard-refresh the page. Expect: the menu, map art and everything else load as before, with no
      broken images (check a few arenas in the map picker).
- [ ] **H2** Open the browser's network tab, reload. Expect: the page and scripts are served
      **compressed** (`content-encoding: zstd` or `gzip`), and play works.
- [ ] **H3** Open `<slot URL>/version` and `<slot URL>/stats`. Expect: the version text and the stats JSON
      (they come from the game process, not from Caddy's files).
- [ ] **H4** Play a full online match (create room, join, START, fight, rematch). Expect: no change
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

## 25. [0.6.5] Mark's spell variants (solo prototype)

- [ ] **S1** Menu: a **SPELL LOADOUT** panel with a variant per spell (Earth: Pebble Spray, Fire: Fireball,
      Water: Water Surge, Ice: Frost Shards; each defaults to the original). Online ignores them.
- [ ] **S2** Pick all four variants, **DUEL AI**. Expect: the HUD shows the variant names, and each spell
      behaves as described: pebbles are a spray (hold to keep firing) and the water surge an instant ring, the fireball and
      frost shards are single projectiles with their own sprites.
- [ ] **S3** Choose the originals again. Expect: spells behave exactly as before, including charging.
- [ ] **S4** Start a new match after changing the loadout. Expect: it is locked in for each match (a match
      keeps the loadout it started with).

## 26. [0.7.0] A match is a list of wizards (no visible change: a regression check)

- [ ] **L1** Solo **DUEL AI** and **IMMORTAL DUMMY**, then a **mortal dummy** and kill it. Expect: everything as
      before, the dummy respawns, the HUD and menu background look the same.
- [ ] **L2** One online match (two windows) on an arena and on Ruined Keep, start to finish with a
      rematch. Expect: no difference from before.

## 27. [0.7.1] Targeting for teams (a regression check, plus one fix)

Nothing should change in a 1v1. These check every attack type still lands and the new trap fix.

- [ ] **G1** Solo **DUEL AI**: fire and water sprays, lightning, a projectile spell, a charged shot, a bomb, a
      force push (space), the sword, a bubble and a trap each still hurt the AI as before.
- [ ] **G2** Online (two windows), arena: the same attacks hit the other player and not yourself, and your own
      bomb or reflected shot can still hurt you.
- [ ] **G3** **Fix:** on **Ruined Keep** (solo or online), set a trap (middle click) far from the left edge, in the
      middle and right side of the map. Expect: it is placed where you aimed (up to its range), not
      stuck near x=760.
- [ ] **G4** Magnetic spells still curve toward the other wizard.

## 28. [0.7.2] Seats and protocol 8 (a regression check; the wire format changed)

Nothing should look different. These cover everything the new snapshot and messages touch.

- [ ] **Q1** Online (two windows), arena: create, join, start. Expect: each player sees themselves on their
      own side, the rival on the other, HUD names and hp right ("RIVAL 200/200").
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

- [ ] **C1** Online, Ruined Keep, two windows: the rival is hidden at the start (HUD "RIVAL out of sight"),
      appears when you get close and moves smoothly (no jumping), vanishes again when you part. The
      minimap shows their red dot only while you see them.
- [ ] **C2** Wizards overlap correctly: when one walks past the other, the one lower on the screen is in
      front, and a dying wizard falls over (the right one, on both screens).
- [ ] **C3** The hit arrow (from out of sight) and the fog still work (sections 16 and 17).
- [ ] **C4** At the end of a won match the result says "Remaining health" with **your** health (it used to
      show the rival's).
- [ ] **C5** Your own spells preview instantly and stop at walls and at the rival if they are in the way;
      a rival you cannot see does not stop them.
- [ ] **C6** Solo: DUEL AI and the training dummies look and play as before, with the rival in the minimap.
- [ ] **C7** Colours: your team is green and the other team red, in solo and online (this changed in 0.10.0; online
      you used to be the red wizard).

## 30. [0.8.0] Team spawns (no visible change yet: a regression check)

Team spawns only matter in a 2v2 (section 35), so this just checks that duels did not change.

- [ ] **T1** Online duel on an arena and on Ruined Keep: spawns where they were (left and right), sides swap
      on a rematch on the battleground, nothing else different.
- [ ] **T2** Solo duel and dummies: unchanged.

## 31. [0.8.1] Rooms by seat (a regression check for duels; the team lobby is section 32)

This checks duels still work through the room code that now handles seats, and the lobby status text.

- [ ] **E1** Create a room, join from a second window, start (arena and Ruined Keep). Expect: lobby shows
      "Share the code…" then "Your opponent is here" with START enabled for the creator only.
- [ ] **E2** Change the map in the lobby (creator): the guest sees it change. The guest leaving puts START
      back to disabled; joining again re-enables it.
- [ ] **E3** Rematch and back to lobby still work; closing a tab mid-match and reopening keeps your seat
      (reconnect). A tab from before the deploy is told to refresh.

## 32. [0.8.2] The team lobby (needs up to four browser windows)

Set up and look at a 2v2 lobby (the match itself is section 35).

- [ ] **B1** Window A: create a room. The lobby shows MAP, TEAM SIZE (1 v 1 up to 4 v 4) and two team columns
      (TEAM 1: Host (you) + open seat; TEAM 2: two open seats). With 1 v 1 there are only two seats and no
      rules rows.
- [ ] **B2** A picks **2 v 2** and **Ruined Keep**. Expect: four seats, the Friendly fire checkbox and the
      "When a wizard falls" choice appear, and the map list stays as it is (every map takes every team size).
- [ ] **B3** Windows B, C, D join with the code. Expect: they fill seats in turn: the second joiner goes to
      TEAM 2 (Player 3), the third to TEAM 1 (Player 2), the fourth to TEAM 2 (Player 4). Everyone sees the
      same lobby with "(you)" on their own seat, and the status counts (n/4) until full.
- [ ] **B4** Joiners see the options greyed out (read-only). The host changes friendly fire and the fall rule:
      all four windows update.
- [ ] **B5** The host presses **⇄** next to a player: they move to the other team (into an open seat, or
      swapping with a player there). The host has no ⇄ and cannot be moved; non-hosts have no buttons.
- [ ] **B6** A joiner leaves (LEAVE ROOM or closes the tab): their seat shows "Open seat" and START is disabled
      again for the host. Switching A back to **1 v 1** with more than two players seated does nothing (the
      room keeps 2 v 2); after players leave so only two remain it works and they become Host and Player 2.
- [ ] **B7** Host presses **START** with all four seated on a 2 v 2: the match starts for everyone (section 35).
      With a seat empty START is disabled. A **1 v 1** still starts normally.
- [ ] **B8** Everything else in the lobby still works as before: copy button, map change in 1 v 1, rematch.

## 33. [0.8.3] Mark's spell variants, second batch (solo prototype; merged from `test`)

- [ ] **V1** Menu: the spell choices (now in the **SPELLBOOK**, see section 39) have a variant for every spell (Fire, Water, Lightning, Earth,
      Steam, Plasma, Magma, Storm, Ice, Magnetic). Online ignores them.
- [ ] **V2** Pick a few new variants (e.g. Plasma Beam, Magnetic Pull, Lava Pool, Frost Shards) and
      play **DUEL AI**. Expect: each behaves as its name says, has its own look, and hits the AI; held beams
      retract when you let go.
- [ ] **V3** With all variants on default the game plays exactly as the originals.
- [ ] **V4** Online duel: spells are the originals, nothing changed.

## 34. [0.9.0 to 0.9.2] Team rules (a duel regression check; the team rules themselves are in section 35)

The elimination and respawn rules, friendly fire and team vision only show in a 2 v 2 (section 35), so
these confirm that duels did not change.

- [ ] **R1** Online duel to the end on an arena and on Ruined Keep: the first fall ends the round, the right
      player gets VICTORY and the other DEFEAT, rematch works.
- [ ] **R2** Fog on Ruined Keep in a duel: the rival is hidden until close, as before (vision per team is
      the same as per player in a duel).
- [ ] **R3** Solo duel, and training dummies (including the mortal dummy that respawns): unchanged.

## 35. [0.10.0] Playing a 2v2 (needs four browser windows; the big one to eyeball)

Team matches can now be started from the lobby. Four windows on http://159.13.37.255:8082/: A creates a
room (pick **Ruined Keep**, **2 v 2**), B, C and D join. Seats: A and C are one team, B and D the other.

- [ ] **P1** START works. Each window says "Online 2v2 · Your team is GREEN"; the top bar shows
      "ENEMIES STANDING 2"; a team panel (top-left) lists you ("YOU ·"), your teammate (green) and the two
      enemies (red), the enemies as "Enemy ?" until you have seen them.
- [ ] **P2** Teams start on opposite sides (left and right), two to a side, with different wizard looks. Your
      teammate is always visible on screen and on the minimap (green dots); enemies only when your team
      can see them (red dot).
- [ ] **P3** **Shared sight:** stand so that your teammate can see an enemy and you cannot. The enemy appears
      for you too (fog clears around your teammate as well as you), and the minimap shows them.
- [ ] **P4** Fight. Spells hit the enemies, and not your teammate (friendly fire off); hits from out of sight
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

- [ ] **H1** The lobby's TEAM SIZE now lists **3 v 3**. Pick it: six seats, three to a team column, the status
      counts n/6, and the seats fill alternating teams (host, then team 2, team 1, team 2, ...).
- [ ] **H2** START with all six seated, on an arena and on the Ruined Keep: six wizards, three a side, the team
      panel lists six rows (yours green, three enemies red), nothing overlaps or runs off the screen.
- [ ] **H3** Play a round of each rule (elimination and respawn): falls, spectating, the score and the end screen
      work as in the 2 v 2, with more people.
- [ ] **H4** It stays smooth: no stutter with six players (check `<slot URL>/stats`: `lastSecond.ticks` near 60 and
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

- [ ] **P1** Menu: **SPELLBOOK** opens a modal with a description for every variant; Fire offers Fireball and
      Pyrodisk, Water only Water Surge. There is no Flame Wave or Tidal Surge anywhere. Online ignores them.
- [ ] **P2** Pick Pyrodisk, **DUEL AI**. Expect: a flaming ring flies out, hits the AI at most twice on the way (out
      and back), turns for home at max range or when it hits a pillar or wall (the map edge does not turn it), and returns to you. You cannot throw a
      second one until it is back, and it cannot be charged.
- [ ] **P3** Stand the AI behind your Bubble shield or let it use one, and throw Pyrodisk at it. Expect: the disc stops
      at the bubble edge and returns; nobody inside is hurt. A disc that meets a pillar or bubble on the way back just
      vanishes. Your own bubble does not stop your disc.
- [ ] **P4** Magnetic bomb with a Lightning shield up: one "BLOCKED!" label, and no pull. Without the shield: the
      bomb pulls you in and hurts less than before.
- [ ] **P5** Plasma Beam: tap, hold and release repeatedly. Expect: the beam starts fresh each press, damage numbers
      appear about five times a second, and silence builds slowly.
- [ ] **P6** The spell legend (top left) lists the ten spells, highlights the selected one, collapses with its
      arrow, and does not flicker while you play.

## 40. [0.12.2] The spellbook online (needs two browser windows)

- [ ] **O1** Create a room and join it. In the lobby each window has a **📖 SPELLBOOK** button. Pick variants in both
      (e.g. host: Pyrodisk and Plasma Beam; guest: Pebble Flurry and Magnetic Pull). Each seat in both windows
      shows that player's picks, or "Original spells".
- [ ] **O2** START. Cast each variant at the other player. Both windows see the same spell with its own look (Pyrodisk
      ring, Frost Shards, beams, the surge ring, the cloud), and your own variant shots show as well as theirs. The HUD and legend name
      your variant.
- [ ] **O3** Plain spells (no variant picked) still show instantly for you with no double image. A variant may appear a
      moment after the click (one round trip) rather than instantly: note if that feels bad.
- [ ] **O4** After the match, go back to the lobby: the picks are still there and can be changed. Rematch keeps them.
- [ ] **O5** In a 2v2, all four players picking different variants: everyone sees everyone's spells, no errors.
- [ ] **O6** The spellbook modal opens above the lobby and closes back to it. Picks made in the menu before creating a
      room are sent when the lobby opens.
- [ ] **O7** Server health with variants flying: `<slot URL>/stats` still shows `lastSecond.ticks` near 60.

## 41. [0.12.3] Very high health option (two browser windows)

- [ ] **H1** The lobby has a **HEALTH** setting (Normal 200, Very high 1000). The host can change it; the guest sees it
      but cannot.
- [ ] **H2** Pick Very high, START. Both HP readouts start at 1000 and the rival label reads `/1000`; health bars start
      full and shrink in proportion as you are hit. A heal restores a quarter of 1000, not of 200.
- [ ] **H3** In a team match everyone starts at 1000; with the respawn rule a returning wizard comes back at 1000.
- [ ] **H4** Go back to the lobby and rematch: the setting is kept. Set it back to Normal: back to 200.

## 42. [0.12.7] Water Surge (replaced Water Bullet)

- [ ] **W1** Pick Water Surge, **DUEL AI** (or an online room) and stand near the target. Click: a ring of water grows out
      from you and fades, and a second cast only works about 5 seconds later. The UI shows no Water cooldown.
- [ ] **W2** The target is hurled back a very long way (about 330 px) when the ring reaches them, ends up at about 75% wet (the wet meter), and
      takes no damage. A target out of the ring's reach, behind a pillar or inside a bubble is untouched, and one holding a
      water shield is neither soaked nor pushed.
- [ ] **W3** A Lightning hit right after a Water Surge does extra ELECTROCUTION damage.
- [ ] **W4** Set yourself on fire (stand in a Fire spray or Lava) and cast Water Surge: your own fire goes out.

## 43. [0.12.5] Pebble Flurry, lightning and wall fixes

- [ ] **F1** Pick Pebble Flurry (Earth), hold the button at a close target. Stones fly fast and hit hard for 1.5 seconds
      (about 12 damage each), then stop even if you keep holding. A ring under your health bar empties over those 1.5 seconds,
      and the other player sees it too.
- [ ] **F2** You can't start another flurry for about 5 seconds. Letting go early also starts the 5 second wait.
- [ ] **F3** Online, cast plain Lightning and hold: you see every bolt you cast, as often as the other player sees them.
- [ ] **F4** On any arena map, walk straight up between the top pillars: you can go past the line of the pillars, nearly to
      the top edge of the floor, and the wall now follows the edge of the floor.

## 44. [0.12.6] Bubble reflections online (two browser windows)

- [ ] **B1** One player raises a Bubble (Space twice); the other fires a projectile at it (Steam, Magma or any bolt). The
      shot stops at the bubble's edge with the purple bounce effect and comes back. Neither player ever sees it cross
      the bubble first. Check from both windows.
- [ ] **B2** Aim straight at the bubble owner: the reflected shot returns along its path and hurts the caster (their HP drops
      once, when it reaches them, not before).
- [ ] **B3** A Pyrodisk thrown out of your own bubble leaves it; one thrown at an enemy bubble is reflected off its edge like any
      other shot, flies back out, and can hit the one who threw it (not the bubble's owner). It then simply
      ends at the end of its reach: it never turns back to the bubble.
- [ ] **B4** Both players see a reflected projectile all the way back, the bubble's owner as well as the caster; it never vanishes
      for one of them.

## 45. [0.12.7] Thundercloud (a moving cloud) and Gale Force removed

- [ ] **T1** Pick Thundercloud (Storm), load Water + Lightning (2, 3) and click. A dark cloud with flashes of lightning appears
      where you aimed (no further than a few hundred pixels) and drifts toward the nearest enemy at half their walking speed.
- [ ] **T2** Anyone under the cloud is struck about every half second: small damage and the Static bar fills (and discharges).
      Teammates and you are struck too if you stand under it, friendly fire or not; it never chases them. It fades after about 5 seconds; a second cast within 8 seconds does nothing.
- [ ] **T3** Gale Force is gone from the spellbook: Storm offers only Storm Shot and Thundercloud.
- [ ] **T4** Online, the other player sees the cloud move and the strikes, from both windows.

## 46. [0.12.10] Nine variants removed

- [ ] **R1** The spellbook has no Lightning or Steam entries. Fire offers Fireball and Pyrodisk, Water Water Surge, Earth
      Pebble Flurry, Magma Lava Pool, Ice Frost Shards, Plasma Plasma Beam, Storm Thundercloud, Magnetic Magnetic Pull.
      None of Stone Lance, Chain Lightning, Static Discharge, Scalding Mist, Steam Burst, Unstable Orb, Molten Shrapnel,
      Glacial Spike or Iron Swarm appear anywhere.
- [ ] **R2** Each remaining variant still casts and looks right, solo and online.
- [ ] **R3** Plain Lightning and plain Steam work as the originals.

## 47. [0.12.11] Knockback glide and the bubble tap (two browser windows)

- [ ] **K1** Get hit by an opponent's Water Surge (stand within its reach, not in a bubble). On your own screen you slide away
      quickly; you never blink to the end spot. The other player sees the same slide.
- [ ] **K2** Press 1, Space, 2, Space quickly: two shields (the second replaces the first) and no bubble; the bubble cooldown
      stays READY. Space, Space still casts the bubble, even with a WASD key pressed between.
- [ ] **K3** Get silenced (Plasma Overcharge to 100): load an element and press Space. No shield appears, the element stays
      loaded, and Space works again once SILENCED is gone. A frozen wizard can still shield.

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


## Flamethrower visual refinement [0.12.17-0, Mark, 2026-10-17]

- [ ] **FLAME-1:** On the `test` slot, cast Flamethrower. **Expect:** tapered pointed flame tongues rather than ovals, predominantly dark orange, with fewer rich-yellow and some dark-red tongues.
- [ ] **FLAME-2:** Fire while turning and moving. **Expect:** widened visible cone still points along the cast, with no noticeable increase in particles or frame stutter.
- [ ] **FLAME-3:** Hit a training dummy at the cone's centre and edge. **Expect:** damage, attack range and hit behaviour unchanged from before the cosmetic update.
- [ ] **FLAME-4:** Repeat online with a second player. **Expect:** both players see the same palette and direction, with no gameplay difference. Also run section 7 regression.

## Flamethrower three-shape blend [0.12.17-0, Mark, 2026-10-17]

- [ ] **FLAME-5:** Cast Flamethrower on test. **Expect:** pointed tongues, ovals and small circles all visible, each approximately one-third of the stream; orange/yellow/red palette unchanged.
- [ ] **FLAME-6:** Move and rotate while casting, including online. **Expect:** same wide cone and particle density, unchanged damage and hit detection. Run section 7 regression.

## Flamethrower triangle refinement [0.12.17-0, Mark, 2026-10-17]

- [ ] **FLAME-7:** Cast Flamethrower on test. **Expect:** roughly one-third each small triangles, ovals and small circles; no teardrops.
- [ ] **FLAME-8:** Check movement, colour balance, cone and dummy damage. **Expect:** unchanged except triangle shapes; run section 7 regression.

## Flamethrower impact palette [0.12.17-0, Mark, 2026-10-17]

- [ ] **FLAME-9:** Hit a dummy with Flamethrower. **Expect:** direct impact splash includes dark orange, rich yellow and dark red, with the same number of particles as before.
- [ ] **FLAME-10:** Observe burn after the direct hit and check damage; repeat online. **Expect:** burn behaviour, damage and other effects unchanged; run section 7 regression.

## Direct FIRE damage splash correction [0.12.17-0, Mark, 2026-10-17]

- [ ] **FLAME-11:** Hit a dummy with Flamethrower. **Expect:** existing seven small round direct-hit particles use orange, yellow and dark red; no extra splash.
- [ ] **FLAME-12:** Watch the burn/ignite effect separately. **Expect:** its original appearance restored; same hit damage and cone. Run section 7 regression and online test.

## Steam Shot vapour visuals [0.12.17-0, Mark, 2026-10-17]

- [ ] **STEAM-V1:** Cast Steam Shot in training mode. **Expect:** concentrated pale steam with animated curling wisps and trailing translucent vapour rather than isolated circles.
- [ ] **STEAM-V2:** Check movement, collision and impacts against dummy and obstacle. **Expect:** trajectory, hit detection, damage and original impact unchanged.
- [ ] **STEAM-V3:** Try Steam Shot with two players online and run section 7 regression. **Expect:** visual works for both clients without stuttering or gameplay changes.
