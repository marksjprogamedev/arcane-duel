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

/** The moving training dummy wanders: a new heading every so often, and a turn when it is stuck on something. */
export function moveDummy(game: SimState, dt: number) {
  if (
    (game.mode === 'moving' || (game.mode === 'mortal' && game.dummyMoving)) &&
    game.respawn <= 0 &&
    !pinned(game.e)
  ) {
    game.dummyClock -= dt;
    if (game.dummyClock <= 0) {
      game.dummyAngle = simRand(game, 0, TAU);
      game.dummyClock = simRand(game, 50, 110);
    }
    let sp = 1.7 * (1 - (0.75 * game.e.chill) / 100),
      ox = game.e.x,
      oy = game.e.y;
    walk(
      game.e,
      Math.cos(game.dummyAngle) * sp * dt,
      Math.sin(game.dummyAngle) * sp * dt,
      game.map,
    );
    if (dist(game.e, { x: ox, y: oy }) < sp * dt * 0.4) {
      game.dummyAngle += simRand(game, 1.7, 3.5);
      game.dummyClock = simRand(game, 30, 60);
    }
  }
}

/** The duel AI (solo play against the computer): picks a spell, moves, and casts, bombs, shields and heals. */
export function duelAi(game: SimState, dt: number) {
  if (game.mode === 'duel') {
    game.aiClock -= dt;
    if (game.aiClock <= 0) {
      game.aiClock = simRand(game, 45, 80);
      game.aiSide = game.rng() < 0.5 ? -1 : 1;
      game.e.spell = Object.keys(COL)[Math.floor(simRand(game, 0, 10))] as SpellName;
      if (game.rng() < 0.25 && game.e.bombCD <= 0)
        bomb(game, game.e, game.p.x, game.p.y, game.e.spell);
      if (game.rng() < 0.2) shield(game, game.e, Math.floor(simRand(game, 0, 4)));
    }
    let d = dist(game.p, game.e) || 1,
      dx = (game.p.x - game.e.x) / d,
      dy = (game.p.y - game.e.y) / d;
    if (!pinned(game.e)) {
      let f = d > 235 ? 1 : d < 130 ? -1 : 0,
        sx = dx * f - dy * game.aiSide * 0.8,
        sy = dy * f + dx * game.aiSide * 0.8,
        l = Math.hypot(sx, sy) || 1;
      walk(
        game.e,
        (sx / l) * 2.3 * (1 - (0.75 * game.e.chill) / 100) * dt,
        (sy / l) * 2.3 * (1 - (0.75 * game.e.chill) / 100) * dt,
        game.map,
      );
    }
    if (game.e.hp < game.e.max * 0.48 && game.e.healCD <= 0 && game.rng() < 0.025)
      heal(game, game.e);
    if (d < 80 && game.e.swordCD <= 0 && game.e.cast <= 0) sword(game, game.e, game.p);
    if (game.e.cast <= 0 && game.e.swing <= 0) {
      if (cast(game, game.e, game.p.x, game.p.y, 1, game.e.spell))
        game.e.cast = isContinuousSpell(game.e.spell) ? 10 : simRand(game, 33, 52);
    }
  }
}
