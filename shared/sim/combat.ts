import {
  BOMB_FUSE_TICKS,
  COL,
  COMBO_DAMAGE,
  COOLDOWN_TICKS,
  FREEZE_TICKS,
  PART,
  names,
} from '../constants';
import { isContinuousSpell } from '../charge';
import { clamp, dist } from '../math';
import { SimState } from '../simState';
import type { ShieldType, SpellName, StatusKey, TimerKey, Wizard, WizardId } from '../types';
import { float, queueDamageNumber } from './effects';
import { clear, ray } from './geometry';
import { immortal } from './wizard';

export function burst(
  game: SimState,
  x: number,
  y: number,
  c: string,
  n: number = 10,
  power: number = 4,
  castOwner: WizardId | null = null,
) {
  game.events.push({ type: 'burst', x, y, c, n, power, castOwner });
}

export function damage(game: SimState, w: Wizard, n: number, c: string) {
  if (game.ending || (w === game.e && game.respawn > 0)) return;
  if (!immortal(game, w)) w.hp -= n;
  queueDamageNumber(game, w, n, c, 'direct');
  burst(game, w.x, w.y - 20, c, 7);
}

export function status(game: SimState, w: Wizard, k: StatusKey, n: number, d: number, c: string) {
  const before = w[k];
  w[k] = clamp(before + n, 0, 100);
  w.rest[k] = d;
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

export function blocked(game: SimState, w: Wizard, k: SpellName) {
  if (w.shield && w.shield.type !== 4 && PART[k].includes(w.shield.type)) {
    float(game, w.x, w.y - 120, 'BLOCKED!', COL[names[w.shield.type]]);
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
) {
  if (game.ending || (w === game.e && game.respawn > 0) || blocked(game, w, k)) return;
  if (k === 'FIRE') {
    w.wet = 0;
    ignite(game, w);
  }
  if (k === 'WATER') {
    extinguish(game, w);
    status(game, w, 'wet', bomb ? 50 : charged ? 35 : 11, 130, COL.WATER);
  }
  if (k === 'LIGHTNING') {
    n *= 1 + (1.5 * w.wet) / 100;
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
        status(game, w, 'chill', charged ? 38 : 25, 160, COL.ICE);
        if (w.chill >= 100) w.freeze = w.freezeMax = FREEZE_TICKS.CHILL;
      }
    }
  }
  if (k === 'STEAM') status(game, w, 'scald', bomb ? 45 : charged ? 36 : 26, 170, COL.STEAM);
  if (k === 'MAGNETIC') status(game, w, 'mag', bomb ? 45 : charged ? 38 : 27, 195, COL.MAGNETIC);
  if (k === 'PLASMA') {
    status(game, w, 'over', bomb ? 48 : charged ? 38 : 28, 175, COL.PLASMA);
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
  damage(game, w, n, COL[k]);
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

export function sword(game: SimState, w: Wizard, target: Wizard) {
  if (
    w.swordCD > 0 ||
    w.cast > 0 ||
    w.freeze > 0 ||
    w.silence > 0 ||
    (w === game.p && game.input.p.holding)
  )
    return;
  w.swordCD = COOLDOWN_TICKS.SWORD;
  w.swing = 22;
  w.face = Math.atan2(target.y - w.y, target.x - w.x);
  if (target === game.e && game.respawn > 0) return;
  if (dist(w, target) > 80 || !clear(w, target, 8)) return;
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

export function force(game: SimState, w: Wizard, target: Wizard) {
  if (w.forceCD > 0 || w.freeze > 0 || w.silence > 0 || w.swing > 0) return;
  w.forceCD = COOLDOWN_TICKS.FORCE;
  game.events.push({ type: 'wave', x: w.x, y: w.y, r: 8, life: 22, c: '#d8b4fe' });
  if (target === game.e && game.respawn > 0) return;
  if (dist(w, target) < 160 && clear(w, target, 5)) {
    let d = dist(w, target) || 1;
    target.kx += ((target.x - w.x) / d) * 19;
    target.ky += ((target.y - w.y) / d) * 19;
    damage(game, target, 5, '#d8b4fe');
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
    tx = clamp(w.x + ux * range, 30, 770),
    ty = clamp(w.y + uy * range, 30, 570);
  game.shots.push({
    id: game.nextId++,
    x: w.x + ux * 26,
    y: w.y + uy * 26,
    vx: ux * 4,
    vy: uy * 4,
    k: 'MAGMA',
    owner: w,
    r: 27,
    life: 220,
    damage: 40 * power,
    tx,
    ty,
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
    range = Math.min(d, 520);
  game.bombs.push({
    id: game.nextId++,
    x: w.x,
    y: w.y,
    sx: w.x,
    sy: w.y,
    tx: clamp(w.x + (dx / d) * range, 30, 770),
    ty: clamp(w.y + (dy / d) * range, 30, 570),
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

export function spray(game: SimState, w: Wizard, x: number, y: number, k: SpellName) {
  if (w.swing > 0 || w.freeze > 0 || w.silence > 0) return false;
  let target = w === game.p ? game.e : game.p,
    a = Math.atan2(y - w.y, x - w.x);
  w.face = a;
  let d = dist(w, target),
    diff = Math.atan2(
      Math.sin(Math.atan2(target.y - w.y, target.x - w.x) - a),
      Math.cos(Math.atan2(target.y - w.y, target.x - w.x) - a),
    );
  if (k === 'FIRE' || k === 'WATER') {
    let fire = k === 'FIRE',
      range = fire ? 300 : 350,
      cd: TimerKey = fire ? 'fireCD' : 'waterCD';
    if (w[cd] > 0) return false;
    w[cd] = fire ? COOLDOWN_TICKS.FIRE : COOLDOWN_TICKS.WATER;
    game.events.push({
      type: 'spray',
      wizard: w === game.p ? 'p' : 'e',
      x,
      y,
      spell: k,
      castOwner: w === game.e ? 'e' : 'p',
    });
    if (
      (target !== game.e || game.respawn <= 0) &&
      d < range &&
      Math.abs(diff) < (fire ? 0.34 : 0.16) &&
      clear(w, target, 12)
    )
      hit(game, target, k, fire ? 2.2 : 1.5);
    return true;
  }
  if (k === 'LIGHTNING') {
    if (w.lightCD > 0) return false;
    w.lightCD = COOLDOWN_TICKS.LIGHTNING;
    let end = { x: w.x + Math.cos(a) * 300, y: w.y + Math.sin(a) * 300 },
      b = ray(w.x, w.y, end.x, end.y, 3);
    if (b) end = { x: b.x, y: b.y };
    if (
      d < 300 &&
      Math.abs(diff) < 0.25 &&
      (target !== game.e || game.respawn <= 0) &&
      clear(w, target, 7)
    ) {
      end = { x: target.x, y: target.y };
      hit(game, target, k, 15);
    }
    game.events.push({
      type: 'lightning',
      x: w.x,
      y: w.y,
      tx: end.x,
      ty: end.y,
      castOwner: w === game.e ? 'e' : 'p',
    });
    burst(game, end.x, end.y, COL.LIGHTNING, 12, 4, w === game.e ? 'e' : 'p');
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
  k: SpellName = w === game.p ? game.input.p.attack : w.spell,
) {
  if (w.swing > 0 || w.silence > 0 || w.freeze > 0) return false;
  return isContinuousSpell(k) ? spray(game, w, x, y, k) : launch(game, w, x, y, k, power);
}
