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

/**
 * Creates a function that runs callbacks after a simulated delay, never reordering them.
 *
 * The callbacks wait in a queue and one timer runs them from the front. (One timer per callback
 * could reorder them: two messages that arrive in the same event loop turn are due at the same
 * time, but the timers measure from the loop's cached clock, so the later one can fire first.
 * A `join` handled before its `hello` then got the client told to refresh.)
 */
export function createDelayLine(baseMs: number, jitterMs = JITTER_MS) {
  const queue: { dueAt: number; run: () => void }[] = [];
  let lastDueAt = 0;
  let timer: NodeJS.Timeout | null = null;
  const runDue = () => {
    timer = null;
    const now = Date.now();
    while (queue.length && queue[0].dueAt <= now) queue.shift()!.run();
    if (queue.length) timer = setTimeout(runDue, queue[0].dueAt - now);
  };
  return (run: () => void) => {
    if (baseMs === 0 && jitterMs === 0 && queue.length === 0) {
      run();
      return;
    }
    const wanted = Date.now() + Math.max(0, baseMs + (Math.random() * 2 - 1) * jitterMs);
    lastDueAt = Math.max(lastDueAt, wanted);
    queue.push({ dueAt: lastDueAt, run });
    if (!timer) timer = setTimeout(runDue, lastDueAt - Date.now());
  };
}
