import { POOL, SPELL_COLOR, WIZARD_HIT_RADIUS } from '../../constants';
import { dist } from '../../math';
import { SimState } from '../../simState';
import type { Zone } from '../../types';
import { SURGE, THUNDERCLOUD } from '../combat/areas';
import { blocked, damage, extinguish, hit, status } from '../combat/damage';
import { shove } from '../combat/knockback';
import { burst } from '../effects';
import { bubbleBetween, hasLineOfSight } from '../geometry';
import { WALK_SPEED } from '../movement';
import { nearestFoeTo, targetsOf, untouchable } from '../teams';
import { canSee } from '../vision';

/**
 * A Water Surge's ring grows and shoves each wizard it reaches, once, away from where it was cast.
 * Bubbles treat it like any other spell (docs/BUBBLES.md): the ring cannot cross a bubble edge, and
 * where it first touches one a new ring starts there (`surgeBounce`).
 */
function surgeStep(game: SimState, zone: Zone, dt: number) {
  zone.r = Math.min(SURGE.MAX_R, zone.r + ((SURGE.MAX_R - SURGE.START_R) / (SURGE.LIFE - 3)) * dt);
  const reached = (zone.hit ??= []);
  for (const target of targetsOf(game, zone.owner, !!zone.reflected)) {
    if (reached.includes(target.seat)) continue;
    const d = dist(zone, target);
    if (d > zone.r + WIZARD_HIT_RADIUS) continue;
    // a pillar or a bubble in the way stops the water from reaching them (for good)
    if (
      !hasLineOfSight(zone, target, 8, game.map.obstacles) ||
      bubbleBetween(game.bubbles, zone, target)
    )
      continue;
    reached.push(target.seat);
    if (blocked(game, target, 'WATER')) continue;
    extinguish(game, target);
    status(game, target, 'wet', SURGE.WET, 130, SPELL_COLOR.WATER);
    shove(target, zone, SURGE.KNOCKBACK);
    burst(game, target.x, target.y - 20, SPELL_COLOR.WATER, 18, 5);
  }
  surgePushBombs(game, zone);
  surgeBounce(game, zone);
}

/** The ring shoves every bomb it sweeps over (once each) outward, unless a wall or bubble is in the way. */
function surgePushBombs(game: SimState, zone: Zone) {
  const pushed = (zone.pushed ??= []);
  for (const bomb of game.bombs) {
    if (bomb.dead || pushed.includes(bomb.id) || dist(zone, bomb) > zone.r) continue;
    if (
      !hasLineOfSight(zone, bomb, 8, game.map.obstacles) ||
      bubbleBetween(game.bubbles, zone, bomb)
    )
      continue;
    pushed.push(bomb.id);
    // a speed, not a jump: `slideBomb` carries it away over the next ticks, like a shoved wizard
    const d = dist(zone, bomb);
    bomb.kx = (bomb.kx ?? 0) + (d > 1 ? (bomb.x - zone.x) / d : 1) * SURGE.BOMB_KNOCKBACK;
    bomb.ky = (bomb.ky ?? 0) + (d > 1 ? (bomb.y - zone.y) / d : 0) * SURGE.BOMB_KNOCKBACK;
    burst(game, bomb.x, bomb.y, SPELL_COLOR.WATER, 10, 4);
  }
}

/**
 * Where a growing ring first meets a bubble, a new ring starts. The ring that met it carries on
 * growing (it just cannot cross the edge), and the new one starts from the point of contact on the
 * side it came from, with the bubble's owner as its owner: it can shove the wizard who cast the
 * surge, and bounces off the other bubbles it meets in turn, so facing bubbles keep rings going
 * for as long as they stand.
 *
 * Each ring turns off each bubble once (its own `bounced` list, which starts with the bubble it was
 * born at), and one surge keeps at most `SURGE.MAX_RINGS` rings alive at a time, so overlapping
 * bubbles can never pile up rings without end.
 */
