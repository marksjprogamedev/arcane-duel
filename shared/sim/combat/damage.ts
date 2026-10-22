import { BOMB, SPELL_COLOR, FREEZE_TICKS, SPELL_ELEMENTS, ELEMENT_NAMES } from '../../constants';
import { clamp } from '../../math';
import { SimState } from '../../simState';
import type { SpellName, SpellVariant, StatusKey, Wizard } from '../../types';
import { burst, addFloatingText, queueDamageNumber } from '../effects';
import { untouchable } from '../teams';
import { immortal } from '../wizard';

export function damage(game: SimState, w: Wizard, amount: number, c: string, quiet = false) {
  if (game.ending || untouchable(game, w)) return;
  if (!immortal(game, w)) w.hp -= amount;
  queueDamageNumber(game, w, amount, c, 'direct');
  // Recolour only the existing direct FIRE damage splash, not the ignite/burn burst.
  burst(game, w.x, w.y - 20, c === SPELL_COLOR.FIRE ? '#d85a24' : c, 7);
}

export function status(
  game: SimState,
  w: Wizard,
  statusKey: StatusKey,
  amount: number,
  delay: number,
  c: string,
  quiet = false,
) {
  const before = w[statusKey];
  w[statusKey] = clamp(before + amount, 0, 100);
  w.statusDelay[statusKey] = delay;
  if (quiet) return;
  if (statusKey === 'wet') {
    if (before < 100 && w[statusKey] >= 100) addFloatingText(game, w.x, w.y - 115, 'WET 100%', c);
  } else if (
    before < 1 ||
    [25, 50, 75, 100].some((level) => before < level && w[statusKey] >= level)
  )
    addFloatingText(
      game,
      w.x,
      w.y - 115,
      statusKey.toUpperCase() + ' ' + Math.round(w[statusKey]) + '%',
      c,
    );
}

export function extinguish(game: SimState, w: Wizard) {
  if (w.burn > 0) {
    w.burn = 0;
    w.burnTime = 0;
    w.burnTick = 0;
    addFloatingText(game, w.x, w.y - 130, 'EXTINGUISHED', '#7dd3fc');
    burst(game, w.x, w.y - 25, '#7dd3fc', 10, 3);
  }
}

/** Sets the wizard alight: +12 burn, or a full 100 for a bomb or trap. */
export function ignite(game: SimState, w: Wizard, full = false) {
  let was = w.burn;
  w.burn = full ? 100 : clamp(w.burn + 12, 0, 100);
  w.burnTime = 180;
  if (was === 0) w.burnTick = 0;
  if (was < 100 && w.burn >= 100)
    addFloatingText(game, w.x, w.y - 130, 'BURN 100%', SPELL_COLOR.FIRE);
  burst(game, w.x, w.y - 30, SPELL_COLOR.FIRE, 5, 2);
}

/** True if the wizard's shield stops this spell. No side effects, unlike `blocked`. */
export function shieldStops(w: Wizard, spell: SpellName) {
  return !!w.shield && w.shield.type !== 4 && SPELL_ELEMENTS[spell].includes(w.shield.type);
}

/** Least ticks between two BLOCKED! labels (and between two block bursts) on one wizard. */
const BLOCKED_LABEL_TICKS = 60;
const BLOCKED_BURST_TICKS = 10;

