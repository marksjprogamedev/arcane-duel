import { pillars } from '../../../shared/constants';
import { clamp } from '../../../shared/math';

export function walk(w, dx, dy) {
  let x = clamp(w.x + dx, 28, 772);
  if (!pillars.some((o) => Math.hypot(x - o.x, w.y - o.y) < o.r + 18)) w.x = x;
  let y = clamp(w.y + dy, 28, 572);
  if (!pillars.some((o) => Math.hypot(w.x - o.x, y - o.y) < o.r + 18)) w.y = y;
}

export function ray(x, y, tx, ty, margin = 0) {
  let dx = tx - x,
    dy = ty - y,
    A = dx * dx + dy * dy;
  if (A < 0.001) return null;
  let best = null;
  for (let o of pillars) {
    let ox = x - o.x,
      oy = y - o.y,
      r = o.r + margin,
      B = 2 * (ox * dx + oy * dy),
      D = B * B - 4 * A * (ox * ox + oy * oy - r * r);
    if (D < 0) continue;
    let u = (-B - Math.sqrt(D)) / (2 * A);
    if (u >= 0 && u <= 1 && (!best || u < best.u)) best = { u, x: x + dx * u, y: y + dy * u };
  }
  return best;
}

export const clear = (a, b, m = 0) => !ray(a.x, a.y, b.x, b.y, m);
