import { ctx } from '../../../dom';
import { TAU } from '../../../../../shared/math';
import type { Bomb } from '../../../../../shared/types';
import type { BombPaint } from './context';
export function drawFallbackBomb(paint: BombPaint) {
  const { bomb, color } = paint;
  // Other elemental bomb casings remain unchanged until reviewed individually.
  const palettes: Partial<Record<Bomb['spell'], [string, string, string, string]>> = {
    EARTH: ['#423e32', '#88795c', '#b4a37e', '#9aad78'],
    ICE: ['#24485f', '#5eb5d9', '#d5faff', '#9ee9ff'],
    MAGMA: ['#292122', '#7e3226', '#ff9b27', '#ffd15b'],
    STEAM: ['#455262', '#94a3b8', '#f1f5f9', '#dce5ee'],
    LIGHTNING: ['#333543', '#85838a', '#facc15', '#fef08a'],
    STORM: ['#2c3651', '#64749c', '#b8c8ff', '#e0e7ff'],
    PLASMA: ['#372340', '#87449e', '#e879f9', '#fae8ff'],
  };
  const [shell, face, seam, glint] = palettes[bomb.spell] ?? [
    '#263344',
    '#64748b',
    color,
    '#e2e8f0',
  ];
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = seam;
  ctx.lineWidth = 1.7;
  ctx.stroke();
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.ellipse(-4, -5, 8, 6, -0.35, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = seam;
  ctx.lineWidth = 2.1;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, -6);
  ctx.lineTo(-4, -2);
  ctx.lineTo(-6, 4);
  ctx.lineTo(0, 9);
  ctx.moveTo(6, -10);
  ctx.lineTo(3, -4);
  ctx.lineTo(9, 1);
  ctx.stroke();
  ctx.fillStyle = glint;
  ctx.beginPath();
  ctx.arc(-6, -8, 2.1, 0, TAU);
  ctx.fill();
}
