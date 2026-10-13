/**
 * An Earth projectile that the server confirms must stay visible to its caster,
 * even if the local cooldown suppressed its visual-only preview.
 * Suppress the server copy only when an active predicted Earth projectile is
 * visually close to it. This avoids both missing shots and obvious duplicates.
 */
export interface EarthShotVisual {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface EarthPreviewVisual {
  kind: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  age: number;
  life: number;
  confirmed?: boolean;
}

export function hasMatchingEarthPreview(
  shot: EarthShotVisual,
  effects: EarthPreviewVisual[],
): boolean {
  const velocity = Math.hypot(shot.vx, shot.vy);
  if (velocity < 0.001) return false;
  const ux = shot.vx / velocity;
  const uy = shot.vy / velocity;
  return effects.some((fx) => {
    if (fx.kind !== 'EARTH' || fx.confirmed || fx.age >= fx.life) return false;
    // Match direction and position: an older preview must not hide a newer shot.
    if (ux * fx.dx + uy * fx.dy < 0.985) return false;
    const predictedTravel = Math.min(fx.age * 9, 450);
    const predictedX = fx.x + fx.dx * (25 + predictedTravel);
    const predictedY = fx.y + fx.dy * (25 + predictedTravel);
    return Math.hypot(shot.x - predictedX, shot.y - predictedY) <= 90;
  });
}