export function blocked(game: SimState, w: Wizard, spell: SpellName) {
  if (w.shield && shieldStops(w, spell)) {
    // A beam or spray is blocked every tick: show one label a second and a burst every few ticks,
    // not a stream of them.
    const colour = SPELL_COLOR[ELEMENT_NAMES[w.shield.type]];
    if (game.t - (w.statusDelay.blockedLabel ?? -Infinity) >= BLOCKED_LABEL_TICKS) {
      addFloatingText(game, w.x, w.y - 120, 'BLOCKED!', colour);
      w.statusDelay.blockedLabel = game.t;
    }
    if (game.t - (w.statusDelay.blockedBurst ?? -Infinity) >= BLOCKED_BURST_TICKS) {
      burst(game, w.x, w.y - 20, colour, 15);
      w.statusDelay.blockedBurst = game.t;
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
  spell: SpellName,
  amount: number,
  charged: boolean = false,
  bomb: boolean = false,
  variant: SpellVariant = 'default',
  power: number = 1,
) {
  if (game.ending || untouchable(game, w) || blocked(game, w, spell)) return;
  if (spell === 'FIRE') {
    w.wet = 0;
    if (w.freeze > 0) {
      w.freeze = 0;
      w.chill = 0;
      addFloatingText(game, w.x, w.y - 145, 'MELTED!', SPELL_COLOR.FIRE);
      burst(game, w.x, w.y - 20, SPELL_COLOR.ICE, 20, 5);
    }
    ignite(game, w, bomb);
  }
  if (spell === 'WATER') {
    extinguish(game, w);
    status(game, w, 'wet', bomb ? 100 : charged ? 35 : 11, 130, SPELL_COLOR.WATER);
  }
  if (spell === 'LIGHTNING') {
    amount *= 1 + w.wet / 100;
    if (w.wet > 0) addFloatingText(game, w.x, w.y - 140, 'ELECTROCUTION', SPELL_COLOR.LIGHTNING);
  }
  if (spell === 'EARTH' && w.freeze > 0) {
    amount *= 2;
    w.freeze = 0;
    w.chill = 0;
    burst(game, w.x, w.y - 20, '#ice-prison-shatter', 32, 8);
    addFloatingText(game, w.x, w.y - 145, 'SHATTER!', SPELL_COLOR.ICE);
  }
  if (spell === 'EARTH' && bomb) w.slow = BOMB.SLOW_TICKS;
  if (spell === 'ICE') {
    // An active freeze is a fixed-duration lock: subsequent ice hits can
    // damage the target, but must never refresh its timer or Chill meter.
    if (w.freeze <= 0) {
      if (bomb) {
        w.freeze = w.freezeMax = FREEZE_TICKS.BOMB;
        w.chill = 100;
        w.statusDelay.chill = FREEZE_TICKS.BOMB;
      } else {
        // Frost Shards chill a little each (7), a little more when charged (17 at full charge): even
        // all five of a full volley (85) leave the target short of frozen
        const chill = variant === 'shards' ? shardChill(power) : charged ? 38 : 25;
        status(game, w, 'chill', chill, 160, SPELL_COLOR.ICE);
        if (w.chill >= 100) w.freeze = w.freezeMax = FREEZE_TICKS.CHILL;
      }
    }
  }
  if (spell === 'STEAM')
    status(game, w, 'scald', bomb ? 100 : charged ? 36 : 26, 170, SPELL_COLOR.STEAM);
  if (spell === 'MAGNETIC')
    status(game, w, 'mag', bomb ? 100 : charged ? 38 : 27, 195, SPELL_COLOR.MAGNETIC);
  if (spell === 'PLASMA') {
    status(
      game,
      w,
      'over',
      bomb ? 100 : variant === 'plasma_beam' ? 10 : charged ? 38 : 28,
      175,
      SPELL_COLOR.PLASMA,
      variant === 'plasma_beam',
    );
    if (w.over >= 100) {
      w.over = 0;
      w.silence = 105;
      damage(game, w, 16, SPELL_COLOR.PLASMA);
      addFloatingText(game, w.x, w.y - 145, 'SILENCED!', SPELL_COLOR.PLASMA);
    }
  }
  if (spell === 'STORM') {
    status(game, w, 'stat', bomb ? 100 : charged ? 34 : 26, 165, SPELL_COLOR.STORM);
    if (w.stat >= 100) {
      w.stat = 0;
      damage(game, w, 18, SPELL_COLOR.STORM);
      addFloatingText(game, w.x, w.y - 145, 'DISCHARGE!', SPELL_COLOR.STORM);
    }
  }
  damage(game, w, amount, SPELL_COLOR[spell], variant === 'plasma_beam');
}
