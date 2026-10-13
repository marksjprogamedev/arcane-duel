// Maps the server's game clock onto this machine's clock, so snapshots can be placed on a
// timeline by when they were *simulated* rather than when they happened to arrive. That makes
// network jitter invisible to interpolation: a late packet just fills in a bit later.

export const TICK_MS = 1000 / 60;

/** How many recent snapshots the offset estimate looks at (about 3 s at 20 Hz). */
const WINDOW = 60;

export class ServerClock {
  private offsets: number[] = [];
  private offset: number | null = null;

  reset() {
    this.offsets = [];
    this.offset = null;
  }

  /**
   * Call for every snapshot. `serverMs` is the snapshot's game time, `arrivalMs` is performance.now().
   * The offset is the *smallest* observed (arrival - server) difference, i.e. the packets that
   * suffered the least delay; slower packets then show up as "late" instead of shifting the clock.
   */
  observe(serverMs: number, arrivalMs: number) {
    this.offsets.push(arrivalMs - serverMs);
    if (this.offsets.length > WINDOW) this.offsets.shift();
    this.offset = Math.min(...this.offsets);
  }

  /**
   * How late the slower packets typically are compared with the fastest ones (90th percentile of
   * the extra delay over the best case, ms). Tells interpolation how much cushion it needs.
   */
  jitterMs(): number {
    if (this.offset === null || this.offsets.length < 5) return 0;
    const extra = this.offsets.map((o) => o - this.offset!).sort((a, b) => a - b);
    return extra[Math.floor(extra.length * 0.9)];
  }

  /** Estimated current server game time (ms), or null before the first snapshot. */
  serverNow(localNowMs: number): number | null {
    return this.offset === null ? null : localNowMs - this.offset;
  }
}

export const serverClock = new ServerClock();
