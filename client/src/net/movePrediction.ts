// Client-side prediction and reconciliation for your own wizard (online play).
//
// Every game tick the client records a move command (held keys), moves its predicted wizard with
// the simulation's own movement rules, and sends the command to the server. When a snapshot
// arrives it says which command the server applied last (`ack`). The client then starts again
// from the server's position and replays the commands the server has not seen yet. If that puts
// the wizard somewhere else than where it was drawn, the difference becomes a small visual
// correction that fades out, so mistakes are fixed without visible jumps.

import {
  moveKeysFromBits,
  moveKeysToBits,
  stepMovement,
  type MoveKeys,
  type Mover,
} from '../../../shared/sim/movement';
import type { Vec2 } from '../../../shared/types';

/** A correction bigger than this is a teleport (respawn, new round): jump instead of gliding. */
const SNAP_DISTANCE_PX = 140;
/** Time constant of the visual correction fading out (63% gone after this long). */
const CORRECTION_FADE_MS = 90;
/** Unacknowledged commands kept at most (10 s); the oldest are dropped beyond this. */
const MAX_PENDING = 600;

interface PendingMove {
  seq: number;
  keys: number;
}

const copyMover = (w: Mover): Mover => ({
  x: w.x,
  y: w.y,
  kx: w.kx,
  ky: w.ky,
  freeze: w.freeze,
  chill: w.chill,
});

export class MovePredictor {
  private seq = 0;
  private pending: PendingMove[] = [];
  /** Predicted wizard after the newest local tick, and its position one tick earlier. */
  private current: Mover | null = null;
  private previous: Vec2 | null = null;
  /** Drawn position = predicted position + correction; the correction fades to zero. */
  private correction: Vec2 = { x: 0, y: 0 };

  reset() {
    this.seq = 0;
    this.pending = [];
    this.current = null;
    this.previous = null;
    this.correction = { x: 0, y: 0 };
  }

  /** True once the first snapshot has given us a position to predict from. */
  get ready() {
    return this.current !== null;
  }

  /**
   * The seq the next tick() will use. A key change is sent straight away under this number, so
   * the server hears about it without waiting up to a tick; tick() then sends the same number.
   */
  get nextSeq() {
    return this.seq + 1;
  }

  /** Number of commands sent but not yet acknowledged by the server. */
  get unacknowledged() {
    return this.pending.length;
  }

  /** One local game tick: records a move command and moves the predicted wizard. */
  tick(keys: MoveKeys): { seq: number; keys: number } {
    const command = { seq: ++this.seq, keys: moveKeysToBits(keys) };
    this.pending.push(command);
    if (this.pending.length > MAX_PENDING) this.pending.shift();
    if (this.current) {
      this.previous = { x: this.current.x, y: this.current.y };
      stepMovement(this.current, keys, 1);
    }
    return command;
  }

  /** A snapshot arrived: `server` is our wizard as the server had it after command `ack`. */
  reconcile(server: Mover, ack: number) {
    this.pending = this.pending.filter((m) => m.seq > ack);
    const replayed = copyMover(server);
    for (const m of this.pending) stepMovement(replayed, moveKeysFromBits(m.keys), 1);
    if (this.current) {
      // keep drawing where we were; the correction then glides to the new prediction
      const dx = this.current.x - replayed.x;
      const dy = this.current.y - replayed.y;
      this.correction.x += dx;
      this.correction.y += dy;
      if (this.previous) {
        this.previous.x -= dx;
        this.previous.y -= dy;
      }
      if (Math.hypot(this.correction.x, this.correction.y) > SNAP_DISTANCE_PX) {
        this.correction = { x: 0, y: 0 };
        this.previous = null;
      }
    }
    this.current = replayed;
  }

  /**
   * Where to draw our wizard this frame. `alpha` (0..1) is how far we are into the next tick;
   * `elapsedMs` is the time since the previous frame (fades the correction).
   */
  drawPosition(alpha: number, elapsedMs: number): Vec2 | null {
    if (!this.current) return null;
    const fade = Math.exp(-Math.max(0, elapsedMs) / CORRECTION_FADE_MS);
    this.correction.x *= fade;
    this.correction.y *= fade;
    if (Math.hypot(this.correction.x, this.correction.y) < 0.05) this.correction = { x: 0, y: 0 };
    const from = this.previous ?? this.current;
    return {
      x: from.x + (this.current.x - from.x) * alpha + this.correction.x,
      y: from.y + (this.current.y - from.y) * alpha + this.correction.y,
    };
  }
}

export const movePredictor = new MovePredictor();
