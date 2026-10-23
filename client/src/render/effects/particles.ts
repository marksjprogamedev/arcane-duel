import { TAU } from '../../../../shared/math';
import type { Particle } from '../../../../shared/types';
import { ctx } from '../../dom';
import { ellipse } from '../shapes';
import { game } from '../../state';

type ParticleLook = Pick<Particle, 'x' | 'y' | 'vx' | 'vy' | 'color' | 'r' | 'life' | 'shape'>;

/** Draws one particle and puts `globalAlpha` back as it was (a cheap restore: this runs for hundreds a frame). */
export function renderParticle(particle: ParticleLook) {
  const alpha = ctx.globalAlpha;
  paintParticle(particle);
  ctx.globalAlpha = alpha;
}

function paintParticle(particle: ParticleLook) {
  ctx.globalAlpha = Math.min(1, particle.life / 12);
  if (particle.shape === 'flame-beam') {
    drawFlameBeam(particle);
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

let flameSheet: HTMLImageElement | null = null;

function drawFlameBeam(particle: ParticleLook) {
  if (typeof Image === 'undefined') return;
  if (!flameSheet) {
    flameSheet = new Image();
    flameSheet.src = '/art/fx/flamethrower-stream.png';
  }

  const angle = Math.atan2(particle.vy, particle.vx);
  const startOffset = Math.min(37, particle.r * 0.25);
  const length = Math.max(1, particle.r - startOffset);
  const frame = Math.abs(Math.floor(game.t / 2)) % 8;
  ctx.save();
  ctx.translate(
    particle.x + Math.cos(angle) * startOffset,
    particle.y - 15 + Math.sin(angle) * startOffset,
  );
  ctx.rotate(angle);
  if (flameSheet.complete && flameSheet.naturalWidth > 0) {
    const frameWidth = flameSheet.naturalWidth / 8;
    ctx.drawImage(
      flameSheet,
      frame * frameWidth,
      0,
      frameWidth,
      flameSheet.naturalHeight,
      0,
      -64,
      length,
      128,
    );
  } else {
    // Keep a coherent flame while the sprite sheet is loading.
    ctx.shadowColor = '#ff6829';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.45, -42, length, 0);
    ctx.quadraticCurveTo(length * 0.45, 42, 0, 0);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.5, -12, length, 0);
    ctx.quadraticCurveTo(length * 0.5, 12, 0, 0);
    ctx.fill();
  }
  ctx.restore();
}
