// Optional network simulation for local testing. Delays are per direction and order-preserving
// (like TCP: a late message delays the ones behind it instead of being overtaken).
//
//   ARCANE_LATENCY_MS     one-way delay server -> client (existing setting)
//   ARCANE_LATENCY_IN_MS  one-way delay client -> server (default 0)
//   ARCANE_JITTER_MS      +/- random variation applied to both

const clampEnv = (name: string, max: number) =>
  Math.max(0, Math.min(max, Number(process.env[name]) || 0));

export const OUT_DELAY_MS = clampEnv('ARCANE_LATENCY_MS', 1000);
export const IN_DELAY_MS = clampEnv('ARCANE_LATENCY_IN_MS', 1000);
export const JITTER_MS = clampEnv('ARCANE_JITTER_MS', 500);

/** Creates a function that runs callbacks after a simulated delay, never reordering them. */
export function createDelayLine(baseMs: number) {
  let lastDueAt = 0;
  return (run: () => void) => {
    const now = Date.now();
    const wanted = now + Math.max(0, baseMs + (Math.random() * 2 - 1) * JITTER_MS);
    if (baseMs === 0 && JITTER_MS === 0 && lastDueAt <= now) {
      run();
      return;
    }
    lastDueAt = Math.max(lastDueAt, wanted);
    setTimeout(run, lastDueAt - now);
  };
}
