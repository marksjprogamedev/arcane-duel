import { TAU } from '../../../../../shared/math';
import { g } from '../../../dom';
import { game } from '../../../state';
import { ellipse } from '../../shapes';

// The original 5-by-4 spell atlas: Tempest Bolt is cell (3, 2), 40 x 32px.
const tempestAtlas = new Image();
tempestAtlas.src = '/spells/spellbook-atlas.png';

export function drawStorm() {
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
}
