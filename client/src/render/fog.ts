// Fog of war drawing: a dark ring around your wizard that is solid at the map's vision radius, and an
// arrow at the screen edge when something you cannot see hit you. Call inside the camera transform.
import { g } from '../dom';
import { game, net } from '../state';
import { camera, VIEW_H, VIEW_W } from './camera';
import { fogAlpha, FOG_START, hintAnchor, HIT_HINT_TICKS } from './fogMath';

const FOG_RGB = '4, 7, 12';

/** Darkens the world beyond what the viewer sees; nothing on arenas. */
export function drawFog(me: { x: number; y: number }) {
  const vision = game.map.vision;
  if (vision === null) return;
  const gradient = g.createRadialGradient(me.x, me.y, 0, me.x, me.y, vision);
  gradient.addColorStop(0, `rgba(${FOG_RGB}, 0)`);
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    const at = FOG_START + (1 - FOG_START) * u;
    gradient.addColorStop(at, `rgba(${FOG_RGB}, ${fogAlpha(at * vision, vision).toFixed(3)})`);
  }
  g.save();
  g.globalAlpha = 1;
  g.shadowBlur = 0;
  g.fillStyle = gradient;
  g.fillRect(camera.x - 2, camera.y - 2, VIEW_W + 4, VIEW_H + 4);
  g.restore();
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
  g.save();
  g.translate(camera.x + at.x, camera.y + at.y); // screen position, inside the camera transform
  g.rotate(hint.angle);
  g.globalAlpha = Math.min(1, (HIT_HINT_TICKS - age) / 30);
  g.fillStyle = '#ef4444';
  g.strokeStyle = '#7f1d1d';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(16, 0);
  g.lineTo(-10, -13);
  g.lineTo(-4, 0);
  g.lineTo(-10, 13);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
}
