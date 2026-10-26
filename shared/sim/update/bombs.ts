import { BOMB, SPELL_COLOR, COMBO_DAMAGE } from '../../constants';
import { dist } from '../../math';
import { SimState } from '../../simState';
import type { Bomb } from '../../types';
import { hit, shieldStops } from '../combat/damage';
import { pull, shove } from '../combat/knockback';
import { reflectBomb } from '../combat/reflect';
import { burst } from '../effects';
import { bubbleCrossing, clampToMap } from '../geometry';
import { solidAt } from '../obstacles';
import { targetsOf } from '../teams';

/**
 * Slides a bomb along the speed a Water Surge gave it, which fades as a wizard's knockback does. A
 * bomb in flight keeps its arc (the whole throw moves with it), a wall stops that axis, and a bubble
 * edge turns it back like any other bomb (docs/BUBBLES.md).
 */
function slideBomb(game: SimState, bomb: Bomb, dt: number) {
  const kx = bomb.kx ?? 0,
    ky = bomb.ky ?? 0;
  if (Math.abs(kx) + Math.abs(ky) <= 0.15) {
    bomb.kx = bomb.ky = 0;
    return;
  }
  const from = { x: bomb.x, y: bomb.y };
  const to = clampToMap(game.map, bomb.x + kx * dt, bomb.y + ky * dt);
  let x = bomb.x,
    y = bomb.y;
  if (!solidAt(game.map.obstacles, to.x, y, 12)) x = to.x;
  else bomb.kx = 0;
  if (!solidAt(game.map.obstacles, x, to.y, 12)) y = to.y;
  else bomb.ky = 0;
  const crossing = bubbleCrossing(game.bubbles, from.x, from.y, x, y);
  if (crossing) {
    x = from.x + (x - from.x) * crossing.u;
    y = from.y + (y - from.y) * crossing.u;
    const bubble = crossing.bubble;
    const d = Math.hypot(x - bubble.x, y - bubble.y) || 1,
      nx = (x - bubble.x) / d,
      ny = (y - bubble.y) / d;
    const dot = (bomb.kx ?? 0) * nx + (bomb.ky ?? 0) * ny;
    bomb.kx = (bomb.kx ?? 0) - 2 * dot * nx;
    bomb.ky = (bomb.ky ?? 0) - 2 * dot * ny;
    bomb.owner = bubble.owner;
    burst(game, x, y, '#c4b5fd', 10, 4);
  }
  const dx = x - bomb.x,
    dy = y - bomb.y;
  bomb.x = x;
  bomb.y = y;
  bomb.sx += dx;
  bomb.sy += dy;
  bomb.tx += dx;
  bomb.ty += dy;
  const friction = Math.pow(0.82, dt);
  bomb.kx = (bomb.kx ?? 0) * friction;
  bomb.ky = (bomb.ky ?? 0) * friction;
}

/** A bomb going off. */
function explode(game: SimState, bomb: Bomb) {
  if (bomb.spell === 'MAGMA') {
    game.zones.push({
      x: bomb.x,
      y: bomb.y,
      spell: 'SMOKE',
      r: BOMB.SMOKE_RADIUS,
      owner: bomb.owner,
      life: BOMB.SMOKE_TICKS,
      tick: 0,
    });
    burst(game, bomb.x, bomb.y - 12, SPELL_COLOR.SMOKE, 34, 6);
    bomb.dead = true;
    return;
  }
  if (bomb.spell === 'MAGNETIC') {
    game.events.push({
      type: 'magnetic_implosion',
      x: bomb.x,
      y: bomb.y,
      castOwner: bomb.owner.seat,
    });
  } else {
    // Dedicated visual palette marker for Firebomb; same burst count and strength.
    burst(
      game,
      bomb.x,
      bomb.y,
      bomb.spell === 'FIRE'
        ? '#firebomb-blast'
        : bomb.spell === 'WATER'
          ? '#waterbomb-blast'
          : bomb.spell === 'PLASMA'
            ? '#plasmabomb-blast'
            : bomb.spell === 'ICE'
              ? '#icebomb-blast'
              : SPELL_COLOR[bomb.spell],
      45,
      8,
    );
  }
  for (const target of targetsOf(game, bomb.owner, true)) {
    const radius = bomb.spell === 'MAGNETIC' ? BOMB.MAGNETIC_RADIUS : BOMB.BLAST_RADIUS;
    const distance = dist(bomb, target);
    if (distance < radius) {
      // Only the magnetic bomb trades damage for a larger gravity-like pull.
      const damageAmount =
        (COMBO_DAMAGE[bomb.spell] || 18) *
        BOMB.DAMAGE_MULTIPLIER *
        (bomb.spell === 'MAGNETIC' ? 0.65 : 1);
      hit(game, target, bomb.spell, damageAmount, false, true);
      if (shieldStops(target, bomb.spell)) continue;
      if (bomb.spell === 'MAGNETIC') pull(target, bomb);
      if (bomb.spell === 'WATER') shove(target, bomb, BOMB.WATER_KNOCKBACK, BOMB.WATER_GLIDE_TICKS);
    }
  }
  if (bomb.spell === 'STORM')
    game.zones.push({
      x: bomb.x,
      y: bomb.y,
      spell: 'STORM',
      r: BOMB.STORM_POOL_RADIUS,
      owner: bomb.owner,
      life: BOMB.STORM_POOL_TICKS,
      tick: 0,
    });
  bomb.dead = true;
}

/** Flies, lands and fuses every bomb; a bomb whose fuse runs out goes off. */
export function stepBombs(game: SimState, dt: number) {
  for (let bomb of game.bombs) {
    slideBomb(game, bomb, dt);
    if (!bomb.landed) {
      const ox = bomb.x,
        oy = bomb.y;
      bomb.flightProgress += dt / bomb.flight;
      let u = Math.min(1, bomb.flightProgress);
      bomb.x = bomb.sx + (bomb.tx - bomb.sx) * u;
      bomb.y = bomb.sy + (bomb.ty - bomb.sy) * u;
      // A bomb meeting a bubble's edge is turned back like any projectile (docs/BUBBLES.md).
      const crossing = bubbleCrossing(game.bubbles, ox, oy, bomb.x, bomb.y);
      if (crossing) {
        bomb.x = ox + (bomb.x - ox) * crossing.u;
        bomb.y = oy + (bomb.y - oy) * crossing.u;
        reflectBomb(bomb, crossing.bubble, game.map);
        burst(game, bomb.x, bomb.y, '#c4b5fd', 10, 4);
      } else if (u >= 1) bomb.landed = true;
    } else {
      bomb.fuse -= dt;
      if (bomb.fuse <= 0) explode(game, bomb);
    }
  }
}
