import { BOMB_FUSE_TICKS, SPELL_COLOR } from '../../../../../shared/constants';
import type { Bomb } from '../../../../../shared/types';
import { clamp, TAU } from '../../../../../shared/math';
import { ctx } from '../../../dom';
import { game } from '../../../state';
import type { BombPaint } from './context';
import { drawEarthBomb } from './earth';
import { drawFallbackBomb } from './fallback';
import { drawFireBomb } from './fire';
import { drawIceBomb } from './ice';
import { drawLightningBomb } from './lightning';
import { drawMagneticBomb } from './magnetic';
import { drawPlasmaBomb } from './plasma';
import { drawSteamBomb } from './steam';
import { drawWaterBomb } from './water';

/** Lightweight canvas-only bomb artwork, matching the top-down arena scale. */
export function drawBomb(bomb: Bomb) {
  const color = SPELL_COLOR[bomb.spell];
  const height = bomb.landed ? 0 : Math.sin(Math.min(1, bomb.flightProgress) * Math.PI) * 105;
  const px = bomb.x,
    py = bomb.y - height - 12;
  const remaining = clamp(bomb.fuse / BOMB_FUSE_TICKS, 0, 1);
  const urgency = 1 - remaining;
  const pulse = 1 + Math.sin(game.t * (0.12 + urgency * 0.28)) * (0.04 + urgency * 0.13);
  const angular = game.t * 0.035;
  ctx.save();

  // Ground shadow makes the throw's height and landing readable.
  ctx.globalAlpha = bomb.landed ? 0.3 : 0.16 + height / 750;
  ctx.fillStyle = '#071319';
  ctx.beginPath();
  ctx.ellipse(px, bomb.y + 3, 12 + height * 0.045, 5 + height * 0.02, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (bomb.landed) {
    // Fixed gameplay blast radius: purely visual, no collision changes.
    const blastRadius = bomb.spell === 'MAGNETIC' ? 165 : 85;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.28 + urgency * 0.58;
    ctx.lineWidth = 1.5 + urgency;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.ellipse(bomb.x, bomb.y, blastRadius, blastRadius * 0.72, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Draw each elemental sprite in local bomb coordinates. Without this
  // translation the artwork renders at canvas (0, 0), in the top-left.
  ctx.translate(px, py);
  ctx.scale(pulse, pulse);

  // Distinct silhouettes: the bombs are not just recoloured spheres.
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  const paint: BombPaint = { bomb, color, urgency, angular };
  if (bomb.spell === 'WATER') drawWaterBomb();
  else if (bomb.spell === 'ICE') drawIceBomb();
  else if (bomb.spell === 'LIGHTNING') drawLightningBomb();
  else if (bomb.spell === 'EARTH') drawEarthBomb();
  else if (bomb.spell === 'PLASMA') drawPlasmaBomb(paint);
  else if (bomb.spell === 'STEAM') drawSteamBomb();
  else if (bomb.spell === 'FIRE') drawFireBomb(paint);
  else if (bomb.spell === 'MAGNETIC') drawMagneticBomb(paint);
  else drawFallbackBomb(paint);

  // Element-specific orbiting motes and an accelerating fuse glow.
  // These are decorative and never affect collision or detonation.
  ctx.globalAlpha = 0.6 + urgency * 0.4;
  for (let i = 0; i < 3; i++) {
    const angle = angular * (bomb.spell === 'MAGNETIC' ? -1.5 : 1.3) + (i * TAU) / 3;
    const r = 22 + Math.sin(game.t * 0.07 + i) * 2;
    const fx = Math.cos(angle) * r,
      fy = Math.sin(angle) * r * 0.75;
    ctx.fillStyle =
      bomb.spell === 'FIRE' || bomb.spell === 'MAGMA'
        ? '#ffe9a3'
        : bomb.spell === 'ICE' || bomb.spell === 'WATER'
          ? '#d9faff'
          : bomb.spell === 'LIGHTNING'
            ? '#fffbc0'
            : color;
    ctx.beginPath();
    ctx.arc(fx, fy, 1.5 + urgency * 1.1, 0, TAU);
    ctx.fill();
  }
  // Orbiting fuse markers contract as the detonation approaches.
  ctx.globalAlpha = 1;
  ctx.rotate(angular);
  for (let i = 0; i < 4; i++) {
    const angle = (i * TAU) / 4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * 17, Math.sin(angle) * 17, 1.4 + urgency * 0.9, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // Draw Ice frost in WORLD space, outside the bomb's pulsing/wobbling scale.
  // Five persistent visual snowflakes rise with smooth sideways drift.
  if (bomb.spell === 'ICE') {
    ctx.save();
    ctx.translate(px, py);
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      // Uneven release phases, speeds and horizontal origins prevent paired flakes.
      const travel = 54 + i * 3;
      const phase = [0, 23, 8, 39, 15][i];
      const rise = (game.t * (0.2 + i * 0.017) + phase) % travel;
      const drift = Math.sin(rise * (0.075 + i * 0.009) + i * 1.8) * (3 + i * 0.55);
      const x = [-12, 8, -3, 14, -8][i] + drift;
      const y = -24 - rise;
      const fade = Math.min(1, rise / 7, (travel - rise) / 10);
      ctx.globalAlpha = (0.77 + urgency * 0.12) * Math.max(0, fade);
      ctx.fillStyle = i % 2 ? '#a7e5ff' : '#f2fdff';
      ctx.beginPath();
      ctx.arc(x, y, 2.1, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = i % 2 ? '#8bd9ff' : '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let arm = 0; arm < 3; arm++) {
        const angle = (arm * Math.PI) / 3;
        const dx = Math.cos(angle) * 5;
        const dy = Math.sin(angle) * 5;
        ctx.moveTo(x - dx, y - dy);
        ctx.lineTo(x + dx, y + dy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}
