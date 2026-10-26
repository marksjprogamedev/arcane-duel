import { TAU } from '../../../../shared/math';
import type { Particle } from '../../../../shared/types';
import { ctx } from '../../dom';
import { ellipse } from '../shapes';

type ParticleLook = Pick<
  Particle,
  'x' | 'y' | 'vx' | 'vy' | 'color' | 'r' | 'life' | 'shape' | 'length' | 'angle'
>;

/** Draws one particle and puts `globalAlpha` back as it was (a cheap restore: this runs for hundreds a frame). */
export function renderParticle(particle: ParticleLook) {
  const alpha = ctx.globalAlpha;
  paintParticle(particle);
  ctx.globalAlpha = alpha;
}

function paintParticle(particle: ParticleLook) {
  ctx.globalAlpha = Math.min(1, particle.life / 12);
  if (particle.shape === 'flame-tongue') {
    drawFlameTongue(particle);
    return;
  }
  // Ice-prison shatter: sharp rotating facets fly out from the broken shell.
  if (
    particle.shape === 'tongue' &&
    ['#b6f0ff', '#e8fbff', '#67c8eb', '#d0e7f4'].includes(particle.color)
  ) {
    ctx.save();
    ctx.translate(particle.x, particle.y - 15);
    ctx.rotate(Math.atan2(particle.vy, particle.vx) + particle.life * 0.11);
    ctx.shadowBlur = 3;
    ctx.shadowColor = '#b6f0ff';
    ctx.fillStyle = particle.color;
    ctx.strokeStyle = '#f0fdff';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(particle.r * 1.35, 0);
    ctx.lineTo(-particle.r * 0.45, -particle.r * 0.76);
    ctx.lineTo(-particle.r * 0.9, particle.r * 0.22);
    ctx.lineTo(-particle.r * 0.12, particle.r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }
  // Ice Bomb burst: a selection of its fragments are the same six-armed frost flakes
  // that float above the fuse, rather than glowing spherical sparks.
  if (
    (particle.color === '#a7e5ff' || particle.color === '#f2fdff') &&
    particle.shape === 'tongue'
  ) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, particle.life / 12);
    ctx.translate(particle.x, particle.y - 15);
    ctx.rotate(Math.atan2(particle.vy, particle.vx) * 0.25);
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 2;
    for (let arm = 0; arm < 3; arm++) {
      const angle = (arm * Math.PI) / 3;
      const dx = Math.cos(angle) * Math.max(3, particle.r * 1.15);
      const dy = Math.sin(angle) * Math.max(3, particle.r * 1.15);
      ctx.beginPath();
      ctx.moveTo(-dx, -dy);
      ctx.lineTo(dx, dy);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  // Earth Bomb burst: irregular rock shards using the existing particles.
  if (['#525b63', '#89949c', '#414950', '#66747a', '#8bac94'].includes(particle.color)) {
    ctx.save();
    ctx.translate(particle.x, particle.y - 15);
    ctx.rotate(Math.atan2(particle.vy, particle.vx));
    ctx.fillStyle = particle.color;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    if (particle.shape === 'tongue') {
      ctx.moveTo(particle.r * 1.4, -particle.r * 0.3);
      ctx.lineTo(-particle.r * 0.6, -particle.r * 0.9);
      ctx.lineTo(-particle.r, particle.r * 0.35);
      ctx.lineTo(particle.r * 0.35, particle.r * 0.8);
      ctx.closePath();
    } else if (particle.shape === 'oval') {
      ctx.moveTo(-particle.r, -particle.r * 0.5);
      ctx.lineTo(particle.r * 0.4, -particle.r);
      ctx.lineTo(particle.r, particle.r * 0.25);
      ctx.lineTo(-particle.r * 0.3, particle.r);
      ctx.closePath();
    } else {
      ctx.moveTo(0, -particle.r);
      ctx.lineTo(particle.r * 0.95, -particle.r * 0.2);
      ctx.lineTo(particle.r * 0.6, particle.r * 0.8);
      ctx.lineTo(-particle.r * 0.65, particle.r * 0.9);
      ctx.lineTo(-particle.r, 0.05);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
    return;
  }
  // Plasma Bomb burst: existing particles, with varied compact shapes.
  if (
    particle.color === '#a94bd9' ||
    particle.color === '#e9a6f7' ||
    particle.color === '#64238d' ||
    particle.color === '#f8d2ff' ||
    particle.color === '#cb72ee' ||
    particle.color === '#f2a2dc'
  ) {
    ctx.save();
    ctx.translate(particle.x, particle.y - 15);
    ctx.rotate(Math.atan2(particle.vy, particle.vx));
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 3;
    ctx.beginPath();
    if (particle.shape === 'tongue') {
      ctx.moveTo(particle.r * 1.35, 0);
      ctx.lineTo(-particle.r * 0.7, -particle.r * 0.65);
      ctx.lineTo(-particle.r, particle.r * 0.55);
      ctx.closePath();
    } else if (particle.shape === 'oval') {
      ctx.ellipse(0, 0, particle.r * 1.35, particle.r * 0.65, 0, 0, TAU);
    } else {
      ctx.arc(0, 0, particle.r * 0.85, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.shadowColor = particle.color;
  ctx.shadowBlur = particle.r * 2;
  ellipse(particle.x, particle.y - 15, particle.r, particle.r, particle.color);
}

function drawFlameTongue(particle: ParticleLook) {
  const angle = particle.angle ?? Math.atan2(particle.vy, particle.vx);
  const length = particle.length ?? particle.r * 3.5;
  const width = particle.r;
  ctx.save();
  ctx.translate(particle.x, particle.y - 15);
  ctx.rotate(angle);
  ctx.globalAlpha *= 0.78;
  ctx.shadowColor = '#fb6a22';
  ctx.shadowBlur = Math.min(6, width * 0.45);
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.moveTo(0, -width * 0.12);
  ctx.quadraticCurveTo(length * 0.13, -width * 0.95, length * 0.3, -width * 0.48);
  ctx.quadraticCurveTo(length * 0.46, -width * 0.84, length * 0.62, -width * 0.34);
  ctx.quadraticCurveTo(length * 0.83, -width * 0.53, length, 0);
  ctx.quadraticCurveTo(length * 0.79, width * 0.22, length * 0.65, width * 0.45);
  ctx.quadraticCurveTo(length * 0.43, width * 0.27, length * 0.28, width * 0.64);
  ctx.quadraticCurveTo(length * 0.12, width * 0.38, 0, width * 0.12);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha *= 0.48;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff0a6';
  ctx.beginPath();
  ctx.moveTo(length * 0.04, 0);
  ctx.quadraticCurveTo(length * 0.25, -width * 0.26, length * 0.48, 0);
  ctx.quadraticCurveTo(length * 0.72, width * 0.2, length * 0.92, 0);
  ctx.quadraticCurveTo(length * 0.68, width * 0.08, length * 0.47, width * 0.16);
  ctx.quadraticCurveTo(length * 0.24, width * 0.08, length * 0.04, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
