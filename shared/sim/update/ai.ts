import { COL } from '../../constants';
import { isContinuousSpell } from '../../charge';
import { dist, TAU } from '../../math';
import { SimState } from '../../simState';
import type { SpellName } from '../../types';
import { sword, heal, shield } from '../combat/abilities';
import { cast } from '../combat/cast';
import { bomb } from '../combat/projectiles';
import { walk } from '../geometry';
import { pinned } from '../movement';
import { simRand } from '../random';
import { soloOpponent, soloPlayer } from '../teams';

/** The moving training dummy wanders: a new heading every so often, and a turn when it is stuck on something. */
export function moveDummy(game: SimState, dt: number) {
  const dummy = soloOpponent(game);
  if (
    (game.mode === 'moving' || (game.mode === 'mortal' && game.dummyMoving)) &&
    game.respawn <= 0 &&
    !pinned(dummy)
  ) {
    game.dummyClock -= dt;
    if (game.dummyClock <= 0) {
      game.dummyAngle = simRand(game, 0, TAU);
      game.dummyClock = simRand(game, 50, 110);
    }
    let sp = 1.7 * (1 - (0.75 * dummy.chill) / 100),
      ox = dummy.x,
      oy = dummy.y;
    walk(dummy, Math.cos(game.dummyAngle) * sp * dt, Math.sin(game.dummyAngle) * sp * dt, game.map);
    if (dist(dummy, { x: ox, y: oy }) < sp * dt * 0.4) {
      game.dummyAngle += simRand(game, 1.7, 3.5);
      game.dummyClock = simRand(game, 30, 60);
    }
  }
}

/** The duel AI (solo play against the computer): picks a spell, moves, and casts, bombs, shields and heals. */
export function duelAi(game: SimState, dt: number) {
  const player = soloPlayer(game),
    dummy = soloOpponent(game);
  if (game.mode === 'duel') {
    game.aiClock -= dt;
    if (game.aiClock <= 0) {
      game.aiClock = simRand(game, 45, 80);
      game.aiSide = game.rng() < 0.5 ? -1 : 1;
      dummy.spell = Object.keys(COL)[Math.floor(simRand(game, 0, 10))] as SpellName;
      if (game.rng() < 0.25 && dummy.bombCD <= 0)
        bomb(game, dummy, player.x, player.y, dummy.spell);
      if (game.rng() < 0.2) shield(game, dummy, Math.floor(simRand(game, 0, 4)));
    }
    let d = dist(player, dummy) || 1,
      dx = (player.x - dummy.x) / d,
      dy = (player.y - dummy.y) / d;
    if (!pinned(dummy)) {
      let f = d > 235 ? 1 : d < 130 ? -1 : 0,
        sx = dx * f - dy * game.aiSide * 0.8,
        sy = dy * f + dx * game.aiSide * 0.8,
        l = Math.hypot(sx, sy) || 1;
      walk(
        dummy,
        (sx / l) * 2.3 * (1 - (0.75 * dummy.chill) / 100) * dt,
        (sy / l) * 2.3 * (1 - (0.75 * dummy.chill) / 100) * dt,
        game.map,
      );
    }
    if (dummy.hp < dummy.max * 0.48 && dummy.healCD <= 0 && game.rng() < 0.025) heal(game, dummy);
    if (d < 80 && dummy.swordCD <= 0 && dummy.cast <= 0) sword(game, dummy, player);
    if (dummy.cast <= 0 && dummy.swing <= 0) {
      if (cast(game, dummy, player.x, player.y, 1, dummy.spell))
        dummy.cast = isContinuousSpell(dummy.spell) ? 10 : simRand(game, 33, 52);
    }
  }
}
