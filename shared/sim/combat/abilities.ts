import { BUBBLE, SPELL_COLOR, COOLDOWN_TICKS, ELEMENT_NAMES, SHIELD_LIFE } from '../../constants';
import { dist } from '../../math';
import { SimState } from '../../simState';
import type { ShieldType, Wizard } from '../../types';
import { burst, addFloatingText } from '../effects';
import { hasLineOfSight } from '../geometry';
import { humanControlled, targetsOf, untouchable } from '../teams';
import { damage, extinguish } from './damage';

/** Raises a shield. A silenced or frozen wizard can't. */
export function shield(game: SimState, w: Wizard, shieldType: ShieldType) {
  if (w.silence > 0 || w.freeze > 0) return false;
  w.shield = { type: shieldType, life: SHIELD_LIFE };
  if (shieldType === 4) w.healTick = 0;
  if (shieldType === 0) {
    w.wet = 0;
    w.chill = 0;
    extinguish(game, w);
  }
  if (shieldType === 1) extinguish(game, w);
  burst(
    game,
    w.x,
    w.y - 20,
    shieldType === 4 ? '#4ade80' : SPELL_COLOR[ELEMENT_NAMES[shieldType]],
    24,
    6,
  );
  return true;
}

export function heal(game: SimState, w: Wizard) {
  if (w.healCD > 0 || w.freeze > 0 || w.silence > 0 || w.swing > 0 || w.hp <= 0) return false;
  w.healCD = COOLDOWN_TICKS.HEAL;
  let amount = Math.min(w.max - w.hp, w.max * 0.25 * (1 - (0.6 * w.scald) / 100));
  w.hp += amount;
  burst(game, w.x, w.y - 20, '#4ade80', 42, 7);
  addFloatingText(game, w.x, w.y - 115, '+' + Math.round(amount) + ' HP', '#86efac');
  game.events.push({ type: 'wave', x: w.x, y: w.y, r: 10, life: 25, color: '#4ade80' });
  return true;
}

export function bubble(game: SimState, w: Wizard) {
  if (w.bubbleCD > 0 || w.freeze > 0 || w.silence > 0 || w.swing > 0 || w.hp <= 0) return false;
  w.bubbleCD = COOLDOWN_TICKS.BUBBLE;
  game.bubbles.push({ x: w.x, y: w.y, r: BUBBLE.RADIUS, owner: w, life: BUBBLE.LIFE });
  burst(game, w.x, w.y - 20, '#c4b5fd', 30, 6);
  game.events.push({ type: 'wave', x: w.x, y: w.y, r: 10, life: 25, color: '#c4b5fd' });
  return true;
}

export function sword(game: SimState, w: Wizard, target: Wizard) {
  if (
    w.swordCD > 0 ||
    w.cast > 0 ||
    w.freeze > 0 ||
    w.silence > 0 ||
    (humanControlled(game, w) && game.input[w.seat].holding)
  )
    return;
  w.swordCD = COOLDOWN_TICKS.SWORD;
  w.swing = 22;
  w.face = Math.atan2(target.y - w.y, target.x - w.x);
  if (untouchable(game, target)) return;
  if (dist(w, target) > 80 || !hasLineOfSight(w, target, 8, game.map.obstacles)) return;
  if (target.shield && target.shield.type === 3) {
    addFloatingText(game, target.x, target.y - 125, 'BLOCKED!', SPELL_COLOR.EARTH);
    return;
  }
  let amount = target.freeze > 0 ? 50 : 25;
  if (amount === 50) {
    target.freeze = 0;
    target.chill = 0;
    burst(game, target.x, target.y - 20, '#ice-prison-shatter', 32, 8);
    addFloatingText(game, target.x, target.y - 145, 'SHATTER!', SPELL_COLOR.ICE);
  }
  damage(game, target, amount, '#f8fafc');
}

export function force(game: SimState, w: Wizard) {
  if (w.forceCD > 0 || w.freeze > 0 || w.silence > 0 || w.swing > 0) return;
  w.forceCD = COOLDOWN_TICKS.FORCE;
  game.events.push({ type: 'wave', x: w.x, y: w.y, r: 8, life: 22, color: '#d8b4fe' });
  for (const target of targetsOf(game, w)) {
    if (dist(w, target) < 160 && hasLineOfSight(w, target, 5, game.map.obstacles)) {
      const d = dist(w, target) || 1;
      target.kx += ((target.x - w.x) / d) * 19;
      target.ky += ((target.y - w.y) / d) * 19;
      damage(game, target, 5, '#d8b4fe');
    }
  }
}
