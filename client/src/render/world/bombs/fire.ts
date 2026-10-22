import { g } from '../../../dom';
import { TAU } from '../../../../../shared/math';
import { game } from '../../../state';
import type { BombCtx } from './context';
export function drawFireBomb(c: BombCtx) {
  const { b, color, urgency } = c;
  // A few translucent smoke wisps build up as the fuse nears detonation.
  // Canvas-only and fixed-count: no extra simulated particles or gameplay changes.
  const smokeStrength = 0.16 + urgency * 0.44;
  for (let i = 0; i < 3; i++) {
    const drift = Math.sin(game.t * 0.045 + i * 2.3) * (3 + i * 2);
    const rise = (game.t * (0.35 + i * 0.08) + i * 9) % 29;
    g.globalAlpha = smokeStrength * (1 - rise / 34);
    g.fillStyle = i % 2 ? '#647076' : '#93999a';
    g.beginPath();
    g.ellipse(
      drift - 2,
      -15 - rise,
      4 + i * 1.2 + urgency * 2,
      6 + i * 1.4 + urgency * 2,
      0,
      0,
      TAU,
    );
    g.fill();
  }
  g.globalAlpha = 1;
  // Molten, cracked charcoal sphere with a sparse thrown ember trail.
  if (!b.landed) {
    for (let i = 3; i >= 1; i--) {
      g.globalAlpha = 0.13 + (4 - i) * 0.11;
      g.fillStyle = i % 2 ? '#f97316' : '#facc15';
      g.beginPath();
      g.arc(-i * 8, 6 + Math.sin(game.t * 0.12 + i) * 3, 1.5 + (4 - i) * 0.6, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  g.fillStyle = '#211d1b';
  g.strokeStyle = '#9a4322';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(0, 0, 14, 0, TAU);
  g.fill();
  g.stroke();
  g.fillStyle = '#493029';
  g.beginPath();
  g.ellipse(-3, -5, 8, 6, -0.4, 0, TAU);
  g.fill();
  g.lineJoin = 'round';
  for (const [width, color] of [
    [4, '#c2410c'],
    [1.9, '#ffb52e'],
  ] as const) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(-9, -9);
    g.lineTo(-4, -4);
    g.lineTo(-6, 2);
    g.lineTo(-1, 6);
    g.lineTo(1, 12);
    g.moveTo(5, -12);
    g.lineTo(3, -6);
    g.lineTo(8, -1);
    g.lineTo(5, 5);
    g.lineTo(10, 9);
    g.stroke();
  }
  g.fillStyle = '#ffe08a';
  g.beginPath();
  g.arc(-4, -4, 1.6, 0, TAU);
  g.arc(8, -1, 1.4, 0, TAU);
  g.fill();
}
