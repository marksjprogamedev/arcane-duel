/** How long the second click of a two-step confirm stays valid. */
export const CONFIRM_MS = 3000;

/**
 * Two-step confirm: the first `click()` arms it (and calls `onArm`); a second click while armed runs `onConfirm`.
 * After `ms` with no second click it disarms itself (`onDisarm`). `reset()` disarms silently-safe (also calls onDisarm).
 */
export function createConfirm(
  hooks: { onArm: () => void; onDisarm: () => void; onConfirm: () => void },
  ms = CONFIRM_MS,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const disarm = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    hooks.onDisarm();
  };
  return {
    armed: () => timer !== null,
    click() {
      if (timer === null) {
        timer = setTimeout(disarm, ms);
        hooks.onArm();
        return;
      }
      clearTimeout(timer);
      timer = null;
      hooks.onDisarm();
      hooks.onConfirm();
    },
    reset: disarm,
  };
}
