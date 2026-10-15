# Manual test checklist: Arcane Duel, road to 1.0.0

**Living document.** Every feature on the road to 1.0.0 (`docs/MAPS-PLAN.md`) adds its manual test
items here, in a section tagged with the version that introduced it, and the "Tested version" line
below is bumped. Items from earlier versions stay, because they are the regression checks. Rule for
developers: a feature is not finished until its items are in this file.

**Tested version:** 0.5.2-0 (measured). Sections are tagged `[0.x.y]` with the version that added them.

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
> **guest** in the other.

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
- [ ] **S2** The version label (top corner and in the menu) reads the **Tested version** above (e.g. v0.5.2-0). If it
      shows something older, hard-refresh (Ctrl+Shift+R). If still wrong, stop and report: the deploy
      has not finished.
- [ ] **S3** Optional, for a technical check: open `<slot URL>/stats` in a third tab.
      Expect `"version": "Arcane Duel v0.5.2-0 measured"` and `"protocolVersion": 7`.

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

## 16. [0.4.1] Server-side culling (protocol 7). Needs two windows, Ruined Keep, online

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
- [ ] **C7** An old tab left open from before the deploy is told to refresh (protocol 7).

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
