import { ctx } from '../../../dom';
import { TAU } from '../../../../../shared/math';
export function drawSteamBomb() {
  // Silver pressure vessel with a rounded domed top and curling white vapour.
  ctx.fillStyle = '#677586';
  ctx.strokeStyle = '#dbe7f0';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-12, 8);
  ctx.lineTo(-12, -3);
  ctx.quadraticCurveTo(-12, -14, 0, -14);
  ctx.quadraticCurveTo(12, -14, 12, -3);
  ctx.lineTo(12, 8);
  ctx.quadraticCurveTo(0, 15, -12, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#a3b7c4';
  ctx.beginPath();
  ctx.ellipse(-5, -5, 4, 6, -0.25, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#3d4f5e';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(-10, 7);
  ctx.quadraticCurveTo(0, 11, 10, 7);
  ctx.stroke();
  ctx.fillStyle = '#d5e5ed';
  ctx.fillRect(-3, -17, 6, 5);
  ctx.strokeStyle = '#f3faff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, -19);
  ctx.bezierCurveTo(-10, -24, 1, -26, -4, -32);
  ctx.moveTo(4, -19);
  ctx.bezierCurveTo(11, -23, 1, -27, 6, -32);
  ctx.stroke();
}