function surgeBounce(game: SimState, zone: Zone) {
  const bounced = (zone.bounced ??= []);
  for (const bubble of [...game.bubbles]) {
    if (bounced.includes(bubble)) continue;
    const d = dist(zone, bubble);
    const inside = d < bubble.r;
    // the ring first touches the edge here: the gap (cast outside) or what is left to the wall (inside)
    if (zone.r < (inside ? bubble.r - d : d - bubble.r)) continue;
    bounced.push(bubble);
    if (game.zones.filter((other) => other.chain === zone.chain).length >= SURGE.MAX_RINGS)
      continue;
    // the point of contact is on the line through the bubble's centre and the ring's centre; a ring
    // centred exactly on a bubble meets the whole wall at once, so the new one starts toward where
    // its caster faces
    const ux = d > 0.001 ? (zone.x - bubble.x) / d : Math.cos(zone.owner.face),
      uy = d > 0.001 ? (zone.y - bubble.y) / d : Math.sin(zone.owner.face);
    // start half a pixel on the side it came from, so it is not across the edge it bounced off
    const at = bubble.r + (inside ? -0.5 : 0.5);
    const x = bubble.x + ux * at,
      y = bubble.y + uy * at;
    game.zones.push({
      x,
      y,
      spell: 'WATER',
      r: SURGE.START_R,
      owner: bubble.owner,
      life: SURGE.LIFE,
      tick: 0,
      hit: [],
      chain: zone.chain,
      bounced: [bubble],
      reflected: true,
    });
    burst(game, x, y, '#c4b5fd', 10, 4);
  }
}

/**
 * A Thundercloud drifts after the enemy closest to the cloud itself (not to its caster), but strikes
 * whoever is beneath it: teammates and the caster too, friendly fire or not. It never seeks them out.
 * It only follows an enemy its caster can see themselves (fog of war): a teammate's sight does not count.
 */
function cloudStep(game: SimState, zone: Zone, dt: number) {
  const foe = nearestFoeTo(game, zone.owner.team, zone, (w) => canSee(game.map, zone.owner, w));
  if (foe) {
    const d = dist(zone, foe);
    if (d > 6) {
      const step = Math.min(d, WALK_SPEED * THUNDERCLOUD.SPEED_FACTOR * dt);
      zone.x += ((foe.x - zone.x) / d) * step;
      zone.y += ((foe.y - zone.y) / d) * step;
    }
  }
  zone.tick += dt;
  if (zone.tick < THUNDERCLOUD.STRIKE_TICKS) return;
  zone.tick = 0;
  for (const target of game.wizards) {
    if (untouchable(game, target) || dist(zone, target) >= zone.r + WIZARD_HIT_RADIUS) continue;
    game.events.push({
      type: 'lightning',
      x: zone.x,
      y: zone.y - 90,
      tx: target.x,
      ty: target.y,
      castOwner: zone.owner.seat,
    });
    hit(game, target, 'STORM', THUNDERCLOUD.STRIKE_DAMAGE, false, false, 'thundercloud');
  }
}

/** Ages every zone and applies what it does: Water Surge rings, Thunderclouds, and the Magma and Storm pools. */
export function stepZones(game: SimState, dt: number) {
  for (let zone of game.zones) {
    zone.life -= dt;
    if (zone.spell === 'WATER') {
      surgeStep(game, zone, dt);
      continue;
    }
    if (zone.spell === 'SMOKE') continue;
    if (zone.follow) {
      cloudStep(game, zone, dt);
      continue;
    }
    zone.tick += dt;
    if (zone.tick >= POOL.PULSE_TICKS) {
      zone.tick = 0;
      for (const target of targetsOf(game, zone.owner, true)) {
        if (dist(zone, target) >= zone.r + WIZARD_HIT_RADIUS) continue;
        if (zone.spell === 'MAGMA') {
          if (!target.shield || ![0, 3].includes(target.shield.type))
            damage(game, target, POOL.MAGMA_DAMAGE, SPELL_COLOR.MAGMA);
        } else if (!blocked(game, target, 'STORM')) {
          status(
            game,
            target,
            'static',
            POOL.STORM_STATIC,
            POOL.STORM_STATIC_DELAY,
            SPELL_COLOR.STORM,
          );
          if (target.static >= 100) {
            target.static = 0;
            damage(game, target, POOL.STORM_DISCHARGE_DAMAGE, SPELL_COLOR.STORM);
          }
        }
      }
    }
  }
}
