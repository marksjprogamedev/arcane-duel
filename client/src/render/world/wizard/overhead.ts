import { COL } from '../../../../../shared/constants';
import { clamp } from '../../../../../shared/math';
import { dummy } from '../../../../../shared/sim/wizard';
import { g } from '../../../dom';
import { game, greenSide, me } from '../../../state';
import { bar } from '../../shapes';
import type { WizardPaint } from './context';

/** The health bar over the head. */
export function drawHealthBar({ w, x, y }: WizardPaint) {
  g.fillStyle = '#132018';
  g.fillRect(x - 37, y - 79, 74, 7);
  g.fillStyle = greenSide(w) ? '#4ade80' : dummy(game, w) ? '#fbbf24' : '#fb7185';
  g.fillRect(x - 37, y - 79, 74 * clamp(w.hp / w.max, 0, 1), 7);
}

/** Everyone else's health as text beside their bar (your own is in the top left). */
export function drawHpText({ w, x, y }: WizardPaint) {
  if (w !== me()) {
    // everyone else's health, by their bar (your own is in the top left)
    g.save();
    g.font = 'bold 10px monospace';
    g.textAlign = 'left';
    g.fillStyle = '#e2e8f0';
    g.shadowColor = '#081018';
    g.shadowBlur = 4;
    g.fillText(
      dummy(game, w) && game.mode !== 'mortal' ? '∞' : Math.ceil(Math.max(0, w.hp)) + '/' + w.max,
      x + 41,
      y - 72,
    );
    g.restore();
  }
}

/** The name (or dummy label) over the health bar. Sets the text state `drawSilenced` relies on. */
export function drawNameTag({ w, s, x, y }: WizardPaint) {
  g.textAlign = 'center';
  g.font = 'bold 12px monospace';
  g.fillStyle = dummy(game, w) ? '#fbbf24' : greenSide(w) ? '#86efac' : '#fda4af';
  g.shadowColor = '#081018';
  g.shadowBlur = 5;
  g.fillText(
    dummy(game, w)
      ? game.mode === 'mortal'
        ? 'MORTAL DUMMY'
        : game.mode === 'moving'
          ? 'MOVING DUMMY'
          : 'TARGET DUMMY'
      : s.name.toUpperCase(),
    x,
    y - 101,
  );
  g.shadowBlur = 0;
}

/** Call right after drawNameTag: it reuses the text alignment and font that sets. */
export function drawSilenced({ w, x, y }: WizardPaint) {
  if (w.silence > 0) {
    g.fillStyle = COL.PLASMA;
    g.fillText('SILENCED', x, y - 120);
  }
}

/** One bar per status buildup above 0.5, stacked upwards. */
export function drawStatusBars({ w, x, y }: WizardPaint) {
  const statusBars: [string, number, string][] = [
    ['BURN', w.burn, COL.FIRE],
    ['WET', w.wet, COL.WATER],
    ['CHILL', w.chill, COL.ICE],
    ['SCALD', w.scald, COL.STEAM],
    ['MAG', w.mag, COL.MAGNETIC],
    ['OVER', w.over, COL.PLASMA],
    ['STATIC', w.stat, COL.STORM],
  ];
  statusBars
    .filter((a) => a[1] > 0.5)
    .forEach((a, i) => bar(x, y - 140 - i * 19, a[1], a[2], a[0]));
}
