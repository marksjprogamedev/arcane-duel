import { g } from '../../../dom';
import { TAU } from '../../../../../shared/math';
export function drawSteamBomb() {
  // Silver pressure vessel with a rounded domed top and curling white vapour.
  g.fillStyle = '#677586';
  g.strokeStyle = '#dbe7f0';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(-12, 8);
  g.lineTo(-12, -3);
  g.quadraticCurveTo(-12, -14, 0, -14);
  g.quadraticCurveTo(12, -14, 12, -3);
  g.lineTo(12, 8);
  g.quadraticCurveTo(0, 15, -12, 8);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#a3b7c4';
  g.beginPath();
  g.ellipse(-5, -5, 4, 6, -0.25, 0, TAU);
  g.fill();
  g.strokeStyle = '#3d4f5e';
  g.lineWidth = 1.7;
  g.beginPath();
  g.moveTo(-10, 7);
  g.quadraticCurveTo(0, 11, 10, 7);
  g.stroke();
  g.fillStyle = '#d5e5ed';
  g.fillRect(-3, -17, 6, 5);
  g.strokeStyle = '#f3faff';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(-4, -19);
  g.bezierCurveTo(-10, -24, 1, -26, -4, -32);
  g.moveTo(4, -19);
  g.bezierCurveTo(11, -23, 1, -27, 6, -32);
  g.stroke();
}
