import type { Shot } from '../../../../../shared/types';
import { TAU } from '../../../../../shared/math';
import { ctx } from '../../../dom';
import { game } from '../../../state';
import { ellipse } from '../../shapes';

export function drawPyroDisc(shot: Pick<Shot, 'vx' | 'vy' | 'r'>, ang: number) {
  // An open-centred, spinning fire ring with sparks and a fading wake.
  const time = game.t;
  const radius = Math.max(17, shot.r + 3);
  const speed = Math.hypot(shot.vx, shot.vy) || 1;
  const ux = shot.vx / speed,
    uy = shot.vy / speed;
  ctx.save();
  ctx.rotate(-ang);
  for (let j = 5; j >= 1; j--) {
    const fade = (6 - j) / 6;
    ctx.globalAlpha = fade * 0.21;
    ctx.strokeStyle = j % 2 ? '#fb923c' : '#facc15';
    ctx.lineWidth = 5 * fade;
    ctx.beginPath();
    ctx.ellipse(
      -ux * j * 8,
      -uy * j * 8,
      radius * (0.75 + fade * 0.2),
      radius * (0.75 + fade * 0.2),
      0,
      0,
      TAU,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowColor = '#fb4d0c';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = '#fb923c';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.stroke();
  ctx.shadowColor = '#fde047';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 16; i++) {
    const theta = (i * TAU) / 16 + time * 0.16;
    const wave = Math.sin(time * 0.22 + i * 2.4);
    const edge = radius + 3 + 5 * wave;
    const px = Math.cos(theta) * edge;
    const py = Math.sin(theta) * edge;
    const size = 1.5 + (i % 4) * 0.65;
    ctx.globalAlpha = 0.65 + 0.3 * Math.sin(time * 0.13 + i);
    ellipse(px, py, size, size, i % 3 === 0 ? '#fff7ed' : i % 2 ? '#facc15' : '#fb923c');
    const tail = 4 + (i % 3) * 3;
    ctx.strokeStyle = i % 2 ? '#fb923c' : '#fef08a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - ux * tail - Math.sin(theta) * 3, py - uy * tail + Math.cos(theta) * 3);
    ctx.stroke();
  }
  ctx.restore();
}
