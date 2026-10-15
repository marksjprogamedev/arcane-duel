// A corner map on battlegrounds: the layout, you, and the rival only while in sight.
import type { MapDef } from '../../../shared/maps';
import { isRect } from '../../../shared/sim/obstacles';
import { canSee } from '../../../shared/sim/vision';
import { TAU } from '../../../shared/math';
import { g } from '../dom';
import { game } from '../state';
import { camera, VIEW_H, VIEW_W } from './camera';
import { minimapSize, toMinimap } from './minimapMath';

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
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#0b1a12';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#8fa196';
  for (const o of map.obstacles) {
    if (isRect(o))
      c.fillRect((o.x - o.hw) * scale, (o.y - o.hh) * scale, o.hw * 2 * scale, o.hh * 2 * scale);
    else {
      c.beginPath();
      c.arc(o.x * scale, o.y * scale, Math.max(1.5, o.r * scale), 0, TAU);
      c.fill();
    }
  }
  layers.set(map.id, canvas);
  return canvas;
}

function dot(map: MapDef, at: { x: number; y: number }, colour: string, x0: number, y0: number) {
  const p = toMinimap(map, at.x, at.y);
  g.fillStyle = colour;
  g.strokeStyle = '#000c';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(x0 + p.x, y0 + p.y, 4, 0, TAU);
  g.fill();
  g.stroke();
}

/**
 * Draws the minimap in the bottom-right of the screen (call inside the camera transform). `rival` is
 * null when the opponent is hidden; on maps without fog it is always shown.
 */
export function drawMinimap(me: { x: number; y: number }, rival: { x: number; y: number } | null) {
  const map = game.map;
  if (map.kind !== 'battleground') return;
  const { w, h } = minimapSize(map);
  const x0 = camera.x + VIEW_W - w - MARGIN;
  const y0 = camera.y + VIEW_H - h - MARGIN;
  g.save();
  g.globalAlpha = 0.88;
  g.drawImage(layer(map), x0, y0);
  g.strokeStyle = '#a7f3d0aa';
  g.lineWidth = 2;
  g.strokeRect(x0, y0, w, h);
  // the part of the map on screen
  const view = toMinimap(map, camera.x, camera.y);
  const size = toMinimap(map, VIEW_W, VIEW_H);
  g.strokeStyle = '#ffffff66';
  g.lineWidth = 1;
  g.strokeRect(x0 + view.x, y0 + view.y, size.x, size.y);
  if (rival && canSee(map, me, rival)) dot(map, rival, '#fb7185', x0, y0);
  dot(map, me, '#4ade80', x0, y0);
  g.restore();
}
