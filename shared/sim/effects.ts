import { SimState } from '../simState';
import type { FxEvent, Seat, SimEvent, Wizard } from '../types';

const FX_TYPES = new Set<SimEvent['type']>([
  'burst',
  'spray',
  'magma_trail',
  'bolt_trail',
  'text',
  'lightning',
  'wave',
  'magnetic_implosion',
]);

/** True for purely cosmetic events (clients turn them into particles, text, arcs and rings). */
export const isFxEvent = (ev: SimEvent): ev is FxEvent => FX_TYPES.has(ev.type);

/** Floating text above the arena, e.g. "BLOCKED!". */
export function addFloatingText(game: SimState, x: number, y: number, text: string, c: string) {
  game.events.push({ type: 'text', x, y, text, c });
}

export function burst(
  game: SimState,
  x: number,
  y: number,
  c: string,
  n: number = 10,
  power: number = 4,
  castOwner: Seat | null = null,
) {
  game.events.push({ type: 'burst', x, y, c, n, power, castOwner });
}

export function queueDamageNumber(
  game: SimState,
  w: Wizard,
  n: number,
  c: string,
  kind: 'direct' | 'burn' = 'direct',
) {
  const id = w.seat + ':' + kind;
  let batch = game.damageBatches.get(id);
  if (!batch) {
    batch = { w, n: 0, c, kind, elapsed: 0 };
    game.damageBatches.set(id, batch);
  }
  batch.n += n;
  batch.c = c;
}

/** Damage is summed for 0.5 s per wizard and kind, then shown as one floating number. */
export function flushDamageNumbers(game: SimState, dt: number) {
  for (const [id, batch] of game.damageBatches) {
    batch.elapsed += dt;
    if (batch.elapsed < 12) continue; // 0.2 seconds: responsive hit feedback
    const burn = batch.kind === 'burn';
    // a burn number is not shown over a wizard who has fallen or died since it was queued
    if (burn && (batch.w.fallen || batch.w.hp <= 0)) {
      game.damageBatches.delete(id);
      continue;
    }
    game.events.push({
      type: 'text',
      x: batch.w.x + (burn ? 13 : 0),
      y: batch.w.y - (burn ? 105 : 85),
      text: (burn ? '-' : '') + String(Math.round(batch.n)) + (burn ? ' 🔥' : ''),
      c: batch.c,
      damageOwner: batch.w.seat,
    });
    game.damageBatches.delete(id);
  }
}
