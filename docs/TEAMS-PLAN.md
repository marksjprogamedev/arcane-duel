# Plan: team matches, 2v2 first, then 3v3 and 4v4 (toward 1.0.0)

Today a match is two wizards, `p` and `e`, and that is built into the simulation, the protocol, the
rooms and the client. This plan makes a match **N wizards in two teams**, keeps 1v1 working at every
step, and ships 2v2 first (`1.0.0-0`), then 3v3 (`1.1.0-0`) and 4v4 (`1.2.0-0`). It follows the shape of
`docs/MAPS-PLAN.md`: small steps, each shippable, each adding its manual tests to
`docs/TEST-CHECKLIST.md`.

## Decisions (made)

- **Versions continue the 0.x line.** Each stage below is a minor version (0.7, 0.8, 0.9, 0.10) and each
  step inside it a feature (`0.7.0-0`, `0.7.1-0`, ...). `1.0.0-0` is the release where 2v2 is playable
  (this replaces the earlier idea of calling the maps work 1.0.0, which was merged as 0.6.x); 3v3 is
  `1.1.0-0` and 4v4 `1.2.0-0`.

- **Humans only.** No AI teammates or fillers; AI as an input source stays a separate, later piece of
  work (and the AI can't path around walls yet).
- **Friendly fire is a lobby option** (`friendlyFire: boolean`, default off).
- **Death rule is a lobby option** (`deathRule: 'elimination' | 'respawn'`):
  - `elimination`: a dead wizard is out and spectates; the round ends when a team has no one left.
    This is today's one-life duel, extended to teams.
  - `respawn`: a dead wizard comes back after a delay at its team's spawn; the round ends when a team
    reaches a kill target (default 10; revisit when building).
- **Shared team vision** on maps with fog of war: you see what any teammate sees.
- Teams are two (A and B) of equal size; the room creator picks `teamSize` (1 to 4) in the lobby.
  Larger sizes unlock in later steps, but the code is written for N from the first step.

## Design

- **Seats, not `p` / `e`.** A match has `wizards: Wizard[]`, a wizard has a `seat` (0..N-1) and a `team`
  (0 or 1). Seats `0..T-1` are team A, `T..2T-1` team B. `WizardId` ('p' | 'e') becomes a seat number.
  To keep every step small, `game.p` and `game.e` stay for a while as aliases for seats 0 and 1 and
  are removed when the last user is gone.
- **Who hurts whom** is one function, `canHurt(game, from, to)` (enemies always, allies only with
  friendly fire). Every place that picks a "foe" or loops over targets (`update.ts`, `combat.ts`,
  bombs, zones, traps, beams) goes through it, and areas loop over all wizards.
- **Rules live in the match state** (`game.rules`: team size, friendly fire, death rule) so the sim
  stays pure and testable.
- **Per-viewer snapshots without the p/e swap.** A snapshot has `you` (your wizard, with cooldowns) and
  `others` (everyone else, each with `seat` and `team`), and owners are seat numbers, so the flipping
  code in `snapshot.ts` goes away. Allies are always sent; enemies, their shots and effects are culled
  by the **team's** sight (the union of its members' vision circles).
- **Spawns per team.** `MapDef.spawns` becomes a list of spawn points per team (and `maxTeamSize`);
  arenas stay 1v1-only at first (800x600 is too small), and the picker only offers a map when it
  fits the chosen team size. Sides still swap every other round.
- **Client.** The rival becomes a list: one interpolation history and one hidden/visible state per
  other wizard (`net.opponentSamples` and `net.opponentHidden` become per-seat), fog is a union of
  circles (an offscreen fog layer with a hole per teammate), the minimap shows allies always and
  enemies only when the team sees them, the HUD shows teammates' health, and a dead player's camera
  follows a living teammate.
- **Rooms.** `players` and `resumeTokens` become per-seat arrays, the lobby shows teams and seats (the
  creator can move players between teams), the match starts when every seat is filled. If a player
  drops, the match pauses for everyone for the grace period (10 s), as now; if they do not return the
  room closes (revisit after 1.0: let a team play on short-handed).
- **Protocol 8.** Seat-based `joined`, `lobby`, `start`, `death_start` and the new snapshot shape; old
  tabs are told to refresh as usual.
- **Cost.** A 4-player room means about twice the entities per snapshot. Fog culling already cuts it;
  measure with `tests/load.mjs` at each minor (extend it to 4 players per room) and only reach for
  delta or binary snapshots if the numbers ask for it.

## Rules for every step

- **1v1 never regresses.** The 1v1 tests and the solo modes (duel, training dummies) keep passing; solo
  stays seats 0 and 1.
