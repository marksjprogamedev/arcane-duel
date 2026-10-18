// How wizards move. Used by the simulation and, online, by the client to predict its own wizard
// with exactly the same rules (see client/src/net/movePrediction.ts).

import { chargeMovementMultiplier } from '../charge';
import { BOMB } from '../constants';
import type { Wizard } from '../types';
import { DEFAULT_MAP, type MapDef } from '../maps';
import { walk } from './geometry';

/** Pixels per tick a wizard walks with nothing slowing it down. */
export const WALK_SPEED = 3.5;

/** Held movement keys, as in `PlayerInput.keys`. */
export type MoveKeys = Record<string, boolean>;

/** The parts of a wizard that movement reads and writes. */
export type Mover = Pick<
  Wizard,
  | 'x'
  | 'y'
  | 'kx'
  | 'ky'
  | 'freeze'
  | 'prison'
  | 'airborne'
  | 'slow'
  | 'pulled'
  | 'glide'
  | 'chill'
  | 'chargeSpell'
  | 'chargeTicks'
>;

/** Frozen, imprisoned or knocked-up wizards can't walk or be pushed. */
export const pinned = (w: Pick<Wizard, 'freeze' | 'prison' | 'airborne'>) =>
  w.freeze > 0 || w.prison > 0 || w.airborne > 0;

/** Bit per movement key, so a move command fits in one small number on the wire. */
const KEY_BITS = { KeyW: 1, KeyA: 2, KeyS: 4, KeyD: 8 } as const;
export const ALL_MOVE_KEY_BITS = 15;

export function moveKeysToBits(keys: MoveKeys): number {
  let bits = 0;
  for (const [code, bit] of Object.entries(KEY_BITS)) if (keys[code]) bits |= bit;
  return bits;
}

export function moveKeysFromBits(bits: number): MoveKeys {
  const keys: MoveKeys = {};
  for (const [code, bit] of Object.entries(KEY_BITS)) if (bits & bit) keys[code] = true;
  return keys;
}

/** Walks in the direction of the held keys, slowed by chill, charging and an Earth bomb; stopped while pinned or dragged. */
export function walkWithKeys(
  w: Mover,
  keys: MoveKeys,
  dt: number,
  speed = WALK_SPEED,
  map: MapDef = DEFAULT_MAP,
) {
  if (pinned(w) || w.pulled > 0) return;
  const mx = Number(!!keys.KeyD) - Number(!!keys.KeyA);
  const my = Number(!!keys.KeyS) - Number(!!keys.KeyW);
  const length = Math.hypot(mx, my) || 1;
  const slow = w.slow > 0 ? 1 - BOMB.SLOW : 1;
  const step =
    speed *
    chargeMovementMultiplier(w.chargeTicks, w.chargeSpell) *
    (1 - (0.75 * w.chill) / 100) *
    slow *
    dt;
  walk(w, (mx / length) * step, (my / length) * step, map);
}

/** Slides a wizard along its knockback velocity (force push), which then decays. */
export function applyKnockback(w: Mover, dt: number, map: MapDef = DEFAULT_MAP) {
  if (pinned(w)) {
    w.kx = w.ky = 0;
    return;
  }
  if (Math.abs(w.kx) + Math.abs(w.ky) <= 0.15) {
    w.glide = 0;
    return;
  }
  walk(w, w.kx * dt, w.ky * dt, map);
  const friction = Math.pow(w.glide > 0 ? BOMB.GLIDE_FRICTION : 0.82, dt);
  w.kx *= friction;
  w.ky *= friction;
}

/**
 * Everything that moves one wizard during one tick, in the simulation's order: the freeze timer
 * runs down, knockback slides, then the wizard walks. The client replays this for prediction.
 */
export function stepMovement(w: Mover, keys: MoveKeys, dt: number, map: MapDef = DEFAULT_MAP) {
  w.freeze = Math.max(0, w.freeze - dt);
  w.prison = Math.max(0, w.prison - dt);
  w.airborne = Math.max(0, w.airborne - dt);
  w.slow = Math.max(0, w.slow - dt);
  w.pulled = Math.max(0, w.pulled - dt);
  w.glide = Math.max(0, w.glide - dt);
  applyKnockback(w, dt, map);
  walkWithKeys(w, keys, dt, WALK_SPEED, map);
}
