// Fog of war drawing: a dark layer with a clear hole around you and your teammates, solid at the map's vision radius, and an arrow at
// the screen edge when something unseen hit you. Call inside the camera transform.
import { ctx } from '../dom';
import { game, net } from '../state';
import { camera, VIEW_H, VIEW_W } from './camera';
import { fogAlpha, FOG_START, hintAnchor, HIT_HINT_TICKS } from './fogMath';

const FOG_COLOUR = 'rgb(4, 7, 12)';

/**
 * Opacity stops of one wizard's sight, as fractions of the vision radius: clear in the middle,
 * fully fogged at the radius. Worked out once per radius.
 */
let stops: { at: number; clear: number }[] = [];
let stopsFor = 0;

function sightStops(vision: number) {
  if (stopsFor !== vision) {
    stopsFor = vision;
    stops = Array.from({ length: 9 }, (_, i) => {
      const at = FOG_START + ((1 - FOG_START) * i) / 8;
      return { at, clear: 1 - fogAlpha(at * vision, vision) };
    });
  }
  return stops;
}

/** The fog is painted on its own layer so several wizards' sight can be cut out of it. */
let layer: HTMLCanvasElement | null = null;

/**
 * Darkens the world beyond what the team sees: a dark layer with a clear, fading hole around each of
 * `sources` (you and your standing teammates). Nothing on arenas. Call inside the camera transform.
 */
export function drawFog(sources: { x: number; y: number }[]) {
  const vision = game.map.vision;
  if (vision === null) return;
  if (!layer) {
    layer = document.createElement('canvas');
    layer.width = VIEW_W;
    layer.height = VIEW_H;
  }
  const maskCtx = layer.getContext('2d')!;
  maskCtx.globalCompositeOperation = 'source-over';
  maskCtx.clearRect(0, 0, VIEW_W, VIEW_H);
  maskCtx.fillStyle = FOG_COLOUR;
  maskCtx.fillRect(0, 0, VIEW_W, VIEW_H);
  maskCtx.globalCompositeOperation = 'destination-out';
  for (const source of sources) {
    const x = source.x - camera.x;
    const y = source.y - camera.y;
    const hole = maskCtx.createRadialGradient(x, y, 0, x, y, vision);
    hole.addColorStop(0, 'rgba(0, 0, 0, 1)');
    for (const stop of sightStops(vision))
      hole.addColorStop(stop.at, `rgba(0, 0, 0, ${stop.clear.toFixed(3)})`);
    maskCtx.fillStyle = hole;
    maskCtx.fillRect(x - vision, y - vision, vision * 2, vision * 2);
  }
  ctx.drawImage(layer, camera.x, camera.y);
}

/** A red arrow at the edge of the screen toward whatever just hit you from out of sight. */
export function drawHitHint() {
  const hint = net.hitHint;
  if (!hint) return;
  const age = game.t - hint.t;
  if (age < 0 || age > HIT_HINT_TICKS) {
    net.hitHint = null;
    return;
  }
  const at = hintAnchor(hint.angle);
  ctx.save();
  ctx.translate(camera.x + at.x, camera.y + at.y); // screen position, inside the camera transform
  ctx.rotate(hint.angle);
  ctx.globalAlpha = Math.min(1, (HIT_HINT_TICKS - age) / 30);
  ctx.fillStyle = '#ef4444';
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -13);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-10, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
