import { g } from '../../../dom';
import { TAU } from '../../../../../shared/math';
import { BOMB_FUSE_TICKS } from '../../../../../shared/constants';
import { game } from '../../../state';
import type { BombCtx } from './context';
export function drawPlasmaBomb(c: BombCtx) {
  const { b } = c;
  // Animated swirling plasma sphere and low-cost solar-flare tongues.
  // Rotate the entire shell, luminous markings and flares clockwise together.
  const elapsed = Math.max(0, BOMB_FUSE_TICKS - b.fuse);
  const progress = Math.min(1, elapsed / BOMB_FUSE_TICKS);
  const wholeSpin = 0.038 * elapsed + (0.85 * BOMB_FUSE_TICKS * Math.pow(progress, 4)) / 4;
  g.save();
  g.rotate(wholeSpin);
  g.fillStyle = '#63327c';
  g.strokeStyle = '#e0abff';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(0, 0, 14, 0, TAU);
  g.fill();
  g.stroke();
  const glow = g.createRadialGradient(-3, -4, 0, 0, 0, 14);
  glow.addColorStop(0, '#341044');
  glow.addColorStop(0.17, '#61227b');
  glow.addColorStop(0.38, '#a34acb');
  glow.addColorStop(0.65, '#d185eb');
  glow.addColorStop(0.85, '#8738ae');
  glow.addColorStop(1, '#50216f');
  g.fillStyle = glow;
  g.beginPath();
  g.arc(0, 0, 12, 0, TAU);
  g.fill();
  // Small translucent darker pockets add depth without a hard dividing stripe.
  g.save();
  g.globalAlpha = 0.35;
  g.fillStyle = '#37104e';
  g.beginPath();
  g.ellipse(5, 5, 4.4, 2.8, -0.6, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(-7, 2, 2.5, 4, 0.25, 0, TAU);
  g.fill();
  g.restore();
  // Soft purple bloom, no bright two-tone ring around the surface.
  g.save();
  g.globalAlpha = 0.32;
  g.strokeStyle = '#b94de7';
  g.shadowColor = '#bb55ef';
  g.shadowBlur = 8;
  g.lineWidth = 2.2;
  g.beginPath();
  g.arc(0, 0, 14, 0, TAU);
  g.stroke();
  g.restore();
  // Internal currents rotate gently relative to the rapidly spinning shell.
  const plasmaSpin = elapsed * 0.012;
  // Small stationary-on-shell plasma sparks replace the conspicuous arc-shaped stripe.
  const plasmaDots: [number, number, number][] = [
    [-7, -7, 1.5],
    [3, -9, 1.1],
    [8, -4, 1.4],
    [-10, 1, 1.1],
    [-4, 3, 1.2],
    [4, 5, 1.6],
    [-6, 9, 1.1],
    [9, 7, 1.0],
    [0, -3, 1.3],
    [2, 10, 0.9],
  ];
  for (let i = 0; i < plasmaDots.length; i++) {
    const [x, y, r] = plasmaDots[i];
    g.globalAlpha = 0.45 + 0.3 * (0.5 + 0.5 * Math.sin(game.t * 0.065 + i * 1.7));
    g.fillStyle = (['#fff1ff', '#d58cf8', '#74239f', '#f6a7df', '#a756ed', '#e0c1ff'] as const)[
      i % 6
    ];
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  // Solar-flare loops projecting from the rim. Fixed canvas paths; no new particles.
  for (let i = 0; i < 3; i++) {
    const a = plasmaSpin * 0.6 + (i * TAU) / 3;
    const length = 4 + 2 * Math.sin(game.t * 0.055 + i * 2);
    g.save();
    g.rotate(a);
    g.strokeStyle = i === 1 ? '#f5b5ff' : '#d56af7';
    g.lineWidth = 1.9;
    g.globalAlpha = 0.72 + 0.16 * Math.sin(game.t * 0.06 + i);
    g.beginPath();
    g.moveTo(10, -3);
    g.bezierCurveTo(15, -7 - length, 20, -5 - length, 14, 3);
    g.stroke();
    g.restore();
  }
  // Short plasma lashes crackle outward more frequently as the fuse runs down.
  // Fixed canvas strokes only: no new particles or gameplay radius changes.
  for (let i = 0; i < 4; i++) {
    const phase = game.t * (0.12 + i * 0.009) + i * 2.37;
    const flicker = Math.max(0, Math.sin(phase));
    const extension = (3 + 9 * progress) * flicker;
    if (extension < 1) continue;
    g.save();
    g.rotate((i * TAU) / 4 + game.t * 0.013);
    g.globalAlpha = (0.32 + 0.55 * progress) * flicker;
    g.strokeStyle = i % 2 ? '#f2b5ff' : '#c36cff';
    g.lineWidth = 1.2 + progress * 0.5;
    g.beginPath();
    g.moveTo(12, 0);
    g.lineTo(16 + extension * 0.35, -2.5);
    g.lineTo(17 + extension, 1.8);
    g.stroke();
    g.restore();
  }
  g.fillStyle = '#ffe4ff';
  g.beginPath();
  g.arc(-3, -4, 1.4, 0, TAU);
  g.fill();
  g.restore();
}
