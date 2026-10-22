import { BOMB_FUSE_TICKS, SPELL_COLOR } from '../../../../../shared/constants';
import type { Bomb } from '../../../../../shared/types';
import { clamp, TAU } from '../../../../../shared/math';
import { g } from '../../../dom';
import { game } from '../../../state';
import type { BombCtx } from './context';
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
export function drawBomb(b: Bomb) {
  const color = SPELL_COLOR[b.k];
  const height = b.landed ? 0 : Math.sin(Math.min(1, b.u) * Math.PI) * 105;
  const px = b.x,
    py = b.y - height - 12;
  const remaining = clamp(b.fuse / BOMB_FUSE_TICKS, 0, 1);
  const urgency = 1 - remaining;
  const pulse = 1 + Math.sin(game.t * (0.12 + urgency * 0.28)) * (0.04 + urgency * 0.13);
  const angular = game.t * 0.035;
  g.save();

  // Ground shadow makes the throw's height and landing readable.
  g.globalAlpha = b.landed ? 0.3 : 0.16 + height / 750;
  g.fillStyle = '#071319';
  g.beginPath();
  g.ellipse(px, b.y + 3, 12 + height * 0.045, 5 + height * 0.02, 0, 0, TAU);
  g.fill();
  g.globalAlpha = 1;

  if (b.landed) {
    // Fixed gameplay blast radius: purely visual, no collision changes.
    g.strokeStyle = color;
    g.globalAlpha = 0.28 + urgency * 0.58;
    g.lineWidth = 1.5 + urgency;
    g.setLineDash([7, 5]);
    g.beginPath();
    g.ellipse(
      b.x,
      b.y,
      b.k === 'MAGNETIC' ? 165 : 85,
      (b.k === 'MAGNETIC' ? 165 : 85) * 0.72,
      0,
      0,
      TAU,
    );
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
  }

  // Draw each elemental sprite in local bomb coordinates. Without this
  // translation the artwork renders at canvas (0, 0), in the top-left.
  g.translate(px, py);
  g.scale(pulse, pulse);

  // Distinct silhouettes: the bombs are not just recoloured spheres.
  g.lineWidth = 2;
  g.strokeStyle = color;
  const c: BombCtx = { b, color, urgency, angular };
  if (b.k === 'WATER') drawWaterBomb();
  else if (b.k === 'ICE') drawIceBomb();
  else if (b.k === 'LIGHTNING') drawLightningBomb();
  else if (b.k === 'EARTH') drawEarthBomb();
  else if (b.k === 'PLASMA') drawPlasmaBomb(c);
  else if (b.k === 'STEAM') drawSteamBomb();
  else if (b.k !== 'FIRE' && b.k !== 'MAGNETIC') drawFallbackBomb(c);
  else if (b.k === 'FIRE') drawFireBomb(c);
  else if (b.k === 'MAGNETIC') drawMagneticBomb(c);

  // Element-specific orbiting motes and an accelerating fuse glow.
  // These are decorative and never affect collision or detonation.
  g.globalAlpha = 0.6 + urgency * 0.4;
  for (let i = 0; i < 3; i++) {
    const a = angular * (b.k === 'MAGNETIC' ? -1.5 : 1.3) + (i * TAU) / 3;
    const r = 22 + Math.sin(game.t * 0.07 + i) * 2;
    const fx = Math.cos(a) * r,
      fy = Math.sin(a) * r * 0.75;
    g.fillStyle =
      b.k === 'FIRE' || b.k === 'MAGMA'
        ? '#ffe9a3'
        : b.k === 'ICE' || b.k === 'WATER'
          ? '#d9faff'
          : b.k === 'LIGHTNING'
            ? '#fffbc0'
            : color;
    g.beginPath();
    g.arc(fx, fy, 1.5 + urgency * 1.1, 0, TAU);
    g.fill();
  }
  // Orbiting fuse markers contract as the detonation approaches.
  g.globalAlpha = 1;
  g.rotate(angular);
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4;
    g.fillStyle = color;
    g.beginPath();
    g.arc(Math.cos(a) * 17, Math.sin(a) * 17, 1.4 + urgency * 0.9, 0, TAU);
    g.fill();
  }
  g.restore();
  // Draw Ice frost in WORLD space, outside the bomb's pulsing/wobbling scale.
  // Five persistent visual snowflakes rise with smooth sideways drift.
  if (b.k === 'ICE') {
    g.save();
    g.translate(px, py);
    g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      // Uneven release phases, speeds and horizontal origins prevent paired flakes.
      const travel = 54 + i * 3;
      const phase = [0, 23, 8, 39, 15][i];
      const rise = (game.t * (0.2 + i * 0.017) + phase) % travel;
      const drift = Math.sin(rise * (0.075 + i * 0.009) + i * 1.8) * (3 + i * 0.55);
      const x = [-12, 8, -3, 14, -8][i] + drift;
      const y = -24 - rise;
      const fade = Math.min(1, rise / 7, (travel - rise) / 10);
      g.globalAlpha = (0.77 + urgency * 0.12) * Math.max(0, fade);
      g.fillStyle = i % 2 ? '#a7e5ff' : '#f2fdff';
      g.beginPath();
      g.arc(x, y, 2.1, 0, TAU);
      g.fill();
      g.strokeStyle = i % 2 ? '#8bd9ff' : '#ffffff';
      g.lineWidth = 1.2;
      g.beginPath();
      for (let arm = 0; arm < 3; arm++) {
        const angle = (arm * Math.PI) / 3;
        const dx = Math.cos(angle) * 5;
        const dy = Math.sin(angle) * 5;
        g.moveTo(x - dx, y - dy);
        g.lineTo(x + dx, y + dy);
      }
      g.stroke();
    }
    g.restore();
  }
}
