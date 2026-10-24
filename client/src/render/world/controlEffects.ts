import { SPELL_COLOR, TRAP } from '../../../../shared/constants';
import { TAU } from '../../../../shared/math';
import { ctx } from '../../dom';
import { SHIELD_VISUAL } from './shieldVisual';

/** The elemental or healing shield outline around the wizard; also used by cast prediction. */
export function drawShieldOutline(x: number, y: number, color: string, fade = 1, type = 0, t = 0) {
  ctx.save();
  const cx = x;
  const cy = y + SHIELD_VISUAL.offsetY;
  const rx = SHIELD_VISUAL.radiusX;
  const ry = SHIELD_VISUAL.radiusY;
  ctx.globalAlpha = fade;
  // Keep every texture inside the established shield silhouette.
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.globalAlpha = fade * 0.075;
  ctx.fill();
  ctx.globalAlpha = fade;
  ctx.shadowColor = color;
  ctx.shadowBlur = SHIELD_VISUAL.shadowBlur * 0.55;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  if (type === 1) {
    // Water: clockwise travelling arcs and a few intermittently falling droplets.
    ctx.strokeStyle = '#c8f5ff';
    ctx.globalAlpha = fade * 0.48;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(
        cx,
        cy,
        rx - 7 - i * 7,
        ry - 8 - i * 8,
        0,
        t * 0.025 + i * 2.1,
        t * 0.025 + i * 2.1 + 0.8,
      );
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const phase = (t * 0.035 + i / 3) % 1;
      const dx = cx + Math.sin(i * 5.1) * (rx - 7);
      const dy = cy + ry - 3 + phase * 10;
      if (phase < 0.4) {
        ctx.beginPath();
        ctx.ellipse(dx, dy, 2.2, 3.6, 0, 0, TAU);
        ctx.fillStyle = '#c8f5ff';
        ctx.fill();
      }
    }
  } else if (type === 0) {
    // Fire: warm, wavering tongues rising along the inside edge.
    ctx.strokeStyle = '#ffe08a';
    ctx.globalAlpha = fade * 0.5;
    for (let i = 0; i < 7; i++) {
      const px = cx - 30 + i * 10;
      const wave = Math.sin(t * 0.13 + i * 1.7) * 4;
      ctx.beginPath();
      ctx.moveTo(px, cy + 16);
      ctx.quadraticCurveTo(px - 5 + wave, cy + 4, px + wave, cy - 5 - (i % 3) * 3);
      ctx.stroke();
    }
  } else if (type === 2) {
    // Lightning: short branching pulses that flash around the perimeter.
    ctx.strokeStyle = '#f5f7ff';
    ctx.globalAlpha = fade * (0.28 + 0.32 * (0.5 + 0.5 * Math.sin(t * 0.22)));
    for (let i = 0; i < 5; i++) {
      const px = cx - 28 + ((i * 17 + Math.floor(t * 0.12) * 7) % 56);
      const py = cy - 27 + (i % 3) * 24;
      ctx.beginPath();
      ctx.moveTo(px - 4, py - 7);
      ctx.lineTo(px + 2, py);
      ctx.lineTo(px - 2, py + 5);
      ctx.lineTo(px + 4, py + 11);
      ctx.stroke();
    }
  } else if (type === 3) {
    // Earth: slow-moving angular plates, like overlapping stone facets.
    ctx.strokeStyle = '#d6c39a';
    ctx.globalAlpha = fade * 0.44;
    for (let i = 0; i < 6; i++) {
      const px = cx - 30 + i * 12 + Math.sin(t * 0.025 + i) * 2;
      const py = cy - 23 + (i % 3) * 23;
      ctx.beginPath();
      ctx.moveTo(px - 5, py - 5);
      ctx.lineTo(px + 3, py - 7);
      ctx.lineTo(px + 6, py + 1);
      ctx.lineTo(px, py + 6);
      ctx.closePath();
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = '#eaffdf';
    ctx.globalAlpha = fade * 0.42;
    ctx.setLineDash([5, 7]);
    ctx.lineDashOffset = -t * 0.15;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 10, ry - 10, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = fade;
  ctx.strokeStyle = color;
  ctx.lineWidth = SHIELD_VISUAL.lineWidth;
  ctx.shadowColor = color;
  ctx.shadowBlur = SHIELD_VISUAL.shadowBlur;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.stroke();
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
