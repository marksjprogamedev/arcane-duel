import { SimState } from '../simState';
import type { Wizard } from '../types';

export function float(game: SimState, x: number, y: number, s: string, c: string) {
  game.labels.push({ x, y, s, c, life: 60 });
}

export function queueDamageNumber(
  game: SimState,
  w: Wizard,
  n: number,
  c: string,
  kind: 'direct' | 'burn' = 'direct',
) {
  const id = (w === game.p ? 'p' : 'e') + ':' + kind;
  let batch = game.damageBatches.get(id);
  if (!batch) {
    batch = { w, n: 0, c, kind, elapsed: 0 };
    game.damageBatches.set(id, batch);
  }
  batch.n += n;
  batch.c = c;
}

export function flushDamageNumbers(game: SimState, dt: number) {
  for (const [id, b] of game.damageBatches) {
    b.elapsed += dt;
    if (b.elapsed < 30) continue; // 0.5 seconds at the game's 60Hz tick
    const owner = id.slice(0, 1),
      kind = b.kind;
    // Limit each wizard to three simultaneous damage labels, without
    // discarding status messages or other important notifications.
    const own = game.labels.filter((q) => q.damageOwner === owner);
    while (own.length >= 3) {
      const oldest = own.shift()!;
      const i = game.labels.indexOf(oldest);
      if (i >= 0) game.labels.splice(i, 1);
    }
    game.labels.push({
      x: b.w.x + (kind === 'burn' ? 13 : 0),
      y: b.w.y - (kind === 'burn' ? 105 : 85),
      s: (kind === 'burn' ? '-' : '') + String(Math.round(b.n)) + (kind === 'burn' ? ' 🔥' : ''),
      c: b.c,
      life: 52,
      damageOwner: owner,
    });
    game.damageBatches.delete(id);
  }
}
