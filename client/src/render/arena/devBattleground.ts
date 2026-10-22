// Placeholder art for the development battleground: a plain tiled field with a stone on every
// solid circle from shared/maps.ts. Painted once into cached tiles (chunks.ts); only the tiles in
// the camera's view are drawn each frame.
import { DEV_BATTLEGROUND_OBSTACLES, MAPS } from '../../../../shared/maps';
import { TAU } from '../../../../shared/math';
import { ChunkedBackground } from './chunks';

const TILE = 100;
const { width, height } = MAPS.devbattle;

function paint(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  g.fillStyle = '#16301f';
  g.fillRect(x, y, w, h);
  g.strokeStyle = '#ffffff12';
  g.lineWidth = 1;
  g.beginPath();
  for (let gx = Math.ceil(x / TILE) * TILE; gx <= x + w; gx += TILE) {
    g.moveTo(gx, y);
    g.lineTo(gx, y + h);
  }
  for (let gy = Math.ceil(y / TILE) * TILE; gy <= y + h; gy += TILE) {
    g.moveTo(x, gy);
    g.lineTo(x + w, gy);
  }
  g.stroke();
  // the border of the playable world
  g.strokeStyle = '#a7f3d0aa';
  g.lineWidth = 6;
  g.strokeRect(3, 3, width - 6, height - 6);
  for (const o of DEV_BATTLEGROUND_OBSTACLES) {
    if (
      o.x + o.r + 10 < x ||
      o.x - o.r - 10 > x + w ||
      o.y + o.r + 10 < y ||
      o.y - o.r - 10 > y + h
    )
      continue;
    g.fillStyle = '#0006';
    g.beginPath();
    g.ellipse(o.x + 6, o.y + 8, o.r, o.r * 0.7, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#6b7b73';
    g.beginPath();
    g.arc(o.x, o.y, o.r, 0, TAU);
    g.fill();
    g.fillStyle = '#8fa196';
    g.beginPath();
    g.arc(o.x - o.r * 0.2, o.y - o.r * 0.25, o.r * 0.7, 0, TAU);
    g.fill();
  }
}

export const devBattleground = new ChunkedBackground(width, height, paint);

export const devBattlegroundScenery = (g: CanvasRenderingContext2D) => devBattleground.draw(g);
