import { TAU } from '../../../../../shared/math';
import { ctx } from '../../../dom';
import { game } from '../../../state';
import { ellipse } from '../../shapes';

export function drawPlasma() {
  // A volatile plasma comet: layered violet-pink atmosphere, flowing ribbons,
  // and a multicolour energetic core. All effects are draw-only.
  const t = game.t;
  ctx.save();
  // Wider diffuse atmosphere and long, translucent tapered plume.
  ctx.shadowBlur = 0;
  const aura = ctx.createRadialGradient(0, 0, 3, 0, 0, 31);
  aura.addColorStop(0, 'rgba(255,241,255,0.15)');
  aura.addColorStop(0.32, 'rgba(232,121,249,0.25)');
  aura.addColorStop(0.65, 'rgba(126,34,206,0.13)');
  aura.addColorStop(1, 'rgba(126,34,206,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, TAU);
  ctx.fill();
  for (let layer = 0; layer < 3; layer++) {
    const length = 106 - layer * 13;
    const width = 19 - layer * 5;
    const fade = ctx.createLinearGradient(-length, 0, 7, 0);
    fade.addColorStop(0, 'rgba(126,34,206,0)');
    fade.addColorStop(0.35, layer === 1 ? 'rgba(217,70,239,0.07)' : 'rgba(126,34,206,0.06)');
    fade.addColorStop(0.78, layer === 2 ? 'rgba(245,208,254,0.18)' : 'rgba(192,132,252,0.14)');
    fade.addColorStop(1, layer === 2 ? 'rgba(255,241,255,0.30)' : 'rgba(217,70,239,0.24)');
    ctx.fillStyle = fade;
    ctx.beginPath();
    ctx.moveTo(5, -width);
    ctx.bezierCurveTo(-length * 0.32, -width * 1.1, -length * 0.8, -width * 0.25, -length, 0);
    ctx.bezierCurveTo(-length * 0.8, width * 0.25, -length * 0.32, width * 1.1, 5, width);
    ctx.closePath();
    ctx.fill();
  }
  // Uneven, twisting plasma streamers, with different speeds and phases to
  // avoid Magnetic Shot's neat, symmetrical double helix.
  ctx.lineCap = 'round';
  for (let strand = 0; strand < 3; strand++) {
    ctx.shadowColor = strand === 0 ? '#d946ef' : '#a855f7';
    ctx.shadowBlur = 7;
    for (let i = 0; i < 13; i++) {
      const d = 8 + i * 7;
      const fade = Math.max(0, 1 - d / 106);
      const phase = t * (0.13 + strand * 0.036) + d * (0.082 + strand * 0.009) + (strand * TAU) / 3;
      const offset = Math.sin(phase) * (10 + 4 * Math.sin(t * 0.04 + strand));
      const next =
        Math.sin(phase + 7 * (0.082 + strand * 0.009)) * (10 + 4 * Math.sin(t * 0.04 + strand));
      const depth = Math.cos(phase);
      ctx.globalAlpha = fade * (0.19 + (0.46 * (depth + 1)) / 2);
      ctx.lineWidth = (1 + Math.max(0, depth) * 1.9) * (0.55 + fade * 0.45);
      ctx.strokeStyle = strand === 0 ? '#f5d0fe' : strand === 1 ? '#d946ef' : '#c084fc';
      ctx.beginPath();
      ctx.moveTo(-d, offset);
      ctx.lineTo(-d - 7, next);
      ctx.stroke();
      if (i % 3 === strand) {
        ctx.fillStyle = depth > 0 ? '#fff1ff' : '#a855f7';
        ctx.beginPath();
        ctx.arc(-d, offset, (0.8 + Math.max(0, depth)) * fade, 0, TAU);
        ctx.fill();
      }
    }
  }
  // Shimmering layered core: purple shell, magenta plasma and hot pink-white centre.
  const pulse = 1 + 0.07 * Math.sin(t * 0.23);
  ctx.globalAlpha = 1;
  ctx.shadowColor = '#7e22ce';
  ctx.shadowBlur = 20;
  ellipse(0, 0, 17 * pulse, 14 * pulse, '#6b21a8');
  ctx.shadowColor = '#d946ef';
  ctx.shadowBlur = 13;
  ellipse(1, -1, 12 * pulse, 10 * pulse, '#a21caf');
  ellipse(2, -1, 8 * pulse, 6 * pulse, '#f472b6');
  ctx.shadowColor = '#f5d0fe';
  ellipse(3, -2, 5 * pulse, 4 * pulse, '#f5d0fe');
  ellipse(4, -2, 2, 2, '#fff1ff');
  // Flickering asymmetric electric tongues at the edge of the core.
  for (let i = 0; i < 6; i++) {
    const phase = t * (0.13 + (i % 2) * 0.04) + (i * TAU) / 6;
    const x = Math.cos(phase),
      y = Math.sin(phase);
    const reach = 19 + 6 * Math.sin(t * 0.2 + i * 2);
    ctx.globalAlpha = 0.48 + 0.4 * Math.sin(t * 0.16 + i) ** 2;
    ctx.strokeStyle = i % 3 === 0 ? '#fff1ff' : i % 2 ? '#f5d0fe' : '#c084fc';
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.4;
    ctx.beginPath();

    ctx.moveTo(x * 9, y * 8);
    ctx.lineTo(x * 14 - y * 4, y * 12 + x * 4);
    ctx.lineTo(x * reach, y * reach * 0.82);
    ctx.stroke();
  }
  ctx.restore();
}
