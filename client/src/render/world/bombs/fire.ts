import { ctx } from '../../../dom';
import { TAU } from '../../../../../shared/math';
import { game } from '../../../state';
import type { BombPaint } from './context';
export function drawFireBomb(paint: BombPaint) {
  const { bomb, color, urgency } = paint;
  // A few translucent smoke wisps build up as the fuse nears detonation.
  // Canvas-only and fixed-count: no extra simulated particles or gameplay changes.
  const smokeStrength = 0.16 + urgency * 0.44;
  for (let i = 0; i < 3; i++) {
    const drift = Math.sin(game.t * 0.045 + i * 2.3) * (3 + i * 2);
    const rise = (game.t * (0.35 + i * 0.08) + i * 9) % 29;
    ctx.globalAlpha = smokeStrength * (1 - rise / 34);
    ctx.fillStyle = i % 2 ? '#647076' : '#93999a';
    ctx.beginPath();
    ctx.ellipse(
      drift - 2,
      -15 - rise,
      4 + i * 1.2 + urgency * 2,
      6 + i * 1.4 + urgency * 2,
      0,
      0,
      TAU,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Molten, cracked charcoal sphere with a sparse thrown ember trail.
  if (!bomb.landed) {
    for (let i = 3; i >= 1; i--) {
      ctx.globalAlpha = 0.13 + (4 - i) * 0.11;
      ctx.fillStyle = i % 2 ? '#f97316' : '#facc15';
      ctx.beginPath();
      ctx.arc(-i * 8, 6 + Math.sin(game.t * 0.12 + i) * 3, 1.5 + (4 - i) * 0.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#211d1b';
  ctx.strokeStyle = '#9a4322';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#493029';
  ctx.beginPath();
  ctx.ellipse(-3, -5, 8, 6, -0.4, 0, TAU);
  ctx.fill();
  ctx.lineJoin = 'round';
  for (const [width, color] of [
    [4, '#c2410c'],
    [1.9, '#ffb52e'],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(-9, -9);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-6, 2);
    ctx.lineTo(-1, 6);
    ctx.lineTo(1, 12);
    ctx.moveTo(5, -12);
    ctx.lineTo(3, -6);
    ctx.lineTo(8, -1);
    ctx.lineTo(5, 5);
    ctx.lineTo(10, 9);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffe08a';
  ctx.beginPath();
  ctx.arc(-4, -4, 1.6, 0, TAU);
  ctx.arc(8, -1, 1.4, 0, TAU);
  ctx.fill();
}
