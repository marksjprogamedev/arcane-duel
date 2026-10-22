import { TAU } from '../../../../shared/math';
import type { Particle } from '../../../../shared/types';
import { g } from '../../dom';
import { ellipse } from '../shapes';

export function renderParticle(
  q: Pick<Particle, 'x' | 'y' | 'vx' | 'vy' | 'c' | 'r' | 'life' | 'shape'>,
) {
  g.globalAlpha = Math.min(1, q.life / 12);
  // Render only flamethrower spray particles as pointed, directional flame tongues.
  if (q.c === '#e9ad13' || q.c === '#ff6829' || q.c === '#9f2316') {
    g.save();
    g.translate(q.x, q.y - 15);
    g.rotate(Math.atan2(q.vy, q.vx));
    g.shadowColor = q.c;
    g.shadowBlur = 6;
    g.fillStyle = q.c;
    g.beginPath();
    if (q.shape === 'circle') {
      g.arc(0, 0, q.r * 0.6, 0, TAU);
      g.fill();
      g.restore();
      return;
    }
    if (q.shape === 'oval') {
      g.ellipse(0, 0, q.r * 1.65, q.r * 0.75, 0, 0, TAU);
      g.fill();
      g.restore();
      return;
    }
    // Small directional flame triangle replaces the previous pointed teardrop.
    g.moveTo(q.r * 1.4, 0);
    g.lineTo(-q.r * 0.9, -q.r * 0.8);
    g.lineTo(-q.r * 0.9, q.r * 0.8);
    g.closePath();
    g.fill();
    g.restore();
    return;
  }
  // Ice-prison shatter: sharp rotating facets fly out from the broken shell.
  if (q.shape === 'tongue' && ['#b6f0ff', '#e8fbff', '#67c8eb', '#d0e7f4'].includes(q.c)) {
    g.save();
    g.translate(q.x, q.y - 15);
    g.rotate(Math.atan2(q.vy, q.vx) + q.life * 0.11);
    g.shadowBlur = 3;
    g.shadowColor = '#b6f0ff';
    g.fillStyle = q.c;
    g.strokeStyle = '#f0fdff';
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(q.r * 1.35, 0);
    g.lineTo(-q.r * 0.45, -q.r * 0.76);
    g.lineTo(-q.r * 0.9, q.r * 0.22);
    g.lineTo(-q.r * 0.12, q.r * 0.7);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    return;
  }
  // Ice Bomb burst: a selection of its fragments are the same six-armed frost flakes
  // that float above the fuse, rather than glowing spherical sparks.
  if ((q.c === '#a7e5ff' || q.c === '#f2fdff') && q.shape === 'tongue') {
    g.save();
    g.globalAlpha = Math.min(1, q.life / 12);
    g.translate(q.x, q.y - 15);
    g.rotate(Math.atan2(q.vy, q.vx) * 0.25);
    g.strokeStyle = q.c;
    g.lineWidth = 1.2;
    g.lineCap = 'round';
    g.shadowColor = q.c;
    g.shadowBlur = 2;
    for (let arm = 0; arm < 3; arm++) {
      const angle = (arm * Math.PI) / 3;
      const dx = Math.cos(angle) * Math.max(3, q.r * 1.15);
      const dy = Math.sin(angle) * Math.max(3, q.r * 1.15);
      g.beginPath();
      g.moveTo(-dx, -dy);
      g.lineTo(dx, dy);
      g.stroke();
    }
    g.restore();
    return;
  }
  // Earth Bomb burst: irregular rock shards using the existing particles.
  if (['#525b63', '#89949c', '#414950', '#66747a', '#8bac94'].includes(q.c)) {
    g.save();
    g.translate(q.x, q.y - 15);
    g.rotate(Math.atan2(q.vy, q.vx));
    g.fillStyle = q.c;
    g.shadowBlur = 0;
    g.beginPath();
    if (q.shape === 'tongue') {
      g.moveTo(q.r * 1.4, -q.r * 0.3);
      g.lineTo(-q.r * 0.6, -q.r * 0.9);
      g.lineTo(-q.r, q.r * 0.35);
      g.lineTo(q.r * 0.35, q.r * 0.8);
      g.closePath();
    } else if (q.shape === 'oval') {
      g.moveTo(-q.r, -q.r * 0.5);
      g.lineTo(q.r * 0.4, -q.r);
      g.lineTo(q.r, q.r * 0.25);
      g.lineTo(-q.r * 0.3, q.r);
      g.closePath();
    } else {
      g.moveTo(0, -q.r);
      g.lineTo(q.r * 0.95, -q.r * 0.2);
      g.lineTo(q.r * 0.6, q.r * 0.8);
      g.lineTo(-q.r * 0.65, q.r * 0.9);
      g.lineTo(-q.r, 0.05);
      g.closePath();
    }
    g.fill();
    g.restore();
    return;
  }
  // Plasma Bomb burst: existing particles, with varied compact shapes.
  if (
    q.c === '#a94bd9' ||
    q.c === '#e9a6f7' ||
    q.c === '#64238d' ||
    q.c === '#f8d2ff' ||
    q.c === '#cb72ee' ||
    q.c === '#f2a2dc'
  ) {
    g.save();
    g.translate(q.x, q.y - 15);
    g.rotate(Math.atan2(q.vy, q.vx));
    g.fillStyle = q.c;
    g.shadowColor = q.c;
    g.shadowBlur = 3;
    g.beginPath();
    if (q.shape === 'tongue') {
      g.moveTo(q.r * 1.35, 0);
      g.lineTo(-q.r * 0.7, -q.r * 0.65);
      g.lineTo(-q.r, q.r * 0.55);
      g.closePath();
    } else if (q.shape === 'oval') {
      g.ellipse(0, 0, q.r * 1.35, q.r * 0.65, 0, 0, TAU);
    } else {
      g.arc(0, 0, q.r * 0.85, 0, TAU);
    }
    g.fill();
    g.restore();
    return;
  }
  g.shadowColor = q.c;
  g.shadowBlur = q.r * 2;
  ellipse(q.x, q.y - 15, q.r, q.r, q.c);
}
