import {
  BOMB_FUSE_TICKS,
  BUBBLE,
  COL,
  COMBO_DAMAGE,
  COOLDOWN_TICKS,
  FREEZE_TICKS,
  MAGMA_SHOT_LIFE,
  PART,
  TRAP,
  names,
} from '../constants';
import { isContinuousSpell } from '../charge';
import { clamp, dist } from '../math';
import { SimState } from '../simState';
import type {
  Bubble,
  ShieldType,
  Shot,
  SpellName,
  SpellLoadout,
  SpellVariant,
  StatusKey,
  TimerKey,
  Trap,
  Vec2,
  Wizard,
  Seat,
} from '../types';
import type { MapDef } from '../maps';
import { float, queueDamageNumber } from './effects';
import { bubbleBetween, bubbleCrossing, clampToMap, clear, ray } from './geometry';
import { solidAt } from './obstacles';
import { targetsOf, untouchable } from './teams';
import { immortal } from './wizard';
import { spellVariant, projectileVariant, continuousVariant } from './variants';

export function burst(
  game: SimState,
  x: number,
  y: number,
  c: string,
  n: number = 10,
  power: number = 4,
  castOwner: Seat | null = null,
) {
  game.events.push({ type: 'burst', x, y, c, n, power, castOwner });
}

export function damage(game: SimState, w: Wizard, n: number, c: string, quiet = false) {
  if (game.ending || untouchable(game, w)) return;
  if (!immortal(game, w)) w.hp -= n;
  queueDamageNumber(game, w, n, c, 'direct');
  burst(game, w.x, w.y - 20, c, 7);
}

export function status(
  game: SimState,
  w: Wizard,
  k: StatusKey,
  n: number,
  d: number,
  c: string,
  quiet = false,
) {
  const before = w[k];
  w[k] = clamp(before + n, 0, 100);
  w.rest[k] = d;
  if (quiet) return;
  if (k === 'wet') {
    if (before < 100 && w[k] >= 100) float(game, w.x, w.y - 115, 'WET 100%', c);
  } else if (before < 1 || [25, 50, 75, 100].some((level) => before < level && w[k] >= level))
    float(game, w.x, w.y - 115, k.toUpperCase() + ' ' + Math.round(w[k]) + '%', c);
}

export function extinguish(game: SimState, w: Wizard) {
  if (w.burn > 0) {
    w.burn = 0;
    w.burnTime = 0;
    w.burnTick = 0;
    float(game, w.x, w.y - 130, 'EXTINGUISHED', '#7dd3fc');
    burst(game, w.x, w.y - 25, '#7dd3fc', 10, 3);
  }
}

export function ignite(game: SimState, w: Wizard) {
  let was = w.burn;
  w.burn = clamp(w.burn + 12, 0, 100);
  w.burnTime = 180;
  if (was === 0) w.burnTick = 0;
  if (was < 100 && w.burn >= 100) float(game, w.x, w.y - 130, 'BURN 100%', COL.FIRE);
  // Distinct cosmetic event colour for direct Flamethrower impact; burn mechanics are unchanged.
  burst(game, w.x, w.y - 30, '#e46a25', 5, 2);
}

/** True if the wizard's shield stops this spell. No side effects, unlike `blocked`. */
export function shieldStops(w: Wizard, k: SpellName) {
  return !!w.shield && w.shield.type !== 4 && PART[k].includes(w.shield.type);
}

/** Least ticks between two BLOCKED! labels (and between two block bursts) on one wizard. */
const BLOCKED_LABEL_TICKS = 60;
const BLOCKED_BURST_TICKS = 10;

export function blocked(game: SimState, w: Wizard, k: SpellName) {
  if (w.shield && shieldStops(w, k)) {
    // A beam or spray is blocked every tick: show one label a second and a burst every few ticks,
    // not a stream of them.
    const colour = COL[names[w.shield.type]];
    if (game.t - (w.rest.blockedLabel ?? -Infinity) >= BLOCKED_LABEL_TICKS) {
      float(game, w.x, w.y - 120, 'BLOCKED!', colour);
      w.rest.blockedLabel = game.t;
    }
    if (game.t - (w.rest.blockedBurst ?? -Infinity) >= BLOCKED_BURST_TICKS) {
      burst(game, w.x, w.y - 20, colour, 15);
      w.rest.blockedBurst = game.t;
    }
    return true;
  }
  return false;
}

