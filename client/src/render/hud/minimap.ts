// A corner map on battlegrounds: the layout, you, and the others only while in sight.
import type { MapDef } from '../../../../shared/maps';
import { isRect } from '../../../../shared/sim/obstacles';
import { canSee } from '../../../../shared/sim/vision';
import { TAU } from '../../../../shared/math';
import { ctx } from '../../dom';
import { game } from '../../state';
import { camera, VIEW_H, VIEW_W } from '../camera';
import { ACTION_BAR_SPACE, minimapSize, toMinimap } from './minimapMath';

const MARGIN = 12;
const layers = new Map<string, HTMLCanvasElement>();

/** The part that never changes: background and every solid, painted once per map. */
function layer(map: MapDef): HTMLCanvasElement {
  let canvas = layers.get(map.id);
  if (canvas) return canvas;
  const { w, h, scale } = minimapSize(map);
  canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const baseCtx = canvas.getContext('2d')!;
  baseCtx.fillStyle = '#0b1a12';
  baseCtx.fillRect(0, 0, w, h);
  baseCtx.fillStyle = '#8fa196';
  for (const o of map.obstacles) {
    if (isRect(o))
      baseCtx.fillRect(
        (o.x - o.hw) * scale,
        (o.y - o.hh) * scale,
        o.hw * 2 * scale,
        o.hh * 2 * scale,
      );
    else {
      baseCtx.beginPath();
      baseCtx.arc(o.x * scale, o.y * scale, Math.max(1.5, o.r * scale), 0, TAU);
      baseCtx.fill();
    }
  }
  layers.set(map.id, canvas);
  return canvas;
}

function dot(map: MapDef, at: { x: number; y: number }, colour: string, x0: number, y0: number) {
  const point = toMinimap(map, at.x, at.y);
  ctx.fillStyle = colour;
  ctx.strokeStyle = '#000c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x0 + point.x, y0 + point.y, 4, 0, TAU);
  ctx.fill();
  ctx.stroke();
}

/**
 * Draws the minimap in the bottom-right of the screen, above the action bar (call inside the camera transform): you and
 * your teammates in green, and the enemies your team can see in red.
 */
export function drawMinimap(
  me: { x: number; y: number },
  allies: { x: number; y: number }[],
  enemies: { x: number; y: number }[],
) {
  const map = game.map;
  if (map.kind !== 'battleground') return;
  const { w, h } = minimapSize(map);
  const x0 = camera.x + VIEW_W - w - MARGIN;
  const y0 = camera.y + VIEW_H - h - ACTION_BAR_SPACE - MARGIN; // above the action bar
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.drawImage(layer(map), x0, y0);
  ctx.strokeStyle = '#a7f3d0aa';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, w, h);
  // the part of the map on screen
  const view = toMinimap(map, camera.x, camera.y);
  const size = toMinimap(map, VIEW_W, VIEW_H);
  ctx.strokeStyle = '#ffffff66';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + view.x, y0 + view.y, size.x, size.y);
  const sources = [me, ...allies];
  for (const enemy of enemies)
    if (sources.some((s) => canSee(map, s, enemy))) dot(map, enemy, '#fb7185', x0, y0);
  for (const ally of allies) dot(map, ally, '#86efac', x0, y0);
  dot(map, me, '#4ade80', x0, y0);
  ctx.restore();
}