- **Tests with the rules:** `canHurt`, death rules, win conditions, team vision, per-seat snapshots,
  lobby seat assignment, reconnect per seat, determinism and isolation with four wizards.
- **Measure before and after** each minor (`docs/ROADMAP.md`).
- **Coordinate with Mark.** The refactor touches `update.ts`, `combat.ts`, `actor.ts` and `hud.ts`,
  which Mark also edits. Before 0.7 starts, merge his `test` into `test-jesse` and ask him to keep
  edits to those files small (or on a branch off `main`) until 0.7.3 lands; then he merges back as
  usual (`docs/WORKFLOW.md`).

## 0.7 One match, N wizards (no behaviour change; 1v1 only)

- **0.7.0 Data model (done).** `SimState.wizards`, `Wizard.seat` / `team`, `game.rules`;
  `game.p` / `game.e` as aliases. All existing tests green.
- **0.7.1 Targeting (done).** `canHurt`, `targetsOf`, `nearestFoe`; replace every "the other wizard" in
  the sim; areas hit everyone they can.
  Areas hit all wizards in range that can be hurt.
- **0.7.2 Snapshot and protocol 8 (done).** `WizardId` becomes a seat number and `input` is indexed by seat;
  `you` / `others`, seat owners, no flipping; the server builds them
  per viewer; the client reads them with one other wizard (still 1v1).
- **0.7.3 Client for a list (done).** Render, interpolate, fog and HUD loop over other wizards; per-seat
  hidden state. Still 1v1 in play.

## 0.8 Teams in the sim, rooms and lobby

- **0.8.0 Spawns per team and N-wizard matches (done).** `MapDef.teamSpawns` (four slots per team on
  both battlegrounds, the right team a mirror of the left), `startPositions` and `maxTeamSize`;
  `resetMatch` starts `2 x teamSize` wizards with seats, teams, inputs and styles; the server runner takes
  the rules. Reordered from the first draft so rooms have something to start.
- **0.8.1 Seats in rooms (done).** Per-seat players, tokens, away timers and ready flags for `2 x teamSize`
  seats; the `teamSize` option; join fills the next free seat; start needs all seats filled; the start
  message carries the team size. Tests for join, leave, reconnect.
- **0.8.2 Lobby screen (done; starting a team match is switched off until 0.10).** Shows both teams with seat names, the creator can swap players between
  teams, the options (`teamSize`, `friendlyFire`, `deathRule`) on top of the map. Joiners see them
  read-only. The map picker greys out maps that don't fit the team size.

## 0.9 Team rules

- **0.9.0 Friendly fire** option wired through `canHurt` and every damaging effect; allies' healing and
  shields keep working.
- **0.9.1 Death and win rules.** `elimination` (per-wizard death, spectate, team out) and `respawn`
  (delay, spawn, kill count, end at the target). The one `Death` record becomes per wizard.
- **0.9.2 Team vision.** The server culls by the team's union of sight; allies are always sent.

## 0.10 Playing it

- **0.10.0 Client for teams.** Team colours and names over wizards, ally health in the HUD, scoreboard
  for `respawn`, spectator camera, fog layer with a hole per teammate, minimap with allies.
- **0.10.1 Hit arrow and effects** for team games (who hit you, ally spells in fog).
- **0.10.2 2v2 map.** Tune the Ruined Keep for four (or add a second battleground), and test it.
- **0.10.3 Measure.** Four-player load numbers, compared with 1v1 (`tests/load.mjs` with a team size).

`1.0.0-0` is the full 2v2 release. It is done when all of this works:

- The lobby is complete: room code, both teams with named seats, the creator moves players between
  teams, and the options (map, team size 1v1 or 2v2, friendly fire, death rule) with joiners seeing them
  read-only; the match starts when every seat is filled; rematch and back to lobby work for teams.
- 2v2 plays online on a battleground with shared team vision, spectating, both death rules and
  per-seat reconnect; 1v1 and the arenas are unchanged.
- The checklist covers all of it and has been run by two or more people, and the measurements are in
  `docs/ROADMAP.md`.

## 1.1 and 1.2 More players

- **Minor updates after the release:** **1.1.0 3v3** and **1.2.0 4v4** only unlock bigger team sizes in the
  lobby and add what they need: more spawns and bigger maps where needed, performance work if the measurements ask for it (cheaper snapshots, per-viewer culling by
  distance bands, delta format), and balance notes (spell spam in crowds, area spells vs allies).
- Each size gets its own checklist section and load numbers.

## Not in this plan

AI players or AI teammates, more than two teams, free-for-all, matchmaking or public lobbies, team chat
and pings (worth adding for 3v3 and up), letting a team play on short-handed after a disconnect (the
room closes as now), spectators who are not in the match.
