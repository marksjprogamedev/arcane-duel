import { TEAM_RESPAWN_TICKS } from '../../constants';
import { SimState } from '../../simState';
import type { Wizard } from '../../types';
import { burst, float } from '../effects';
import { fall, make, startDeath } from '../wizard';

/** Starts the death sequence for any wizard whose HP ran out. Call after `update` returned true. */
export function resolveDeaths(game: SimState) {
  for (const w of game.wizards) {
    if (game.ending) return;
    if (w.fallen || w.hp > 0) continue;
    if (w === game.e && game.mode === 'mortal') {
      if (game.respawn <= 0) startDeath(game, w, true);
    } else if (w.seat === 0 || game.mode === 'duel' || game.mode === 'online') eliminate(game, w);
  }
}

/**
 * A wizard's health ran out. Elimination: they are out until the round ends, which happens when
 * their team has no one left. Respawn (team matches): the other team scores, the wizard comes back
 * after a delay, and the round ends when a team reaches the kill target. A duel is always one life.
 */
function eliminate(game: SimState, w: Wizard) {
  w.fallen = true;
  const { deathRule, teamSize, killTarget } = game.rules;
  if (deathRule === 'respawn' && teamSize > 1) {
    const scorer = w.team === 0 ? 1 : 0;
    if (++game.score[scorer] >= killTarget) startDeath(game, w, false);
    else {
      fall(game, w);
      w.returnIn = TEAM_RESPAWN_TICKS;
    }
  } else if (game.wizards.some((o) => o.team === w.team && !o.fallen)) fall(game, w);
  else startDeath(game, w, false);
}

/** A fallen wizard waiting to respawn counts down, then returns at their start with full health. */
export function tickRespawns(game: SimState, dt: number) {
  for (const w of game.wizards) {
    if (!w.fallen || w.returnIn <= 0) continue;
    w.returnIn -= dt;
    if (w.returnIn > 0) continue;
    const at = game.starts[w.seat];
    Object.assign(w, make(at.x, at.y, w.max, w.style, w.seat, w.team));
    burst(game, w.x, w.y - 20, '#4ade80', 35, 7);
    float(game, w.x, w.y - 80, 'RESPAWNED', '#4ade80');
  }
}

/** The training dummy is down: counts down to its respawn, then puts a fresh one at its spawn. */
export function respawnDummy(game: SimState, dt: number) {
  game.respawn -= dt;
  if (game.death) game.death.age += dt;
  if (game.respawn <= 0) {
    game.e = make(
      game.map.spawns.e.x,
      game.map.spawns.e.y,
      game.dummyHP,
      game.e.style,
      game.e.seat,
      game.e.team,
    );
    game.death = null;
    game.dummyClock = 60;
    burst(game, game.e.x, game.e.y - 20, '#4ade80', 35, 7);
    float(game, game.e.x, game.e.y - 80, 'RESPAWNED', '#4ade80');
  }
}
