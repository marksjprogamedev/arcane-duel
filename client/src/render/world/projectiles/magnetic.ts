import { TAU } from '../../../../../shared/math';
import { g } from '../../../dom';
import { game } from '../../../state';
import { ellipse, poly } from '../../primitives';

export function drawMagnetic() {
  // Visual-only projectile companion to Magnetic Pull: its layered lime/gold
  // field, bright inner current and alternating electromagnetic filaments.
  const t = game.t;
  g.save();
  g.lineCap = 'round';
  g.shadowColor = '#84cc16';
  g.shadowBlur = 13;
  // Compact, pulsing field rather than the previous diffuse translucent blobs.
  const breathe = Math.sin(t * 0.16) * 1.3;
  g.globalAlpha = 0.35;
  ellipse(0, 0, 19 + breathe, 15 + breathe, '#4d7c0f');
  g.globalAlpha = 0.6;
  ellipse(0, 0, 14 + breathe * 0.6, 11 + breathe * 0.5, '#84cc16');
  g.globalAlpha = 0.85;
  ellipse(0, 0, 9, 7, '#eab308');
  g.globalAlpha = 0.95;
  ellipse(1, -1, 5, 4, '#fef08a');
  g.globalAlpha = 1;
  ellipse(2, -1, 2.2, 2, '#f7fee7');

  // Long, feathered translucent wake aligned with the projectile's flight.
  // Layered tapered ribbons blend into the air instead of ending abruptly.
  g.shadowBlur = 0;
  for (let layer = 0; layer < 3; layer++) {
    const reach = 100 - layer * 14;
    const width = 13 - layer * 4;
    const fade = g.createLinearGradient(-reach, 0, 1, 0);
    fade.addColorStop(0, 'rgba(132,204,22,0)');
    fade.addColorStop(0.3, layer === 1 ? 'rgba(234,179,8,0.035)' : 'rgba(132,204,22,0.045)');
    fade.addColorStop(0.75, layer === 1 ? 'rgba(234,179,8,0.11)' : 'rgba(163,230,53,0.13)');
    fade.addColorStop(1, layer === 2 ? 'rgba(254,240,138,0.26)' : 'rgba(190,242,100,0.2)');
    g.fillStyle = fade;
    g.beginPath();
    g.moveTo(3, -width);
    g.quadraticCurveTo(-reach * 0.4, -width * 0.75, -reach, 0);
    g.quadraticCurveTo(-reach * 0.4, width * 0.75, 3, width);
    g.closePath();
    g.fill();
  }

  // Two rotating strands form a projected 3D helix around the flight axis.
  // Sine moves each strand across the screen; cosine simulates depth by
  // changing size and opacity as it passes in front of/behind the projectile.
  // Sample each strand as short strokes so the spiral reads continuously.
  g.lineCap = 'round';
  for (let strand = 0; strand < 2; strand++) {
    for (let i = 0; i < 16; i++) {
      const distance = 7 + i * 5.8;
      const falloff = Math.max(0, 1 - distance / 105);
      const phase = t * 0.16 + distance * 0.105 + strand * Math.PI;
      const depth = Math.cos(phase);
      const lateral = Math.sin(phase) * (8 + 3 * falloff);
      const nextPhase = phase + 0.105 * 5.8;
      const nextLateral = Math.sin(nextPhase) * (8 + 3 * falloff);
      g.globalAlpha = (0.18 + (depth + 1) * 0.23) * falloff;
      g.strokeStyle = strand === 0 ? '#bef264' : '#facc15';
      g.lineWidth = (1.1 + (depth + 1) * 1.1) * (0.6 + falloff * 0.4);
      g.shadowColor = strand === 0 ? '#a3e635' : '#fef08a';
      g.shadowBlur = depth > 0 ? 8 : 2;
      g.beginPath();
      g.moveTo(-distance, lateral);
      g.lineTo(-distance - 5.8, nextLateral);
      g.stroke();
      if (i % 3 === 0) {
        const moteSize = (0.8 + (depth + 1) * 0.85) * (0.5 + falloff * 0.5);
        ellipse(-distance, lateral, moteSize, moteSize, depth > 0 ? '#fef08a' : '#84cc16');
      }
    }
  }
  g.globalAlpha = 1;
  g.shadowBlur = 0;

  // One cohesive forged-metal projectile instead of four separate shards.
  // Angular shoulders and silver facets keep its magnetic/industrial character.
  g.shadowBlur = 0;
  poly(
    [
      [-12, -5],
      [-7, -10],
      [3, -11],
      [11, -6],
      [13, 1],
      [8, 9],
      [-2, 11],
      [-11, 6],
      [-14, 0],
    ],
    '#334155',
  );
  poly(
    [
      [-10, -5],
      [-6, -9],
      [3, -9],
      [9, -5],
      [5, -2],
      [-6, -2],
    ],
    '#94a3b8',
  );
  poly(
    [
      [-11, 2],
      [-5, 0],
      [5, 1],
      [10, 5],
      [7, 8],
      [-3, 9],
    ],
    '#475569',
  );
  poly(
    [
      [4, -8],
      [10, -5],
      [12, 1],
      [8, 3],
      [5, -2],
    ],
    '#cbd5e1',
  );
  // A single central seam and glint, not gaps between disconnected pieces.
  g.strokeStyle = '#d1d5db';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(-9, 0);
  g.lineTo(0, -1);
  g.lineTo(8, 3);
  g.stroke();
  ellipse(-5, -5, 2.3, 1.1, '#e2e8f0');

  // Animated bloom wraps around the projectile, brightening as it passes in front.
  const haloPhase = t * 0.23;
  const flicker = 0.86 + Math.sin(t * 0.43) * 0.14;
  g.lineCap = 'round';
  for (let strand = 0; strand < 2; strand++) {
    const offset = strand * Math.PI;
    for (let i = 0; i < 12; i++) {
      const phase = haloPhase + offset + (i / 12) * TAU;
      const next = phase + TAU / 12;
      const depth = Math.cos(phase + TAU / 24);
      if (depth < -0.12) continue;
      const radiusX = 16 + Math.sin(t * 0.13 + strand) * 1.2;
      const radiusY = 12;
      g.globalAlpha = Math.max(0.07, (0.28 + depth * 0.48) * flicker);
      g.strokeStyle = strand === 0 ? '#bef264' : '#fef08a';
      g.shadowColor = strand === 0 ? '#a3e635' : '#eab308';
      g.shadowBlur = 7 + depth * 8;
      g.lineWidth = 1.4 + depth * 1.4;
      g.beginPath();
      g.moveTo(Math.sin(phase) * radiusX, Math.cos(phase) * radiusY);
      g.lineTo(Math.sin(next) * radiusX, Math.cos(next) * radiusY);
      g.stroke();
    }
  }
  for (let i = 0; i < 3; i++) {
    const phase = haloPhase + (i * TAU) / 3;
    const depth = Math.cos(phase);
    g.globalAlpha = (0.35 + 0.55 * Math.max(0, depth)) * flicker;
    g.shadowColor = '#fef08a';
    g.shadowBlur = depth > 0 ? 13 : 3;
    ellipse(
      Math.sin(phase) * 17,
      depth * 13,
      1.1 + Math.max(0, depth) * 1.3,
      1.1 + Math.max(0, depth) * 1.3,
      i % 2 ? '#fde047' : '#d9f99d',
    );
  }
  g.globalAlpha = 1;
  g.shadowBlur = 0;

  // Oscillating containment filaments echo Magnetic Pull's sparking beam.
  g.shadowColor = '#a3e635';
  g.shadowBlur = 8;
  for (let i = 0; i < 3; i++) {
    const phase = t * 0.17 + i * (TAU / 3);
    const y = Math.sin(phase) * 12;
    const x = Math.cos(phase) * 5;
    g.globalAlpha = 0.83;
    g.strokeStyle = i % 2 ? '#fef08a' : '#bef264';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-17 + x, y - 5);
    g.lineTo(-11 + x, y + 1);
    g.lineTo(-5 + x, y - 3);
    g.stroke();
    g.fillStyle = i % 2 ? '#fde047' : '#a3e635';
    g.beginPath();
    g.arc(-17 + x, y - 5, 1.5, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  g.restore();
}
