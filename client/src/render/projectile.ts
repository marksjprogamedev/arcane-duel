import { COL } from '../../../shared/constants';
import { TAU } from '../../../shared/math';
import type { Shot } from '../../../shared/types';
import { g } from '../dom';
import { game } from '../state';
import { ellipse, poly } from './primitives';

// The original 5-by-4 spell atlas: Tempest Bolt is cell (3, 2), 40 x 32px.
const tempestAtlas = new Image();
tempestAtlas.src = '/spells/spellbook-atlas.png';

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
  } else if (s.k === 'PLASMA') {
    // A volatile plasma comet: layered violet-pink atmosphere, flowing ribbons,
    // and a multicolour energetic core. All effects are draw-only.
    const t = game.t;
    g.save();
    // Wider diffuse atmosphere and long, translucent tapered plume.
    g.shadowBlur = 0;
    const aura = g.createRadialGradient(0, 0, 3, 0, 0, 31);
    aura.addColorStop(0, 'rgba(255,241,255,0.15)');
    aura.addColorStop(0.32, 'rgba(232,121,249,0.25)');
    aura.addColorStop(0.65, 'rgba(126,34,206,0.13)');
    aura.addColorStop(1, 'rgba(126,34,206,0)');
    g.fillStyle = aura;
    g.beginPath();
    g.arc(0, 0, 31, 0, TAU);
    g.fill();
    for (let layer = 0; layer < 3; layer++) {
      const length = 106 - layer * 13;
      const width = 19 - layer * 5;
      const fade = g.createLinearGradient(-length, 0, 7, 0);
      fade.addColorStop(0, 'rgba(126,34,206,0)');
      fade.addColorStop(0.35, layer === 1 ? 'rgba(217,70,239,0.07)' : 'rgba(126,34,206,0.06)');
      fade.addColorStop(0.78, layer === 2 ? 'rgba(245,208,254,0.18)' : 'rgba(192,132,252,0.14)');
      fade.addColorStop(1, layer === 2 ? 'rgba(255,241,255,0.30)' : 'rgba(217,70,239,0.24)');
      g.fillStyle = fade;
      g.beginPath();
      g.moveTo(5, -width);
      g.bezierCurveTo(-length * 0.32, -width * 1.1, -length * 0.8, -width * 0.25, -length, 0);
      g.bezierCurveTo(-length * 0.8, width * 0.25, -length * 0.32, width * 1.1, 5, width);
      g.closePath();
      g.fill();
    }
    // Uneven, twisting plasma streamers, with different speeds and phases to
    // avoid Magnetic Shot's neat, symmetrical double helix.
    g.lineCap = 'round';
    for (let strand = 0; strand < 3; strand++) {
      g.shadowColor = strand === 0 ? '#d946ef' : '#a855f7';
      g.shadowBlur = 7;
      for (let i = 0; i < 13; i++) {
        const d = 8 + i * 7;
        const fade = Math.max(0, 1 - d / 106);
        const phase =
          t * (0.13 + strand * 0.036) + d * (0.082 + strand * 0.009) + (strand * TAU) / 3;
        const offset = Math.sin(phase) * (10 + 4 * Math.sin(t * 0.04 + strand));
        const next =
          Math.sin(phase + 7 * (0.082 + strand * 0.009)) * (10 + 4 * Math.sin(t * 0.04 + strand));
        const depth = Math.cos(phase);
        g.globalAlpha = fade * (0.19 + (0.46 * (depth + 1)) / 2);
        g.lineWidth = (1 + Math.max(0, depth) * 1.9) * (0.55 + fade * 0.45);
        g.strokeStyle = strand === 0 ? '#f5d0fe' : strand === 1 ? '#d946ef' : '#c084fc';
        g.beginPath();
        g.moveTo(-d, offset);
        g.lineTo(-d - 7, next);
        g.stroke();
        if (i % 3 === strand) {
          g.fillStyle = depth > 0 ? '#fff1ff' : '#a855f7';
          g.beginPath();
          g.arc(-d, offset, (0.8 + Math.max(0, depth)) * fade, 0, TAU);
          g.fill();
        }
      }
    }
    // Shimmering layered core: purple shell, magenta plasma and hot pink-white centre.
    const pulse = 1 + 0.07 * Math.sin(t * 0.23);
    g.globalAlpha = 1;
    g.shadowColor = '#7e22ce';
    g.shadowBlur = 20;
    ellipse(0, 0, 17 * pulse, 14 * pulse, '#6b21a8');
    g.shadowColor = '#d946ef';
    g.shadowBlur = 13;
    ellipse(1, -1, 12 * pulse, 10 * pulse, '#a21caf');
    ellipse(2, -1, 8 * pulse, 6 * pulse, '#f472b6');
    g.shadowColor = '#f5d0fe';
    ellipse(3, -2, 5 * pulse, 4 * pulse, '#f5d0fe');
    ellipse(4, -2, 2, 2, '#fff1ff');
    // Flickering asymmetric electric tongues at the edge of the core.
    for (let i = 0; i < 6; i++) {
      const phase = t * (0.13 + (i % 2) * 0.04) + (i * TAU) / 6;
      const x = Math.cos(phase),
        y = Math.sin(phase);
      const reach = 19 + 6 * Math.sin(t * 0.2 + i * 2);
      g.globalAlpha = 0.48 + 0.4 * Math.sin(t * 0.16 + i) ** 2;
      g.strokeStyle = i % 3 === 0 ? '#fff1ff' : i % 2 ? '#f5d0fe' : '#c084fc';
      g.shadowColor = '#d946ef';
      g.shadowBlur = 8;
      g.lineWidth = 1.4;
      g.beginPath();

      g.moveTo(x * 9, y * 8);
      g.lineTo(x * 14 - y * 4, y * 12 + x * 4);
      g.lineTo(x * reach, y * reach * 0.82);
      g.stroke();
    }
    g.restore();
  } else if (s.k === 'STORM') {
    // Tempest Bolt: preserve the atlas comet as ONE solid silhouette.
    // All details are visual-only; they do not change collision or speed.
    const t = game.t;
    g.save();
    g.shadowBlur = 0;
    g.lineCap = 'round';
    // Short atmospheric wake, drawn behind (not attached as separate tendrils).
    for (let i = 8; i >= 0; i--) {
      const d = 28 + i * 7;
      const fade = (9 - i) / 9;
      const waver = Math.sin(t * 0.11 + i * 1.55) * (3 + i * 0.55);
      g.globalAlpha = 0.055 + fade * 0.12;
      ellipse(
        -d,
        waver,
        8 + fade * 8,
        5 + fade * 6,
        i % 3 === 0 ? '#8b86ae' : i % 2 ? '#8fa7b9' : '#b0bac6',
      );
    }
    // Delicate grey-blue particles shed sideways from the body.
    for (let i = 0; i < 14; i++) {
      const drift = (t * (0.6 + (i % 4) * 0.12) + i * 11.7) % 92;
      const d = 23 + drift;
      const side = i % 2 ? 1 : -1;
      const yy = side * (11 + (i % 5) * 3) + Math.sin(t * 0.12 + i * 2.3) * 5;
      const fade = Math.max(0, 1 - drift / 92);
      g.globalAlpha = fade * (0.16 + (i % 3) * 0.085);
      g.fillStyle = i % 7 === 0 ? '#b3a3e5' : i % 3 === 0 ? '#a5bfd8' : '#c4ccd2';
      g.beginPath();
      g.arc(-d, yy, 0.8 + (i % 3) * 0.5, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    // Source image keeps the original rounded head and connected curved fringe.
    const loaded = tempestAtlas.complete && tempestAtlas.naturalWidth >= 160;
    if (loaded) {
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.shadowColor = '#a3a4bd';
      g.shadowBlur = 8;
      g.filter = 'grayscale(0.95) sepia(0.2) hue-rotate(205deg) brightness(1.22)';
      g.drawImage(tempestAtlas, 120, 64, 40, 32, -43, -31, 86, 62);
      g.filter = 'none';
    } else {
      ellipse(0, 0, 19, 15, '#9391aa');
    }
    // Moving blue/violet electrical pulse confined to the comet's central body.
    // Short translucent curved folds travel rear-to-front, not separate orbs.
    g.shadowBlur = 5;
    const sweep = (t * 1.45) % 63;
    for (let j = 0; j < 3; j++) {
      const xx = -28 + ((sweep + j * 20) % 63);
      const envelope = Math.max(0, 1 - Math.abs(xx - 4) / 40);
      const shimmer = 0.75 + 0.25 * Math.sin(t * 0.21 + j * 2);
      g.globalAlpha = envelope * shimmer * (j === 0 ? 0.58 : 0.32);
      g.strokeStyle = j === 0 ? '#a6d7f5' : j === 1 ? '#aa9be6' : '#d2dbe5';
      g.shadowColor = j === 1 ? '#8676c9' : '#75b9e5';
      g.lineWidth = j === 0 ? 3 : 2;
      g.beginPath();
      g.moveTo(xx - 8, -4);
      g.bezierCurveTo(xx - 2, -9, xx + 1, 6, xx + 8, 2);
      g.stroke();
    }
    // Tempest static: tiny, broken lightning forks that snap between positions
    // rather than sliding or waving. Confined to the comet's continuous body.
    g.save();
    g.beginPath();
    g.moveTo(-32, -7);
    g.bezierCurveTo(-24, -14, -7, -18, 8, -17);
    g.bezierCurveTo(24, -16, 35, -9, 35, 0);
    g.bezierCurveTo(35, 12, 19, 18, 4, 17);
    g.bezierCurveTo(-13, 16, -26, 12, -32, 7);
    g.closePath();
    g.clip();
    g.lineJoin = 'miter';
    g.lineCap = 'round';
    // The stepped phase makes each tiny arc hold briefly, then jump abruptly.
    const zapFrame = Math.floor(t * 0.58);
    const jitter = (seed: number) => {
      const n = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
      return n - Math.floor(n);
    };
    for (let vein = 0; vein < 9; vein++) {
      const seed = zapFrame * 41 + vein * 19;
      // A random-looking but repeatable duty cycle: arcs blink in and out.
      if (jitter(seed + 1) < 0.13) continue;
      const x0 = -26 + vein * 6.4 + (jitter(seed + 2) - 0.5) * 8;
      const y0 = (jitter(seed + 3) - 0.5) * 19;
      const dir = jitter(seed + 4) > 0.5 ? 1 : -1;
      const k1 = (jitter(seed + 5) - 0.5) * 5;
      const k2 = (jitter(seed + 6) - 0.5) * 6;
      const x1 = x0 + 3.5;
      const y1 = y0 + dir * (2 + jitter(seed + 7) * 3);
      const x2 = x0 + 7;
      const y2 = y0 - dir * 2 + k1;
      const x3 = x0 + 11;
      const y3 = y0 + k2;
      const violet = vein % 2 === 1;
      g.strokeStyle = violet ? '#d1baff' : '#c5eeff';
      g.shadowColor = violet ? '#8b5cf6' : '#60a5fa';
      g.shadowBlur = 7;
      g.lineWidth = 1.2 + jitter(seed + 8) * 0.45;
      g.globalAlpha = 0.42 + jitter(seed + 9) * 0.32;
      // Two short disconnected strokes with an actual visible gap.
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
      g.globalAlpha *= 0.86;
      g.beginPath();
      g.moveTo(x2 + 1.7, y2 - dir * 0.8);
      g.lineTo(x3, y3);
      g.lineTo(x3 + 3, y3 - dir * 2);
      g.stroke();
      // One occasional branch shoots off at a sharp angle.
      if (jitter(seed + 10) > 0.35) {
        g.globalAlpha *= 0.8;
        g.lineWidth = 1.0;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x1 + 1.5, y1 + dir * 3);
        g.lineTo(x1 + 4, y1 + dir * 5);
        g.stroke();
      }
    }
    g.restore();
    // A subdued aura breathes inside the leading third rather than forming a sphere.
    g.shadowBlur = 12;
    g.shadowColor = '#8b9fd9';
    g.globalAlpha = 0.08 + 0.04 * Math.sin(t * 0.18);
    ellipse(13, 0, 9, 8, '#c1c4ec');
    g.globalAlpha = 1;
    g.restore();
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
        [
          [px - size, py],
          [px - size * 0.3, py - size],
          [px + size, py - size * 0.3],
          [px + size * 0.5, py + size],
        ],
        i % 3 === 0 ? '#728055' : i % 2 ? '#a08b6d' : '#685741',
      );
    }
    g.globalAlpha = 1;
    // A rough earthen boulder: brown rock, mossy facets and sharp stone edges,
    // matching the moss-and-soil palette of Earth Shot's spellbook icon.
    g.shadowColor = '#51432b';
    g.shadowBlur = 7;
    poly(
      [
        [-20, -3],
        [-16, -13],
        [-7, -19],
        [5, -17],
        [17, -9],
        [20, 1],
        [12, 13],
        [-1, 17],
        [-14, 12],
        [-21, 4],
      ],
      '#594d38',
    );
    g.shadowBlur = 0;
    poly(
      [
        [-18, -4],
        [-15, -13],
        [-7, -19],
        [5, -17],
        [4, -7],
        [-8, 1],
      ],
      '#978565',
    );
    poly(
      [
        [5, -17],
        [17, -9],
        [20, 1],
        [11, 5],
        [4, -7],
      ],
      '#637049',
    );
    poly(
      [
        [-8, 1],
        [4, -7],
        [11, 5],
        [12, 13],
        [-1, 17],
        [-14, 12],
      ],
      '#786249',
    );
    poly(
      [
        [-15, -13],
        [-7, -19],
        [5, -17],
        [-1, -13],
        [-10, -9],
      ],
      '#b4a180',
    );
    poly(
      [
        [4, -7],
        [11, -9],
        [16, -4],
        [11, 5],
        [5, 1],
      ],
      '#83915f',
    );
    poly(
      [
        [-16, 5],
        [-8, 1],
        [-2, 7],
        [-5, 12],
        [-14, 12],
      ],
      '#4f6040',
    );
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
