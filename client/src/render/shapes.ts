import { TAU } from '../../../shared/math';
import { g } from '../dom';

export function ellipse(x: number, y: number, rx: number, ry: number, c: string) {
  g.fillStyle = c;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fill();
}

export function poly(pts: [number, number][], c: string) {
  g.fillStyle = c;
  g.beginPath();
  g.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]);
  g.closePath();
  g.fill();
}

export function bar(x, y, v, c, k) {
  g.fillStyle = '#071118db';
  g.fillRect(x - 34, y, 68, 7);
  g.fillStyle = c;
  g.fillRect(x - 34, y, (68 * v) / 100, 7);
  g.textAlign = 'center';
  g.font = 'bold 10px monospace';
  g.fillText(k + ' ' + Math.round(v) + '%', x, y - 3);
}
