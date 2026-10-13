import { game } from '../state';

export const damageBatches = new Map();

export function float(x, y, s, c) {
  game.labels.push({ x, y, s, c, life: 60 });
}

export function queueDamageNumber(w, n, c, kind = 'direct') {
  const id = (w === game.p ? 'p' : 'e') + ':' + kind;
  let batch = damageBatches.get(id);
  if (!batch) {
    batch = { w, n: 0, c, kind, elapsed: 0 };
    damageBatches.set(id, batch);
  }
  batch.n += n;
  batch.c = c;
}

export function flushDamageNumbers(dt) {
  for (const [id, b] of damageBatches) {
    b.elapsed += dt;
    if (b.elapsed < 30) continue; // 0.5 seconds at the game's 60Hz tick
    const owner = id.slice(0, 1),
      kind = b.kind;
    // Limit each wizard to three simultaneous damage labels, without
    // discarding status messages or other important notifications.
    const own = game.labels.filter((q) => q.damageOwner === owner);
    while (own.length >= 3) {
      const oldest = own.shift();
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
    damageBatches.delete(id);
  }
}
