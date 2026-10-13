import { names } from '../constants';
import { clamp } from '../math';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../protocol';
import { SimState } from '../simState';
import type { WizardId } from '../types';
import { bomb, cast, force, heal, shield, sword } from './combat';
import { comb } from './wizard';

/**
 * A single player action, in simulation terms. Both the local keyboard/mouse and network
 * messages from the remote player are translated into these and fed to `applyInput`.
 */
export type InputEvent =
  | { kind: 'key'; code: string; down: boolean }
  | { kind: 'pointerdown'; x: number; y: number }
  | { kind: 'pointerup'; x: number; y: number }
  | { kind: 'bomb'; x: number; y: number }
  | { kind: 'aim'; x: number; y: number }
  | { kind: 'clear' };

const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
const CONTINUOUS = ['FIRE', 'WATER', 'LIGHTNING'];

/** Hints are guidance for the local player only (wizard `p`). */
function hint(game: SimState, side: WizardId, text: string) {
  if (side === 'p') game.events.push({ type: 'hint', text });
}

/** Turns the loaded elements into the current attack. */
export function commit(game: SimState, side: WizardId) {
  const input = game.input[side];
  if (!input.loaded.length) return;
  input.attack = comb(input.loaded)!;
  input.loaded = [];
  input.healArmed = false;
}

export function applyInput(game: SimState, side: WizardId, ev: InputEvent) {
  if (game.ending) return;
  const input = game.input[side];
  const me = side === 'p' ? game.p : game.e;
  const foe = side === 'p' ? game.e : game.p;

  switch (ev.kind) {
    case 'aim':
      input.mouse = { x: ev.x, y: ev.y };
      return;
    case 'clear':
      input.keys = {};
      input.holding = false;
      input.charge = 0;
      return;
    case 'pointerdown':
      input.mouse = { x: ev.x, y: ev.y };
      if (me.swing > 0 || me.silence > 0 || me.freeze > 0) return;
      commit(game, side);
      input.holding = true;
      input.charge = 0;
      return;
    case 'pointerup':
      input.mouse = { x: ev.x, y: ev.y };
      if (input.holding && !CONTINUOUS.includes(input.attack)) {
        const power = input.charge >= 20 ? 1.5 + (input.charge / 90) * 1.5 : 1;
        if (me.cast <= 0 && cast(game, me, ev.x, ev.y, power, input.attack)) me.cast = 20;
      }
      input.holding = false;
      input.charge = 0;
      return;
    case 'bomb':
      input.mouse = { x: ev.x, y: ev.y };
      commit(game, side);
      bomb(game, me, ev.x, ev.y, input.attack);
      return;
    case 'key':
      applyKey(game, side, input, me, foe, ev.code, ev.down);
      return;
  }
}

function applyKey(
  game: SimState,
  side: WizardId,
  input: (typeof game.input)[WizardId],
  me: typeof game.p,
  foe: typeof game.p,
  code: string,
  down: boolean,
) {
  if (MOVE_KEYS.includes(code)) {
    input.keys[code] = down;
    return;
  }
  if (!down) return;

  if (code === 'KeyE') {
    input.healArmed = true;
    input.loaded = [];
    hint(game, side, 'Healing loaded · Press 2 for Greater Heal or Space for Healing Shield');
    return;
  }
  if (code === 'Digit2' && input.healArmed) {
    input.healArmed = false;
    input.loaded = [];
    hint(
      game,
      side,
      heal(game, me) ? 'Greater Healing cast!' : 'Greater Healing unavailable or cooling down',
    );
    return;
  }
  if (code === 'Space') {
    if (input.healArmed) {
      shield(game, me, 4);
      input.healArmed = false;
      input.loaded = [];
      hint(game, side, 'Healing Shield cast · Attack remains ' + input.attack);
    } else if (input.loaded.length) {
      const sh = input.loaded[input.loaded.length - 1];
      shield(game, me, sh);
      input.loaded = [];
      hint(game, side, names[sh] + ' Shield cast · Attack remains ' + input.attack);
    } else hint(game, side, 'Load an element with 1–4 before pressing Space');
    return;
  }
  if (/^Digit[1-4]$/.test(code)) {
    const i = Number(code.slice(-1)) - 1;
    input.healArmed = false;
    input.loaded =
      input.loaded.length >= 2 || input.loaded.includes(i) ? [i] : [...input.loaded, i];
    hint(game, side, 'Loaded ' + comb(input.loaded) + ' · Click to attack or Space for shield');
    return;
  }
  if (code === 'KeyF') {
    input.healArmed = false;
    sword(game, me, foe);
  } else if (code === 'KeyQ') {
    input.healArmed = false;
    force(game, me, foe);
  } else if (code === 'KeyB') {
    commit(game, side);
    bomb(game, me, input.mouse.x, input.mouse.y, input.attack);
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

/** Translates a (guest -> host/server) input message into a simulation input event. */
export function inputEventFromWire(m: WireInput): InputEvent | null {
  const x = clamp(Number(m.x) || 0, 0, ARENA_WIDTH);
  const y = clamp(Number(m.y) || 0, 0, ARENA_HEIGHT);
  switch (m.action) {
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
    case 'key':
      return { kind: 'key', code: String(m.key ?? ''), down: !!m.down };
    default:
      return null;
  }
}
