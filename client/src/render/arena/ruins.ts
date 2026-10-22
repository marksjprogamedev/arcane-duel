// Art for the Ruined Keep (shared/ruinsMap.ts), painted once into cached tiles (chunks.ts) from fixed
// formulas, so every tile and every player gets the same picture.
import { MAPS } from '../../../../shared/maps';
import { RUINS_STONES, RUINS_WALLS } from '../../../../shared/ruinsMap';
import { TAU } from '../../../../shared/math';
import { ChunkedBackground } from './chunks';

const { width, height, spawns } = MAPS.ruins;
const CELL = 64;
const KEEP = { x0: 980, y0: 680, x1: 1420, y1: 1120 };

/** A repeatable number in 0..1 for a grid cell. */
const hash = (x: number, y: number, salt: number) => {
  let h = Math.imul(x * 374761393 + y * 668265263 + salt * 1274126177, 1103515245);
  h ^= h >>> 13;
  return ((Math.imul(h, 1597334677) >>> 0) % 10000) / 10000;
};

const overlaps = (x: number, y: number, w: number, h: number, a: number, b: number, r: number) =>
  a + r >= x && a - r <= x + w && b + r >= y && b - r <= y + h;

function ground(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  g.fillStyle = '#1d3322';
  g.fillRect(x, y, w, h);
  for (let cx = Math.floor(x / CELL); cx * CELL < x + w; cx++)
    for (let cy = Math.floor(y / CELL); cy * CELL < y + h; cy++) {
      const n = hash(cx, cy, 1);
      g.fillStyle = n < 0.35 ? '#24402a' : n < 0.6 ? '#193020' : '#213a27';
      g.fillRect(cx * CELL, cy * CELL, CELL, CELL);
      // tufts and small stones
      for (let i = 0; i < 4; i++) {
        const tx = cx * CELL + hash(cx, cy, 10 + i) * CELL;
        const ty = cy * CELL + hash(cx, cy, 20 + i) * CELL;
        g.fillStyle = i % 2 ? '#2f5236aa' : '#14261a99';
        g.beginPath();
        g.ellipse(tx, ty, 4 + hash(cx, cy, 30 + i) * 5, 2 + hash(cx, cy, 40 + i) * 3, 0, 0, TAU);
        g.fill();
      }
    }
}

/** A worn dirt road from each spawn to the keep's gates. */
function paths(g: CanvasRenderingContext2D) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [colour, widthPx] of [
    ['#3b3324', 90],
    ['#4a4030', 70],
  ] as const) {
    g.strokeStyle = colour;
    g.lineWidth = widthPx;
    for (const side of [spawns.p, spawns.e]) {
      g.beginPath();
      g.moveTo(side.x, side.y);
      g.lineTo(side.x < width / 2 ? KEEP.x0 - 30 : KEEP.x1 + 30, side.y);
      g.stroke();
    }
  }
}

function courtyard(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  if (!overlaps(x, y, w, h, (KEEP.x0 + KEEP.x1) / 2, (KEEP.y0 + KEEP.y1) / 2, 240)) return;
  const size = 55;
  for (let cx = KEEP.x0 / size; cx < KEEP.x1 / size; cx++)
    for (let cy = KEEP.y0 / size; cy < KEEP.y1 / size; cy++) {
      const n = hash(cx | 0, cy | 0, 2);
      g.fillStyle = n < 0.3 ? '#5c6a63' : n < 0.7 ? '#66756c' : '#4f5d56';
      g.fillRect(cx * size + 1, cy * size + 1, size - 2, size - 2);
      if (n > 0.85) {
        g.fillStyle = '#2f5236';
        g.fillRect(cx * size + 6, cy * size + 6, size - 24, size - 30);
      }
    }
}

function wall(g: CanvasRenderingContext2D, o: { x: number; y: number; hw: number; hh: number }) {
  const [x, y, w, h] = [o.x - o.hw, o.y - o.hh, o.hw * 2, o.hh * 2];
  g.fillStyle = '#0007';
  g.fillRect(x + 7, y + 9, w, h);
  g.fillStyle = '#58655f';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#7d8c83';
  g.fillRect(x + 2, y + 2, w - 4, Math.max(2, h * 0.45));
  // blocks along the long side, and the odd missing stone
  g.fillStyle = '#3d4843';
  const long = w > h;
  const step = 34;
  for (let i = step; i < (long ? w : h); i += step) {
    if (long) g.fillRect(x + i, y + 1, 2, h - 2);
    else g.fillRect(x + 1, y + i, w - 2, 2);
  }
  g.strokeStyle = '#2b332f';
  g.lineWidth = 2;
  g.strokeRect(x, y, w, h);
}

function stone(g: CanvasRenderingContext2D, o: { x: number; y: number; r: number }) {
  g.fillStyle = '#0006';
  g.beginPath();
  g.ellipse(o.x + 6, o.y + 8, o.r, o.r * 0.7, 0, 0, TAU);
  g.fill();
  g.fillStyle = '#5d6a62';
  g.beginPath();
  g.arc(o.x, o.y, o.r, 0, TAU);
  g.fill();
  g.fillStyle = '#8b9a90';
  g.beginPath();
  g.arc(o.x - o.r * 0.2, o.y - o.r * 0.25, o.r * 0.68, 0, TAU);
  g.fill();
  g.fillStyle = '#2f5236aa'; // moss
  g.beginPath();
  g.ellipse(o.x + o.r * 0.3, o.y + o.r * 0.35, o.r * 0.35, o.r * 0.2, 0.5, 0, TAU);
  g.fill();
}

function paint(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ground(g, x, y, w, h);
  paths(g);
  courtyard(g, x, y, w, h);
  for (const o of RUINS_WALLS)
    if (overlaps(x, y, w, h, o.x, o.y, Math.max(o.hw, o.hh) + 12)) wall(g, o);
  for (const o of RUINS_STONES) if (overlaps(x, y, w, h, o.x, o.y, o.r + 12)) stone(g, o);
  // the border of the playable world
  g.strokeStyle = '#a7f3d0aa';
  g.lineWidth = 6;
  g.strokeRect(3, 3, width - 6, height - 6);
}

const ruinsBackground = new ChunkedBackground(width, height, paint);

export const ruinsScenery = (g: CanvasRenderingContext2D) => ruinsBackground.draw(g);
