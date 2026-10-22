import { TAU } from '../../../../shared/math';
import type { LightningArc, Wave } from '../../../../shared/types';
import { ctx } from '../../dom';

export function renderLightningArc(
  arc: Pick<LightningArc, 'points' | 'life' | 'variant' | 'hit' | 'reflected'>,
) {
  const variant = arc.variant ?? 'default';
  const styles: Record<
    string,
    { outer: string; inner: string; width: number; blur: number; dash: number[] }
  > = {
    plasma_beam: { outer: '#7e22ce', inner: '#f5d0fe', width: 10, blur: 30, dash: [] },
    magnetic_pull: { outer: '#4d7c0f', inner: '#bef264', width: 10, blur: 20, dash: [8, 5] },
  };
  const style = styles[variant] ?? {
    outer: '#fde04766',
    inner: '#fff7bb',
    width: 9,
    blur: 20,
    dash: [],
  };
  if (variant === 'magnetic_pull') {
    const start = arc.points[0],
      end = arc.points[arc.points.length - 1];
    const dx = end.x - start.x,
      dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length,
      uy = dy / length;
    const nx = -uy,
      ny = ux;
    const clock = Date.now() * 0.003;
    ctx.save();
    ctx.globalAlpha = Math.min(1, arc.life / 5);
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    // Layered yellow-green electromagnetic tractor beam.
    const stroke = (width: number, color: string, glow: number) => {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
      ctx.stroke();
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
      ctx.shadowColor = i % 2 ? '#facc15' : '#a3e635';
      ctx.shadowBlur = 12;
      ctx.fillStyle = i % 3 ? '#bef264' : '#fde047';
      ctx.beginPath();
      ctx.arc(px, py, 1.1 + (i % 3) * 0.45, 0, TAU);
      ctx.fill();
      if (i % 4 === 0) {
        ctx.strokeStyle = i % 2 ? '#fef08a' : '#d9f99d';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px - nx * 6 - ux * 4, py - ny * 6 - uy * 4);
        ctx.lineTo(px + nx * 6 + ux * 3, py + ny * 6 + uy * 3);
        ctx.stroke();
      }
    }
    // Compact forged-iron horseshoe, with small red pole caps.
    // Local coordinates point toward the target along +X.
    ctx.save();
    ctx.translate(start.x, start.y);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(10, -11);
    ctx.lineTo(-6, -11);
    ctx.bezierCurveTo(-24, -11, -24, 11, -6, 11);
    ctx.lineTo(10, 11);
    ctx.lineTo(10, 4);
    ctx.lineTo(-6, 4);
    ctx.bezierCurveTo(-14, 4, -14, -4, -6, -4);
    ctx.lineTo(10, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(4, -11, 6, 7);
    ctx.fillRect(4, 4, 6, 7);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, -9);
    ctx.lineTo(-15, -6);
    ctx.stroke();
    ctx.restore();
    if (arc.hit) {
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#bef264';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 12 + Math.sin(clock * 3) * 3, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const theta = clock * 3 + (i * TAU) / 8;
        ctx.fillStyle = i % 2 ? '#fef08a' : '#a3e635';
        ctx.beginPath();
        ctx.arc(end.x + Math.cos(theta) * 16, end.y + Math.sin(theta) * 16, 2.7, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }
  if (variant === 'plasma_beam') {
    // A rigid, sustained laser, visually separate from jagged lightning arcs.
    const start = arc.points[0];
    const end = arc.points[arc.points.length - 1];
    const alpha = Math.min(1, arc.life / 5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    const laser = (width: number, color: string, blur: number) => {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.stroke();
    };
    laser(30, '#6b21a855', 30);
    laser(17, '#9333ea', 24);
    laser(9, '#d946ef', 13);
    laser(3.5, '#fff1ff', 7);
    // A rotating portal suspended in front of the caster (not where a bubble turned the beam).
    // It masks the laser's start cap and makes the emission feel deliberate.
    if (!arc.reflected) {
      // Stable central aperture, with orbiting motes but no extra rotating ring.
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.arc(start.x, start.y, 12, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(start.x, start.y, 13, 0, TAU);
      ctx.stroke();
      // Keep the four luminous orbiting motes, without an outer purple ring.
      const portalTime = Date.now() * 0.003;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 8;
      for (let i = 0; i < 4; i++) {
        const angle = portalTime * -1.4 + (i * TAU) / 4;
        ctx.fillStyle = i % 2 ? '#f5d0fe' : '#c084fc';
        ctx.beginPath();
        ctx.arc(start.x + Math.cos(angle) * 18, start.y + Math.sin(angle) * 18, 2, 0, TAU);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
    // Fine moving filaments run along the laser, without lightning zigzags.
    const dx = end.x - start.x,
      dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      const nx = -dy / length,
        ny = dx / length;
      const phase = (11 - arc.life) * 12;
      ctx.shadowBlur = 6;
      for (let i = 0; i < Math.floor(length / 24); i++) {
        // Moving filaments stay outside the 18px origin aperture.
        const filamentStart = !arc.reflected ? 25 : 0;
        const travel = length - filamentStart;
        if (travel <= 1) break;
        const t = (filamentStart + ((((i * 24 + phase) % travel) + travel) % travel)) / length;
        const cx = start.x + dx * t,
          cy = start.y + dy * t;
        const offset = Math.sin(t * 35 + phase * 0.12) * 3.5;
        ctx.strokeStyle = i % 2 ? '#f0abfcaa' : '#ffffffaa';
        ctx.lineWidth = i % 2 ? 1.5 : 2;
        ctx.beginPath();
        ctx.moveTo(cx + nx * (offset - 4), cy + ny * (offset - 4));
        ctx.lineTo(cx + nx * (offset + 4), cy + ny * (offset + 4));
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#f5d0fe';
    if (arc.hit) {
      const t = (11 - arc.life) * 0.3;
      for (let i = 0; i < 7; i++) {
        const theta = (i * TAU) / 7 + t;
        const radius = 9 + 4 * Math.sin(t + i);
        ctx.fillStyle = i % 2 ? '#e879f9' : '#fff1ff';
        ctx.beginPath();
        ctx.arc(end.x + Math.cos(theta) * radius, end.y + Math.sin(theta) * radius, 2.5, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = '#f5d0fe';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 11 + 3 * Math.sin(t), 0, TAU);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(end.x, end.y, arc.hit ? 8 : 3, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = Math.min(1, arc.life / 7);
  ctx.setLineDash(style.dash);
  for (const [width, color] of [
    [style.width, style.outer],
    [Math.max(2, style.width * 0.32), style.inner],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';
    ctx.shadowColor = style.outer;
    ctx.shadowBlur = style.blur;
    ctx.beginPath();
    const pts = arc.points;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawWave(wave: Wave) {
  ctx.globalAlpha = wave.life / 25;
  ctx.strokeStyle = wave.color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(wave.x, wave.y, wave.r, wave.r * 0.7, 0, 0, TAU);
  ctx.stroke();
}