/** What a charge of `power` (1 to 3) multiplies a Frost Shard's damage by: 1x up to 6x. */
const shardCharge = (power: number) => 1 + (power - 1) * 2.5;
/** The chill (in percent) one Frost Shard adds: 7 uncharged, 17 at full charge. */
const shardChill = (power: number) => 7 + (power - 1) * 5;

export function hit(
  game: SimState,
  w: Wizard,
  k: SpellName,
  n: number,
  charged: boolean = false,
  bomb: boolean = false,
  variant: SpellVariant = 'default',
  power: number = 1,
) {
  if (game.ending || untouchable(game, w) || blocked(game, w, k)) return;
  if (k === 'FIRE') {
    w.wet = 0;
    ignite(game, w);
  }
  if (k === 'WATER') {
    extinguish(game, w);
    status(game, w, 'wet', bomb ? 50 : charged ? 35 : 11, 130, COL.WATER);
  }
  if (k === 'LIGHTNING') {
    n *= 1 + w.wet / 100;
    if (w.wet > 0) float(game, w.x, w.y - 140, 'ELECTROCUTION', COL.LIGHTNING);
  }
  if (k === 'EARTH' && w.freeze > 0) {
    n *= 2;
    w.freeze = 0;
    w.chill = 0;
    float(game, w.x, w.y - 145, 'SHATTER!', COL.ICE);
  }
  if (k === 'ICE') {
    // An active freeze is a fixed-duration lock: subsequent ice hits can
    // damage the target, but must never refresh its timer or Chill meter.
    if (w.freeze <= 0) {
      if (bomb) {
        w.freeze = w.freezeMax = FREEZE_TICKS.BOMB;
        w.chill = 100;
        w.rest.chill = FREEZE_TICKS.BOMB;
      } else {
        // Frost Shards chill a little each (7), a little more when charged (17 at full charge): even
        // all five of a full volley (85) leave the target short of frozen
        const chill = variant === 'shards' ? shardChill(power) : charged ? 38 : 25;
        status(game, w, 'chill', chill, 160, COL.ICE);
        if (w.chill >= 100) w.freeze = w.freezeMax = FREEZE_TICKS.CHILL;
      }
    }
  }
  if (k === 'STEAM') status(game, w, 'scald', bomb ? 45 : charged ? 36 : 26, 170, COL.STEAM);
  if (k === 'MAGNETIC') status(game, w, 'mag', bomb ? 45 : charged ? 38 : 27, 195, COL.MAGNETIC);
  if (k === 'PLASMA') {
    status(
      game,
      w,
      'over',
      bomb ? 100 : variant === 'plasma_beam' ? 10 : charged ? 38 : 28,
      175,
      COL.PLASMA,
      variant === 'plasma_beam',
    );
    if (w.over >= 100) {
      w.over = 0;
      w.silence = 105;
      damage(game, w, 16, COL.PLASMA);
      float(game, w.x, w.y - 145, 'SILENCED!', COL.PLASMA);
    }
  }
  if (k === 'STORM') {
    status(game, w, 'stat', bomb ? 42 : charged ? 34 : 26, 165, COL.STORM);
    if (w.stat >= 100) {
      w.stat = 0;
      damage(game, w, 18, COL.STORM);
      float(game, w.x, w.y - 145, 'DISCHARGE!', COL.STORM);
    }
  }
  damage(game, w, n, COL[k], variant === 'plasma_beam');
}

/** Raises a shield. A silenced wizard can't (a frozen one can: a fire shield thaws). */
export function shield(game: SimState, w: Wizard, k: ShieldType) {
  if (w.silence > 0) return false;
  w.shield = { type: k, life: 250 };
  if (k === 4) w.healTick = 0;
  if (k === 0) {
    w.wet = 0;
    w.chill = 0;
    w.freeze = 0;
    extinguish(game, w);
  }
  if (k === 1) extinguish(game, w);
  burst(game, w.x, w.y - 20, k === 4 ? '#4ade80' : COL[names[k]], 24, 6);
  return true;
}

