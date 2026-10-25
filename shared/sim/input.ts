import { BUBBLE, ELEMENT_NAMES } from '../constants';
import { CHARGE_TICKS } from '../charge';
import { clamp } from '../math';
import type { MapDef } from '../maps';
import { SimState } from '../simState';
import type { Seat, Wizard } from '../types';
import { bubble, force, heal, shield, sword } from './combat/abilities';
import { cast } from './combat/cast';
import { bomb } from './combat/projectiles';
import { trap } from './combat/traps';
import { combineElements } from './wizard';
import {
  continuousVariant,
  chargeableVariant,
  hasBomb,
  isUncharged,
  spellVariant,
} from './variants';

/**
 * A single player action, in simulation terms. Both the local keyboard/mouse and network
 * messages from the remote player are translated into these and fed to `applyInput`.
 */
export type InputEvent =
  | { kind: 'key'; code: string; down: boolean }
  | { kind: 'pointerdown'; x: number; y: number }
  | { kind: 'pointerup'; x: number; y: number }
  | { kind: 'bomb'; x: number; y: number }
  | { kind: 'trap'; x: number; y: number }
  | { kind: 'aim'; x: number; y: number }
  | { kind: 'clear' };

export const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];

/** Hints are guidance for the local player only (seat 0). */
function hint(game: SimState, side: Seat, text: string) {
  if (side === 0) game.events.push({ type: 'hint', text });
}

/** Turns the loaded elements into the current attack. */
export function commit(game: SimState, side: Seat) {
  const input = game.input[side];
  if (!input.loaded.length) return;
  input.attack = combineElements(input.loaded)!;
  input.loaded = [];
  input.healArmed = false;
}

export function applyInput(game: SimState, side: Seat, ev: InputEvent) {
  if (game.ending) return;
  const input = game.input[side];
  const me = game.wizards[side];
  if (me.fallen) return; // a fallen wizard watches

  switch (ev.kind) {
    case 'aim':
      input.mouse = { x: ev.x, y: ev.y };
      return;
    case 'clear':
      input.keys = {};
      input.holding = false;
      me.plasmaReach = 0;
      game.arcs = game.arcs.filter(
        (arc) => !(arc.variant === 'plasma_beam' && arc.castOwner === side),
      );
      input.charge = 0;
      me.chargeSpell = null;
      me.chargeTicks = 0;
      return;
    case 'pointerdown':
      input.mouse = { x: ev.x, y: ev.y };
      if (me.swing > 0 || me.silence > 0 || me.freeze > 0) return;
      commit(game, side);
      // A cooling-down Magma spell cannot begin charging. The player must
      // release and press again once it is ready.
      if (input.attack === 'MAGMA' && me.magmaCD > 0) return;
      if (input.attack === 'PLASMA' && input.loadout.PLASMA === 'plasma_beam') {
        me.plasmaReach = 0;
        game.arcs = game.arcs.filter(
          (arc) => !(arc.variant === 'plasma_beam' && arc.castOwner === side),
        );
      }
      input.holding = true;
      input.charge = 0;
      me.chargeSpell = chargeableVariant(input.attack, input.loadout) ? input.attack : null;
      me.chargeTicks = 0;
      return;
    case 'pointerup':
      input.mouse = { x: ev.x, y: ev.y };
      if (input.holding && !continuousVariant(input.attack, input.loadout)) {
        const power = isUncharged(spellVariant(input.attack, input.loadout))
          ? 1
          : 1 + (Math.min(input.charge, CHARGE_TICKS) / CHARGE_TICKS) * 2;
        if (me.cast <= 0 && cast(game, me, ev.x, ev.y, power, input.attack, input.loadout))
          me.cast = 20;
      }
      input.holding = false;
      input.charge = 0;
      me.chargeSpell = null;
      me.chargeTicks = 0;
      return;
    case 'bomb':
      input.mouse = { x: ev.x, y: ev.y };
      commit(game, side);
      if (!hasBomb(input.attack)) hint(game, side, input.attack + ' has no bomb');
      bomb(game, me, ev.x, ev.y, input.attack, input.loadout);
      return;
    case 'trap':
      input.mouse = { x: ev.x, y: ev.y };
      commit(game, side);
      if (trap(game, me, ev.x, ev.y, input.attack)) hint(game, side, input.attack + ' trap set');
      return;
    case 'key':
      applyKey(game, side, input, me, ev.code, ev.down);
      return;
  }
}

