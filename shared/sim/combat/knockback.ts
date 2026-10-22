import { BOMB } from '../../constants';
import { dist } from '../../math';
import type { Vec2, Wizard } from '../../types';

/**
 * Shoves a wizard straight away from `from` with knockback speed `force` (Water Surge, Water bomb).
 * With `glideTicks` the knockback fades slowly for that long, so a gentler push still carries far.
 */
export function shove(w: Wizard, from: Vec2, force: number, glideTicks = 0) {
  const d = dist(from, w);
  w.kx += (d > 1 ? (w.x - from.x) / d : 1) * force;
  w.ky += (d > 1 ? (w.y - from.y) / d : 0) * force;
  w.glide = Math.max(w.glide, glideTicks);
}

/** Drags a wizard to `to` (Magnetic bomb): their own walking is overridden while the pull carries them. */
export function pull(w: Wizard, to: Vec2) {
  if (dist(w, to) <= 12) return;
  // knockback decays by 0.82 a tick, so it carries a wizard 1 / (1 - 0.82) times its speed
  w.kx = (to.x - w.x) * (1 - 0.82);
  w.ky = (to.y - w.y) * (1 - 0.82);
  w.pulled = BOMB.MAGNETIC_PULL_TICKS;
}
