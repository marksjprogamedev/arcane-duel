// Counting attempts per key (an IP address or a username) in a fixed time window, in memory. Used to
// slow down password guessing and sign-up floods. The map is capped, oldest keys dropped first, so a
// flood of new keys can't grow it without bound.

export interface WindowLimiter {
  /** Counts one attempt for `key`; `ok: false` once it is over the limit for this window. */
  hit(key: string, now?: number): { ok: boolean; retryAfterSeconds: number };
  /** Whether `key` is over the limit, without counting an attempt. */
  blocked(key: string, now?: number): { ok: boolean; retryAfterSeconds: number };
  /** Forgets `key` (e.g. after a successful login). */
  clear(key: string): void;
}

export function createWindowLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}): WindowLimiter {
  const windows = new Map<string, { count: number; resetAt: number }>();
  // `hit` has just counted the attempt it asks about, so it may reach the limit; `blocked` asks about the
  // next attempt, which must stay under it.
  const verdict = (
    w: { count: number; resetAt: number } | undefined,
    now: number,
    allowed = limit,
  ) =>
    !w || w.resetAt <= now || w.count <= allowed
      ? { ok: true, retryAfterSeconds: 0 }
      : { ok: false, retryAfterSeconds: Math.ceil((w.resetAt - now) / 1000) };
  return {
    hit(key, now = Date.now()) {
      let w = windows.get(key);
      if (!w || w.resetAt <= now) {
        windows.delete(key);
        w = { count: 0, resetAt: now + windowMs };
        windows.set(key, w);
        if (windows.size > maxKeys) windows.delete(windows.keys().next().value!);
      }
      w.count++;
      return verdict(w, now);
    },
    blocked(key, now = Date.now()) {
      return verdict(windows.get(key), now, limit - 1);
    },
    clear(key) {
      windows.delete(key);
    },
  };
}