function applyKey(
  game: SimState,
  side: Seat,
  input: SimState['input'][number],
  me: Wizard,
  code: string,
  down: boolean,
) {
  if (MOVE_KEYS.includes(code)) {
    input.keys[code] = down;
    return;
  }
  if (!down) return;
  if (me.freeze > 0) {
    hint(game, side, 'Frozen · Nothing works until you thaw');
    return;
  }
  // a bubble is two Space presses in a row: any other key in between makes the next Space a new tap
  if (code !== 'Space') input.lastSpace = -Infinity;

  // E loads healing; a second E casts Greater Heal (Space instead raises the Healing Shield)
  if (code === 'KeyE' && input.healArmed) {
    input.healArmed = false;
    input.loaded = [];
    hint(
      game,
      side,
      heal(game, me) ? 'Greater Healing cast!' : 'Greater Healing unavailable or cooling down',
    );
    return;
  }
  if (code === 'KeyE') {
    input.healArmed = true;
    input.loaded = [];
    hint(game, side, 'Healing loaded · Press E again for Greater Heal or Space for Healing Shield');
    return;
  }
  if (code === 'Space') {
    const doubleTap = game.t - input.lastSpace <= BUBBLE.DOUBLE_TAP_TICKS;
    input.lastSpace = game.t;
    if (doubleTap && bubble(game, me)) {
      input.lastSpace = -Infinity;
      hint(game, side, 'Reflective Bubble cast');
      return;
    }
    if (me.silence > 0) {
      // silenced: no shield, and what is loaded stays loaded for when it wears off
      hint(game, side, 'Silenced · No shields until it wears off');
    } else if (input.healArmed) {
      shield(game, me, 4);
      input.healArmed = false;
      input.loaded = [];
      hint(game, side, 'Healing Shield cast · Attack remains ' + input.attack);
    } else if (input.loaded.length) {
      const sh = input.loaded[input.loaded.length - 1];
      shield(game, me, sh);
      input.loaded = [];
      hint(game, side, ELEMENT_NAMES[sh] + ' Shield cast · Attack remains ' + input.attack);
    } else hint(game, side, 'Load an element with 1–4 before pressing Space');
    return;
  }
  if (/^Digit[1-4]$/.test(code)) {
    const i = Number(code.slice(-1)) - 1;
    input.healArmed = false;
    input.loaded =
      input.loaded.length >= 2 || input.loaded.includes(i) ? [i] : [...input.loaded, i];
    hint(
      game,
      side,
      'Loaded ' + combineElements(input.loaded) + ' · Click to attack or Space for shield',
    );
    return;
  }
  if (code === 'KeyF') {
    input.healArmed = false;
    sword(game, me, Math.atan2(input.mouse.y - me.y, input.mouse.x - me.x));
  } else if (code === 'KeyQ') {
    input.healArmed = false;
    force(game, me);
  } else if (code === 'KeyT') {
    commit(game, side);
    if (trap(game, me, input.mouse.x, input.mouse.y, input.attack))
      hint(game, side, input.attack + ' trap set');
  } else if (code === 'KeyB') {
    commit(game, side);
    if (!hasBomb(input.attack)) hint(game, side, input.attack + ' has no bomb');
    bomb(game, me, input.mouse.x, input.mouse.y, input.attack, input.loadout);
  }
}

/** The fields of a network input message that matter to the simulation. */
export interface WireInput {
  action: string;
  key?: string;
  down?: boolean;
  x?: number;
  y?: number;
}

/** Translates a (client -> server) input message into a simulation input event on `map`. */
export function inputEventFromWire(message: WireInput, map: MapDef): InputEvent | null {
  const x = clamp(Number(message.x) || 0, 0, map.width);
  const y = clamp(Number(message.y) || 0, 0, map.height);
  switch (message.action) {
    case 'aim':
      return { kind: 'aim', x, y };
    case 'clear':
      return { kind: 'clear' };
    case 'down':
      return { kind: 'pointerdown', x, y };
    case 'up':
      return { kind: 'pointerup', x, y };
    case 'bomb':
      return { kind: 'bomb', x, y };
    case 'trap':
      return { kind: 'trap', x, y };
    case 'key':
      return { kind: 'key', code: String(message.key ?? ''), down: !!message.down };
    default:
      return null;
  }
}
