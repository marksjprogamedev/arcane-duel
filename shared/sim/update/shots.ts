import {
  COL,
  MAGMA_OWNER_GRACE_TICKS,
  MAGMA_SHOT_LIFE,
  PYRO_DISC_REACH,
  WIZARD_HIT_RADIUS,
} from '../../constants';
import { dist } from '../../math';
import { SimState } from '../../simState';
import type { BoltShot, Bubble, Shot, Wizard } from '../../types';
import { crater } from '../combat/areas';
import { hit } from '../combat/damage';
import { reflect } from '../combat/reflect';
import { burst } from '../effects';
import { bubbleCrossing, ray, segmentCircleHit } from '../geometry';
import { WALK_SPEED } from '../movement';
import { nearestFoe, targetsOf, untouchable } from '../teams';

/**
 * The first thing a projectile met on its way from (ox, oy) to where it is now: one of the
 * `targets`, a pillar, or nothing. Checks the whole travelled segment, not just the end point, so a
 * pillar in front of a wizard intercepts it. On contact the projectile stops at the contact point.
 */
function firstContact(
  game: SimState,
  s: Shot,
  ox: number,
  oy: number,
  targets: Wizard[],
  wallMargin: number,
  canHitWizard: boolean,
): Wizard | 'wall' | null {
  const wall = ray(ox, oy, s.x, s.y, wallMargin, game.map.obstacles);
  let struck: Wizard | null = null;
  let wizardAt: number | null = null;
  if (canHitWizard)
    for (const target of targets) {
      if (untouchable(game, target)) continue;
      const at = segmentCircleHit(ox, oy, s.x, s.y, target.x, target.y, s.r + WIZARD_HIT_RADIUS);
      if (at !== null && (wizardAt === null || at < wizardAt)) {
        wizardAt = at;
        struck = target;
      }
    }
  if (struck && wizardAt !== null && (!wall || wizardAt < wall.u)) {
    s.x = ox + (s.x - ox) * wizardAt;
    s.y = oy + (s.y - oy) * wizardAt;
    s.life = 0;
    return struck;
  }
  if (wall) {
    s.x = wall.x;
    s.y = wall.y;
    s.life = 0;
    return 'wall';
  }
  return null;
}

/**
 * Whether a projectile is far enough from its owner to hurt them. Beyond the hit circle by two
 * walking steps: the owner has already moved this tick, so with less room a wizard running the way
 * they fired is back inside the circle when the next tick sweeps the projectile.
 */
function hasLeftOwner(s: Shot): boolean {
  return dist(s, s.owner) > s.r + WIZARD_HIT_RADIUS + 2 * WALK_SPEED;
}

/** Who a projectile can hurt: its owner's foes, and the owner too once it has left them. */
function victims(game: SimState, s: Shot): Wizard[] {
  return targetsOf(game, s.owner, !!s.ownerClear);
}

/**
 * If the step (ox, oy) -> (s.x, s.y) crossed a bubble edge, cuts the step short at the edge and
 * returns the bubble. The caller still checks what lies before that point, then bounces.
 */
function stopAtBubble(game: SimState, s: Shot, ox: number, oy: number) {
  const crossing = bubbleCrossing(game.bubbles, ox, oy, s.x, s.y);
  if (!crossing) return null;
  s.x = ox + (s.x - ox) * crossing.u;
  s.y = oy + (s.y - oy) * crossing.u;
  return crossing.bubble;
}

/** Sends a Pyrodisk back to its caster, with extra travel and life for the trip home. */
function startDiscReturn(s: BoltShot) {
  s.returning = true;
  s.maxTravel += 1200;
  s.life = Math.max(s.life, 120);
  s.ownerClear = true;
}

function bounce(game: SimState, s: Shot, bubble: Bubble) {
  reflect(s, bubble, game.map);
  burst(game, s.x, s.y, '#c4b5fd', 10, 4);
}

