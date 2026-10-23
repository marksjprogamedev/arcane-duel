// The team match overlay, drawn on the canvas in screen space: who is on each team and how they
// are doing, the kill score in respawn matches, and a banner when you have fallen.
import { ctx } from '../../dom';
import { game, greenSide, isHidden, isTeamMatch, isUnseen, me, net, playerName } from '../../state';
import { camera, VIEW_W } from '../camera';

const GREEN = '#4ade80';
const RED = '#fb7185';

/** What to show for a wizard on the right of their name: health, or why there is none. */
function status(w: (typeof game.wizards)[number]): string {
  if (isUnseen(w)) return '?';
  if (w.fallen) return w.returnIn > 0 ? `↺ ${Math.ceil(w.returnIn / 60)}s` : 'FALLEN';
  return String(Math.ceil(Math.max(0, w.hp)));
}

/** Draws the team panel, the score and the fallen banner (inside the camera transform). */
export function drawTeamHud() {
  if (!isTeamMatch() || !me()) return;
  const mine = me();
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.textBaseline = 'middle';
  // the two teams, yours first
  const rows = game.wizards
    .filter((w) => !w.absent)
    .sort((a, b) => +(b.team === mine.team) - +(a.team === mine.team) || a.seat - b.seat);
  const x = 14;
  let y = 16;
  ctx.fillStyle = '#071319cc';
  const standing = rows.filter((w) => w.team !== mine.team && !w.fallen).length;
  ctx.fillRect(x - 6, y - 10, 190, (rows.length + 1) * 17 + 8);
  ctx.font = 'bold 11px monospace';
  for (const w of rows) {
    const colour = greenSide(w) ? GREEN : RED;
    ctx.fillStyle = colour;
    ctx.fillRect(x, y - 4, 8, 8);
    ctx.textAlign = 'left';
    ctx.fillStyle = w.fallen ? '#94a3b8' : '#e2e8f0';
    // an enemy we have not seen yet is not named (the placeholder look is only a guess)
    const name = isUnseen(w) ? 'Enemy' : playerName(w);
    ctx.fillText((w === mine ? (net.spectating ? 'WATCHING · ' : 'YOU · ') : '') + name, x + 14, y);
    ctx.textAlign = 'right';
    // out of sight now: the health shown is from when we last saw them
    ctx.fillStyle = w.fallen || (isHidden(w) && !greenSide(w)) ? '#94a3b8' : colour;
    ctx.fillText(status(w), x + 178, y);
    y += 17;
  }
  // how many of the other team are still on their feet (this used to sit in the corner HUD)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fda4af';
  ctx.fillText(`ENEMIES STANDING ${standing}`, x, y);
  // the kill score of a respawn match
  if (net.rules.deathRule === 'respawn') {
    const [a, b] = mine.team === 0 ? net.score : [net.score[1], net.score[0]];
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`${a} – ${b}  ·  first to ${net.rules.killTarget}`, VIEW_W / 2, 18);
  }
  if (mine.fallen && !net.spectating) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#fecaca';
    ctx.fillText('YOU HAVE FALLEN', VIEW_W / 2, 52);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(
      mine.returnIn > 0 ? `Back in ${Math.ceil(mine.returnIn / 60)} s` : 'Watching your team',
      VIEW_W / 2,
      72,
    );
  }
  ctx.restore();
}
