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
  Wizard,
  Seat,
} from '../types';
import type { MapDef } from '../maps';
import { float, queueDamageNumber } from './effects';
import { bubbleBetween, clampToMap, clear, ray, stopAtBubbleEdge } from './geometry';
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
  burst(game, w.x, w.y - 30, COL.FIRE, 5, 2);
}

/** True if the wizard's shield stops this spell. No side effects, unlike `blocked`. */
export function shieldStops(w: Wizard, k: SpellName) {
  return !!w.shield && w.shield.type !== 4 && PART[k].includes(w.shield.type);
}

export function blocked(game: SimState, w: Wizard, k: SpellName) {
  if (w.shield && shieldStops(w, k)) {
    // Avoid flooding the screen with labels from continuous Fire hits.
    const lastFireBlock = w.rest.fireBlockedLabel ?? -Infinity;
    if (k !== 'FIRE' || game.t - lastFireBlock >= 60) {
      float(game, w.x, w.y - 120, 'BLOCKED!', COL[names[w.shield.type]]);
      if (k === 'FIRE') w.rest.fireBlockedLabel = game.t;
    }
    burst(game, w.x, w.y - 20, COL[names[w.shield.type]], 15);
    return true;
  }
  return false;
}

export function hit(
  game: SimState,
  w: Wizard,
  k: SpellName,
  n: number,
  charged: boolean = false,
  bomb: boolean = false,
  variant: SpellVariant = 'default',
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
        status(game, w, 'chill', variant === 'shards' ? 7 : charged ? 38 : 25, 160, COL.ICE);
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

export function shield(game: SimState, w: Wizard, k: ShieldType) {
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
    const target = clampToMap(map, s.x + dx, s.y + dy);
    s.tx = target.x;
    s.ty = target.y;
  }
  [s.vx, s.vy] = mirror(s.vx, s.vy);
  s.x += nx * side * 0.5;
  s.y += ny * side * 0.5;
  s.owner = b.owner;
  s.ownerClear = true;
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
    pebbles: [220, 0.22, 2.6, 6, 'earthCD'],
    jet: [470, 0.075, 1.25, 6, 'waterCD'],
    chain_lightning: [260, 0.28, 3.1, 9, 'lightCD'],
    static_discharge: [135, 1.5, 1.5, 8, 'lightCD'],
    scalding_mist: [190, 0.6, 2.1, 8, 'waterCD'],
    plasma_beam: [460, 0.055, 3.1, 8, 'fireCD'],
    gale_force: [240, 0.65, 1.9, 8, 'waterCD'],
    magnetic_pull: [440, 0.18, 0.8, 5, 'earthCD'],
    iron_swarm: [210, 0.5, 2.6, 7, 'earthCD'],
  };
  const spec = specs[variant];
  if (!spec) return false;
  const [range, cone, damagePerHit, interval, timer] = spec;
  if (w[timer] > 0) return false;
  w[timer] = interval;
  if (variant === 'pebbles' || variant === 'iron_swarm') {
    const dir = a + (game.rng() - 0.5) * cone * 2;
    game.shots.push({
      id: game.nextId++,
      x: w.x + Math.cos(dir) * 25,
      y: w.y + Math.sin(dir) * 25,
      vx: Math.cos(dir) * 13,
      vy: Math.sin(dir) * 13,
      k,
      owner: w,
      r: variant === 'pebbles' ? 4 : 6,
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
  // Beams strike only the nearest wizard in their path; the other sprays hit everyone in the cone.
  const beam = variant === 'plasma_beam' || variant === 'magnetic_pull';
  const struck: { target: Wizard; d: number }[] = [];
  for (const target of targetsOf(game, w)) {
    const { d, diff } = aimTo(w, target, a);
    if (
      d < beamRange &&
      Math.abs(diff) < cone &&
      clear(w, target, 4, game.map.obstacles) &&
      !bubbleBetween(game.bubbles, w, target) &&
      (!beam || !wall || d < Math.hypot(wall.x - w.x, wall.y - w.y))
    )
      struck.push({ target, d });
  }
  struck.sort((p, q) => p.d - q.d);
  const hits = beam ? struck.slice(0, 1) : struck;
  if (beam && hits.length) {
    // Terminate at the near surface of the enemy rather than drawing through them.
    const contact = Math.max(0, hits[0].d - 22);
    stop = { x: w.x + Math.cos(a) * contact, y: w.y + Math.sin(a) * contact };
  }
  game.events.push({
    type: 'lightning',
    x: w.x,
    y: w.y,
    tx: stop.x,
    ty: stop.y,
    castOwner: w.seat,
    variant,
    hit: beam && hits.length > 0,
  });
  for (const { target, d } of hits) {
    hit(game, target, k, damagePerHit, false, false, variant);
    if (variant === 'magnetic_pull') {
      // Continuous attraction: draw the opponent toward the caster.
      target.kx += ((w.x - target.x) / (d || 1)) * 1.15;
      target.ky += ((w.y - target.y) / (d || 1)) * 1.15;
    }
    if (variant === 'gale_force') {
      target.kx += ((target.x - w.x) / (d || 1)) * 4;
      target.ky += ((target.y - w.y) / (d || 1)) * 4;
    }
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
    pyro_disc: [1, 0, 11, 18, 340, 15, 'fireCD'],
    stone_lance: [1, 0, 17, 5, 560, 21, 'earthCD'],
    molten_shrapnel: [5, 0.2, 10, 6, 330, 8, 'magmaCD'],
    shards: [5, 0.14, 12, 5, 270, 3.5, 'earthCD'],
    glacial_spike: [1, 0, 10, 13, 460, 23, 'earthCD'],
    unstable_orb: [1, 0, 6, 19, 370, 25, 'fireCD'],
    steam_burst: [3, 0.22, 12, 8, 260, 8, 'waterCD'],
    thundercloud: [1, 0, 7, 18, 360, 17, 'waterCD'],
  };
  const cfg = specs[variant];
  if (!cfg) return false;
  const [count, spread, speed, radius, reach, dmg, timer] = cfg;
  const cooldown =
    variant === 'molten_shrapnel'
      ? 120
      : variant === 'pyro_disc'
        ? 62
        : variant === 'fireball'
          ? 30
          : 34;
  if (w[timer] > 0) return false;
  // A Pyrodisk must finish its entire flight before another can be thrown.
  if (
    variant === 'pyro_disc' &&
    game.shots.some((shot) => shot.owner === w && shot.variant === 'pyro_disc' && shot.life > 0)
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
      damage: dmg * power,
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

/** Distance to `target` and how far off the aim direction `a` it is (radians, signed). */
function aimTo(w: Wizard, target: Wizard, a: number) {
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
    let end = { x: w.x + Math.cos(a) * 300, y: w.y + Math.sin(a) * 300 },
      b = ray(w.x, w.y, end.x, end.y, 3, game.map.obstacles);
    if (b) end = { x: b.x, y: b.y };
    end = stopAtBubbleEdge(game.bubbles, w.x, w.y, end.x, end.y);
    // the bolt strikes the nearest wizard in its path
    let struck: Wizard | null = null;
    let nearest = 300;
    for (const target of targetsOf(game, w)) {
      const { d, diff } = aimTo(w, target, a);
      if (
        d < nearest &&
        Math.abs(diff) < 0.25 &&
        clear(w, target, 7, game.map.obstacles) &&
        !bubbleBetween(game.bubbles, w, target)
      ) {
        struck = target;
        nearest = d;
      }
    }
    if (struck) {
      end = { x: struck.x, y: struck.y };
      hit(game, struck, k, (40 * COOLDOWN_TICKS.LIGHTNING) / 60);
    }
    game.events.push({
      type: 'lightning',
      x: w.x,
      y: w.y,
      tx: end.x,
      ty: end.y,
      castOwner: w.seat,
    });
    burst(game, end.x, end.y, COL.LIGHTNING, 12, 4, w.seat);
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
  return isContinuousSpell(k) ? spray(game, w, x, y, k) : launch(game, w, x, y, k, power);
}
