import { g } from '../../../dom';
import { TAU } from '../../../../../shared/math';
export function drawWaterBomb() {
  // Rounded bead of dew: a shallow liquid dome, without a pointed tip or interior lines.
  const dew = g.createRadialGradient(-6, -8, 0.5, 3, 5, 21);
  dew.addColorStop(0, '#ffffff');
  dew.addColorStop(0.24, '#c8f5ff');
  dew.addColorStop(0.45, '#69c8f2');
  dew.addColorStop(0.72, '#1777bb');
  dew.addColorStop(1, '#062f70');
  g.fillStyle = dew;
  g.beginPath();
  g.ellipse(0, 0, 15, 13.5, 0, 0, TAU);
  g.fill();
  g.strokeStyle = '#b8f2ff';
  g.lineWidth = 1.35;
  g.stroke();
  // Clean curved surface reflections give the sphere a raised, wet look.
  g.globalAlpha = 0.48;
  g.fillStyle = '#e0faff';
  g.beginPath();
  g.ellipse(-5, -6, 5.2, 3.3, -0.35, 0, TAU);
  g.fill();
  g.globalAlpha = 0.94;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(-6, -7, 2.3, 1.5, -0.3, 0, TAU);
  g.fill();
  g.globalAlpha = 1;
}
