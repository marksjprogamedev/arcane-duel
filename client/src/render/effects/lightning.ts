import { TAU } from '../../../../shared/math';
import type { LightningArc, Wave } from '../../../../shared/types';
import { g } from '../../dom';

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
      // Stable central aperture, with orbiting motes but no extra rotating ring.
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
      // Keep the four luminous orbiting motes, without an outer purple ring.
      const portalTime = Date.now() * 0.003;
      g.shadowColor = '#c084fc';
      g.shadowBlur = 8;
      for (let i = 0; i < 4; i++) {
        const angle = portalTime * -1.4 + (i * TAU) / 4;
        g.fillStyle = i % 2 ? '#f5d0fe' : '#c084fc';
        g.beginPath();
        g.arc(start.x + Math.cos(angle) * 18, start.y + Math.sin(angle) * 18, 2, 0, TAU);
        g.fill();
      }
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
        const t = (filamentStart + ((((i * 24 + phase) % travel) + travel) % travel)) / length;
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
  g.strokeStyle = q.color;
  g.lineWidth = 6;
  g.beginPath();
  g.ellipse(q.x, q.y, q.r, q.r * 0.7, 0, 0, TAU);
  g.stroke();
}
