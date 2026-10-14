// How wizards move. Used by the simulation and, online, by the client to predict its own wizard
// with exactly the same rules (see client/src/net/movePrediction.ts).

import type { Wizard } from '../types';
import { walk } from './geometry';

/** Pixels per tick a wizard walks with nothing slowing it down. */
export const WALK_SPEED = 3.5;

/** Held movement keys, as in `PlayerInput.keys`. */
export type MoveKeys = Record<string, boolean>;

/** The parts of a wizard that movement reads and writes. */
export type Mover = Pick<Wizard, 'x' | 'y' | 'kx' | 'ky' | 'freeze' | 'chill'>;

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

/** Walks in the direction of the held keys, slowed by chill and stopped while frozen. */
export function walkWithKeys(w: Mover, keys: MoveKeys, dt: number, speed = WALK_SPEED) {
  if (w.freeze > 0) return;
  const mx = Number(!!keys.KeyD) - Number(!!keys.KeyA);
  const my = Number(!!keys.KeyS) - Number(!!keys.KeyW);
  const length = Math.hypot(mx, my) || 1;
  const step = speed * (1 - (0.75 * w.chill) / 100) * dt;
  walk(w, (mx / length) * step, (my / length) * step);
}

/** Slides a wizard along its knockback velocity (force push), which then decays. */
export function applyKnockback(w: Mover, dt: number) {
  if (Math.abs(w.kx) + Math.abs(w.ky) <= 0.15) return;
  walk(w, w.kx * dt, w.ky * dt);
  w.kx *= Math.pow(0.82, dt);
  w.ky *= Math.pow(0.82, dt);
}

/**
 * Everything that moves one wizard during one tick, in the simulation's order: the freeze timer
 * runs down, knockback slides, then the wizard walks. The client replays this for prediction.
 */
export function stepMovement(w: Mover, keys: MoveKeys, dt: number) {
  w.freeze = Math.max(0, w.freeze - dt);
  applyKnockback(w, dt);
  walkWithKeys(w, keys, dt);
}
