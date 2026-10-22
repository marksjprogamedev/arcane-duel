import { COL, COMBO_DAMAGE, COOLDOWN_TICKS, TRAP } from '../../constants';
import { clamp } from '../../math';
import { SimState } from '../../simState';
import type { SpellName, Trap, Wizard } from '../../types';
import { burst, float } from '../effects';
import { solidAt } from '../obstacles';
import { crater } from './areas';
import { blocked, hit, shieldStops } from './damage';

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

/** Knocks a wizard up (Water trap): no walking or being pushed, but they can still cast. */
export function knockUp(game: SimState, w: Wizard) {
  w.airborne = TRAP.KNOCKUP_TICKS;
  w.kx = w.ky = 0;
  burst(game, w.x, w.y - 20, COL.WATER, 26, 6);
  float(game, w.x, w.y - 145, 'KNOCKED UP!', COL.WATER);
}

/** What a trap does to the wizard who stepped on it. A shield of the right element stops it. */
export function springTrap(game: SimState, t: Trap, victim: Wizard) {
  burst(game, t.x, t.y, COL[t.k], 30, 7);
  if (t.k === 'EARTH') {
    if (!blocked(game, victim, 'EARTH')) imprison(game, victim);
    return;
  }
  hit(game, victim, t.k, (COMBO_DAMAGE[t.k] || 18) * TRAP.DAMAGE_MULTIPLIER, false, true);
  if (t.k === 'WATER' && !shieldStops(victim, 'WATER')) knockUp(game, victim);
  if (t.k === 'MAGMA') crater(game, t.x, t.y, t.owner);
  if (t.k === 'STORM')
    game.zones.push({ x: t.x, y: t.y, k: 'STORM', r: 75, owner: t.owner, life: 175, tick: 0 });
}
