import { TAU } from '../../../shared/math';
import { ctx } from '../dom';

export function ellipse(x: number, y: number, rx: number, ry: number, c: string) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

export function poly(pts: [number, number][], c: string) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(...pts[i]);
  ctx.closePath();
  ctx.fill();
}

/** A small HUD bar above a wizard: `value` is a percentage (0-100), drawn in `color` with "label NN%" over it. */
export function bar(x: number, y: number, value: number, color: string, label: string) {
  ctx.fillStyle = '#071118db';
  ctx.fillRect(x - 34, y, 68, 7);
  ctx.fillStyle = color;
  ctx.fillRect(x - 34, y, (68 * value) / 100, 7);
  const { textAlign, font } = ctx;
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(label + ' ' + Math.round(value) + '%', x, y - 3);
  ctx.textAlign = textAlign;
  ctx.font = font;
}
