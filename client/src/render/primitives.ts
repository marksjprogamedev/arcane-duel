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

export function renderLightningArc(
  a: Pick<LightningArc, 'points' | 'life' | 'variant' | 'hit' | 'reflected'>,
) {
  const v = a.variant ?? 'default';
  const styles: Record<
    string,
    { outer: string; inner: string; width: number; blur: number; dash: number[] }
  > = {
    plasma_beam: { outer: '#7e22ce', inner: '#f5d0fe', width: 10, blur: 30, dash: [] },
    magnetic_pull: { outer: '#4d7c0f', inner: '#bef264', width: 10, blur: 20, dash: [8, 5] },
  };
  const style = styles[v] ?? { outer: '#fde04766', inner: '#fff7bb', width: 9, blur: 20, dash: [] };
  if (v === 'magnetic_pull') {
    const start = a.points[0],
      end = a.points[a.points.length - 1];
    const dx = end.x - start.x,
      dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length,
      uy = dy / length;
    const nx = -uy,
      ny = ux;
    const clock = Date.now() * 0.003;
    g.save();
    g.globalAlpha = Math.min(1, a.life / 5);
    g.lineCap = 'round';
    g.setLineDash([]);
    // Layered yellow-green electromagnetic tractor beam.
    const stroke = (width: number, color: string, glow: number) => {
      g.beginPath();
      g.moveTo(start.x, start.y);
      g.lineTo(end.x, end.y);
      g.lineWidth = width;
      g.strokeStyle = color;
      g.shadowColor = color;
      g.shadowBlur = glow;
      g.stroke();
    };
    stroke(15, '#4d7c0f66', 16);
    stroke(9, '#84cc16', 13);
    stroke(5, '#eab308', 9);
    stroke(2.5, '#fef08a', 6);
    stroke(1, '#f7fee7', 3);
    // Animated alternating green/yellow electromagnetic filaments and sparks.
    for (let i = 0; i < Math.floor(length / 13); i++) {
      const t = (((i * 17 - clock * 115) % length) + length) % length;
      const x = start.x + ux * t,
        y = start.y + uy * t;
      const swirl = Math.sin(t * 0.08 + clock * 5 + i) * (5 + (i % 3) * 2);
      const px = x + nx * swirl,
        py = y + ny * swirl;
      g.shadowColor = i % 2 ? '#facc15' : '#a3e635';
      g.shadowBlur = 12;
      g.fillStyle = i % 3 ? '#bef264' : '#fde047';
      g.beginPath();
      g.arc(px, py, 1.1 + (i % 3) * 0.45, 0, TAU);
      g.fill();
      if (i % 4 === 0) {
        g.strokeStyle = i % 2 ? '#fef08a' : '#d9f99d';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(px - nx * 6 - ux * 4, py - ny * 6 - uy * 4);
        g.lineTo(px + nx * 6 + ux * 3, py + ny * 6 + uy * 3);
        g.stroke();
      }
    }
    // Compact forged-iron horseshoe, with small red pole caps.
    // Local coordinates point toward the target along +X.
    g.save();
    g.translate(start.x, start.y);
    g.rotate(Math.atan2(dy, dx));
    g.shadowBlur = 0;
    g.fillStyle = '#475569';
    g.beginPath();
    g.moveTo(10, -11);
    g.lineTo(-6, -11);
    g.bezierCurveTo(-24, -11, -24, 11, -6, 11);
    g.lineTo(10, 11);
    g.lineTo(10, 4);
    g.lineTo(-6, 4);
    g.bezierCurveTo(-14, 4, -14, -4, -6, -4);
    g.lineTo(10, -4);
    g.closePath();
    g.fill();
    g.strokeStyle = '#cbd5e1';
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = '#ef4444';
    g.fillRect(4, -11, 6, 7);
    g.fillRect(4, 4, 6, 7);
    g.strokeStyle = '#94a3b8';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-6, -9);
    g.lineTo(-15, -6);
    g.stroke();
    g.restore();
    if (a.hit) {
      g.shadowColor = '#facc15';
      g.shadowBlur = 20;
      g.strokeStyle = '#bef264';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(end.x, end.y, 12 + Math.sin(clock * 3) * 3, 0, TAU);
      g.stroke();
      for (let i = 0; i < 8; i++) {
        const theta = clock * 3 + (i * TAU) / 8;
        g.fillStyle = i % 2 ? '#fef08a' : '#a3e635';
        g.beginPath();
        g.arc(end.x + Math.cos(theta) * 16, end.y + Math.sin(theta) * 16, 2.7, 0, TAU);
        g.fill();
      }
    }
    g.restore();
    return;
  }
  if (v === 'plasma_beam') {
    // A rigid, sustained laser, visually separate from jagged lightning arcs.
    const start = a.points[0];
    const end = a.points[a.points.length - 1];
    const alpha = Math.min(1, a.life / 5);
    g.save();
    g.globalAlpha = alpha;
    g.lineCap = 'round';
    g.setLineDash([]);
    const laser = (width: number, color: string, blur: number) => {
      g.beginPath();
      g.moveTo(start.x, start.y);
      g.lineTo(end.x, end.y);
      g.strokeStyle = color;
      g.lineWidth = width;
      g.shadowColor = color;
      g.shadowBlur = blur;
      g.stroke();
    };
    laser(30, '#6b21a855', 30);
    laser(17, '#9333ea', 24);
    laser(9, '#d946ef', 13);
    laser(3.5, '#fff1ff', 7);
    // A rotating portal suspended in front of the caster (not where a bubble turned the beam).
    // It masks the laser's start cap and makes the emission feel deliberate.
    if (!a.reflected) {
      // Stable aperture: no rotating wedges or orbiting highlights at the caster.
      g.shadowColor = '#c084fc';
      g.shadowBlur = 14;
      g.fillStyle = '#4c1d95';
      g.beginPath();
      g.arc(start.x, start.y, 12, 0, TAU);
      g.fill();
      g.strokeStyle = '#e9d5ff';
      g.lineWidth = 2.8;
      g.beginPath();
      g.arc(start.x, start.y, 13, 0, TAU);
      g.stroke();
      g.strokeStyle = '#a855f7';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(start.x, start.y, 18, 0, TAU);
      g.stroke();
    }
    g.shadowBlur = 0;
    // Fine moving filaments run along the laser, without lightning zigzags.
    const dx = end.x - start.x,
      dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      const nx = -dy / length,
        ny = dx / length;
      const phase = (11 - a.life) * 12;
      g.shadowBlur = 6;
      for (let i = 0; i < Math.floor(length / 24); i++) {
        // Moving filaments stay outside the 18px origin aperture.
        const filamentStart = !a.reflected ? 25 : 0;
        const travel = length - filamentStart;
        if (travel <= 1) break;
        const t = (filamentStart + ((i * 24 + phase) % travel + travel) % travel) / length;
        const cx = start.x + dx * t,
          cy = start.y + dy * t;
        const offset = Math.sin(t * 35 + phase * 0.12) * 3.5;
        g.strokeStyle = i % 2 ? '#f0abfcaa' : '#ffffffaa';
        g.lineWidth = i % 2 ? 1.5 : 2;
        g.beginPath();
        g.moveTo(cx + nx * (offset - 4), cy + ny * (offset - 4));
        g.lineTo(cx + nx * (offset + 4), cy + ny * (offset + 4));
        g.stroke();
      }
    }
    g.shadowBlur = 18;
    g.fillStyle = '#f5d0fe';
    if (a.hit) {
      const t = (11 - a.life) * 0.3;
      for (let i = 0; i < 7; i++) {
        const theta = (i * TAU) / 7 + t;
        const radius = 9 + 4 * Math.sin(t + i);
        g.fillStyle = i % 2 ? '#e879f9' : '#fff1ff';
        g.beginPath();
        g.arc(end.x + Math.cos(theta) * radius, end.y + Math.sin(theta) * radius, 2.5, 0, TAU);
        g.fill();
      }
      g.strokeStyle = '#f5d0fe';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(end.x, end.y, 11 + 3 * Math.sin(t), 0, TAU);
      g.stroke();
    }
    g.beginPath();
    g.arc(end.x, end.y, a.hit ? 8 : 3, 0, TAU);
    g.fill();
    g.restore();
    return;
  }
  g.save();
  g.globalAlpha = Math.min(1, a.life / 7);
  g.setLineDash(style.dash);
  for (const [width, color] of [
    [style.width, style.outer],
    [Math.max(2, style.width * 0.32), style.inner],
  ] as const) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'butt';
    g.shadowColor = style.outer;
    g.shadowBlur = style.blur;
    g.beginPath();
    const pts = a.points;
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();
  }
  g.restore();
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
