import {
  SPELL_COLOR,
  MAGMA_OWNER_GRACE_TICKS,
  MAGMA_SHOT_LIFE,
  PROJECTILE_SPEED_MULT,
  PYRO_DISC_REACH,
  WIZARD_HIT_RADIUS,
} from '../../constants';
import { spellSolids } from '../../maps';
import { dist } from '../../math';
import { SimState } from '../../simState';
import type { BoltShot, Bubble, Shot, Wizard } from '../../types';
import { crater } from '../combat/areas';
import { hit } from '../combat/damage';
import { reflect } from '../combat/reflect';
import { burst } from '../effects';
import { bubbleCrossing, distToWizard, firstObstacleHit, segmentWizardHit } from '../geometry';
import { WALK_SPEED } from '../movement';
import { nearestFoe, targetsOf, untouchable } from '../teams';

/**
 * The first thing a projectile met on its way from (ox, oy) to where it is now: one of the
 * `targets`, a pillar, or nothing. Checks the whole travelled segment, not just the end point, so a
 * pillar in front of a wizard intercepts it. On contact the projectile stops at the contact point.
 */
function firstContact(
  game: SimState,
  shot: Shot,
  ox: number,
  oy: number,
  targets: Wizard[],
  wallMargin: number,
  canHitWizard: boolean,
): Wizard | 'wall' | null {
  const wall = firstObstacleHit(ox, oy, shot.x, shot.y, wallMargin, spellSolids(game.map));
  let struck: Wizard | null = null;
  let wizardAt: number | null = null;
  if (canHitWizard)
    for (const target of targets) {
      if (untouchable(game, target)) continue;
      const at = segmentWizardHit(
        ox,
        oy,
        shot.x,
        shot.y,
        target.x,
        target.y,
        shot.r + WIZARD_HIT_RADIUS,
      );
      if (at !== null && (wizardAt === null || at < wizardAt)) {
        wizardAt = at;
        struck = target;
      }
    }
  if (struck && wizardAt !== null && (!wall || wizardAt < wall.u)) {
    shot.x = ox + (shot.x - ox) * wizardAt;
    shot.y = oy + (shot.y - oy) * wizardAt;
    shot.life = 0;
    return struck;
  }
  if (wall) {
    shot.x = wall.x;
    shot.y = wall.y;
    shot.life = 0;
    return 'wall';
  }
  return null;
}

/**
 * Whether a projectile is far enough from its owner to hurt them. Beyond the hit circle by two
 * walking steps: the owner has already moved this tick, so with less room a wizard running the way
 * they fired is back inside the circle when the next tick sweeps the projectile.
 */
function hasLeftOwner(shot: Shot): boolean {
  return distToWizard(shot, shot.owner) > shot.r + WIZARD_HIT_RADIUS + 2 * WALK_SPEED;
}

/** Who a projectile can hurt: its owner's foes, and the owner too once it has left them. */
function victims(game: SimState, shot: Shot): Wizard[] {
  return targetsOf(game, shot.owner, !!shot.ownerClear);
}

/**
 * If the step (ox, oy) -> (s.x, s.y) crossed a bubble edge, cuts the step short at the edge and
 * returns the bubble. The caller still checks what lies before that point, then bounces.
 */
function stopAtBubble(game: SimState, shot: Shot, ox: number, oy: number) {
  const crossing = bubbleCrossing(game.bubbles, ox, oy, shot.x, shot.y);
  if (!crossing) return null;
  shot.x = ox + (shot.x - ox) * crossing.u;
  shot.y = oy + (shot.y - oy) * crossing.u;
  return crossing.bubble;
}

/** Sends a Pyrodisk back to its caster, with extra travel and life for the trip home. */
function startDiscReturn(shot: BoltShot) {
  shot.returning = true;
  shot.maxTravel += 1200;
  shot.life = Math.max(shot.life, 120);
  shot.ownerClear = true;
}

function bounce(game: SimState, shot: Shot, bubble: Bubble) {
  reflect(shot, bubble, game.map);
  burst(game, shot.x, shot.y, '#c4b5fd', 10, 4);
}

