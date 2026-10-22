import { BOMB, COL, COMBO_DAMAGE } from '../../constants';
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
function slideBomb(game: SimState, b: Bomb, dt: number) {
  const kx = b.kx ?? 0,
    ky = b.ky ?? 0;
  if (Math.abs(kx) + Math.abs(ky) <= 0.15) {
    b.kx = b.ky = 0;
    return;
  }
  const from = { x: b.x, y: b.y };
  const to = clampToMap(game.map, b.x + kx * dt, b.y + ky * dt);
  let x = b.x,
    y = b.y;
  if (!solidAt(game.map.obstacles, to.x, y, 12)) x = to.x;
  else b.kx = 0;
  if (!solidAt(game.map.obstacles, x, to.y, 12)) y = to.y;
  else b.ky = 0;
  const crossing = bubbleCrossing(game.bubbles, from.x, from.y, x, y);
  if (crossing) {
    x = from.x + (x - from.x) * crossing.u;
    y = from.y + (y - from.y) * crossing.u;
    const bubble = crossing.bubble;
    const d = Math.hypot(x - bubble.x, y - bubble.y) || 1,
      nx = (x - bubble.x) / d,
      ny = (y - bubble.y) / d;
    const dot = (b.kx ?? 0) * nx + (b.ky ?? 0) * ny;
    b.kx = (b.kx ?? 0) - 2 * dot * nx;
    b.ky = (b.ky ?? 0) - 2 * dot * ny;
    b.owner = bubble.owner;
    burst(game, x, y, '#c4b5fd', 10, 4);
  }
  const dx = x - b.x,
    dy = y - b.y;
  b.x = x;
  b.y = y;
  b.sx += dx;
  b.sy += dy;
  b.tx += dx;
  b.ty += dy;
  const friction = Math.pow(0.82, dt);
  b.kx = (b.kx ?? 0) * friction;
  b.ky = (b.ky ?? 0) * friction;
}

/** A bomb going off. */
function explode(game: SimState, b: Bomb) {
  if (b.k === 'MAGNETIC') {
    game.events.push({
      type: 'magnetic_implosion',
      x: b.x,
      y: b.y,
      castOwner: b.owner.seat,
    });
  } else {
    // Dedicated visual palette marker for Firebomb; same burst count and strength.
    burst(
      game,
      b.x,
      b.y,
      b.k === 'FIRE'
        ? '#firebomb-blast'
        : b.k === 'WATER'
          ? '#waterbomb-blast'
          : b.k === 'PLASMA'
            ? '#plasmabomb-blast'
            : b.k === 'ICE'
              ? '#icebomb-blast'
              : COL[b.k],
      45,
      8,
    );
  }
  for (const target of targetsOf(game, b.owner, true)) {
    const radius = b.k === 'MAGNETIC' ? BOMB.MAGNETIC_RADIUS : 100;
    const distance = dist(b, target);
    if (distance < radius) {
      // Only the magnetic bomb trades damage for a larger gravity-like pull.
      const damageAmount = (COMBO_DAMAGE[b.k] || 18) * 2.5 * (b.k === 'MAGNETIC' ? 0.65 : 1);
      hit(game, target, b.k, damageAmount, false, true);
      if (shieldStops(target, b.k)) continue;
      if (b.k === 'MAGNETIC') pull(target, b);
      if (b.k === 'WATER') shove(target, b, BOMB.WATER_KNOCKBACK, BOMB.WATER_GLIDE_TICKS);
    }
  }
  if (b.k === 'STORM')
    game.zones.push({ x: b.x, y: b.y, k: 'STORM', r: 75, owner: b.owner, life: 175, tick: 0 });
  b.dead = true;
}

/** Flies, lands and fuses every bomb; a bomb whose fuse runs out goes off. */
export function stepBombs(game: SimState, dt: number) {
  for (let b of game.bombs) {
    slideBomb(game, b, dt);
    if (!b.landed) {
      const ox = b.x,
        oy = b.y;
      b.u += dt / b.flight;
      let u = Math.min(1, b.u);
      b.x = b.sx + (b.tx - b.sx) * u;
      b.y = b.sy + (b.ty - b.sy) * u;
      // A bomb meeting a bubble's edge is turned back like any projectile (docs/BUBBLES.md).
      const crossing = bubbleCrossing(game.bubbles, ox, oy, b.x, b.y);
      if (crossing) {
        b.x = ox + (b.x - ox) * crossing.u;
        b.y = oy + (b.y - oy) * crossing.u;
        reflectBomb(b, crossing.bubble, game.map);
        burst(game, b.x, b.y, '#c4b5fd', 10, 4);
      } else if (u >= 1) b.landed = true;
    } else {
      b.fuse -= dt;
      if (b.fuse <= 0) explode(game, b);
    }
  }
}