export function heal(game: SimState, w: Wizard) {
  if (w.healCD > 0 || w.freeze > 0 || w.silence > 0 || w.swing > 0 || w.hp <= 0) return false;
  w.healCD = COOLDOWN_TICKS.HEAL;
  let amount = Math.min(w.max - w.hp, w.max * 0.25 * (1 - (0.6 * w.scald) / 100));
  w.hp += amount;
  burst(game, w.x, w.y - 20, '#4ade80', 42, 7);
  float(game, w.x, w.y - 115, '+' + Math.round(amount) + ' HP', '#86efac');
  game.events.push({ type: 'wave', x: w.x, y: w.y, r: 10, life: 25, c: '#4ade80' });
  return true;
}

export function bubble(game: SimState, w: Wizard) {
  if (w.bubbleCD > 0 || w.freeze > 0 || w.silence > 0 || w.swing > 0 || w.hp <= 0) return false;
  w.bubbleCD = COOLDOWN_TICKS.BUBBLE;
  game.bubbles.push({ x: w.x, y: w.y, r: BUBBLE.RADIUS, owner: w, life: BUBBLE.LIFE });
  burst(game, w.x, w.y - 20, '#c4b5fd', 30, 6);
  game.events.push({ type: 'wave', x: w.x, y: w.y, r: 10, life: 25, c: '#c4b5fd' });
  return true;
}

/**
 * Sets a trap of the given spell at the cursor, up to `TRAP.RANGE` away and not inside anything
 * solid. A wizard has one trap at a time: a new one replaces the old.
 */
export function trap(game: SimState, w: Wizard, x: number, y: number, k: SpellName) {
  if (w.trapCD > 0 || w.freeze > 0 || w.silence > 0 || w.swing > 0 || w.hp <= 0) return false;
  const dx = x - w.x,
    dy = y - w.y,
    d = Math.hypot(dx, dy) || 1,
    reach = Math.min(d, TRAP.RANGE),
    tx = clamp(w.x + (dx / d) * reach, 40, game.map.width - 40),
    ty = clamp(w.y + (dy / d) * reach, 40, game.map.height - 40);
  if (solidAt(game.map.obstacles, tx, ty, 12)) return false;
  game.traps = game.traps.filter((t) => t.owner !== w);
  game.traps.push({
    id: game.nextId++,
    x: tx,
    y: ty,
    k,
    owner: w,
    life: TRAP.LIFE,
    arm: TRAP.ARM_TICKS,
  });
  w.trapCD = COOLDOWN_TICKS.TRAP;
  burst(game, tx, ty, COL[k], 14, 4);
  return true;
}

/** Locks a wizard in an Earth prison: no walking or being pushed, but they can still cast. */
export function imprison(game: SimState, w: Wizard) {
  w.prison = TRAP.PRISON_TICKS;
  w.kx = w.ky = 0;
  burst(game, w.x, w.y - 20, COL.EARTH, 26, 6);
  float(game, w.x, w.y - 145, 'IMPRISONED!', COL.EARTH);
}

/** What a trap does to the wizard who stepped on it. A shield of the right element stops it. */
export function springTrap(game: SimState, t: Trap, victim: Wizard) {
  burst(game, t.x, t.y, COL[t.k], 30, 7);
  if (t.k === 'EARTH') {
    if (!blocked(game, victim, 'EARTH')) imprison(game, victim);
    return;
  }
  hit(game, victim, t.k, (COMBO_DAMAGE[t.k] || 18) * TRAP.DAMAGE_MULTIPLIER, false, true);
  if (t.k === 'MAGMA') crater(game, t.x, t.y, t.owner);
  if (t.k === 'STORM')
    game.zones.push({ x: t.x, y: t.y, k: 'STORM', r: 75, owner: t.owner, life: 175, tick: 0 });
}

