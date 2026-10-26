// The pure part of the arena pillars' depth sorting (no canvas), so it can be tested.

/**
 * How far below a pillar's collision centre its painted base sits. Wizards and shots are stopped
 * 25 + 18 units (pillar radius plus body) from the centre, so the art stands low enough for them to
 * halt at its face instead of floating in front of it.
 */
export const PILLAR_FOOT = 42;
/** How far a wizard's feet are below its position (where its shadow is painted). */
export const WIZARD_FOOT = 14;
/** The painted pillar reaches this far left and right of its centre, and this high above its base. */
const PILLAR_LEFT = 28;
const PILLAR_RIGHT = 38;
const PILLAR_HEIGHT = 72;

/** The depth a wizard is sorted by: the lower its feet are on the screen, the nearer it is. */
export const wizardDepth = (w: { y: number }) => w.y + WIZARD_FOOT;
export const pillarDepth = (pillar: { y: number }) => pillar.y + PILLAR_FOOT;

/** True when the point lies over a pillar's painted face from behind it (so the pillar hides it). */
export function behindPillar(
  pillars: readonly { x: number; y: number }[],
  x: number,
  y: number,
  glowMargin = 0,
) {
  return pillars.some(
    (p) =>
      x > p.x - PILLAR_LEFT - glowMargin &&
      x < p.x + PILLAR_RIGHT + glowMargin &&
      y < pillarDepth(p) &&
      y > pillarDepth(p) - PILLAR_HEIGHT - glowMargin,
  );
}