/** Moves every projectile one step: steering, travel, bubbles, contact and the hit itself. */
export function stepShots(game: SimState, dt: number) {
  for (let s of game.shots) {
    if (s.magma === true) {
      let dx = s.tx - s.x,
        dy = s.ty - s.y,
        d = Math.hypot(dx, dy),
        step = 4 * dt,
        ox = s.x,
        oy = s.y,
        arrived = false;
      if (d <= step + 1) {
        s.x = s.tx;
        s.y = s.ty;
        arrived = true;
      } else {
        s.x += (dx / d) * step;
        s.y += (dy / d) * step;
        s.life -= dt;
      }
      const bubble = stopAtBubble(game, s, ox, oy);
      const contact = firstContact(game, s, ox, oy, victims(game, s), 8, true);
      if (!contact && bubble) {
        bounce(game, s, bubble);
        arrived = false;
      }
      // Magma is slower than a walking caster, so it can't always get clear of them: after a short
      // grace it can hurt them anyway.
      if (!s.ownerClear && (hasLeftOwner(s) || s.life <= MAGMA_SHOT_LIFE - MAGMA_OWNER_GRACE_TICKS))
        s.ownerClear = true;
      if (arrived) s.life = 0;
      s.trail += dt;
      if (s.trail >= 2) {
        s.trail = 0;
        game.events.push({ type: 'magma_trail', x: s.x, y: s.y, vx: s.vx, vy: s.vy });
      }
      if (contact && contact !== 'wall' && !s.hitTargets.has(contact)) {
        s.hitTargets.add(contact);
        hit(game, contact, 'MAGMA', s.damage);
        s.life = 0;
      }
      if (s.life <= 0) {
        // Exploding for any reason ends the caster's immunity: a point-blank hit catches them too.
        if (!s.hitTargets.has(s.owner) && dist(s, s.owner) < s.r + WIZARD_HIT_RADIUS) {
          s.hitTargets.add(s.owner);
          hit(game, s.owner, 'MAGMA', s.damage);
        }
        crater(game, s.x, s.y, s.owner);
      }
      continue;
    }
    const target = nearestFoe(game, s.owner);
    if (target && target.mag > 0) {
      let d = dist(s, target) || 1,
        sp = Math.hypot(s.vx, s.vy),
        turn = ((0.013 * target.mag) / 100) * dt,
        ux = (s.vx / sp) * (1 - turn) + ((target.x - s.x) / d) * turn,
        uy = (s.vy / sp) * (1 - turn) + ((target.y - s.y) / d) * turn,
        l = Math.hypot(ux, uy) || 1;
      s.vx = (ux / l) * sp;
      s.vy = (uy / l) * sp;
    }
    if (s.variant === 'pyro_disc' && s.returning) {
      const dx = s.owner.x - s.x,
        dy = s.owner.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      s.vx = (dx / d) * 11;
      s.vy = (dy / d) * 11;
      if (d < 25) {
        s.life = 0;
        continue;
      }
    }
    let ox = s.x,
      oy = s.y,
      step = Math.hypot(s.vx, s.vy) * dt,
      remaining = s.maxTravel - s.travel,
      mult = remaining < step ? Math.max(0, remaining / Math.max(step, 0.001)) : 1;
    s.x += s.vx * dt * mult;
    s.y += s.vy * dt * mult;
    s.travel += step * mult;
    s.life -= dt;
    s.trail += dt;
    if (s.trail > 3 && ['STEAM', 'PLASMA', 'STORM', 'ICE', 'MAGNETIC'].includes(s.k)) {
      s.trail = 0;
      game.events.push({ type: 'bolt_trail', x: s.x, y: s.y, spell: s.k });
    }
    if (s.variant === 'pyro_disc') {
      // Any bubble (enemy, ally or its own caster's) stops the disc at its edge, before any wizard inside is checked.
      const bubbleStop = bubbleCrossing(game.bubbles, ox, oy, s.x, s.y);
      if (bubbleStop) {
        s.x = ox + (s.x - ox) * bubbleStop.u;
        s.y = oy + (s.y - oy) * bubbleStop.u;
      }
      // The disc passes through wizards rather than stopping on contact: up to two hits on each.
      // Count a hit only on entry; overlap across successive frames is not another hit.
      const radius = s.r + WIZARD_HIT_RADIUS;
      const wasInside = s.discInside ?? [];
      const nowInside: number[] = [];
      const hits = (s.discHits ??= {});
      // once a bubble has turned it round, its caster can be hurt too (like any reflected shot)
      for (const foe of targetsOf(game, s.owner, !!s.reflected)) {
        const dx = s.x - foe.x,
          dy = s.y - foe.y;
        const inside = dx * dx + dy * dy <= radius * radius;
        const crossing = segmentCircleHit(ox, oy, s.x, s.y, foe.x, foe.y, radius) !== null;
        if (inside) nowInside.push(foe.seat);
        if (!wasInside.includes(foe.seat) && (inside || crossing) && (hits[foe.seat] ?? 0) < 2) {
          hit(game, foe, s.k, s.damage, s.charged, false, s.variant);
          hits[foe.seat] = (hits[foe.seat] ?? 0) + 1;
        }
      }
      s.discInside = nowInside;
      const wall = ray(ox, oy, s.x, s.y, s.r * 0.6, game.map.obstacles);
      if (bubbleStop) {
        // Like any projectile it is reflected: it now belongs to the bubble's owner, flies out again
        // from the edge, and can hurt the one who threw it. It starts a new outward flight.
        bounce(game, s, bubbleStop.bubble);
        s.returning = false;
        s.maxTravel = PYRO_DISC_REACH;
        s.discHits = {};
        s.discInside = [];
      } else if (wall) {
        // Any obstacle (the map edge is not one) sends an outbound disc home; a returning disc is lost.
        s.x = ox;
        s.y = oy;
        burst(game, wall.x, wall.y, COL[s.k], 8, 3);
        if (s.returning || s.reflected) s.life = 0;
        else startDiscReturn(s);
      }
    } else {
      const bubble = stopAtBubble(game, s, ox, oy);
      const contact = firstContact(game, s, ox, oy, victims(game, s), s.r * 0.6, s.life > 0);
      if (contact === 'wall') {
        burst(game, s.x, s.y, COL[s.k], 12, 4);
      } else if (contact) {
        hit(game, contact, s.k, s.damage, s.charged, false, s.variant, s.power);
        if (['ICE', 'PLASMA', 'MAGNETIC'].includes(s.k)) burst(game, s.x, s.y, COL[s.k], 22, 7);
      } else if (bubble) bounce(game, s, bubble);
    }
    if (!s.ownerClear && hasLeftOwner(s)) s.ownerClear = true;
    // (a reflected disc is not coming back: it belongs to the bubble's owner now and just ends)
    if (s.variant === 'pyro_disc' && !s.returning && !s.reflected && s.travel >= s.maxTravel - 0.01)
      startDiscReturn(s);
    if (s.travel >= s.maxTravel - 0.01) {
      s.life = 0;
      burst(game, s.x, s.y, COL[s.k], 10, 3);
    }
  }
}
