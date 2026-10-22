import { g } from '../../../dom';
import type { BombCtx } from './context';
export function drawMagneticBomb(c: BombCtx) {
  const { angular } = c;
  // Miniature forged-iron horseshoe matching Magnetic Pull's silver/red magnet.
  g.save();
  g.rotate(angular * 0.3);
  g.fillStyle = '#475569';
  g.beginPath();
  g.moveTo(10, -11);
  g.lineTo(-6, -11);
  g.bezierCurveTo(-24, -11, -24, 11, -6, 11);
  g.lineTo(10, 11);
  g.lineTo(10, 4);
  g.lineTo(-6, 4);
  g.bezierCurveTo(-14, 4, -14, -4, -6, -4);
  g.lineTo(10, -4);
  g.closePath();
  g.fill();
  g.strokeStyle = '#cbd5e1';
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = '#ef4444';
  g.fillRect(4, -11, 6, 7);
  g.fillRect(4, 4, 6, 7);
  g.strokeStyle = '#94a3b8';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-6, -9);
  g.lineTo(-15, -6);
  g.stroke();
  g.restore();
}
