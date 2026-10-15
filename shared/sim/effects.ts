import { SimState } from '../simState';
import type { FxEvent, SimEvent, Wizard } from '../types';

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
export function float(game: SimState, x: number, y: number, s: string, c: string) {
  game.events.push({ type: 'text', x, y, text: s, c });
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
  for (const [id, b] of game.damageBatches) {
    b.elapsed += dt;
    if (b.elapsed < 12) continue; // 0.2 seconds: responsive hit feedback
    const burn = b.kind === 'burn';
    game.events.push({
      type: 'text',
      x: b.w.x + (burn ? 13 : 0),
      y: b.w.y - (burn ? 105 : 85),
      text: (burn ? '-' : '') + String(Math.round(b.n)) + (burn ? ' 🔥' : ''),
      c: b.c,
      damageOwner: b.w.seat,
    });
    game.damageBatches.delete(id);
  }
}