/**
 * Bounces a projectile off a bubble edge. It sits at the crossing point (`s.x`, `s.y`), is
 * mirrored about the edge's normal, takes the bubble owner's side, and from then on can hurt
 * anyone, including the one who fired it.
 */
export function reflect(s: Shot, b: Bubble, map: MapDef) {
  const d = Math.hypot(s.x - b.x, s.y - b.y) || 1,
    nx = (s.x - b.x) / d,
    ny = (s.y - b.y) / d;
  // nudge it back to the side it came from, so the next step doesn't cross the edge again
  const side = s.vx * nx + s.vy * ny > 0 ? -1 : 1;
  const mirror = (vx: number, vy: number): [number, number] => {
    const dot = vx * nx + vy * ny;
    return [vx - 2 * dot * nx, vy - 2 * dot * ny];
  };
  if (s.magma === true) {
    // Magma steers by its target point, not its velocity: mirror the way to it.
    const [dx, dy] = mirror(s.tx - s.x, s.ty - s.y);
    const len = Math.hypot(dx, dy) || 1;
    const reach = s.reach ?? len; // its whole original range again, not what was left of it
    const target = clampToMap(map, s.x + (dx / len) * reach, s.y + (dy / len) * reach);
    s.tx = target.x;
    s.ty = target.y;
  }
  [s.vx, s.vy] = mirror(s.vx, s.vy);
  // a reflected shot starts its flight again: its whole range, and enough life to fly it
  if (s.magma === true) {
    s.life = MAGMA_SHOT_LIFE;
  } else {
    s.travel = 0;
    s.life = Math.max(s.life, Math.ceil(s.maxTravel / (Math.hypot(s.vx, s.vy) || 1)) + 5);
  }
  s.x += nx * side * 0.5;
  s.y += ny * side * 0.5;
  s.owner = b.owner;
  s.ownerClear = true;
  s.reflected = true;
}

export function sword(game: SimState, w: Wizard, target: Wizard) {
  if (
    w.swordCD > 0 ||
    w.cast > 0 ||
    w.freeze > 0 ||
    w.silence > 0 ||
    (w.seat === 0 && game.input[0].holding)
  )
    return;
  w.swordCD = COOLDOWN_TICKS.SWORD;
  w.swing = 22;
  w.face = Math.atan2(target.y - w.y, target.x - w.x);
  if (untouchable(game, target)) return;
  if (dist(w, target) > 80 || !clear(w, target, 8, game.map.obstacles)) return;
  if (target.shield && target.shield.type === 3) {
    float(game, target.x, target.y - 125, 'BLOCKED!', COL.EARTH);
    return;
  }
  let n = target.freeze > 0 ? 50 : 25;
  if (n === 50) {
    target.freeze = 0;
    target.chill = 0;
    float(game, target.x, target.y - 145, 'SHATTER!', COL.ICE);
  }
  damage(game, target, n, '#f8fafc');
}

export function force(game: SimState, w: Wizard) {
  if (w.forceCD > 0 || w.freeze > 0 || w.silence > 0 || w.swing > 0) return;
  w.forceCD = COOLDOWN_TICKS.FORCE;
  game.events.push({ type: 'wave', x: w.x, y: w.y, r: 8, life: 22, c: '#d8b4fe' });
  for (const target of targetsOf(game, w)) {
    if (dist(w, target) < 160 && clear(w, target, 5, game.map.obstacles)) {
      const d = dist(w, target) || 1;
      target.kx += ((target.x - w.x) / d) * 19;
      target.ky += ((target.y - w.y) / d) * 19;
      damage(game, target, 5, '#d8b4fe');
    }
  }
}

export function crater(game: SimState, x: number, y: number, owner: Wizard) {
  game.zones = game.zones.filter((z) => z.k !== 'MAGMA' || Math.hypot(z.x - x, z.y - y) > z.r + 65);
  game.zones.push({ x, y, k: 'MAGMA', r: 65, owner, life: 230, tick: 0 });
  burst(game, x, y, COL.MAGMA, 55, 9);
  burst(game, x, y, '#fde047', 18, 7);
  float(game, x, y - 65, 'MAGMA CRATER!', COL.MAGMA);
}

