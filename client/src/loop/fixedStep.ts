/**
 * Turns variable frame times into a whole number of fixed simulation steps.
 * The simulation always advances in identical steps, so a match plays the same on a 60 Hz and a
 * 144 Hz monitor (and the same as on the server). `alpha` is how far we are into the next step,
 * used to draw smoothly between the last two states.
 */
export class FixedStepper {
  private accumulatedMs = 0;

  constructor(
    readonly stepMs: number,
    /** Most steps taken per frame; beyond this the backlog is dropped (tab was hidden, long stall). */
    readonly maxStepsPerFrame = 5,
  ) {}

  reset() {
    this.accumulatedMs = 0;
  }

  advance(elapsedMs: number): { steps: number; alpha: number } {
    this.accumulatedMs += Math.max(0, elapsedMs);
    let steps = 0;
    while (this.accumulatedMs >= this.stepMs && steps < this.maxStepsPerFrame) {
      this.accumulatedMs -= this.stepMs;
      steps++;
    }
    if (this.accumulatedMs >= this.stepMs) this.accumulatedMs = 0;
    return { steps, alpha: this.accumulatedMs / this.stepMs };
  }
}
