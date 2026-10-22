import type { Wizard } from '../../../../shared/types';
import { ctx } from '../../dom';
import { game, greenSide } from '../../state';

/** The uploaded atlas is 8 columns (directions) by 19 rows (animation frames).
 * Cosmetics only: no simulation, networking, collision or spell changes.
 */
const FRAME_W = 192;
const FRAME_H = 224;
const FACING = [
  'south',
  'southeast',
  'east',
  'northeast',
  'north',
  'northwest',
  'west',
  'southwest',
] as const;
const ACTIONS = {
  idle: { first: 0, count: 4, fps: 5 },
  walk: { first: 4, count: 4, fps: 9 },
  cast: { first: 8, count: 4, fps: 10 },
  hit: { first: 12, count: 3, fps: 10 },
  defeat: { first: 15, count: 4, fps: 6 },
} as const;
type Action = keyof typeof ACTIONS;
interface Motion {
  x: number;
  y: number;
  hp: number;
  tick: number;
  movedAt: number;
  hitAt: number;
}
const motion = new Map<number, Motion>();
const atlas = new Image();
atlas.src = '/ice-wizard/ice-wizard-atlas.png';

/** Draw at the same feet position as the legacy character, preserving HUD and combat effects. */
export function drawIceWizard(w: Wizard, bob: number): boolean {
  if (!atlas.complete || atlas.naturalWidth < FRAME_W * 8 || atlas.naturalHeight < FRAME_H * 19)
    return false;

  const t = game.t;
  let motionState = motion.get(w.seat);
  if (!motionState || t < motionState.tick) {
    motionState = { x: w.x, y: w.y, hp: w.hp, tick: t, movedAt: -1000, hitAt: -1000 };
    motion.set(w.seat, motionState);
  }
  if (Math.hypot(w.x - motionState.x, w.y - motionState.y) > 0.45) motionState.movedAt = t;
  if (w.hp < motionState.hp - 0.01) motionState.hitAt = t;
  motionState.x = w.x;
  motionState.y = w.y;
  motionState.hp = w.hp;
  motionState.tick = t;

  let action: Action = 'idle';
  if (w.hp <= 0 || w.fallen || game.death?.wizard === w) action = 'defeat';
  else if (t - motionState.hitAt < 18) action = 'hit';
  else if (w.cast > 0 || w.chargeTicks > 0 || w.beamAim !== null || w.swing > 0) action = 'cast';
  else if (w.freeze <= 0 && t - motionState.movedAt < 7) action = 'walk';

  // Wizard.face uses canvas radians: 0 east, +PI/2 south.
  const octant = ((Math.round(w.face / (Math.PI / 4)) % 8) + 8) % 8;
  const compass = [
    'east',
    'southeast',
    'south',
    'southwest',
    'west',
    'northwest',
    'north',
    'northeast',
  ];
  const column = FACING.indexOf(compass[octant] as (typeof FACING)[number]);
  const anim = ACTIONS[action];
  const step =
    action === 'defeat'
      ? Math.min(anim.count - 1, Math.floor(((game.death?.age ?? 0) * anim.fps) / 60))
      : Math.floor((t * anim.fps) / 60 + w.seat * 0.37) % anim.count;
  const row = anim.first + step;

  ctx.save();
  // Native image occupancy is around 150x180 inside the padded 192x224 cell.
  // At 0.53 scale this matches the original wizard's ~80px visible height.
  const drawW = 102;
  const drawH = 119;
  ctx.drawImage(
    atlas,
    column * FRAME_W,
    row * FRAME_H,
    FRAME_W,
    FRAME_H,
    w.x - drawW / 2,
    w.y + bob + 23 - drawH,
    drawW,
    drawH,
  );
  ctx.restore();

  // Keep the old friendly/enemy team ring and sword cue.
  ctx.strokeStyle = greenSide(w) ? '#4ade80' : '#fb7185';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(w.x, w.y + 8, 23, 11, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (w.swing > 0) {
    ctx.strokeStyle = '#e2e8f0dd';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w.x, w.y - 14, 57, w.face - 0.9, w.face + 0.9);
    ctx.stroke();
  }
  return true;
}
