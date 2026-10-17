import { COL } from '../../../shared/constants';
import { TAU } from '../../../shared/math';
import type { Shot } from '../../../shared/types';
import { g } from '../dom';
import { game } from '../state';
import { ellipse, poly } from './primitives';

export function projectile(
  s: Pick<Shot, 'x' | 'y' | 'vx' | 'vy' | 'k' | 'r' | 'life'> & Partial<Shot>,
) {
  let x = s.x,
    y = s.y - 20,
    c = COL[s.k],
    ang = Math.atan2(s.vy, s.vx);
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.shadowColor = c;
  g.shadowBlur = 20;
  const pulse = Math.sin(game.t * 0.19 + s.x * 0.1);
  if (s.variant === 'pyro_disc') {
    // An open-centred, spinning fire ring with sparks and a fading wake.
    const time = game.t;
    const radius = Math.max(17, s.r + 3);
    const speed = Math.hypot(s.vx, s.vy) || 1;
    const ux = s.vx / speed,
      uy = s.vy / speed;
    g.save();
    g.rotate(-ang);
    for (let j = 5; j >= 1; j--) {
      const fade = (6 - j) / 6;
      g.globalAlpha = fade * 0.21;
      g.strokeStyle = j % 2 ? '#fb923c' : '#facc15';
      g.lineWidth = 5 * fade;
      g.beginPath();
      g.ellipse(
        -ux * j * 8,
        -uy * j * 8,
        radius * (0.75 + fade * 0.2),
        radius * (0.75 + fade * 0.2),
        0,
        0,
        TAU,
      );
      g.stroke();
    }
    g.globalAlpha = 1;
    g.shadowColor = '#fb4d0c';
    g.shadowBlur = 24;
    g.strokeStyle = '#b91c1c';
    g.lineWidth = 11;
    g.beginPath();
    g.arc(0, 0, radius, 0, TAU);
    g.stroke();
    g.strokeStyle = '#fb923c';
    g.lineWidth = 8;
    g.beginPath();
    g.arc(0, 0, radius, 0, TAU);
    g.stroke();
    g.shadowColor = '#fde047';
    g.shadowBlur = 16;
    g.strokeStyle = '#fef08a';
    g.lineWidth = 3.5;
    g.beginPath();
    g.arc(0, 0, radius, 0, TAU);
    g.stroke();
    for (let i = 0; i < 16; i++) {
      const theta = (i * TAU) / 16 + time * 0.16;
      const wave = Math.sin(time * 0.22 + i * 2.4);
      const edge = radius + 3 + 5 * wave;
      const px = Math.cos(theta) * edge;
      const py = Math.sin(theta) * edge;
      const size = 1.5 + (i % 4) * 0.65;
      g.globalAlpha = 0.65 + 0.3 * Math.sin(time * 0.13 + i);
      ellipse(px, py, size, size, i % 3 === 0 ? '#fff7ed' : i % 2 ? '#facc15' : '#fb923c');
      const tail = 4 + (i % 3) * 3;
      g.strokeStyle = i % 2 ? '#fb923c' : '#fef08a';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px - ux * tail - Math.sin(theta) * 3, py - uy * tail + Math.cos(theta) * 3);
      g.stroke();
    }
    g.restore();
  } else if (s.variant === 'pebbles') {
    poly(
      [
        [-5, -3],
        [-1, -6],
        [5, -2],
        [4, 4],
        [-3, 5],
      ],
      '#857663',
    );
    poly(
      [
        [-5, -3],
        [-1, -6],
        [5, -2],
        [-2, 0],
      ],
      '#e2d0af',
    );
  } else if (s.variant === 'fireball') {
    for (let i = 0; i < 4; i++) {
      const t = i * 0.9 + game.t * 0.12;
      poly(
        [
          [-s.r - 12 - i * 5, Math.sin(t) * 7],
          [-s.r + 3, -s.r * 0.7],
          [s.r * 0.7, 0],
          [-s.r + 3, s.r * 0.7],
        ],
        i % 2 ? '#f97316' : '#dc2626',
      );
    }
    ellipse(0, 0, s.r + 3, s.r + 2, '#f97316');
    ellipse(3, -2, s.r * 0.67, s.r * 0.67, '#fde047');
    ellipse(6, -4, s.r * 0.32, s.r * 0.32, '#fff7ed');
  } else if (s.variant === 'shards') {
    poly(
      [
        [-13, -5],
        [-3, -8],
        [17, 0],
        [-3, 8],
        [-13, 5],
      ],
      '#38bdf8',
    );
    poly(
      [
        [-12, -5],
        [-3, -8],
        [17, 0],
        [-4, -1],
      ],
      '#f0fdfa',
    );
  } else if (s.k === 'MAGMA') {
    g.rotate(game.t * 0.045);
    g.shadowColor = '#ff4500';
    g.shadowBlur = 34;
    ellipse(0, 0, 25, 25, '#ff6b12');
    ellipse(0, 0, 20, 20, '#ffcf45');
    poly(
      [
        [-23, -8],
        [-13, -23],
        [5, -26],
        [18, -14],
        [12, -5],
        [-12, 0],
      ],
      '#292524',
    );
    poly(
      [
        [15, -15],
        [25, -3],
        [20, 14],
        [6, 22],
        [-1, 11],
        [9, 5],
      ],
      '#3f3029',
    );
    poly(
      [
        [-18, 5],
        [-5, 15],
        [8, 20],
        [-9, 26],
        [-25, 14],
      ],
      '#292524',
    );
    g.strokeStyle = '#ffec8b';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-11, -10);
    g.lineTo(-3, -2);
    g.lineTo(7, -7);
    g.lineTo(14, 1);
    g.stroke();
    ellipse(-5, -4, 4, 4, '#fff5b0');
  } else if (s.k === 'STEAM') {
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
      const phase = game.t * 0.052 + i * TAU / 6;
      const swirl = 7 + 3 * Math.sin(game.t * 0.09 + i);
      g.globalAlpha = 0.19 + 0.045 * (i % 3);
      ellipse(Math.cos(phase) * swirl, Math.sin(phase) * swirl * 0.8,
        13 + 2 * (i % 2), 11 + 2 * (i % 3),
        i % 3 === 0 ? '#94a3b8' : i % 2 ? '#f8fafc' : '#cbd5e1');
    }
    g.globalAlpha = 0.5;
    ellipse(0, 0, 13, 11, '#e2e8f0');
    g.globalAlpha = 0.48;
    ellipse(2, -2, 8, 7, '#fffdf7');
    // Thin vapour curls with a tiny, fixed draw budget.
    g.shadowBlur = 0;
    g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a = game.t * 0.055 + i * TAU / 3;
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
  } else if (s.k === 'PLASMA') {
    g.rotate(-ang);
    let pulse = 1 + 0.18 * Math.sin(game.t * 0.22);
    g.shadowColor = '#d946ef';
    g.shadowBlur = 28;
    ellipse(0, 0, 16 * pulse, 16 * pulse, '#8613b6');
    ellipse(0, 0, 11 * pulse, 11 * pulse, '#d946ef');
    ellipse(0, 0, 6 * pulse, 6 * pulse, '#fff1ff');
    for (let i = 0; i < 6; i++) {
      let a = game.t * 0.12 + (i * TAU) / 6,
        r = 18 + 4 * Math.sin(game.t * 0.18 + i);
      g.strokeStyle = i % 2 ? '#f0abfc' : '#c084fc';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      g.lineTo(Math.cos(a + 0.23) * (r + 5), Math.sin(a + 0.23) * (r + 5));
      g.lineTo(Math.cos(a - 0.14) * (r + 11), Math.sin(a - 0.14) * (r + 11));
      g.stroke();
    }
  } else if (s.k === 'STORM') {
    g.rotate(-ang);
    g.shadowColor = '#818cf8';
    g.shadowBlur = 24;
    for (let i = 0; i < 6; i++) {
      let a = game.t * 0.045 + (i * TAU) / 6;
      ellipse(Math.cos(a) * 8, Math.sin(a) * 5, 12, 10, i % 2 ? '#6366f1' : '#a5b4fc');
    }
    ellipse(0, 0, 11, 9, '#e0e7ff');
    g.strokeStyle = '#c7d2fe99';
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(0, 0, 21, 16, game.t * 0.03, 0, TAU);
    g.stroke();
  } else if (s.k === 'ICE') {
    poly(
      [
        [-20, -5],
        [11, -7],
        [29, 0],
        [11, 7],
        [-20, 5],
      ],
      '#7dd3fc',
    );
    poly(
      [
        [-20, -5],
        [11, -7],
        [29, 0],
        [-5, 0],
      ],
      '#e0f2fe',
    );
    poly(
      [
        [-10, 2],
        [9, 0],
        [-8, 9],
      ],
      '#38bdf8',
    );
  } else if (s.k === 'MAGNETIC') {
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

    // Reuse Magnetic Pull's green/gold motes, spaced across a longer wake.
    g.shadowBlur = 8;
    for (let i = 0; i < 7; i++) {
      const distance = 13 + i * 12;
      const wave = Math.sin(t * 0.2 - i * 1.4) * (4 + i * 0.6);
      const size = Math.max(1.1, 4.5 - i * 0.48);
      const fade = 1 - i / 7;
      g.globalAlpha = 0.48 * fade;
      ellipse(-distance, wave, size + 2, size, i % 2 ? '#a3e635' : '#eab308');
      g.globalAlpha = 0.8 * fade;
      ellipse(-distance + 1, wave, Math.max(0.8, size * 0.47), Math.max(0.7, size * 0.4),
        i % 2 ? '#fef08a' : '#bef264');
    }
    g.globalAlpha = 1;

    // One cohesive forged-metal projectile instead of four separate shards.
    // Angular shoulders and silver facets keep its magnetic/industrial character.
    g.shadowBlur = 0;
    poly(
      [[-12, -5], [-7, -10], [3, -11], [11, -6], [13, 1],
       [8, 9], [-2, 11], [-11, 6], [-14, 0]],
      '#334155',
    );
    poly(
      [[-10, -5], [-6, -9], [3, -9], [9, -5], [5, -2], [-6, -2]],
      '#94a3b8',
    );
    poly(
      [[-11, 2], [-5, 0], [5, 1], [10, 5], [7, 8], [-3, 9]],
      '#475569',
    );
    poly([[4, -8], [10, -5], [12, 1], [8, 3], [5, -2]], '#cbd5e1');
    // A single central seam and glint, not gaps between disconnected pieces.
    g.strokeStyle = '#d1d5db';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(-9, 0);
    g.lineTo(0, -1);
    g.lineTo(8, 3);
    g.stroke();
    ellipse(-5, -5, 2.3, 1.1, '#e2e8f0');

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
  } else if (s.k === 'EARTH') {
    // Small stone fragments stream behind the boulder (local -X is backwards).
    // Deterministic motion avoids random frame-to-frame popping.
    g.shadowBlur = 0;
    for (let i = 0; i < 7; i++) {
      const drift = (game.t * (0.45 + i * 0.08) + i * 13) % 55;
      const px = -22 - drift;
      const py = Math.sin(game.t * 0.06 + i * 2.3) * (5 + i * 1.4);
      const size = 2.5 + (i % 3) * 1.2;
      g.globalAlpha = 0.75 * (1 - drift / 65);
      poly(
        [[px - size, py], [px - size * 0.3, py - size],
         [px + size, py - size * 0.3], [px + size * 0.5, py + size]],
        i % 3 === 0 ? '#728055' : i % 2 ? '#a08b6d' : '#685741',
      );
    }
    g.globalAlpha = 1;
    // A rough earthen boulder: brown rock, mossy facets and sharp stone edges,
    // matching the moss-and-soil palette of Earth Shot's spellbook icon.
    g.shadowColor = '#51432b';
    g.shadowBlur = 7;
    poly(
      [[-20, -3], [-16, -13], [-7, -19], [5, -17], [17, -9],
       [20, 1], [12, 13], [-1, 17], [-14, 12], [-21, 4]],
      '#594d38',
    );
    g.shadowBlur = 0;
    poly(
      [[-18, -4], [-15, -13], [-7, -19], [5, -17], [4, -7], [-8, 1]],
      '#978565',
    );
    poly(
      [[5, -17], [17, -9], [20, 1], [11, 5], [4, -7]],
      '#637049',
    );
    poly(
      [[-8, 1], [4, -7], [11, 5], [12, 13], [-1, 17], [-14, 12]],
      '#786249',
    );
    poly([[-15, -13], [-7, -19], [5, -17], [-1, -13], [-10, -9]], '#b4a180');
    poly([[4, -7], [11, -9], [16, -4], [11, 5], [5, 1]], '#83915f');
    poly([[-16, 5], [-8, 1], [-2, 7], [-5, 12], [-14, 12]], '#4f6040');
    // Subtle fractures give the projectile a rocky, rather than geometric, silhouette.
    g.strokeStyle = '#403c2d';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-8, 1);
    g.lineTo(4, -7);
    g.lineTo(11, 5);
    g.moveTo(-2, 7);
    g.lineTo(2, 11);
    g.stroke();
  } else ellipse(0, 0, s.r, s.r, c);
  g.shadowBlur = 0;
  g.restore();
}
