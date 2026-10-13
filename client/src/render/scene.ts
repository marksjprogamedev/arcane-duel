import { COL } from '../../../shared/constants';
import { clamp, TAU } from '../../../shared/math';
import { g } from '../dom';
import { game, localInput, net } from '../state';
import { actor } from './actor';
import { drawWave, ellipse, renderLightningArc, renderParticle, scenery } from './primitives';
import { projectile } from './projectile';

export function deathDraw() {
  if (!game.death) return;
  let d = game.death,
    u = clamp(d.age / 95, 0, 1),
    c = d.w === game.p ? '#a78bfa' : d.mortal ? '#fbbf24' : '#fb7185';
  g.save();
  g.globalAlpha = 1 - u;
  g.translate(d.x, d.y);
  g.rotate(u * 1.5);
  g.scale(1 - u * 0.35, Math.max(0.03, 1 - u));
  g.translate(-d.x, -d.y);
  actor(d.w);
  g.restore();
  g.globalAlpha = (1 - u) * 0.9;
  g.strokeStyle = c;
  g.lineWidth = 5;
  g.shadowColor = c;
  g.shadowBlur = 25;
  g.beginPath();
  g.arc(d.x, d.y - 20, 20 + u * 100, 0, TAU);
  g.stroke();
  g.shadowBlur = 0;
  g.globalAlpha = 1;
}

export function draw() {
  scenery();
  for (let z of game.zones) {
    g.globalAlpha = Math.min(0.65, z.life / 80);
    g.fillStyle = COL[z.k] + '55';
    g.beginPath();
    g.ellipse(z.x, z.y, z.r, z.r * 0.7, 0, 0, TAU);
    g.fill();
    g.strokeStyle = COL[z.k];
    g.lineWidth = 3;
    g.stroke();
    if (z.k === 'MAGMA')
      for (let i = 0; i < 9; i++) {
        let a = (i * TAU) / 9 + game.t * 0.008,
          r = z.r * 0.55;
        ellipse(
          z.x + Math.cos(a) * r,
          z.y + Math.sin(a) * r * 0.7,
          4 + Math.sin(game.t * 0.1 + i) * 2,
          3,
          '#ffb347',
        );
      }
    g.globalAlpha = 1;
  }
  [
    { y: game.p.y, w: game.p },
    { y: game.e.y, w: game.e },
  ]
    .filter((o) => !game.death || o.w !== game.death.w)
    .sort((a, b) => a.y - b.y)
    .forEach((o) => actor(o.w));
  deathDraw();
  for (let b of game.bombs) {
    let h = b.landed ? 0 : Math.sin(Math.min(1, b.u) * Math.PI) * 105;
    ellipse(b.x, b.y - h - 12, 13, 13, COL[b.k]);
    if (b.landed) {
      g.strokeStyle = COL[b.k];
      g.lineWidth = 2;
      g.beginPath();
      g.arc(b.x, b.y, 85, 0, TAU);
      g.stroke();
    }
  }
  for (let s of game.shots) {
    if (net.mpRole === 'guest' && s.owner === game.e) continue;
    projectile(s);
  }
  for (let a of game.arcs) {
    if (
      net.mpRole === 'guest' &&
      (a.castOwner === 'e' ||
        (a.points?.length &&
          Math.hypot(a.points[0].x - game.e.x, a.points[0].y - (game.e.y - 20)) < 110))
    )
      continue;
    renderLightningArc(a);
  }
  g.globalAlpha = 1;
  for (let q of game.waves) {
    if (
      net.mpRole === 'guest' &&
      net.guestFX.some(
        (f) =>
          (f.kind === 'HEAL' || f.kind === 'FORCE') &&
          Math.hypot(q.x - f.x, q.y - f.y) < 75 &&
          f.age < f.life,
      )
    )
      continue;
    drawWave(q);
  }
  g.globalAlpha = 1;
  for (let q of game.particles) {
    if (net.mpRole === 'guest' && q.castOwner === 'e') continue;
    renderParticle(q);
  }
  g.shadowBlur = 0;
  g.globalAlpha = 1;
  for (let q of game.labels) {
    g.globalAlpha = Math.min(1, q.life / 18);
    g.font = 'bold 15px monospace';
    g.textAlign = 'center';
    g.fillStyle = q.c;
    g.fillText(q.s, q.x, q.y);
  }
  g.globalAlpha = 1;
  g.strokeStyle = '#ffffffaa';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(localInput().mouse.x, localInput().mouse.y, 9, 0, TAU);
  g.moveTo(localInput().mouse.x - 15, localInput().mouse.y);
  g.lineTo(localInput().mouse.x - 5, localInput().mouse.y);
  g.moveTo(localInput().mouse.x + 5, localInput().mouse.y);
  g.lineTo(localInput().mouse.x + 15, localInput().mouse.y);
  g.stroke();
}
