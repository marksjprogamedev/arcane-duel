// The big 5-4-3-2-1 shown to everyone while an online match is about to begin.
import { SERVER_TICK_HZ } from '../../../../shared/protocol';
import { g } from '../../dom';
import { net } from '../../state';
import { camera, VIEW_H, VIEW_W } from '../camera';

/** Draws the seconds left over the arena (screen space, inside the camera transform). */
export function drawCountdown() {
  if (!net.online || net.countdown <= 0) return;
  const seconds = Math.ceil(net.countdown / SERVER_TICK_HZ);
  // the digit swells at the start of each second and settles
  const into = 1 - (net.countdown % SERVER_TICK_HZ || SERVER_TICK_HZ) / SERVER_TICK_HZ;
  g.save();
  g.translate(camera.x, camera.y);
  g.fillStyle = '#0b1b2c88';
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#fde68a';
  g.shadowColor = '#000';
  g.shadowBlur = 12;
  g.font = `bold ${Math.round(150 * (1.15 - 0.15 * into))}px monospace`;
  g.fillText(String(seconds), VIEW_W / 2, VIEW_H / 2 - 10);
  g.shadowBlur = 0;
  g.font = 'bold 20px monospace';
  g.fillStyle = '#e2e8f0';
  g.fillText('GET READY', VIEW_W / 2, VIEW_H / 2 + 80);
  g.restore();
}
