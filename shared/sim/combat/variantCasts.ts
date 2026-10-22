import { COL, FLURRY_TICKS, PYRO_DISC_REACH } from '../../constants';
import { dist } from '../../math';
import { SimState } from '../../simState';
import type { SpellName, SpellVariant, TimerKey, Vec2, Wizard } from '../../types';
import { burst } from '../effects';
import { clear, ray } from '../geometry';
import { targetsOf } from '../teams';
import { bubbleBounce, nearestInBeam } from './beams';
import { hit, shardCharge } from './damage';

/** Alternative short-range attacks use the same element for shields/status effects. */
/** Continuous sidegrades trade damage, range, and width for a different role. */
export function variantSpray(
  game: SimState,
  w: Wizard,
  x: number,
  y: number,
  k: SpellName,
  variant: SpellVariant,
) {
  const a = Math.atan2(y - w.y, x - w.x);
  w.face = a;
  const specs: Partial<Record<SpellVariant, [number, number, number, number, TimerKey]>> = {
    pebbles: [286, 0.22, 11.7, 6, 'earthCD'],
    plasma_beam: [460, 0.11, 3.1, 8, 'plasmaCD'],
    magnetic_pull: [440, 0.18, 0.8, 5, 'magneticCD'],
  };
  const spec = specs[variant];
  if (!spec) return false;
  const [range, cone, damagePerHit, interval, timer] = spec;
  if (variant === 'pebbles' && w.flurryCD > 0) return false;
  if (w[timer] > 0) return false;
  w[timer] = interval;
  if (variant === 'pebbles' && w.flurryTime <= 0) w.flurryTime = FLURRY_TICKS;
  if (variant === 'pebbles') {
    const dir = a + (game.rng() - 0.5) * cone * 2;
    game.shots.push({
      id: game.nextId++,
      x: w.x + Math.cos(dir) * 25,
      y: w.y + Math.sin(dir) * 25,
      vx: Math.cos(dir) * 13,
      vy: Math.sin(dir) * 13,
      k,
      owner: w,
      r: 4,
      travel: 25,
      maxTravel: range,
      life: 30,
      damage: damagePerHit,
      charged: false,
      trail: 0,
      variant,
    });
    return true;
  }
  // Plasma has a short propagation time and remains anchored to the caster.
  // Collision is evaluated only as far as the travelling beam has reached.
  const beamRange =
    variant === 'plasma_beam'
      ? (w.plasmaReach = Math.min(range, (w.plasmaReach ?? 0) + 8 * 40))
      : variant === 'magnetic_pull'
        ? (w.magneticReach = Math.min(range, (w.magneticReach ?? 0) + 19 * interval))
        : range;
  const end = { x: w.x + Math.cos(a) * beamRange, y: w.y + Math.sin(a) * beamRange };
  const wall = ray(w.x, w.y, end.x, end.y, 4, game.map.obstacles);
  let stop = wall ? { x: wall.x, y: wall.y } : end;
  // A beam strikes only the nearest wizard in its path, and ends at their near surface.
  const first = nearestInBeam(game, w, a, beamRange, cone, wall, targetsOf(game, w), false);
  if (first) {
    const contact = Math.max(0, first.d - 22);
    stop = { x: w.x + Math.cos(a) * contact, y: w.y + Math.sin(a) * contact };
  }
  // Nothing struck first: a bubble in the way turns the beam round.
  const bounce = first ? null : bubbleBounce(game, w, stop, range);
  if (bounce) stop = bounce.at;
  game.events.push({
    type: 'lightning',
    x: w.x,
    y: w.y,
    tx: stop.x,
    ty: stop.y,
    castOwner: w.seat,
    variant,
    hit: !!first,
  });
  const strike = (target: Wizard, d: number, from: Vec2) => {
    hit(game, target, k, damagePerHit, false, false, variant);
    if (variant === 'magnetic_pull') {
      // Continuous attraction: draw the target toward where the beam comes from.
      target.kx += ((from.x - target.x) / (d || 1)) * 1.15;
      target.ky += ((from.y - target.y) / (d || 1)) * 1.15;
    }
  };
  if (first) strike(first.target, first.d, w);
  if (bounce) {
    burst(game, bounce.at.x, bounce.at.y, '#c4b5fd', 10, 4);
    // the reflected leg is the bubble owner's: it hurts whoever fired it, and anyone else it reaches
    const back = Math.atan2(bounce.end.y - bounce.at.y, bounce.end.x - bounce.at.x);
    const reach = Math.hypot(bounce.end.x - bounce.at.x, bounce.end.y - bounce.at.y);
    const owner = bounce.bubble.owner;
    const second = nearestInBeam(
      game,
      bounce.at,
      back,
      reach,
      cone,
      null,
      targetsOf(game, owner, true),
      true,
    );
    let stop2 = bounce.end;
    if (second) {
      const contact = Math.max(0, second.d - 22);
      stop2 = {
        x: bounce.at.x + Math.cos(back) * contact,
        y: bounce.at.y + Math.sin(back) * contact,
      };
    }
    game.events.push({
      type: 'lightning',
      x: bounce.at.x,
      y: bounce.at.y,
      tx: stop2.x,
      ty: stop2.y,
      castOwner: owner.seat,
      variant,
      hit: !!second,
      reflected: true,
    });
    if (second) strike(second.target, second.d, bounce.at);
  }
  return true;
}

