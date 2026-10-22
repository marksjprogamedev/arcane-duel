import { clamp, TAU } from '../../../../shared/math';
import { ctx } from '../../dom';
import { game, greenSide } from '../../state';
import { drawWizard as drawWizardArt } from './wizard';

export function deathDraw() {
  if (!game.death) return;
  let death = game.death,
    progress = clamp(death.age / 95, 0, 1),
    color = greenSide(death.wizard) ? '#a78bfa' : death.mortal ? '#fbbf24' : '#fb7185';
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.translate(death.x, death.y);
  ctx.rotate(progress * 1.5);
  ctx.scale(1 - progress * 0.35, Math.max(0.03, 1 - progress));
  ctx.translate(-death.x, -death.y);
  drawWizardArt(death.wizard);
  ctx.restore();
  ctx.globalAlpha = (1 - progress) * 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(death.x, death.y - 20, 20 + progress * 100, 0, TAU);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}
