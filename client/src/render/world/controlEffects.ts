import { SPELL_COLOR, TRAP } from '../../../../shared/constants';
import { TAU } from '../../../../shared/math';
import { ctx } from '../../dom';

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
  ctx.arc(x, y, r, 0, TAU);
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
