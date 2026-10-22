import { COL, WIZARD_HIT_RADIUS } from '../../constants';
import { dist } from '../../math';
import { SimState } from '../../simState';
import type { Zone } from '../../types';
import { SURGE, THUNDERCLOUD } from '../combat/areas';
import { blocked, damage, extinguish, hit, status } from '../combat/damage';
import { shove } from '../combat/knockback';
import { burst } from '../effects';
import { bubbleBetween, clear } from '../geometry';
import { WALK_SPEED } from '../movement';
import { nearestFoeTo, targetsOf, untouchable } from '../teams';
import { canSee } from '../vision';

/**
 * A Water Surge's ring grows and shoves each wizard it reaches, once, away from where it was cast.
 * Bubbles treat it like any other spell (docs/BUBBLES.md): the ring cannot cross a bubble edge, and
 * where it first touches one a new ring starts there (`surgeBounce`).
 */
function surgeStep(game: SimState, z: Zone, dt: number) {
  z.r = Math.min(SURGE.MAX_R, z.r + ((SURGE.MAX_R - SURGE.START_R) / (SURGE.LIFE - 3)) * dt);
  const reached = (z.hit ??= []);
  for (const target of targetsOf(game, z.owner, !!z.reflected)) {
    if (reached.includes(target.seat)) continue;
    const d = dist(z, target);
    if (d > z.r + WIZARD_HIT_RADIUS) continue;
    // a pillar or a bubble in the way stops the water from reaching them (for good)
    if (!clear(z, target, 8, game.map.obstacles) || bubbleBetween(game.bubbles, z, target))
      continue;
    reached.push(target.seat);
    if (blocked(game, target, 'WATER')) continue;
    extinguish(game, target);
    status(game, target, 'wet', SURGE.WET, 130, COL.WATER);
    shove(target, z, SURGE.KNOCKBACK);
    burst(game, target.x, target.y - 20, COL.WATER, 18, 5);
  }
  surgePushBombs(game, z);
  surgeBounce(game, z);
}

/** The ring shoves every bomb it sweeps over (once each) outward, unless a wall or bubble is in the way. */
function surgePushBombs(game: SimState, z: Zone) {
  const pushed = (z.pushed ??= []);
  for (const b of game.bombs) {
    if (b.dead || pushed.includes(b.id) || dist(z, b) > z.r) continue;
    if (!clear(z, b, 8, game.map.obstacles) || bubbleBetween(game.bubbles, z, b)) continue;
    pushed.push(b.id);
    // a speed, not a jump: `slideBomb` carries it away over the next ticks, like a shoved wizard
    const d = dist(z, b);
    b.kx = (b.kx ?? 0) + (d > 1 ? (b.x - z.x) / d : 1) * SURGE.BOMB_KNOCKBACK;
    b.ky = (b.ky ?? 0) + (d > 1 ? (b.y - z.y) / d : 0) * SURGE.BOMB_KNOCKBACK;
    burst(game, b.x, b.y, COL.WATER, 10, 4);
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
function surgeBounce(game: SimState, z: Zone) {
  const bounced = (z.bounced ??= []);
  for (const bubble of [...game.bubbles]) {
    if (bounced.includes(bubble)) continue;
    const d = dist(z, bubble);
    const inside = d < bubble.r;
    // the ring first touches the edge here: the gap (cast outside) or what is left to the wall (inside)
    if (z.r < (inside ? bubble.r - d : d - bubble.r)) continue;
    bounced.push(bubble);
    if (game.zones.filter((o) => o.chain === z.chain).length >= SURGE.MAX_RINGS) continue;
    // the point of contact is on the line through the bubble's centre and the ring's centre; a ring
    // centred exactly on a bubble meets the whole wall at once, so the new one starts toward where
    // its caster faces
    const ux = d > 0.001 ? (z.x - bubble.x) / d : Math.cos(z.owner.face),
      uy = d > 0.001 ? (z.y - bubble.y) / d : Math.sin(z.owner.face);
    // start half a pixel on the side it came from, so it is not across the edge it bounced off
    const at = bubble.r + (inside ? -0.5 : 0.5);
    const x = bubble.x + ux * at,
      y = bubble.y + uy * at;
    game.zones.push({
      x,
      y,
      k: 'WATER',
      r: SURGE.START_R,
      owner: bubble.owner,
      life: SURGE.LIFE,
      tick: 0,
      hit: [],
      chain: z.chain,
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
function cloudStep(game: SimState, z: Zone, dt: number) {
  const foe = nearestFoeTo(game, z.owner.team, z, (w) => canSee(game.map, z.owner, w));
  if (foe) {
    const d = dist(z, foe);
    if (d > 6) {
      const step = Math.min(d, WALK_SPEED * THUNDERCLOUD.SPEED_FACTOR * dt);
      z.x += ((foe.x - z.x) / d) * step;
      z.y += ((foe.y - z.y) / d) * step;
    }
  }
  z.tick += dt;
  if (z.tick < THUNDERCLOUD.STRIKE_TICKS) return;
  z.tick = 0;
  for (const target of game.wizards) {
    if (untouchable(game, target) || dist(z, target) >= z.r + WIZARD_HIT_RADIUS) continue;
    game.events.push({
      type: 'lightning',
      x: z.x,
      y: z.y - 90,
      tx: target.x,
      ty: target.y,
      castOwner: z.owner.seat,
    });
    hit(game, target, 'STORM', THUNDERCLOUD.STRIKE_DAMAGE, false, false, 'thundercloud');
  }
}

/** Ages every zone and applies what it does: Water Surge rings, Thunderclouds, and the Magma and Storm pools. */
export function stepZones(game: SimState, dt: number) {
  for (let z of game.zones) {
    z.life -= dt;
    if (z.k === 'WATER') {
      surgeStep(game, z, dt);
      continue;
    }
    if (z.follow) {
      cloudStep(game, z, dt);
      continue;
    }
    z.tick += dt;
    if (z.tick >= 24) {
      z.tick = 0;
      for (const target of targetsOf(game, z.owner, true)) {
        if (dist(z, target) >= z.r + WIZARD_HIT_RADIUS) continue;
        if (z.k === 'MAGMA') {
          if (!target.shield || ![0, 3].includes(target.shield.type))
            damage(game, target, 4, COL.MAGMA);
        } else if (!blocked(game, target, 'STORM')) {
          status(game, target, 'stat', 13, 165, COL.STORM);
          if (target.stat >= 100) {
            target.stat = 0;
            damage(game, target, 18, COL.STORM);
          }
        }
      }
    }
  }
}
