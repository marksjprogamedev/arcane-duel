import { TAU } from '../../../../../shared/math';
import { ctx } from '../../../dom';
import { greenSide } from '../../../state';
import { poly } from '../../shapes';
import type { WizardPaint } from './context';

/** The sword and its swing transform; drawn in body coordinates while the sword ability runs. */
export function drawSword({ wizard }: WizardPaint) {
  ctx.save();
  ctx.translate(15, -10);
  ctx.rotate(-1.25 + Math.sin(((22 - wizard.swing) / 22) * Math.PI) * 2.3);
  ctx.fillStyle = '#5b422c';
  ctx.fillRect(-3, -2, 6, 13);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-5, -5, 10, 4);
  poly(
    [
      [-3, -5],
      [3, -5],
      [2, -36],
      [0, -44],
      [-2, -36],
    ],
    '#e2e8f0',
  );
  ctx.restore();
}

/** The pale arc the swing sweeps, in world coordinates (after the body's transform is restored). */
export function drawSwingArc({ wizard, x, y }: WizardPaint) {
  ctx.strokeStyle = '#e2e8f0dd';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y - 14, 57, wizard.face - 0.9, wizard.face + 0.9);
  ctx.stroke();
}

/** The team ring at the feet: green for our side, red for the other. */
export function drawTeamRing({ wizard, x, y }: WizardPaint) {
  ctx.strokeStyle = greenSide(wizard) ? '#4ade80' : '#fb7185';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 23, 11, 0, 0, TAU);
  ctx.stroke();
}
