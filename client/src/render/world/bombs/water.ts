import { ctx } from '../../../dom';
import { TAU } from '../../../../../shared/math';
export function drawWaterBomb() {
  // Rounded bead of dew: a shallow liquid dome, without a pointed tip or interior lines.
  const dew = ctx.createRadialGradient(-6, -8, 0.5, 3, 5, 21);
  dew.addColorStop(0, '#ffffff');
  dew.addColorStop(0.24, '#c8f5ff');
  dew.addColorStop(0.45, '#69c8f2');
  dew.addColorStop(0.72, '#1777bb');
  dew.addColorStop(1, '#062f70');
  ctx.fillStyle = dew;
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 13.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#b8f2ff';
  ctx.lineWidth = 1.35;
  ctx.stroke();
  // Clean curved surface reflections give the sphere a raised, wet look.
  ctx.globalAlpha = 0.48;
  ctx.fillStyle = '#e0faff';
  ctx.beginPath();
  ctx.ellipse(-5, -6, 5.2, 3.3, -0.35, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-6, -7, 2.3, 1.5, -0.3, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}