export function magma(game: SimState, w: Wizard, x: number, y: number, power: number = 1) {
  if (w.magmaCD > 0 || w.swing > 0 || w.freeze > 0 || w.silence > 0) return false;
  let dx = x - w.x,
    dy = y - w.y,
    d = Math.hypot(dx, dy) || 1,
    range = Math.min(d, 400),
    ux = dx / d,
    uy = dy / d,
    target = clampToMap(game.map, w.x + ux * range, w.y + uy * range);
  game.shots.push({
    id: game.nextId++,
    x: w.x + ux * 26,
    y: w.y + uy * 26,
    vx: ux * 4,
    vy: uy * 4,
    k: 'MAGMA',
    owner: w,
    r: 27,
    life: MAGMA_SHOT_LIFE,
    damage: 40 * power,
    tx: target.x,
    ty: target.y,
    reach: range,
    magma: true,
    hitTargets: new Set(),
    trail: 0,
  });
  w.magmaCD = COOLDOWN_TICKS.MAGMA;
  burst(game, w.x, w.y - 20, COL.MAGMA, 20);
  return true;
}

export function launch(
  game: SimState,
  w: Wizard,
  x: number,
  y: number,
  k: SpellName,
  power: number = 1,
) {
  if (w.swing > 0 || w.freeze > 0 || w.silence > 0) return false;
  if (k === 'MAGMA') return magma(game, w, x, y, power);
  if (k === 'EARTH' && w.earthCD > 0) return false;
  let dx = x - w.x,
    dy = y - w.y,
    d = Math.hypot(dx, dy) || 1,
    sp = k === 'EARTH' ? 9 : 7.5;
  if (k === 'EARTH') w.earthCD = COOLDOWN_TICKS.EARTH;
  game.shots.push({
    id: game.nextId++,
    x: w.x + (dx / d) * 25,
    y: w.y + (dy / d) * 25,
    vx: (dx / d) * sp,
    vy: (dy / d) * sp,
    k,
    owner: w,
    r: k === 'EARTH' ? 14 : power > 1.2 ? 15 : 9,
    travel: 25,
    maxTravel: 450,
    life: 110,
    damage: (k === 'EARTH' ? 25 : COMBO_DAMAGE[k] || 18) * power,
    charged: power > 1.2,
    trail: 0,
  });
  burst(game, w.x, w.y - 18, COL[k], 9);
  return true;
}

export function bomb(game: SimState, w: Wizard, x: number, y: number, k: SpellName) {
  if (w.bombCD > 0 || w.swing > 0 || w.freeze > 0 || w.silence > 0) return;
  if (k === 'MAGMA') {
    magma(game, w, x, y, 1.5);
    return;
  }
  let dx = x - w.x,
    dy = y - w.y,
    d = Math.hypot(dx, dy) || 1,
    range = Math.min(d, 520),
    target = clampToMap(game.map, w.x + (dx / d) * range, w.y + (dy / d) * range);
  game.bombs.push({
    id: game.nextId++,
    x: w.x,
    y: w.y,
    sx: w.x,
    sy: w.y,
    tx: target.x,
    ty: target.y,
    u: 0,
    flight: Math.max(25, range / 12),
    fuse: BOMB_FUSE_TICKS,
    k,
    owner: w,
    landed: false,
    dead: false,
  });
  w.bombCD = COOLDOWN_TICKS.BOMB;
}

/** How far a Pyrodisk flies out before it turns for home. */
export const PYRO_DISC_REACH = 340;

