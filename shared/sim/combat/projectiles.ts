import {
  BOMB_FUSE_TICKS,
  COL,
  COMBO_DAMAGE,
  COOLDOWN_TICKS,
  MAGMA_SHOT_LIFE,
} from '../../constants';
import { SimState } from '../../simState';
import type { SpellLoadout, SpellName, Wizard } from '../../types';
import { burst } from '../effects';
import { clampToMap } from '../geometry';
import { hasBomb } from '../variants';

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
  const comboCooldown = {
    STEAM: 'steamCD',
    PLASMA: 'plasmaCD',
    ICE: 'iceCD',
    MAGNETIC: 'magneticCD',
  } as const;
  const comboTimer = k in comboCooldown ? comboCooldown[k as keyof typeof comboCooldown] : null;
  if (comboTimer && w[comboTimer] > 0) return false;
  let dx = x - w.x,
    dy = y - w.y,
    d = Math.hypot(dx, dy) || 1,
    sp = k === 'EARTH' ? 9 : 7.5;
  if (k === 'EARTH') w.earthCD = COOLDOWN_TICKS.EARTH;
  if (comboTimer) w[comboTimer] = COOLDOWN_TICKS[k as keyof typeof comboCooldown];
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

export function bomb(
  game: SimState,
  w: Wizard,
  x: number,
  y: number,
  k: SpellName,
  loadout: SpellLoadout = {},
) {
  if (w.bombCD > 0 || w.swing > 0 || w.freeze > 0 || w.silence > 0) return;
  if (!hasBomb(k)) return;
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
