// Placeholder art for the development battleground: a plain tiled field with a stone on every
// solid circle from shared/maps.ts. Only the part inside the camera's view is drawn.
import { DEV_BATTLEGROUND_OBSTACLES, MAPS } from '../../../shared/maps';
import { TAU } from '../../../shared/math';
import { camera, VIEW_H, VIEW_W } from './camera';

const TILE = 100;

export function devBattlegroundScenery(g: CanvasRenderingContext2D) {
  const { width, height } = MAPS.devbattle;
  g.fillStyle = '#16301f';
  g.fillRect(0, 0, width, height);
  g.strokeStyle = '#ffffff12';
  g.lineWidth = 1;
  g.beginPath();
  const x0 = Math.floor(camera.x / TILE) * TILE;
  const y0 = Math.floor(camera.y / TILE) * TILE;
  for (let x = x0; x <= camera.x + VIEW_W; x += TILE) {
    g.moveTo(x, camera.y);
    g.lineTo(x, camera.y + VIEW_H);
  }
  for (let y = y0; y <= camera.y + VIEW_H; y += TILE) {
    g.moveTo(camera.x, y);
    g.lineTo(camera.x + VIEW_W, y);
  }
  g.stroke();
  // the border of the playable world
  g.strokeStyle = '#a7f3d0aa';
  g.lineWidth = 6;
  g.strokeRect(3, 3, width - 6, height - 6);
  for (const o of DEV_BATTLEGROUND_OBSTACLES) {
    if (Math.abs(o.x - camera.x - VIEW_W / 2) > VIEW_W / 2 + o.r + 20) continue;
    if (Math.abs(o.y - camera.y - VIEW_H / 2) > VIEW_H / 2 + o.r + 60) continue;
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