/** Pebble Flurry fires for this long (1.5 s), then needs `FLURRY_COOLDOWN_TICKS` to recharge. */
export const FLURRY_TICKS = 90;
export const FLURRY_COOLDOWN_TICKS = 300;

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
function bubbleBounce(game: SimState, from: Vec2, to: Vec2, fullLength: number): BeamBounce | null {
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
function nearestInBeam(
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

/** Alternative short-range attacks use the same element for shields/status effects. */
/** Continuous sidegrades trade damage, range, and width for a different role. */
function variantSpray(
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
    plasma_beam: [460, 0.11, 3.1, 8, 'fireCD'],
    magnetic_pull: [440, 0.18, 0.8, 5, 'earthCD'],
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
function variantProjectile(
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
    shards: [5, 0.14, 12, 5, 270, 3.5, 'earthCD'],
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
function variantArea(
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

/** Water Surge: a ring of water that spreads from the caster, soaking and shoving every wizard it reaches. */
export const SURGE = {
  START_R: 20,
  MAX_R: 345,
  /** Ticks the ring lasts; it reaches its full size just before it fades. */
  LIFE: 45,
  /** How hard it shoves (a wizard's knockback speed, which fades fast: about 330 px in all). */
  KNOCKBACK: 60,
  WET: 75,
  COOLDOWN: 300,
} as const;

function waterSurge(game: SimState, w: Wizard) {
  if (w.waterCD > 0) return false;
  w.waterCD = SURGE.COOLDOWN;
  extinguish(game, w); // the water that rushes out also puts out the caster's own fire
  game.zones.push({
    x: w.x,
    y: w.y,
    k: 'WATER',
    r: SURGE.START_R,
    owner: w,
    life: SURGE.LIFE,
    tick: 0,
    hit: [],
  });
  burst(game, w.x, w.y - 18, COL.WATER, 30, 6);
  return true;
}

/** Thundercloud: a storm cloud that drifts after the nearest enemy and strikes whoever is under it. */
export const THUNDERCLOUD = {
  R: 70,
  LIFE: 330,
  /** Ticks between strikes. */
  STRIKE_TICKS: 30,
  STRIKE_DAMAGE: 6,
  /** A cloud flies at this fraction of a wizard's walking speed. */
  SPEED_FACTOR: 0.5,
  /** How far from the caster it can be summoned. */
  REACH: 300,
  COOLDOWN: 480,
} as const;

function summonThundercloud(game: SimState, w: Wizard, x: number, y: number) {
  if (w.waterCD > 0) return false;
  w.waterCD = THUNDERCLOUD.COOLDOWN;
  const d = Math.hypot(x - w.x, y - w.y) || 1;
  const reach = Math.min(d, THUNDERCLOUD.REACH);
  const at = { x: w.x + ((x - w.x) / d) * reach, y: w.y + ((y - w.y) / d) * reach };
  // one cloud per caster: a new one replaces the old
  game.zones = game.zones.filter((z) => !(z.follow && z.owner === w));
  game.zones.push({
    ...at,
    k: 'STORM',
    r: THUNDERCLOUD.R,
    owner: w,
    life: THUNDERCLOUD.LIFE,
    tick: 0,
    follow: true,
  });
  burst(game, at.x, at.y, COL.STORM, 35, 6);
  return true;
}

/** Distance to `target` and how far off the aim direction `a` it is (radians, signed). */
function aimTo(w: Vec2, target: Wizard, a: number) {
  const toward = Math.atan2(target.y - w.y, target.x - w.x);
  return { d: dist(w, target), diff: Math.atan2(Math.sin(toward - a), Math.cos(toward - a)) };
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

export function cast(
  game: SimState,
  w: Wizard,
  x: number,
  y: number,
  power: number = 1,
  k: SpellName = w.seat === 0 ? game.input[0].attack : w.spell,
  loadout: SpellLoadout = {},
) {
  if (w.swing > 0 || w.silence > 0 || w.freeze > 0) return false;
  const variant = spellVariant(k, loadout);
  if (continuousVariant(k, loadout) && variant !== 'default')
    return variantSpray(game, w, x, y, k, variant);
  if (projectileVariant(k, loadout)) return variantProjectile(game, w, x, y, k, variant, power);
  if (variant === 'lava_pool') return variantArea(game, w, x, y, k, variant);
  if (variant === 'water_surge') return waterSurge(game, w);
  if (variant === 'thundercloud') return summonThundercloud(game, w, x, y);
  return isContinuousSpell(k) ? spray(game, w, x, y, k) : launch(game, w, x, y, k, power);
}
