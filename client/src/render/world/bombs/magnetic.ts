import { ctx } from '../../../dom';
import type { BombPaint } from './context';
export function drawMagneticBomb(paint: BombPaint) {
  const { angular } = paint;
  // Miniature forged-iron horseshoe matching Magnetic Pull's silver/red magnet.
  ctx.save();
  ctx.rotate(angular * 0.3);
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(10, -11);
  ctx.lineTo(-6, -11);
  ctx.bezierCurveTo(-24, -11, -24, 11, -6, 11);
  ctx.lineTo(10, 11);
  ctx.lineTo(10, 4);
  ctx.lineTo(-6, 4);
  ctx.bezierCurveTo(-14, 4, -14, -4, -6, -4);
  ctx.lineTo(10, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(4, -11, 6, 7);
  ctx.fillRect(4, 4, 6, 7);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, -9);
  ctx.lineTo(-15, -6);
  ctx.stroke();
  ctx.restore();
}
