import { TAU } from '../../../../../shared/math';
import { g } from '../../../dom';
import { game } from '../../../state';
import { ellipse } from '../../primitives';

export function drawSteam() {
  // Local-only illustration: broad translucent wake, dense shifting core and curling wisps.
  // The projectile's simulation radius, speed and collision remain untouched.
  g.shadowColor = '#cbd5e1';
  g.shadowBlur = 8;
  for (let i = 4; i >= 1; i--) {
    const drift = Math.sin(game.t * 0.11 + i * 1.7);
    g.globalAlpha = 0.08 + (5 - i) * 0.045;
    ellipse(-i * 11, drift * (3 + i), 7 + i * 2, 5 + i * 1.5, i % 2 ? '#e2e8f0' : '#f8fafc');
  }
  // Overlapping translucent lobes read as one turbulent cloud, not separate bright beads.
  for (let i = 0; i < 6; i++) {
    const phase = game.t * 0.052 + (i * TAU) / 6;
    const swirl = 7 + 3 * Math.sin(game.t * 0.09 + i);
    g.globalAlpha = 0.19 + 0.045 * (i % 3);
    ellipse(
      Math.cos(phase) * swirl,
      Math.sin(phase) * swirl * 0.8,
      13 + 2 * (i % 2),
      11 + 2 * (i % 3),
      i % 3 === 0 ? '#94a3b8' : i % 2 ? '#f8fafc' : '#cbd5e1',
    );
  }
  g.globalAlpha = 0.5;
  ellipse(0, 0, 13, 11, '#e2e8f0');
  g.globalAlpha = 0.48;
  ellipse(2, -2, 8, 7, '#fffdf7');
  // Thin vapour curls with a tiny, fixed draw budget.
  g.shadowBlur = 0;
  g.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const a = game.t * 0.055 + (i * TAU) / 3;
    const sx = Math.cos(a) * 11;
    const sy = Math.sin(a) * 9;
    g.globalAlpha = 0.27;
    g.strokeStyle = i % 2 ? '#e2e8f0' : '#fffdf7';
    g.beginPath();
    g.moveTo(sx - 5, sy + 4);
    g.quadraticCurveTo(sx + 2, sy - 9, sx + 12, sy - 2);
    g.stroke();
  }
  g.globalAlpha = 1;
}
