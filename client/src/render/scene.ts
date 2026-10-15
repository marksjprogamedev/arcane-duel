import { BOMB_FUSE_TICKS, COL } from '../../../shared/constants';
import type { Bomb, Wizard } from '../../../shared/types';
import { clamp, TAU } from '../../../shared/math';
import { g } from '../dom';
import { game, localInput, net } from '../state';
import { actor } from './actor';
import {
  drawBubble,
  drawPrison,
  drawTrapRune,
  drawWave,
  ellipse,
  renderLightningArc,
  renderParticle,
} from './primitives';
import { inView } from './camera';
import { drawFog, drawHitHint } from './fog';
import { drawMinimap } from './minimap';
import { projectile } from './projectile';
import { mapScenery } from './maps';
import { usesAuthoritativeProjectile } from '../net/earthVisibility';

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

/** Draws a wizard unless it is dying, off screen, or the rival hidden in the fog. */
function drawWizard(w: Wizard) {
  if ((game.death && w === game.death.w) || (net.opponentHidden && w === game.p)) return;
  if (!inView(w.x, w.y, 160)) return;
  actor(w);
  if (w.prison > 0) drawPrison(w.x, w.y, w.prison, game.t);
}

export function draw() {
  mapScenery();
  for (let z of game.zones) {
    if (!inView(z.x, z.y, z.r + 20)) continue;
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
  for (const t of game.traps)
    if (inView(t.x, t.y, 60)) drawTrapRune(t.x, t.y, COL[t.k], t.arm <= 0, game.t);
  const [back, front] = game.p.y <= game.e.y ? [game.p, game.e] : [game.e, game.p];
  drawWizard(back);
  drawWizard(front);
  deathDraw();
  for (const b of game.bombs) if (inView(b.x, b.y, 200)) drawBomb(b);
  for (let s of game.shots) {
    if (net.online && s.owner === game.e && !usesAuthoritativeProjectile(s.k)) continue;
    if (!inView(s.x, s.y, 120)) continue;
    projectile(s);
  }
  for (const b of game.bubbles)
    if (inView(b.x, b.y, b.r + 30)) drawBubble(b.x, b.y, b.r, Math.min(1, b.life / 40));
  for (let a of game.arcs) {
    if (
      net.online &&
      (a.castOwner === 'e' ||
        (a.points?.length &&
          Math.hypot(a.points[0].x - game.e.x, a.points[0].y - (game.e.y - 20)) < 110))
    )
      continue;
    if (a.variant === 'plasma_beam') {
      const caster = a.castOwner === 'p' ? game.p : game.e;
      const start = { x: caster.x, y: caster.y - 20 };
      const target = a.points[a.points.length - 1];
      const dx = target.x - start.x, dy = target.y - start.y;
      const length = Math.hypot(dx, dy);
      const fraction = length ? Math.min(1, (a.reach ?? 0) / length) : 0;
      renderLightningArc({
        ...a, points: [start, { x: start.x + dx * fraction, y: start.y + dy * fraction }],
        hit: a.hit && fraction >= .98,
      });
    } else renderLightningArc(a);
  }
  g.globalAlpha = 1;
  for (let q of game.waves) {
    if (
      net.online &&
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
    if (net.online && q.castOwner === 'e') continue;
    if (!inView(q.x, q.y, 60)) continue;
    renderParticle(q);
  }
  g.shadowBlur = 0;
  g.globalAlpha = 1;
  for (let q of game.labels) {
    if (!inView(q.x, q.y, 80)) continue;
    g.globalAlpha = Math.min(1, q.life / 18);
    g.font = 'bold 15px monospace';
    g.textAlign = 'center';
    g.fillStyle = q.c;
    g.fillText(q.s, q.x, q.y);
  }
  g.globalAlpha = 1;
  if (game.active) {
    const me = net.online ? game.e : game.p;
    const rival = net.online ? game.p : game.e;
    drawFog(me);
    drawHitHint();
    drawMinimap(me, net.online && net.opponentHidden ? null : rival);
  }
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
  const px = b.x,
    py = b.y - height - 12;
  const remaining = clamp(b.fuse / BOMB_FUSE_TICKS, 0, 1);
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

  // Draw each elemental sprite in local bomb coordinates. Without this
  // translation the artwork renders at canvas (0, 0), in the top-left.
  g.translate(px, py);
  g.scale(pulse, pulse);

  // Distinct silhouettes: the bombs are not just recoloured spheres.
  const polygon = (sides: number, radius: number, rotation = 0) => {
    g.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i * TAU) / sides;
      const xx = Math.cos(a) * radius,
        yy = Math.sin(a) * radius;
      if (i === 0) g.moveTo(xx, yy);
      else g.lineTo(xx, yy);
    }
    g.closePath();
  };
  g.lineWidth = 2;
  g.strokeStyle = color;
  if (b.k === 'EARTH') {
    // Chunky boulder with protruding chips and a rough, asymmetric profile.
    g.fillStyle = '#655c46';
    g.beginPath();
    [
      [-13, -4],
      [-7, -13],
      [4, -12],
      [13, -5],
      [10, 8],
      [0, 13],
      [-11, 7],
    ].forEach(([xx, yy], i) => (i ? g.lineTo(xx, yy) : g.moveTo(xx, yy)));
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#a69d81';
    g.beginPath();
    g.moveTo(-7, -9);
    g.lineTo(2, -10);
    g.lineTo(0, -1);
    g.lineTo(-9, 1);
    g.closePath();
    g.fill();
    for (const [xx, yy] of [
      [-16, 7],
      [15, 3],
      [-3, 16],
    ]) {
      g.fillStyle = '#8d8066';
      g.fillRect(xx - 2, yy - 2, 4, 4);
    }
  } else if (b.k === 'ICE') {
    // Tall crystalline diamond and offset ice splinters.
    g.fillStyle = '#63c9f4';
    polygon(4, 15, Math.PI / 4);
    g.fill();
    g.stroke();
    g.fillStyle = '#d5faff';
    g.beginPath();
    g.moveTo(0, -15);
    g.lineTo(0, 13);
    g.lineTo(-10, 0);
    g.closePath();
    g.fill();
    for (const [xx, yy] of [
      [-15, 9],
      [14, -8],
    ]) {
      g.beginPath();
      g.moveTo(xx, yy - 5);
      g.lineTo(xx + 3, yy);
      g.lineTo(xx, yy + 5);
      g.lineTo(xx - 3, yy);
      g.closePath();
      g.fill();
    }
  } else if (b.k === 'FIRE') {
    // Flame-shaped core, with pointed tongues above the orb.
    g.fillStyle = '#d94c15';
    g.beginPath();
    g.moveTo(-10, 7);
    g.quadraticCurveTo(-16, -2, -7, -13);
    g.lineTo(-3, -7);
    g.lineTo(2, -19);
    g.quadraticCurveTo(16, -6, 11, 7);
    g.quadraticCurveTo(0, 17, -10, 7);
    g.fill();
    g.stroke();
    g.fillStyle = '#ffdf5c';
    g.beginPath();
    g.ellipse(0, 3, 5, 7, 0, 0, TAU);
    g.fill();
  } else if (b.k === 'MAGMA') {
    // Black volcanic shell with bright orange cracks.
    g.fillStyle = '#3f2924';
    polygon(7, 14, -Math.PI / 2);
    g.fill();
    g.stroke();
    g.strokeStyle = '#ff8a27';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(-9, -8);
    g.lineTo(-2, -3);
    g.lineTo(-5, 5);
    g.lineTo(2, 12);
    g.moveTo(7, -11);
    g.lineTo(3, -3);
    g.lineTo(10, 4);
    g.stroke();
    g.fillStyle = '#ffb23e';
    g.beginPath();
    g.arc(-2, -3, 3, 0, TAU);
    g.fill();
  } else if (b.k === 'WATER') {
    // Teardrop with concentric ripples.
    g.fillStyle = '#1488d4';
    g.beginPath();
    g.moveTo(0, -17);
    g.bezierCurveTo(17, 0, 15, 12, 0, 13);
    g.bezierCurveTo(-15, 12, -17, 0, 0, -17);
    g.fill();
    g.stroke();
    g.strokeStyle = '#b2f4ff';
    g.beginPath();
    g.arc(0, 4, 6, 0.1, 2.7);
    g.stroke();
  } else if (b.k === 'STEAM') {
    // Soft clustered vapour puffs instead of a solid orb.
    g.fillStyle = '#cad5df';
    for (const [xx, yy, r] of [
      [-7, 3, 8],
      [3, -5, 9],
      [10, 5, 7],
      [-3, 10, 7],
    ] as const) {
      g.beginPath();
      g.arc(xx, yy, r, 0, TAU);
      g.fill();
    }
    g.strokeStyle = '#f8fafc';
    g.beginPath();
    g.arc(-1, -2, 8, 3.5, 5.7);
    g.stroke();
  } else if (b.k === 'LIGHTNING') {
    // Lightning bomb: luminous forked bolt and electric sparks, NO dark ring.
    g.shadowColor = '#fef08a';
    g.shadowBlur = 15;
    g.fillStyle = '#fde047';
    g.beginPath();
    g.moveTo(3, -18);
    g.lineTo(-7, -2);
    g.lineTo(0, -2);
    g.lineTo(-5, 16);
    g.lineTo(12, -5);
    g.lineTo(4, -5);
    g.closePath();
    g.fill();
    g.strokeStyle = '#fffde0';
    g.lineWidth = 1.5;
    g.stroke();
    for (let i = 0; i < 4; i++) {
      const a = angular * 1.8 + (i * TAU) / 4;
      const sx = Math.cos(a) * 17,
        sy = Math.sin(a) * 17;
      g.strokeStyle = '#fff9a8';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(sx - 3, sy - 3);
      g.lineTo(sx + 2, sy);
      g.lineTo(sx - 1, sy + 4);
      g.stroke();
    }
    g.shadowBlur = 0;
  } else if (b.k === 'STORM') {
    // Sharp thunderbolt through a dark storm cloud.
    g.fillStyle = '#515b8f';
    for (const [xx, yy, r] of [
      [-7, 3, 8],
      [2, -5, 9],
      [9, 4, 7],
    ] as const) {
      g.beginPath();
      g.arc(xx, yy, r, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#e8ecff';
    g.beginPath();
    g.moveTo(3, -13);
    g.lineTo(-5, 2);
    g.lineTo(1, 2);
    g.lineTo(-2, 15);
    g.lineTo(10, -2);
    g.lineTo(3, -2);
    g.closePath();
    g.fill();
  } else if (b.k === 'PLASMA') {
    // Four-point star inside a rotating spiked ring.
    g.fillStyle = '#782e96';
    polygon(8, 14, angular);
    g.fill();
    g.stroke();
    g.fillStyle = '#ffb2fc';
    g.beginPath();
    g.moveTo(0, -12);
    g.lineTo(4, -4);
    g.lineTo(12, 0);
    g.lineTo(4, 4);
    g.lineTo(0, 12);
    g.lineTo(-4, 4);
    g.lineTo(-12, 0);
    g.lineTo(-4, -4);
    g.closePath();
    g.fill();
  } else if (b.k === 'MAGNETIC') {
    // Horseshoe magnet with opposing poles and orbiting sparks.
    g.strokeStyle = '#b9eb45';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(0, 0, 10, Math.PI, TAU);
    g.stroke();
    g.strokeStyle = '#e5ffad';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-10, 0);
    g.lineTo(-10, 8);
    g.moveTo(10, 0);
    g.lineTo(10, 8);
    g.stroke();
  } else {
    // Other elemental bombs retain the standard runic sphere.
    g.fillStyle = '#17233b';
    g.beginPath();
    g.arc(0, 0, 12, 0, TAU);
    g.fill();
    g.stroke();
    g.fillStyle = color;
    g.beginPath();
    g.arc(0, 0, 6, 0, TAU);
    g.fill();
  }

  // Element-specific orbiting motes and an accelerating fuse glow.
  // These are decorative and never affect collision or detonation.
  g.globalAlpha = 0.6 + urgency * 0.4;
  for (let i = 0; i < 3; i++) {
    const a = angular * (b.k === 'MAGNETIC' ? -1.5 : 1.3) + (i * TAU) / 3;
    const r = 22 + Math.sin(game.t * 0.07 + i) * 2;
    const fx = Math.cos(a) * r,
      fy = Math.sin(a) * r * 0.75;
    g.fillStyle =
      b.k === 'FIRE' || b.k === 'MAGMA'
        ? '#ffe9a3'
        : b.k === 'ICE' || b.k === 'WATER'
          ? '#d9faff'
          : b.k === 'LIGHTNING'
            ? '#fffbc0'
            : color;
    g.beginPath();
    g.arc(fx, fy, 1.5 + urgency * 1.1, 0, TAU);
    g.fill();
  }
  // Orbiting fuse markers contract as the detonation approaches.
  g.globalAlpha = 1;
  g.rotate(angular);
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4;
    g.fillStyle = color;
    g.beginPath();
    g.arc(Math.cos(a) * 17, Math.sin(a) * 17, 1.4 + urgency * 0.9, 0, TAU);
    g.fill();
  }
  g.restore();
}
