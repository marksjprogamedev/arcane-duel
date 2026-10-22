import { ctx } from '../../../dom';
import { TAU } from '../../../../../shared/math';
import { BOMB_FUSE_TICKS } from '../../../../../shared/constants';
import { game } from '../../../state';
import type { BombPaint } from './context';
export function drawPlasmaBomb(paint: BombPaint) {
  const { bomb } = paint;
  // Animated swirling plasma sphere and low-cost solar-flare tongues.
  // Rotate the entire shell, luminous markings and flares clockwise together.
  const elapsed = Math.max(0, BOMB_FUSE_TICKS - bomb.fuse);
  const progress = Math.min(1, elapsed / BOMB_FUSE_TICKS);
  const wholeSpin = 0.038 * elapsed + (0.85 * BOMB_FUSE_TICKS * Math.pow(progress, 4)) / 4;
  ctx.save();
  ctx.rotate(wholeSpin);
  ctx.fillStyle = '#63327c';
  ctx.strokeStyle = '#e0abff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.fill();
  ctx.stroke();
  const glow = ctx.createRadialGradient(-3, -4, 0, 0, 0, 14);
  glow.addColorStop(0, '#341044');
  glow.addColorStop(0.17, '#61227b');
  glow.addColorStop(0.38, '#a34acb');
  glow.addColorStop(0.65, '#d185eb');
  glow.addColorStop(0.85, '#8738ae');
  glow.addColorStop(1, '#50216f');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, TAU);
  ctx.fill();
  // Small translucent darker pockets add depth without a hard dividing stripe.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#37104e';
  ctx.beginPath();
  ctx.ellipse(5, 5, 4.4, 2.8, -0.6, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-7, 2, 2.5, 4, 0.25, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Soft purple bloom, no bright two-tone ring around the surface.
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = '#b94de7';
  ctx.shadowColor = '#bb55ef';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.stroke();
  ctx.restore();
  // Internal currents rotate gently relative to the rapidly spinning shell.
  const plasmaSpin = elapsed * 0.012;
  // Small stationary-on-shell plasma sparks replace the conspicuous arc-shaped stripe.
  const plasmaDots: [number, number, number][] = [
    [-7, -7, 1.5],
    [3, -9, 1.1],
    [8, -4, 1.4],
    [-10, 1, 1.1],
    [-4, 3, 1.2],
    [4, 5, 1.6],
    [-6, 9, 1.1],
    [9, 7, 1.0],
    [0, -3, 1.3],
    [2, 10, 0.9],
  ];
  for (let i = 0; i < plasmaDots.length; i++) {
    const [x, y, r] = plasmaDots[i];
    ctx.globalAlpha = 0.45 + 0.3 * (0.5 + 0.5 * Math.sin(game.t * 0.065 + i * 1.7));
    ctx.fillStyle = (['#fff1ff', '#d58cf8', '#74239f', '#f6a7df', '#a756ed', '#e0c1ff'] as const)[
      i % 6
    ];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Solar-flare loops projecting from the rim. Fixed canvas paths; no new particles.
  for (let i = 0; i < 3; i++) {
    const angle = plasmaSpin * 0.6 + (i * TAU) / 3;
    const length = 4 + 2 * Math.sin(game.t * 0.055 + i * 2);
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = i === 1 ? '#f5b5ff' : '#d56af7';
    ctx.lineWidth = 1.9;
    ctx.globalAlpha = 0.72 + 0.16 * Math.sin(game.t * 0.06 + i);
    ctx.beginPath();
    ctx.moveTo(10, -3);
    ctx.bezierCurveTo(15, -7 - length, 20, -5 - length, 14, 3);
    ctx.stroke();
    ctx.restore();
  }
  // Short plasma lashes crackle outward more frequently as the fuse runs down.
  // Fixed canvas strokes only: no new particles or gameplay radius changes.
  for (let i = 0; i < 4; i++) {
    const phase = game.t * (0.12 + i * 0.009) + i * 2.37;
    const flicker = Math.max(0, Math.sin(phase));
    const extension = (3 + 9 * progress) * flicker;
    if (extension < 1) continue;
    ctx.save();
    ctx.rotate((i * TAU) / 4 + game.t * 0.013);
    ctx.globalAlpha = (0.32 + 0.55 * progress) * flicker;
    ctx.strokeStyle = i % 2 ? '#f2b5ff' : '#c36cff';
    ctx.lineWidth = 1.2 + progress * 0.5;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(16 + extension * 0.35, -2.5);
    ctx.lineTo(17 + extension, 1.8);
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#ffe4ff';
  ctx.beginPath();
  ctx.arc(-3, -4, 1.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}
