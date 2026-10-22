import { COL, TRAP } from '../../../../shared/constants';
import { TAU } from '../../../../shared/math';
import { g } from '../../dom';

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

/** How many pixels a knocked-up wizard is drawn above the ground: up fast, bobbing, down at the end. */
export function airborneLift(ticksLeft: number, t: number) {
  return (
    Math.min(1, ticksLeft / 8, (TRAP.KNOCKUP_TICKS - ticksLeft) / 6 + 0.2) *
    (16 + Math.sin(t * 0.3) * 3)
  );
}

/** A shadow on the ground and water rings under a knocked-up wizard (the wizard itself is drawn `lift` higher). */
export function drawKnockUp(x: number, y: number, lift: number, t: number) {
  g.save();
  g.fillStyle = '#00000055';
  g.beginPath();
  g.ellipse(x, y + 12, 16 - lift * 0.2, 6 - lift * 0.08, 0, 0, TAU);
  g.fill();
  g.strokeStyle = COL.WATER;
  g.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const phase = (t * 0.04 + i / 2) % 1;
    g.globalAlpha = 0.7 * (1 - phase);
    g.beginPath();
    g.ellipse(x, y + 12, 14 + phase * 22, (14 + phase * 22) * 0.35, 0, 0, TAU);
    g.stroke();
  }
  g.restore();
}