/** Every alternate projectile uses the ordinary charging multiplier (1x–3x). */
export function variantProjectile(
  game: SimState,
  w: Wizard,
  x: number,
  y: number,
  k: SpellName,
  variant: SpellVariant,
  power: number,
) {
  const specs: Partial<
    Record<SpellVariant, [number, number, number, number, number, number, TimerKey]>
  > = {
    fireball: [1, 0, 9, 14, 420, 20, 'fireCD'],
    pyro_disc: [1, 0, 11, 18, PYRO_DISC_REACH, 15, 'fireCD'],
    shards: [5, 0.14, 12, 5, 270, 3.5, 'iceCD'],
  };
  const cfg = specs[variant];
  if (!cfg) return false;
  const [count, spread, speed, radius, reach, dmg, timer] = cfg;
  const cooldown = variant === 'pyro_disc' ? 62 : variant === 'fireball' ? 30 : 34;
  if (w[timer] > 0) return false;
  // A Pyrodisk must finish its entire flight before another can be thrown.
  if (
    variant === 'pyro_disc' &&
    game.shots.some(
      (shot) =>
        shot.owner === w && shot.variant === 'pyro_disc' && shot.life > 0 && !shot.reflected,
    )
  )
    return false;
  w[timer] = cooldown;
  const a = Math.atan2(y - w.y, x - w.x);
  w.face = a;
  for (let i = 0; i < count; i++) {
    const dir = a + (i - (count - 1) / 2) * spread;
    const dx = Math.cos(dir),
      dy = Math.sin(dir);
    game.shots.push({
      id: game.nextId++,
      x: w.x + dx * 25,
      y: w.y + dy * 25,
      vx: dx * speed,
      vy: dy * speed,
      k,
      owner: w,
      r: radius * (1 + (power - 1) * 0.15),
      travel: 25,
      maxTravel: reach,
      life: 95,
      damage: dmg * (variant === 'shards' ? shardCharge(power) : power),
      power,
      charged: power > 1.2,
      trail: 0,
      variant,
      ...(variant === 'pyro_disc'
        ? { originX: w.x, originY: w.y, returning: false, discHits: {}, discInside: [] }
        : {}),
    });
  }
  burst(game, w.x, w.y - 18, COL[k], 9 + Math.floor(power * 3));
  return true;
}

/** Ground-control variants are instant casts with a cooldown, not charged projectiles. */
export function variantArea(
  game: SimState,
  w: Wizard,
  x: number,
  y: number,
  k: SpellName,
  variant: SpellVariant,
) {
  const timer: TimerKey = variant === 'lava_pool' ? 'magmaCD' : 'waterCD';
  if (w[timer] > 0) return false;
  w[timer] = variant === 'lava_pool' ? 160 : 48;
  const dx = x - w.x,
    dy = y - w.y,
    d = Math.hypot(dx, dy) || 1;
  const reach = Math.min(d, variant === 'lava_pool' ? 360 : 230);
  const tx = w.x + (dx / d) * reach,
    ty = w.y + (dy / d) * reach;
  if (variant === 'lava_pool') {
    game.zones.push({ x: tx, y: ty, k: 'MAGMA', r: 82, owner: w, life: 210, tick: 0 });
  }
  burst(game, tx, ty, COL[k], 35, 6);
  for (const target of targetsOf(game, w)) {
    if (
      dist(target, { x: tx, y: ty }) < (variant === 'lava_pool' ? 82 : 110) &&
      clear(w, target, 8, game.map.obstacles)
    )
      hit(game, target, k, variant === 'lava_pool' ? 5 : 14);
  }
  return true;
}
