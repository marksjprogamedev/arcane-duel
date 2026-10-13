import { COL } from '../../../shared/constants';
import type { Bomb } from '../../../shared/types';
import { clamp, TAU } from '../../../shared/math';
import { g } from '../dom';
import { game, localInput, net } from '../state';
import { actor } from './actor';
import { drawWave, ellipse, renderLightningArc, renderParticle, scenery } from './primitives';
import { projectile } from './projectile';
import { usesAuthoritativeProjectile } from './earthVisibility';

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
  for (const b of game.bombs) drawBomb(b);
  for (let s of game.shots) {
    if (net.mpRole === 'guest' && s.owner === game.e && !usesAuthoritativeProjectile(s.k))
      continue;
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

/** Lightweight canvas-only bomb artwork, matching the top-down arena scale. */
function drawBomb(b: Bomb) {
  const color = COL[b.k];
  const height = b.landed ? 0 : Math.sin(Math.min(1, b.u) * Math.PI) * 105;
  const px = b.x, py = b.y - height - 12;
  const remaining = clamp(b.fuse / 75, 0, 1);
  const urgency = 1 - remaining;
  const pulse = 1 + Math.sin(game.t * (0.12 + urgency * 0.28)) * (0.04 + urgency * 0.13);
  const angular = game.t * 0.035;
  g.save();

  // Ground shadow makes the throw's height and landing readable.
  g.globalAlpha = b.landed ? 0.3 : 0.16 + height / 750;
  g.fillStyle = '#071319';
  g.beginPath();
  g.ellipse(px, b.y + 3, 12 + height * 0.045, 5 + height * 0.02, 0, 0, TAU);
  g.fill();
  g.globalAlpha = 1;

  if (b.landed) {
    // Fixed gameplay blast radius: purely visual, no collision changes.
    g.strokeStyle = color;
    g.globalAlpha = 0.28 + urgency * 0.58;
    g.lineWidth = 1.5 + urgency;
    g.setLineDash([7, 5]);
    g.beginPath();
    g.ellipse(b.x, b.y, 85, 85 * 0.72, 0, 0, TAU);
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
  }

  // Each spell shares a readable silhouette but has its own material.
  g.translate(px, py);
  g.scale(pulse, pulse);
  g.shadowColor = color;
  g.shadowBlur = 9 + urgency * 11;
  g.fillStyle = '#101a2b';
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, 12, 0, TAU);
  g.fill();
  g.stroke();

  if (b.k === 'ICE' || b.k === 'EARTH') {
    // Faceted crystal for ice, chipped stone for earth.
    const corners = b.k === 'ICE' ? 6 : 7;
    g.fillStyle = color;
    g.globalAlpha = 0.8;
    g.beginPath();
    for (let i = 0; i < corners; i++) {
      const a = -Math.PI / 2 + i * TAU / corners;
      const r = b.k === 'EARTH' ? (i % 2 ? 8 : 11) : 11;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = '#ffffff99';
    g.beginPath(); g.moveTo(-4, -5); g.lineTo(0, 2); g.lineTo(6, -5); g.stroke();
  } else if (b.k === 'STORM' || b.k === 'PLASMA' || b.k === 'MAGNETIC') {
    // Electrical core and orbiting arcs.
    g.fillStyle = color;
    g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill();
    for (let i = 0; i < 3; i++) {
      const a = angular * (b.k === 'MAGNETIC' ? -1 : 1) + i * TAU / 3;
      g.beginPath();
      g.arc(0, 0, 15, a, a + 0.75);
      g.stroke();
    }
  } else if (b.k === 'WATER' || b.k === 'STEAM') {
    // Swirling liquid / vapour bands.
    g.fillStyle = color;
    g.globalAlpha = b.k === 'STEAM' ? 0.6 : 0.85;
    g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
    g.strokeStyle = '#ffffffbb';
    for (let i = 0; i < 2; i++) {
      g.beginPath();
      g.arc(0, 0, 5 + i * 4, angular + i * Math.PI, angular + i * Math.PI + 1.8);
      g.stroke();
    }
  } else {
    // Fire / magma: incandescent rune orb, darker fractured magma shell.
    g.fillStyle = b.k === 'MAGMA' ? '#71331c' : '#d97706';
    g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
    g.strokeStyle = '#ffe08a';
    g.lineWidth = 1.7;
    g.rotate(angular);
    g.beginPath();
    g.moveTo(-7, -2); g.lineTo(-2, -2); g.lineTo(0, -7);
    g.moveTo(4, -7); g.lineTo(4, 1); g.lineTo(8, 3);
    g.moveTo(-5, 6); g.lineTo(1, 3); g.lineTo(5, 7);
    g.stroke();
  }

  // Orbiting fuse markers contract as the detonation approaches.
  g.globalAlpha = 1;
  g.rotate(angular);
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4;
    g.fillStyle = color;
    g.beginPath();
    g.arc(Math.cos(a) * 17, Math.sin(a) * 17, 1.4 + urgency * 0.9, 0, TAU);
    g.fill();
  }
  g.restore();
}
