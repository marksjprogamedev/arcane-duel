import type { Bomb } from '../../../../../shared/types';

/** Per-bomb values shared by the element sprites. The canvas is already translated to the bomb and scaled by its pulse. */
export type BombCtx = {
  b: Bomb;
  color: string;
  /** 0 when the fuse is full, 1 at detonation. */
  urgency: number;
  /** Slow spin angle, in radians. */
  angular: number;
};
