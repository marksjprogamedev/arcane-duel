import { ctx } from '../../../dom';
import { TAU } from '../../../../../shared/math';
export function drawLightningBomb() {
  // Cartoon lightning bomb: heavy charcoal casing, brass fuse socket and yellow bolt.
  ctx.fillStyle = '#686d76';
  ctx.beginPath();
  ctx.arc(0, 2, 14, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#a9aab2';
  ctx.lineWidth = 1.7;
  ctx.stroke();
  ctx.fillStyle = '#9fa4ae';
  ctx.beginPath();
  ctx.ellipse(-5, -4, 5, 3, -0.45, 0, TAU);
  ctx.fill();
  // Short unlit fuse and a little electric spark; decorative only.
  ctx.fillStyle = '#c49c41';
  ctx.fillRect(-4, -14, 8, 4);
  ctx.strokeStyle = '#d5c7a3';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.quadraticCurveTo(2, -19, 6, -20);
  ctx.stroke();
  ctx.fillStyle = '#fff29a';
  ctx.beginPath();
  ctx.arc(6, -20, 2.2, 0, TAU);
  ctx.fill();
  // Subtle forged-metal texture: uneven rim segments and small surface scuffs.
  ctx.strokeStyle = '#d0d2d6';
  ctx.lineWidth = 0.85;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.arc(0, 2, 12.5, -2.7, -1.35);
  ctx.arc(0, 2, 12.5, 0.35, 1.1);
  ctx.stroke();
  ctx.strokeStyle = '#363c46';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-10, -1);
  ctx.lineTo(-8, 1);
  ctx.moveTo(8, 6);
  ctx.lineTo(10, 4);
  ctx.moveTo(-5, 10);
  ctx.lineTo(-3, 11);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Bold, centred lightning insignia on the front.
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#fff3a6';
  ctx.lineWidth = 0.75;
  ctx.save();
  ctx.translate(0, 2); // align emblem to the bomb body, which is centred at y = 2
  ctx.beginPath();
  ctx.moveTo(2, -8);
  ctx.lineTo(-4, 2);
  ctx.lineTo(0, 2);
  ctx.lineTo(-2, 9);
  ctx.lineTo(6, -1);
  ctx.lineTo(2, -1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
