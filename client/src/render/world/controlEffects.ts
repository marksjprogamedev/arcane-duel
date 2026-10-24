import { COMBO_OF, SPELL_COLOR, TRAP } from '../../../../shared/constants';
import { TAU } from '../../../../shared/math';
import { ctx } from '../../dom';
import { SHIELD_VISUAL } from './shieldVisual';

/** The three combination colours an element shield blocks; the healing shield uses soft greens. */
function shieldBarColors(type: number) {
  if (type === 4) return ['#eaffdf', '#bbf7d0', '#eaffdf'];
  return Object.keys(COMBO_OF)
    .filter((key) => key.split(',').map(Number).includes(type))
    .map((key) => SPELL_COLOR[COMBO_OF[key]]);
}

/**
 * The elemental or healing shield outline around the wizard; also used by cast prediction.
 * `elapsed` is how far through its life the shield is (0..1).
 */
export function drawShieldOutline(
  x: number,
  y: number,
  color: string,
  fade = 1,
  type = 0,
  elapsed = 0,
) {
  ctx.save();
  const cx = x;
  const cy = y + SHIELD_VISUAL.offsetY;
  const rx = SHIELD_VISUAL.radiusX;
  const ry = SHIELD_VISUAL.radiusY;
  // A visible but translucent glassy tint inside the shield; only outline highlights move.
  const rgb = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (rgb) {
    const [, r, g, b] = rgb;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 1, ry - 1, 0, 0, TAU);
    ctx.clip();
    const sheen = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    sheen.addColorStop(0, `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, 0.18)`);
    sheen.addColorStop(
      0.48,
      `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, 0.13)`,
    );
    sheen.addColorStop(1, `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, 0.1)`);
    ctx.globalAlpha = fade;
    ctx.fillStyle = sheen;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    // A static, soft lens glint gives the translucent fill a glass-like surface.
    ctx.translate(cx - rx * 0.2, cy - ry * 0.38);
    ctx.rotate(-0.42);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.48, ry * 0.11, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // Keep the established silhouette; moving highlights travel only along its outline.
  ctx.globalAlpha = fade * 0.72;
  ctx.shadowColor = color;
  ctx.shadowBlur = SHIELD_VISUAL.shadowBlur * 0.55;
  ctx.strokeStyle = color;
  ctx.lineWidth = SHIELD_VISUAL.lineWidth;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.stroke();

  // Three bars, one per combination this shield blocks, start at bottom, top-left and
  // top-right and make exactly one turn of the ring while the shield lasts.
  const bars = shieldBarColors(type);
  const angle = elapsed * TAU;
  ctx.lineWidth = Math.max(2, SHIELD_VISUAL.lineWidth - 1);
  ctx.lineCap = 'round';
  ctx.shadowBlur = SHIELD_VISUAL.shadowBlur;
  ctx.globalAlpha = fade * 0.8;
  for (let i = 0; i < bars.length; i++) {
    const start = Math.PI / 2 + (i * TAU) / bars.length + angle;
    ctx.strokeStyle = bars[i];
    ctx.shadowColor = bars[i];
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, start, start + 0.62);
    ctx.stroke();
  }
  ctx.restore();
}

/** The reflective bubble dome; `fade` is 0..1. Also used for the caster's instant preview. */
export function drawBubble(x: number, y: number, r: number, fade: number) {
  ctx.save();
  ctx.globalAlpha = 0.9 * fade;
  ctx.shadowColor = '#c4b5fd';
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(196, 181, 253, 0.12)';
  ctx.strokeStyle = '#c4b5fd';
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Lift the dome around the standing wizard. Both confirmed bubbles and
  // instant cast previews use this renderer; simulation coordinates stay fixed.
  ctx.arc(x, y - 12, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** A trap rune on the ground. Dim and slowly turning until armed, then bright and pulsing. */
export function drawTrapRune(x: number, y: number, color: string, armed: boolean, t: number) {
  const pulse = armed ? 0.75 + 0.25 * Math.sin(t * 0.18) : 0.4;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.7);
  ctx.globalAlpha = pulse;
  ctx.shadowColor = color;
  ctx.shadowBlur = armed ? 16 : 6;
  ctx.fillStyle = color + '33';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(armed ? t * 0.02 : t * 0.006);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * TAU) / 6;
    if (i) ctx.lineTo(Math.cos(angle) * 19, Math.sin(angle) * 19);
    else ctx.moveTo(Math.cos(angle) * 19, Math.sin(angle) * 19);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** Rock stakes around an imprisoned wizard, fading as the prison runs out. */
export function drawPrison(x: number, y: number, ticksLeft: number, t: number) {
  const fade = Math.min(1, ticksLeft / 30);
  ctx.save();
  ctx.globalAlpha = fade;
  const rise = Math.min(1, (TRAP.PRISON_TICKS - ticksLeft) / 8 + 0.3);
  for (let i = 0; i < 9; i++) {
    const angle = (i * TAU) / 9 + 0.2;
    const sx = x + Math.cos(angle) * 34,
      sy = y + 10 + Math.sin(angle) * 16,
      height = (52 + (i % 3) * 8) * rise;
    ctx.fillStyle = '#00000044';
    ctx.beginPath();
    ctx.ellipse(sx + 3, sy + 2, 8, 3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = i % 2 ? '#8a7355' : '#a38a66';
    ctx.strokeStyle = '#3f3426';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx - 6, sy);
    ctx.lineTo(sx - 4, sy - height + 8);
    ctx.lineTo(sx, sy - height);
    ctx.lineTo(sx + 4, sy - height + 8);
    ctx.lineTo(sx + 6, sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** How many pixels a knocked-up wizard is drawn above the ground: up fast, bobbing, down at the end. */
export function airborneLift(ticksLeft: number, t: number) {
  return (
    Math.min(1, ticksLeft / 8, (TRAP.KNOCKUP_TICKS - ticksLeft) / 6 + 0.2) *
    (16 + Math.sin(t * 0.3) * 3)
  );
}

/** A shadow on the ground and water rings under a knocked-up wizard (the wizard itself is drawn `lift` higher). */
export function drawKnockUp(x: number, y: number, lift: number, t: number) {
  ctx.save();
  ctx.fillStyle = '#00000055';
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 16 - lift * 0.2, 6 - lift * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = SPELL_COLOR.WATER;
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const phase = (t * 0.04 + i / 2) % 1;
    ctx.globalAlpha = 0.7 * (1 - phase);
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 14 + phase * 22, (14 + phase * 22) * 0.35, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}
