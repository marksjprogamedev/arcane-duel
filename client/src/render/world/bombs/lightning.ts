import { g } from '../../../dom';
import { TAU } from '../../../../../shared/math';
export function drawLightningBomb() {
  // Cartoon lightning bomb: heavy charcoal casing, brass fuse socket and yellow bolt.
  g.fillStyle = '#686d76';
  g.beginPath();
  g.arc(0, 2, 14, 0, TAU);
  g.fill();
  g.strokeStyle = '#a9aab2';
  g.lineWidth = 1.7;
  g.stroke();
  g.fillStyle = '#9fa4ae';
  g.beginPath();
  g.ellipse(-5, -4, 5, 3, -0.45, 0, TAU);
  g.fill();
  // Short unlit fuse and a little electric spark; decorative only.
  g.fillStyle = '#c49c41';
  g.fillRect(-4, -14, 8, 4);
  g.strokeStyle = '#d5c7a3';
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, -14);
  g.quadraticCurveTo(2, -19, 6, -20);
  g.stroke();
  g.fillStyle = '#fff29a';
  g.beginPath();
  g.arc(6, -20, 2.2, 0, TAU);
  g.fill();
  // Subtle forged-metal texture: uneven rim segments and small surface scuffs.
  g.strokeStyle = '#d0d2d6';
  g.lineWidth = 0.85;
  g.globalAlpha = 0.65;
  g.beginPath();
  g.arc(0, 2, 12.5, -2.7, -1.35);
  g.arc(0, 2, 12.5, 0.35, 1.1);
  g.stroke();
  g.strokeStyle = '#363c46';
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(-10, -1);
  g.lineTo(-8, 1);
  g.moveTo(8, 6);
  g.lineTo(10, 4);
  g.moveTo(-5, 10);
  g.lineTo(-3, 11);
  g.stroke();
  g.globalAlpha = 1;
  // Bold, centred lightning insignia on the front.
  g.fillStyle = '#facc15';
  g.strokeStyle = '#fff3a6';
  g.lineWidth = 0.75;
  g.save();
  g.translate(0, 2); // align emblem to the bomb body, which is centred at y = 2
  g.beginPath();
  g.moveTo(2, -8);
  g.lineTo(-4, 2);
  g.lineTo(0, 2);
  g.lineTo(-2, 9);
  g.lineTo(6, -1);
  g.lineTo(2, -1);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}
