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
  } else if (s.variant === 'stone_lance') {
    poly(
      [
        [-23, -6],
        [-8, -10],
        [27, 0],
        [-8, 10],
        [-23, 6],
      ],
      '#746657',
    );
    poly(
      [
        [-20, -6],
        [-8, -10],
        [27, 0],
        [-4, -2],
      ],
      '#d6c6aa',
    );
    poly(
      [
        [-16, 4],
        [-5, 2],
        [4, 5],
        [-8, 9],
      ],
      '#433c35',
    );
  } else if (s.variant === 'glacial_spike') {
    poly(
      [
        [-22, -7],
        [-7, -16],
        [31, 0],
        [-7, 16],
        [-22, 7],
      ],
      '#0284c7',
    );
    poly(
      [
        [-18, -6],
        [-7, -15],
        [31, 0],
        [-5, -1],
      ],
      '#e0faff',
    );
    poly(
      [
        [-12, 5],
        [5, 1],
        [16, 2],
        [-6, 12],
      ],
      '#67e8f9',
    );
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
  } else if (s.variant === 'molten_shrapnel') {
    poly(
      [
        [-11, -8],
        [1, -13],
        [14, -4],
        [9, 11],
        [-9, 8],
      ],
      '#292524',
    );
    poly(
      [
        [-8, -5],
        [2, -10],
        [10, -3],
        [4, 4],
      ],
      '#fb923c',
    );
    ellipse(2, 0, 3, 3, '#fef08a');
  } else if (s.variant === 'steam_burst') {
    g.globalAlpha = 0.8;
    for (let i = 0; i < 5; i++) {
      const theta = (i * TAU) / 5 + game.t * 0.035;
      ellipse(
        Math.cos(theta) * 9,
        Math.sin(theta) * 7,
        7 + i,
        6 + i,
        i % 2 ? '#cbd5e1' : '#f1f5f9',
      );
    }
    g.globalAlpha = 1;
    ellipse(1, -1, 4, 4, '#ffffff');
  } else if (s.variant === 'tidal_surge') {
    // Curling breaker inspired by the reference: dark blue body, sweeping white
    // foam crest, rolling surf at the base and animated airborne droplets.
    const r = s.r;
    const t = game.t * 0.16;
    g.shadowColor = '#38bdf8';
    g.shadowBlur = 15;
    // Tapered wake that rises into a breaking wave, with a hollow curl near the tip.
    poly(
      [
        [-r * 1.85, r * 0.08],
        [-r * 1.35, -r * 0.24],
        [-r * 0.78, -r * 0.36],
        [-r * 0.32, -r * 0.66],
        [r * 0.02, -r * 1.03],
        [r * 0.47, -r * 1.12],
        [r * 0.92, -r * 0.91],
        [r * 1.12, -r * 0.48],
        [r * 0.83, -r * 0.29],
        [r * 0.55, -r * 0.41],
        [r * 0.35, -r * 0.18],
        [r * 0.6, r * 0.24],
        [r * 1.16, r * 0.63],
        [r * 0.48, r * 0.78],
        [-r * 0.25, r * 0.62],
        [-r * 0.85, r * 0.44],
      ],
      '#155e83',
    );
    poly(
      [
        [-r * 1.55, r * 0.08],
        [-r * 0.78, -r * 0.24],
        [-r * 0.18, -r * 0.55],
        [r * 0.23, -r * 0.96],
        [r * 0.64, -r * 0.91],
        [r * 0.92, -r * 0.61],
        [r * 0.7, -r * 0.42],
        [r * 0.48, -r * 0.49],
        [r * 0.22, -r * 0.27],
        [r * 0.4, r * 0.31],
        [r * 0.83, r * 0.56],
        [r * 0.2, r * 0.57],
        [-r * 0.52, r * 0.31],
      ],
      '#328db7',
    );
    // The distinctive white curling lip; leave the centre blue and open.
    poly(
      [
        [-r * 0.63, -r * 0.36],
        [-r * 0.19, -r * 0.67],
        [r * 0.13, -r * 1.02],
        [r * 0.5, -r * 1.19],
        [r * 0.86, -r * 1.06],
        [r * 1.09, -r * 0.83],
        [r * 1.18, -r * 0.48],
        [r * 0.98, -r * 0.31],
        [r * 0.77, -r * 0.39],
        [r * 0.68, -r * 0.6],
        [r * 0.45, -r * 0.74],
        [r * 0.23, -r * 0.67],
        [-r * 0.05, -r * 0.42],
        [-r * 0.35, -r * 0.27],
      ],
      '#f0faff',
    );
    poly(
      [
        [-r * 0.2, -r * 0.66],
        [r * 0.17, -r * 1.02],
        [r * 0.49, -r * 1.13],
        [r * 0.82, -r * 0.98],
        [r * 1.0, -r * 0.72],
        [r * 0.86, -r * 0.62],
        [r * 0.67, -r * 0.8],
        [r * 0.38, -r * 0.86],
        [r * 0.08, -r * 0.57],
      ],
      '#bceaff',
    );
    // Layered foamy surf rolls along the lower edge.
    poly(
      [
        [-r * 1.72, r * 0.13],
        [-r * 1.15, r * 0.22],
        [-r * 0.83, r * 0.07],
        [-r * 0.48, r * 0.34],
        [-r * 0.13, r * 0.17],
        [r * 0.2, r * 0.43],
        [r * 0.51, r * 0.25],
        [r * 0.91, r * 0.49],
        [r * 1.2, r * 0.63],
        [r * 0.73, r * 0.8],
        [r * 0.35, r * 0.67],
        [r * 0.04, r * 0.78],
        [-r * 0.36, r * 0.57],
        [-r * 0.76, r * 0.6],
        [-r * 1.28, r * 0.35],
      ],
      '#e0f7ff',
    );
    poly(
      [
        [-r * 1.53, r * 0.2],
        [-r * 0.91, r * 0.26],
        [-r * 0.52, r * 0.43],
        [-r * 0.13, r * 0.33],
        [r * 0.23, r * 0.57],
        [r * 0.55, r * 0.45],
        [r * 0.89, r * 0.65],
        [r * 0.38, r * 0.66],
        [-r * 0.12, r * 0.53],
        [-r * 0.66, r * 0.48],
      ],
      '#7dd3fc',
    );
    // Ripple strokes inside the body.
    g.shadowBlur = 0;
    g.strokeStyle = '#9edcf4';
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const x = -r * 1.13 + i * r * 0.4;
      g.beginPath();
      g.moveTo(x, -r * (0.05 + i * 0.07));
      g.quadraticCurveTo(
        x + r * 0.23,
        -r * (0.28 + i * 0.06) + Math.sin(t + i) * 2,
        x + r * 0.38,
        -r * (0.21 + i * 0.07),
      );
      g.stroke();
    }
    // Foam droplets rise and scatter from the curl and wake.
    for (let i = 0; i < 19; i++) {
      const phase = t * (0.7 + (i % 4) * 0.12) + i * 2.17;
      const px = -r * 1.28 + (i % 9) * r * 0.3 + Math.sin(phase) * 5;
      const py =
        (i % 3 === 0 ? -r * 0.95 : i % 3 === 1 ? r * 0.75 : -r * 0.5) + Math.cos(phase * 1.3) * 8;
      const size = 1.5 + (i % 4) * 0.9;
      g.globalAlpha = 0.55 + 0.4 * (0.5 + 0.5 * Math.sin(phase));
      ellipse(px, py, size, size, i % 3 === 0 ? '#ffffff' : '#bae6fd');
    }
    g.globalAlpha = 1;
  } else if (s.variant === 'unstable_orb') {
    g.rotate(-ang + game.t * 0.045);
    for (let i = 0; i < 7; i++) {
      const theta = (i * TAU) / 7;
      ellipse(
        Math.cos(theta) * (s.r + 6 + pulse * 3),
        Math.sin(theta) * (s.r + 6 + pulse * 3),
        3,
        3,
        i % 2 ? '#f0abfc' : '#c084fc',
      );
    }
    ellipse(0, 0, s.r + 3, s.r + 3, '#6b21a8');
    ellipse(0, 0, s.r * 0.7, s.r * 0.7, '#e879f9');
    ellipse(0, 0, 5, 5, '#ffffff');
  } else if (s.variant === 'thundercloud') {
    g.rotate(-ang);
    for (let i = 0; i < 5; i++) {
      ellipse((i - 2) * 8, Math.sin(game.t * 0.08 + i) * 3, 12, 11, i % 2 ? '#475569' : '#64748b');
    }
    poly(
      [
        [-3, 0],
        [7, 0],
        [1, 11],
        [10, 11],
        [-5, 28],
        [-1, 14],
        [-10, 14],
      ],
      '#fef08a',
    );
    ellipse(-9, -5, 4, 3, '#cbd5e1');
  } else if (s.variant === 'iron_swarm') {
    poly(
      [
        [-11, -3],
        [-1, -8],
        [12, -2],
        [8, 6],
        [-7, 7],
      ],
      '#64748b',
    );
    poly(
      [
        [-11, -3],
        [-1, -8],
        [12, -2],
        [0, 0],
      ],
      '#e2e8f0',
    );
    ellipse(0, 0, 2, 2, '#bef264');
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
    for (let i = 0; i < 7; i++) {
      let a = game.t * 0.07 + i * 2.4,
        r = 6 + i * 2.5;
      g.globalAlpha = 0.18 + i * 0.07;
      ellipse(
        Math.cos(a) * r,
        Math.sin(a) * r,
        10 + i * 2,
        9 + i * 2,
        i % 2 ? '#cbd5e1' : '#f8fafc',
      );
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
    ellipse(0, 0, 9, 9, '#65a30d');
    ellipse(0, 0, 4, 4, '#ecfccb');
    for (let i = 0; i < 5; i++) {
      let a = game.t * 0.11 + (i * TAU) / 5,
        r = 15 + Math.sin(game.t * 0.12 + i) * 3;
      g.save();
      g.translate(Math.cos(a) * r, Math.sin(a) * r);
      g.rotate(a);
      poly(
        [
          [-7, -3],
          [5, -5],
          [9, 1],
          [-2, 5],
        ],
        i % 2 ? '#a3a3a3' : '#d4d4d8',
      );
      g.restore();
    }
  } else if (s.k === 'EARTH') {
    poly(
      [
        [-14, -11],
        [-8, -24],
        [8, -26],
        [18, -13],
        [11, 0],
        [-7, 1],
      ],
      '#6b7767',
    );
    poly(
      [
        [-14, -11],
        [-8, -24],
        [8, -26],
        [1, -9],
      ],
      '#b0b9a3',
    );
  } else ellipse(0, 0, s.r, s.r, c);
  g.shadowBlur = 0;
  g.restore();
}
