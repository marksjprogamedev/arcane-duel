// The pure part of the cooldown readouts (no DOM), so it can be tested.

/** Seconds left of a cooldown: one decimal under ten seconds, whole seconds (rounded up) from there. */
export function cooldownSeconds(ticks: number): string {
  const secs = ticks / 60;
  return secs >= 9.95 ? String(Math.ceil(secs)) : secs.toFixed(1);
}
