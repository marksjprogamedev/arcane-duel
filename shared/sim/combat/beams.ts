import { COL, COOLDOWN_TICKS } from '../../constants';
import { dist } from '../../math';
import { SimState } from '../../simState';
import type { Bubble, SpellName, TimerKey, Vec2, Wizard } from '../../types';
import { burst } from '../effects';
import { bubbleBetween, bubbleCrossing, clear, ray } from '../geometry';
import { targetsOf } from '../teams';
import { hit } from './damage';
import { launch } from './projectiles';

/** Distance to `target` and how far off the aim direction `a` it is (radians, signed). */
function aimTo(w: Vec2, target: Wizard, a: number) {
  const toward = Math.atan2(target.y - w.y, target.x - w.x);
  return { d: dist(w, target), diff: Math.atan2(Math.sin(toward - a), Math.cos(toward - a)) };
}

/** A beam turned back by a bubble: where it met the edge, and where its reflected leg ends. */
interface BeamBounce {
  bubble: Bubble;
  at: Vec2;
  end: Vec2;
}

/**
 * If the beam from `from` to `to` meets a bubble's edge, it bounces off like light off a mirror and
 * carries on in the mirrored direction (until a wall) for its whole length again (`fullLength`), however
 * far it had already come. The bubble's owner is then the one the reflected leg belongs to, so it can
 * hurt whoever fired it.
 */
export function bubbleBounce(
  game: SimState,
  from: Vec2,
  to: Vec2,
  fullLength: number,
): BeamBounce | null {
  const crossing = bubbleCrossing(game.bubbles, from.x, from.y, to.x, to.y);
  if (!crossing) return null;
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const dx = (to.x - from.x) / length,
    dy = (to.y - from.y) / length;
  const at = { x: from.x + dx * length * crossing.u, y: from.y + dy * length * crossing.u };
  const { bubble } = crossing;
  const away = Math.hypot(at.x - bubble.x, at.y - bubble.y) || 1;
  const nx = (at.x - bubble.x) / away,
    ny = (at.y - bubble.y) / away;
  const dot = dx * nx + dy * ny;
  let end = {
    x: at.x + (dx - 2 * dot * nx) * fullLength,
    y: at.y + (dy - 2 * dot * ny) * fullLength,
  };
  const wall = ray(at.x, at.y, end.x, end.y, 4, game.map.obstacles);
  if (wall) end = { x: wall.x, y: wall.y };
  return { bubble, at, end };
}
/** The nearest of `candidates` a beam from `origin` along `angle` reaches within `reach`, if any. */
export function nearestInBeam(
  game: SimState,
  origin: Vec2,
  angle: number,
  reach: number,
  cone: number,
  wallAt: Vec2 | null,
  candidates: Wizard[],
  ignoreBubbles: boolean,
  margin = 4,
) {
  const wallD = wallAt ? Math.hypot(wallAt.x - origin.x, wallAt.y - origin.y) : Infinity;
  let best: { target: Wizard; d: number } | null = null;
  for (const target of candidates) {
    const { d, diff } = aimTo(origin, target, angle);
    if (
      d < reach &&
      d < wallD &&
      Math.abs(diff) < cone &&
      clear(origin, target, margin, game.map.obstacles) &&
      (ignoreBubbles || !bubbleBetween(game.bubbles, origin, target)) &&
      (!best || d < best.d)
    )
      best = { target, d };
  }
  return best;
}
export function spray(game: SimState, w: Wizard, x: number, y: number, k: SpellName) {
  if (w.swing > 0 || w.freeze > 0 || w.silence > 0) return false;
  const a = Math.atan2(y - w.y, x - w.x);
  w.face = a;
  if (k === 'FIRE' || k === 'WATER') {
    let fire = k === 'FIRE',
      range = fire ? 300 : 350,
      cd: TimerKey = fire ? 'fireCD' : 'waterCD';
    if (w[cd] > 0) return false;
    w[cd] = fire ? COOLDOWN_TICKS.FIRE : COOLDOWN_TICKS.WATER;
    game.events.push({
      type: 'spray',
      wizard: w.seat,
      x,
      y,
      spell: k,
      castOwner: w.seat,
    });
    for (const target of targetsOf(game, w)) {
      const { d, diff } = aimTo(w, target, a);
      if (
        d < range &&
        Math.abs(diff) < (fire ? 0.34 : 0.16) &&
        clear(w, target, 12, game.map.obstacles) &&
        !bubbleBetween(game.bubbles, w, target)
      )
        hit(game, target, k, fire ? 2.2 : 1.5);
    }
    return true;
  }
  if (k === 'LIGHTNING') {
    if (w.lightCD > 0) return false;
    w.lightCD = COOLDOWN_TICKS.LIGHTNING;
    const damageDealt = (40 * COOLDOWN_TICKS.LIGHTNING) / 60;
    let end = { x: w.x + Math.cos(a) * 300, y: w.y + Math.sin(a) * 300 },
      b = ray(w.x, w.y, end.x, end.y, 3, game.map.obstacles);
    if (b) end = { x: b.x, y: b.y };
    // the bolt strikes the nearest wizard in its path
    const struck = nearestInBeam(game, w, a, 300, 0.25, null, targetsOf(game, w), false, 7);
    // nothing struck: a bubble in the way turns the bolt round
    const bounce = struck ? null : bubbleBounce(game, w, end, 300);
    if (struck) end = { x: struck.target.x, y: struck.target.y };
    else if (bounce) end = bounce.at;
    if (struck) hit(game, struck.target, k, damageDealt);
    game.events.push({
      type: 'lightning',
      x: w.x,
      y: w.y,
      tx: end.x,
      ty: end.y,
      castOwner: w.seat,
    });
    burst(game, end.x, end.y, COL.LIGHTNING, 12, 4, w.seat);
    if (bounce) {
      // the reflected bolt is the bubble owner's: it can strike whoever fired it
      const back = Math.atan2(bounce.end.y - bounce.at.y, bounce.end.x - bounce.at.x);
      const reach = Math.hypot(bounce.end.x - bounce.at.x, bounce.end.y - bounce.at.y);
      const owner = bounce.bubble.owner;
      const second = nearestInBeam(
        game,
        bounce.at,
        back,
        reach,
        0.25,
        null,
        targetsOf(game, owner, true),
        true,
        7,
      );
      const end2 = second ? { x: second.target.x, y: second.target.y } : bounce.end;
      if (second) hit(game, second.target, k, damageDealt);
      game.events.push({
        type: 'lightning',
        x: bounce.at.x,
        y: bounce.at.y,
        tx: end2.x,
        ty: end2.y,
        castOwner: owner.seat,
        reflected: true,
      });
      burst(game, end2.x, end2.y, COL.LIGHTNING, 12, 4, owner.seat);
    }
    return true;
  }
  return launch(game, w, x, y, k);
}
