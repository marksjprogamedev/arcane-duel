import type { SimState } from '../../../shared/simState';
import type { Vec2 } from '../../../shared/types';

/** A move longer than this in one step is a jump (respawn, teleport) and is not smoothed. */
const MAX_SMOOTHED_STEP_PX = 60;

const copy = (v: Vec2): Vec2 => ({ x: v.x, y: v.y });

/**
 * Render interpolation for a fixed-step simulation: remember where things were before the latest
 * step, then draw them part-way between there and where they are now.
 */
export class RenderInterpolator {
  private wizards = new Map<object, Vec2>();
  private shots = new Map<number, Vec2>();
  private bombs = new Map<number, Vec2>();

  reset() {
    this.wizards.clear();
    this.shots.clear();
    this.bombs.clear();
  }

  /** Call right before each simulation step. */
  capture(game: SimState) {
    this.reset();
    for (const w of game.wizards) if (w) this.wizards.set(w, copy(w));
    for (const shot of game.shots) this.shots.set(shot.id, copy(shot));
    for (const bomb of game.bombs) this.bombs.set(bomb.id, copy(bomb));
  }

  /**
   * Moves everything to its position `alpha` (0..1) of the way from the captured state to the
   * current one. Returns a function that puts the real positions back; call it after drawing.
   */
  apply(game: SimState, alpha: number): () => void {
    const restore: (() => void)[] = [];
    const blend = (item: Vec2, prev: Vec2 | undefined) => {
      if (!prev || alpha >= 1) return;
      if (Math.hypot(item.x - prev.x, item.y - prev.y) > MAX_SMOOTHED_STEP_PX) return;
      const real = copy(item);
      item.x = prev.x + (real.x - prev.x) * alpha;
      item.y = prev.y + (real.y - prev.y) * alpha;
      restore.push(() => {
        item.x = real.x;
        item.y = real.y;
      });
    };
    for (const w of game.wizards) if (w) blend(w, this.wizards.get(w));
    for (const shot of game.shots) blend(shot, this.shots.get(shot.id));
    for (const bomb of game.bombs) blend(bomb, this.bombs.get(bomb.id));
    return () => restore.forEach((r) => r());
  }
}
