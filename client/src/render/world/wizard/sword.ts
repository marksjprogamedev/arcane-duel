import { TAU } from '../../../../../shared/math';
import { g } from '../../../dom';
import { greenSide } from '../../../state';
import { poly } from '../../shapes';
import type { WizardPaint } from './context';

/** The sword and its swing transform; drawn in body coordinates while the sword ability runs. */
export function drawSword({ w }: WizardPaint) {
  g.save();
  g.translate(15, -10);
  g.rotate(-1.25 + Math.sin(((22 - w.swing) / 22) * Math.PI) * 2.3);
  g.fillStyle = '#5b422c';
  g.fillRect(-3, -2, 6, 13);
  g.fillStyle = '#e2e8f0';
  g.fillRect(-5, -5, 10, 4);
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
  g.restore();
}

/** The pale arc the swing sweeps, in world coordinates (after the body's transform is restored). */
export function drawSwingArc({ w, x, y }: WizardPaint) {
  g.strokeStyle = '#e2e8f0dd';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(x, y - 14, 57, w.face - 0.9, w.face + 0.9);
  g.stroke();
}

/** The team ring at the feet: green for our side, red for the other. */
export function drawTeamRing({ w, x, y }: WizardPaint) {
  g.strokeStyle = greenSide(w) ? '#4ade80' : '#fb7185';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(x, y + 8, 23, 11, 0, 0, TAU);
  g.stroke();
}
