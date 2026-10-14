import { grass, pillars, TRAP } from '../../../shared/constants';
import { TAU } from '../../../shared/math';
import type { LightningArc, Particle, Wave } from '../../../shared/types';
import { g } from '../dom';

export function renderParticle(q: Pick<Particle, 'x' | 'y' | 'c' | 'r' | 'life'>) {
  g.globalAlpha = Math.min(1, q.life / 12);
  g.shadowColor = q.c;
  g.shadowBlur = q.r * 2;
  ellipse(q.x, q.y - 15, q.r, q.r, q.c);
}

export function renderLightningArc(a: Pick<LightningArc, 'points' | 'life'>) {
  g.globalAlpha = Math.min(1, a.life / 7);
  for (let width of [9, 3]) {
    g.strokeStyle = width === 9 ? '#fde04766' : '#fff7bb';
    g.lineWidth = width;
    g.shadowColor = '#facc15';
    g.shadowBlur = width === 9 ? 20 : 6;
    g.beginPath();
    g.moveTo(a.points[0].x, a.points[0].y);
    for (let i = 1; i < a.points.length; i++) g.lineTo(a.points[i].x, a.points[i].y);
    g.stroke();
  }
  g.shadowBlur = 0;
}

export function drawWave(q: Wave) {
  g.globalAlpha = q.life / 25;
  g.strokeStyle = q.c;
  g.lineWidth = 6;
  g.beginPath();
  g.ellipse(q.x, q.y, q.r, q.r * 0.7, 0, 0, TAU);
  g.stroke();
}

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

export function tree(x: number, y: number, r: number) {
  ellipse(x + 8, y + 14, r + 6, r * 0.45, '#06190e80');
  g.fillStyle = '#624f36';
  g.fillRect(x - 7, y - 18, 14, 37);
  ellipse(x, y - 30, r, r * 0.75, '#17452f');
  ellipse(x - 12, y - 42, r * 0.65, r * 0.53, '#286f42');
  ellipse(x + 13, y - 38, r * 0.55, r * 0.5, '#37804b');
}

export function pillar(o: { x: number; y: number; r: number }) {
  let x = o.x,
    y = o.y;
  ellipse(x + 12, y + 16, 39, 15, '#07191188');
  poly(
    [
      [x - 21, y + 12],
      [x + 21, y + 12],
      [x + 21, y - 50],
      [x - 21, y - 50],
    ],
    '#697b70',
  );
  poly(
    [
      [x + 21, y + 12],
      [x + 34, y + 3],
      [x + 34, y - 59],
      [x + 21, y - 50],
    ],
    '#40564b',
  );
  poly(
    [
      [x - 21, y - 50],
      [x + 21, y - 50],
      [x + 34, y - 59],
      [x - 8, y - 59],
    ],
    '#b3c0b2',
  );
  poly(
    [
      [x - 28, y - 48],
      [x + 26, y - 48],
      [x + 38, y - 59],
      [x - 16, y - 59],
    ],
    '#90a393',
  );
  poly(
    [
      [x - 28, y - 48],
      [x + 26, y - 48],
      [x + 26, y - 38],
      [x - 28, y - 38],
    ],
    '#657f6e',
  );
}

export function scenery() {
  let bg = g.createLinearGradient(0, 0, 0, 600);
  bg.addColorStop(0, '#233c32');
  bg.addColorStop(1, '#10261e');
  g.fillStyle = bg;
  g.fillRect(0, 0, 800, 600);
  ellipse(400, 310, 345, 255, '#3a4b39');
  ellipse(400, 307, 315, 225, '#58654d');
  g.strokeStyle = '#829077';
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(400, 307, 313, 223, 0, 0, TAU);
  g.stroke();
  for (let y = 100; y < 550; y += 45)
    for (let x = 110; x < 700; x += 60) {
      let v = Math.sin(x * 0.08 + y * 0.1) * 5;
      poly(
        [
          [x + v, y],
          [x + 56 + v, y],
          [x + 53 + v, y + 38],
          [x + 3 + v, y + 38],
        ],
        Math.sin(x + y) > 0 ? '#18271e20' : '#c6cda010',
      );
    }
  for (let q of grass) {
    g.strokeStyle = q.h % 3 ? '#456e43' : '#9f9b6a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(q.x, q.y);
    g.lineTo(q.x + q.h * 0.5, q.y - q.h);
    g.stroke();
  }
  for (let x = 55; x < 800; x += 135) {
    tree(x, 40, 34);
    tree(x + 40, 575, 38);
  }
  for (let y = 130; y < 560; y += 140) {
    tree(22, y, 34);
    tree(780, y + 30, 32);
  }
  pillars.forEach(pillar);
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

/** The reflective bubble dome; `fade` is 0..1. Also used for the caster's instant preview. */
export function drawBubble(x: number, y: number, r: number, fade: number) {
  g.save();
  g.globalAlpha = 0.9 * fade;
  g.shadowColor = '#c4b5fd';
  g.shadowBlur = 18;
  g.fillStyle = 'rgba(196, 181, 253, 0.12)';
  g.strokeStyle = '#c4b5fd';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.stroke();
  g.restore();
}

/** A trap rune on the ground. Dim and slowly turning until armed, then bright and pulsing. */
export function drawTrapRune(x: number, y: number, color: string, armed: boolean, t: number) {
  const pulse = armed ? 0.75 + 0.25 * Math.sin(t * 0.18) : 0.4;
  g.save();
  g.translate(x, y);
  g.scale(1, 0.7);
  g.globalAlpha = pulse;
  g.shadowColor = color;
  g.shadowBlur = armed ? 16 : 6;
  g.fillStyle = color + '33';
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, 26, 0, TAU);
  g.fill();
  g.stroke();
  g.rotate(armed ? t * 0.02 : t * 0.006);
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    if (i) g.lineTo(Math.cos(a) * 19, Math.sin(a) * 19);
    else g.moveTo(Math.cos(a) * 19, Math.sin(a) * 19);
  }
  g.closePath();
  g.stroke();
  g.restore();
}

/** Rock stakes around an imprisoned wizard, fading as the prison runs out. */
export function drawPrison(x: number, y: number, ticksLeft: number, t: number) {
  const fade = Math.min(1, ticksLeft / 30);
  g.save();
  g.globalAlpha = fade;
  const rise = Math.min(1, (TRAP.PRISON_TICKS - ticksLeft) / 8 + 0.3);
  for (let i = 0; i < 9; i++) {
    const a = (i * TAU) / 9 + 0.2;
    const sx = x + Math.cos(a) * 34,
      sy = y + 10 + Math.sin(a) * 16,
      h = (52 + (i % 3) * 8) * rise;
    g.fillStyle = '#00000044';
    g.beginPath();
    g.ellipse(sx + 3, sy + 2, 8, 3, 0, 0, TAU);
    g.fill();
    g.fillStyle = i % 2 ? '#8a7355' : '#a38a66';
    g.strokeStyle = '#3f3426';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(sx - 6, sy);
    g.lineTo(sx - 4, sy - h + 8);
    g.lineTo(sx, sy - h);
    g.lineTo(sx + 4, sy - h + 8);
    g.lineTo(sx + 6, sy);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.restore();
}
