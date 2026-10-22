import type { Shot } from '../../../../../shared/types';
import { TAU } from '../../../../../shared/math';
import { g } from '../../../dom';
import { game } from '../../../state';
import { ellipse } from '../../primitives';

export function drawPyroDisc(s: Pick<Shot, 'vx' | 'vy' | 'r'>, ang: number) {
  // An open-centred, spinning fire ring with sparks and a fading wake.
  const time = game.t;
  const radius = Math.max(17, s.r + 3);
  const speed = Math.hypot(s.vx, s.vy) || 1;
  const ux = s.vx / speed,
    uy = s.vy / speed;
  g.save();
  g.rotate(-ang);
  for (let j = 5; j >= 1; j--) {
    const fade = (6 - j) / 6;
    g.globalAlpha = fade * 0.21;
    g.strokeStyle = j % 2 ? '#fb923c' : '#facc15';
    g.lineWidth = 5 * fade;
    g.beginPath();
    g.ellipse(
      -ux * j * 8,
      -uy * j * 8,
      radius * (0.75 + fade * 0.2),
      radius * (0.75 + fade * 0.2),
      0,
      0,
      TAU,
    );
    g.stroke();
  }
  g.globalAlpha = 1;
  g.shadowColor = '#fb4d0c';
  g.shadowBlur = 24;
  g.strokeStyle = '#b91c1c';
  g.lineWidth = 11;
  g.beginPath();
  g.arc(0, 0, radius, 0, TAU);
  g.stroke();
  g.strokeStyle = '#fb923c';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(0, 0, radius, 0, TAU);
  g.stroke();
  g.shadowColor = '#fde047';
  g.shadowBlur = 16;
  g.strokeStyle = '#fef08a';
  g.lineWidth = 3.5;
  g.beginPath();
  g.arc(0, 0, radius, 0, TAU);
  g.stroke();
  for (let i = 0; i < 16; i++) {
    const theta = (i * TAU) / 16 + time * 0.16;
    const wave = Math.sin(time * 0.22 + i * 2.4);
    const edge = radius + 3 + 5 * wave;
    const px = Math.cos(theta) * edge;
    const py = Math.sin(theta) * edge;
    const size = 1.5 + (i % 4) * 0.65;
    g.globalAlpha = 0.65 + 0.3 * Math.sin(time * 0.13 + i);
    ellipse(px, py, size, size, i % 3 === 0 ? '#fff7ed' : i % 2 ? '#facc15' : '#fb923c');
    const tail = 4 + (i % 3) * 3;
    g.strokeStyle = i % 2 ? '#fb923c' : '#fef08a';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px - ux * tail - Math.sin(theta) * 3, py - uy * tail + Math.cos(theta) * 3);
    g.stroke();
  }
  g.restore();
}
