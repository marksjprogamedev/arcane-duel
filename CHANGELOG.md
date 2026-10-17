# Changelog

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

## 0.12.20-2 - 2026-10-17 AWST - Plasma Bomb spin-up

Darkened the core, added a soft purple halo and smoothly accelerated its swirl and flare rotations as the existing fuse counts down. Rendering only.

## 0.12.20-1 - 2026-10-17 AWST - Swirling Plasma Bomb

Animated rotating plasma swirls and three small solar-flare arcs around the existing luminous core. Cosmetic only; no new simulated particles, changes to explosions or combat.

## 0.12.20-0 - 2026-10-17 AWST - Distinct Earth, Plasma and Steam Bomb artwork

Earth now has uneven rock facets, strata and moss; Plasma has a luminous core with energy filaments; Steam has a domed silver vessel and curling vapour. Render-only; explosions and mechanics unchanged.

## 0.12.19-5 - 2026-10-17 AWST - Natural Ice Bomb snowflakes

Removed the frosty ground patch and staggered five white/blue floating snowflakes with varied phases, speeds and lateral paths. Visual only.

## 0.12.19-4 - 2026-10-17 AWST - Glacial Ice Bomb ground frost

Added subtle ground frost under landed Ice Bombs and two more upward-drifting snowflakes, using alternating white and icy blue. Draw-only; no gameplay changes.

## 0.12.19-3 - 2026-10-17 AWST - Independent floating Ice Bomb flakes

Moved the three frost flakes outside the bomb wobble transform and enlarged them with smooth upward travel and gentle lateral drift. Visual only.

## 0.12.19-2 - 2026-10-17 AWST - Irregular faceted Ice Bomb

Made the ice silhouette a many-sided uneven polygon, clipping crystalline panels to the outline. The longer golden fuse and smoothly rising frost from the prior refinement are preserved. Visual-only, no gameplay changes.

## 0.12.19-0 - 2026-10-17 AWST - Frosted Ice Bomb artwork

Recreated the provided faceted ice sphere reference with pale-blue crystalline panels, golden fuse, and lightweight drifting snowy wisps/snowflake marks. Draw-only, no explosion or mechanics change.

## 0.12.18-2 - 2026-10-17 AWST - Centred Lightning Bomb emblem and metal texture

Centred the lightning emblem on its casing and added subtle metallic rim wear and scuffs. Visual only.

## 0.12.18-1 - 2026-10-17 AWST - Slimmer Lightning Bomb

Slimmed the bolt insignia and lightened the casing grey; no mechanics changed.

## 0.12.18-0 - 2026-10-17 AWST - Lightning Bomb fuse artwork

Lightning Bomb now has a dark cartoon bomb casing, a decorative short fuse and a bright yellow lightning emblem. Draw-only; no combat, timing, or other bomb changes.

## Mark, on 0.12.17-0 - 2026-10-17 AWST - Steam Shot swirling vapour visuals

Replaced Steam Shot's seven disconnected bright circles with a denser translucent silver-white
cloud, animated swirling lobes, faint curling wisps and a fading directional wake. Rendering only;
no changes to trajectory, damage, hitbox, effects, or network simulation.

## Mark, on 0.12.17-0 - 2026-10-17 AWST - Correct direct-hit splash colours

Restored the original ignite/burn burst, undoing the previous change to the wrong effect.
Recoloured the existing seven-circle FIRE damage-hit splash with orange, muted yellow and dark red.
No additional particle bursts, shape changes, or combat changes.

## Mark, on 0.12.17-0 - 2026-10-17 AWST - Multicolour Flamethrower impact splashes

The direct Flamethrower impact splash now alternates dark orange, deep yellow and dark red particles instead of using one orange colour. No particle-count, burn, hit-detection or damage changes.

## Mark, on 0.12.17-0 - 2026-10-17 AWST - Triangle Flamethrower accents

Changed only the pointed teardrop drawing to small directional triangles. Oval and circle particles, palette, particle count, cone and gameplay remain untouched.

## Mark, on 0.12.17-0 - 2026-10-17 AWST - Mixed Flamethrower particle shapes

Flamethrower now cycles among pointed tongues, oval embers and small circles, distributed as evenly
as possible across seven particles per burst. Palette, cone width, particle count and combat rules are unchanged.

## Mark, on 0.12.17-0 - 2026-10-17 AWST - Refined Flamethrower flame tongues

Flamethrower spray particles now render as pointed flame tongues rather than ovals. Deep-yellow particles are
reduced from 58% to 29%, replaced with dark red; dark orange remains the primary colour at 42%.
The wider cone, total particle count, damage, hit detection and range are unchanged. Cosmetic-only change on test.

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
