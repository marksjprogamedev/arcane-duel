// Placeholder art for the development battleground: a plain tiled field with a stone on every
// solid circle from shared/maps.ts. Painted once into cached tiles (chunks.ts); only the tiles in
// the camera's view are drawn each frame.
import { DEV_BATTLEGROUND_OBSTACLES, MAPS } from '../../../../shared/maps';
import { TAU } from '../../../../shared/math';
import { ChunkedBackground } from './chunks';

const TILE = 100;
const { width, height } = MAPS.devbattle;

function paint(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#16301f';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffffff12';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = Math.ceil(x / TILE) * TILE; gx <= x + w; gx += TILE) {
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
  }
  for (let gy = Math.ceil(y / TILE) * TILE; gy <= y + h; gy += TILE) {
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
  }
  ctx.stroke();
  // the border of the playable world
  ctx.strokeStyle = '#a7f3d0aa';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);
  for (const o of DEV_BATTLEGROUND_OBSTACLES) {
    if (
      o.x + o.r + 10 < x ||
      o.x - o.r - 10 > x + w ||
      o.y + o.r + 10 < y ||
      o.y - o.r - 10 > y + h
    )
      continue;
    ctx.fillStyle = '#0006';
    ctx.beginPath();
    ctx.ellipse(o.x + 6, o.y + 8, o.r, o.r * 0.7, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6b7b73';
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8fa196';
    ctx.beginPath();
    ctx.arc(o.x - o.r * 0.2, o.y - o.r * 0.25, o.r * 0.7, 0, TAU);
    ctx.fill();
  }
}

export const devBattleground = new ChunkedBackground(width, height, paint);

export const devBattlegroundScenery = (ctx: CanvasRenderingContext2D) => devBattleground.draw(ctx);