/** Moves every projectile one step: steering, travel, bubbles, contact and the hit itself. */
export function stepShots(game: SimState, dt: number) {
  for (let shot of game.shots) {
    if (shot.magma === true) {
      let dx = shot.tx - shot.x,
        dy = shot.ty - shot.y,
        d = Math.hypot(dx, dy),
        step = 4 * PROJECTILE_SPEED_MULT * dt,
        ox = shot.x,
        oy = shot.y,
        arrived = false;
      if (d <= step + 1) {
        shot.x = shot.tx;
        shot.y = shot.ty;
        arrived = true;
      } else {
        shot.x += (dx / d) * step;
        shot.y += (dy / d) * step;
        shot.life -= dt;
      }
      const bubble = stopAtBubble(game, shot, ox, oy);
      const contact = firstContact(game, shot, ox, oy, victims(game, shot), 8, true);
      if (!contact && bubble) {
        bounce(game, shot, bubble);
        arrived = false;
      }
      // Magma is slower than a walking caster, so it can't always get clear of them: after a short
      // grace it can hurt them anyway.
      if (
        !shot.ownerClear &&
        (hasLeftOwner(shot) || shot.life <= MAGMA_SHOT_LIFE - MAGMA_OWNER_GRACE_TICKS)
      )
        shot.ownerClear = true;
      if (arrived) shot.life = 0;
      shot.trail += dt;
      if (shot.trail >= 2) {
        shot.trail = 0;
        game.events.push({ type: 'magma_trail', x: shot.x, y: shot.y, vx: shot.vx, vy: shot.vy });
      }
      if (contact && contact !== 'wall' && !shot.hitTargets.has(contact)) {
        shot.hitTargets.add(contact);
        hit(game, contact, 'MAGMA', shot.damage);
        shot.life = 0;
      }
      if (shot.life <= 0) {
        // Exploding for any reason ends the caster's immunity: a point-blank hit catches them too.
        if (
          !shot.hitTargets.has(shot.owner) &&
          distToWizard(shot, shot.owner) < shot.r + WIZARD_HIT_RADIUS
        ) {
          shot.hitTargets.add(shot.owner);
          hit(game, shot.owner, 'MAGMA', shot.damage);
        }
        crater(game, shot.x, shot.y, shot.owner);
      }
      continue;
    }
    const target = nearestFoe(game, shot.owner);
    if (target && target.magnetized > 0) {
      let d = dist(shot, target) || 1,
        sp = Math.hypot(shot.vx, shot.vy),
        turn = ((0.052 * target.magnetized) / 100) * dt,
        ux = (shot.vx / sp) * (1 - turn) + ((target.x - shot.x) / d) * turn,
        uy = (shot.vy / sp) * (1 - turn) + ((target.y - shot.y) / d) * turn,
        length = Math.hypot(ux, uy) || 1;
      shot.vx = (ux / length) * sp;
      shot.vy = (uy / length) * sp;
    }
    if (shot.variant === 'pyro_disc' && shot.returning) {
      const dx = shot.owner.x - shot.x,
        dy = shot.owner.y - shot.y;
      const d = Math.hypot(dx, dy) || 1;
      shot.vx = (dx / d) * 11 * PROJECTILE_SPEED_MULT;
      shot.vy = (dy / d) * 11 * PROJECTILE_SPEED_MULT;
      if (d < 25) {
        shot.life = 0;
        continue;
      }
    }
    let ox = shot.x,
      oy = shot.y,
      step = Math.hypot(shot.vx, shot.vy) * dt,
      remaining = shot.maxTravel - shot.travel,
      mult = remaining < step ? Math.max(0, remaining / Math.max(step, 0.001)) : 1;
    shot.x += shot.vx * dt * mult;
    shot.y += shot.vy * dt * mult;
    shot.travel += step * mult;
    shot.life -= dt;
    shot.trail += dt;
    if (shot.trail > 3 && ['STEAM', 'PLASMA', 'STORM', 'ICE', 'MAGNETIC'].includes(shot.spell)) {
      shot.trail = 0;
      game.events.push({ type: 'bolt_trail', x: shot.x, y: shot.y, spell: shot.spell });
    }
    if (shot.variant === 'pyro_disc') {
      // Any bubble (enemy, ally or its own caster's) stops the disc at its edge, before any wizard inside is checked.
      const bubbleStop = bubbleCrossing(game.bubbles, ox, oy, shot.x, shot.y);
      if (bubbleStop) {
        shot.x = ox + (shot.x - ox) * bubbleStop.u;
        shot.y = oy + (shot.y - oy) * bubbleStop.u;
      }
      // The disc passes through wizards rather than stopping on contact: up to two hits on each.
      // Count a hit only on entry; overlap across successive frames is not another hit.
      const radius = shot.r + WIZARD_HIT_RADIUS;
      const wasInside = shot.discInside ?? [];
      const nowInside: number[] = [];
      const hits = (shot.discHits ??= {});
      // once a bubble has turned it round, its caster can be hurt too (like any reflected shot)
      for (const foe of targetsOf(game, shot.owner, !!shot.reflected)) {
        const inside = distToWizard(shot, foe) <= radius;
        const crossing = segmentWizardHit(ox, oy, shot.x, shot.y, foe.x, foe.y, radius) !== null;
        if (inside) nowInside.push(foe.seat);
        if (!wasInside.includes(foe.seat) && (inside || crossing) && (hits[foe.seat] ?? 0) < 2) {
          hit(game, foe, shot.spell, shot.damage, shot.charged, false, shot.variant);
          hits[foe.seat] = (hits[foe.seat] ?? 0) + 1;
        }
      }
      shot.discInside = nowInside;
      const wall = firstObstacleHit(ox, oy, shot.x, shot.y, shot.r * 0.6, spellSolids(game.map));
      if (bubbleStop) {
        // Like any projectile it is reflected: it now belongs to the bubble's owner, flies out again
        // from the edge, and can hurt the one who threw it. It starts a new outward flight.
        bounce(game, shot, bubbleStop.bubble);
        shot.returning = false;
        shot.maxTravel = PYRO_DISC_REACH;
        shot.discHits = {};
        shot.discInside = [];
      } else if (wall) {
        // Any obstacle (the map edge is not one) sends an outbound disc home; a returning disc is lost.
        shot.x = ox;
        shot.y = oy;
        burst(game, wall.x, wall.y, SPELL_COLOR[shot.spell], 8, 3);
        if (shot.returning || shot.reflected) shot.life = 0;
        else startDiscReturn(shot);
      }
    } else {
      const bubble = stopAtBubble(game, shot, ox, oy);
      const contact = firstContact(
        game,
        shot,
        ox,
        oy,
        victims(game, shot),
        shot.variant === 'pebbles' ? Math.max(6, shot.r * 0.6) : shot.r * 0.6,
        shot.life > 0,
      );
      if (contact === 'wall') {
        burst(game, shot.x, shot.y, SPELL_COLOR[shot.spell], 12, 4);
      } else if (contact) {
        hit(game, contact, shot.spell, shot.damage, shot.charged, false, shot.variant, shot.power);
        if (['ICE', 'PLASMA', 'MAGNETIC'].includes(shot.spell))
          burst(game, shot.x, shot.y, SPELL_COLOR[shot.spell], 22, 7);
      } else if (bubble) bounce(game, shot, bubble);
    }
    if (!shot.ownerClear && hasLeftOwner(shot)) shot.ownerClear = true;
    // (a reflected disc is not coming back: it belongs to the bubble's owner now and just ends)
    if (
      shot.variant === 'pyro_disc' &&
      !shot.returning &&
      !shot.reflected &&
      shot.travel >= shot.maxTravel - 0.01
    )
      startDiscReturn(shot);
    if (shot.travel >= shot.maxTravel - 0.01) {
      shot.life = 0;
      burst(game, shot.x, shot.y, SPELL_COLOR[shot.spell], 10, 3);
    }
  }
}
