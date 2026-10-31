import { ARENA_HEIGHT, ARENA_STRETCH, ARENA_WIDTH } from '../../../../shared/constants';
import { TAU } from '../../../../shared/math';
import { ctx } from '../../dom';
import { ellipse, poly } from '../shapes';
import { PILLAR_FOOT } from './pillarMath';

export function tree(x: number, y: number, r: number) {
  ellipse(x + 8, y + 14, r + 6, r * 0.45, '#06190e80');
  ctx.fillStyle = '#624f36';
  ctx.fillRect(x - 7, y - 18, 14, 37);
  ellipse(x, y - 30, r, r * 0.75, '#17452f');
  ellipse(x - 12, y - 42, r * 0.65, r * 0.53, '#286f42');
  ellipse(x + 13, y - 38, r * 0.55, r * 0.5, '#37804b');
}

/** A stone pillar; its base stands PILLAR_FOOT below the collision circle's centre. */
export function pillar(o: { x: number; y: number }) {
  let x = o.x,
    y = o.y + PILLAR_FOOT - 12;
  ellipse(x + 12, y + 16, 39, 15, '#07191188');
  poly(
    [
      [x - 21, y + 12],
      [x + 21, y + 12],
      [x + 21, y - 50],
      [x - 21, y - 50],
    ],
    '#697b70',
  );
  poly(
    [
      [x + 21, y + 12],
      [x + 34, y + 3],
      [x + 34, y - 59],
      [x + 21, y - 50],
    ],
    '#40564b',
  );
  poly(
    [
      [x - 21, y - 50],
      [x + 21, y - 50],
      [x + 34, y - 59],
      [x - 8, y - 59],
    ],
    '#b3c0b2',
  );
  poly(
    [
      [x - 28, y - 48],
      [x + 26, y - 48],
      [x + 38, y - 59],
      [x - 16, y - 59],
    ],
    '#90a393',
  );
  poly(
    [
      [x - 28, y - 48],
      [x + 26, y - 48],
      [x + 26, y - 38],
      [x - 28, y - 38],
    ],
    '#657f6e',
  );
}

// Cached painted courtyard: expensive texture work is done once, not every frame.
let courtyard: HTMLCanvasElement | null = null;
function noise(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function paintCourtyard() {
  const canvas = document.createElement('canvas');
  canvas.width = ARENA_WIDTH;
  canvas.height = ARENA_HEIGHT;
  const g = canvas.getContext('2d');
  if (!g) return canvas;
  const w = ARENA_WIDTH, h = ARENA_HEIGHT, mid = w / 2;
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#192c24');
  bg.addColorStop(0.52, '#344338');
  bg.addColorStop(1, '#182c24');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // Forest floor and irregular outer stone boundary.
  g.fillStyle = '#354438';
  g.beginPath(); g.ellipse(mid, 308, 349 * ARENA_STRETCH, 255, 0, 0, TAU); g.fill();
  g.save();
  g.beginPath(); g.ellipse(mid, 307, 318 * ARENA_STRETCH, 225, 0, 0, TAU); g.clip();
  g.fillStyle = '#343b34'; g.fillRect(0, 0, w, h);
  // Staggered weathered flagstones, fine seams and chipped corners.
  for (let row = 0, y = 76; y < 555; row++, y += 39) {
    for (let x = -55 + (row % 2) * 37; x < w + 60; x += 74) {
      const n = noise(row, x), dx = (n - 0.5) * 7, dy = (noise(x, row) - 0.5) * 5;
      const px = x + dx, py = y + dy;
      g.fillStyle = n > 0.72 ? '#62675b' : n > 0.35 ? '#555e53' : '#4b564c';
      g.beginPath();
      g.moveTo(px + 4, py + 1); g.lineTo(px + 67, py + 2);
      g.lineTo(px + 70, py + 32); g.lineTo(px + 64, py + 36);
      g.lineTo(px + 3, py + 35); g.lineTo(px + 1, py + 6);
      g.closePath(); g.fill();
      g.strokeStyle = '#1e302788'; g.lineWidth = 2; g.stroke();
      g.strokeStyle = '#b0ac8b24'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(px + 6, py + 5); g.lineTo(px + 56, py + 5); g.stroke();
      if (n > 0.48) {
        g.strokeStyle = '#263c30a0'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(px + 18, py + 32); g.lineTo(px + 28, py + 21);
        g.lineTo(px + 26, py + 12); g.stroke();
      }
      for (let k = 0; k < 5; k++) {
        const sx = px + 8 + noise(x + k, y) * 54, sy = py + 6 + noise(y + k, x) * 24;
        g.fillStyle = k % 2 ? '#c4bc9c20' : '#1d2b2430';
        g.fillRect(sx, sy, 2 + k % 3, 1);
      }
    }
  }
  g.restore();
  // Moss, scattered leaf litter and tufts become denser toward the perimeter.
  for (let i = 0; i < 1600; i++) {
    const x = noise(i, 13) * w, y = noise(i, 29) * h;
    const d = Math.sqrt(((x - mid) / (340 * ARENA_STRETCH)) ** 2 + ((y - 307) / 226) ** 2);
    if (noise(i, 47) > Math.min(0.96, 0.10 + d * d * 0.75)) continue;
    const r = 1 + noise(i, 61) * (d > 0.85 ? 7 : 3);
    g.fillStyle = i % 4 ? '#354c33a6' : '#77744d8c';
    g.beginPath(); g.ellipse(x, y, r * 1.6, r * 0.55, noise(i, 9), 0, TAU); g.fill();
    if (i % 3 === 0) {
      g.strokeStyle = '#64754b99'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - r * 2); g.stroke();
    }
  }
  // Soft forest shade at the edges, leaving the central combat area legible.
  const shade = g.createRadialGradient(mid, 302, 165, mid, 302, 610);
  shade.addColorStop(0, '#14251c00'); shade.addColorStop(0.7, '#14251c0a');
  shade.addColorStop(1, '#08190f8c');
  g.fillStyle = shade; g.fillRect(0, 0, w, h);
  return canvas;
}
export function scenery() {
  if (!courtyard) courtyard = paintCourtyard();
  ctx.drawImage(courtyard, 0, 0);
  // Layered tree canopy gives the arena a continuous wooded boundary.
  for (let x = 32; x < ARENA_WIDTH + 45; x += 84) {
    tree(x, 19 + noise(x, 1) * 22, 38 + noise(x, 2) * 9);
    tree(x + 34, 593, 41);
  }
  for (let y = 105; y < 570; y += 85) {
    tree(6, y, 39);
    tree(ARENA_WIDTH - 7, y + 24, 40);
  }
}
