import { BOMB, COL, FREEZE_TICKS, PART, names } from '../../constants';
import { clamp } from '../../math';
import { SimState } from '../../simState';
import type { SpellName, SpellVariant, StatusKey, Wizard } from '../../types';
import { burst, float, queueDamageNumber } from '../effects';
import { untouchable } from '../teams';
import { immortal } from '../wizard';

export function damage(game: SimState, w: Wizard, n: number, c: string, quiet = false) {
  if (game.ending || untouchable(game, w)) return;
  if (!immortal(game, w)) w.hp -= n;
  queueDamageNumber(game, w, n, c, 'direct');
  // Recolour only the existing direct FIRE damage splash, not the ignite/burn burst.
  burst(game, w.x, w.y - 20, c === COL.FIRE ? '#d85a24' : c, 7);
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

/** Sets the wizard alight: +12 burn, or a full 100 for a bomb or trap. */
export function ignite(game: SimState, w: Wizard, full = false) {
  let was = w.burn;
  w.burn = full ? 100 : clamp(w.burn + 12, 0, 100);
  w.burnTime = 180;
  if (was === 0) w.burnTick = 0;
  if (was < 100 && w.burn >= 100) float(game, w.x, w.y - 130, 'BURN 100%', COL.FIRE);
  burst(game, w.x, w.y - 30, COL.FIRE, 5, 2);
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
export const shardCharge = (power: number) => 1 + (power - 1) * 2.5;
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
    if (w.freeze > 0) {
      w.freeze = 0;
      w.chill = 0;
      float(game, w.x, w.y - 145, 'MELTED!', COL.FIRE);
      burst(game, w.x, w.y - 20, COL.ICE, 20, 5);
    }
    ignite(game, w, bomb);
  }
  if (k === 'WATER') {
    extinguish(game, w);
    status(game, w, 'wet', bomb ? 100 : charged ? 35 : 11, 130, COL.WATER);
  }
  if (k === 'LIGHTNING') {
    n *= 1 + w.wet / 100;
    if (w.wet > 0) float(game, w.x, w.y - 140, 'ELECTROCUTION', COL.LIGHTNING);
  }
  if (k === 'EARTH' && w.freeze > 0) {
    n *= 2;
    w.freeze = 0;
    w.chill = 0;
    burst(game, w.x, w.y - 20, '#ice-prison-shatter', 32, 8);
    float(game, w.x, w.y - 145, 'SHATTER!', COL.ICE);
  }
  if (k === 'EARTH' && bomb) w.slow = BOMB.SLOW_TICKS;
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
  if (k === 'STEAM') status(game, w, 'scald', bomb ? 100 : charged ? 36 : 26, 170, COL.STEAM);
  if (k === 'MAGNETIC') status(game, w, 'mag', bomb ? 100 : charged ? 38 : 27, 195, COL.MAGNETIC);
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
    status(game, w, 'stat', bomb ? 100 : charged ? 34 : 26, 165, COL.STORM);
    if (w.stat >= 100) {
      w.stat = 0;
      damage(game, w, 18, COL.STORM);
      float(game, w.x, w.y - 145, 'DISCHARGE!', COL.STORM);
    }
  }
  damage(game, w, n, COL[k], variant === 'plasma_beam');
}
