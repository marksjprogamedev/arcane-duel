import { SPELL_COLOR } from '../../../../../shared/constants';
import { clamp } from '../../../../../shared/math';
import { dummy } from '../../../../../shared/sim/wizard';
import { ctx } from '../../../dom';
import { game, greenSide, me, playerName } from '../../../state';
import { bar } from '../../shapes';
import type { WizardPaint } from './context';

/** The health bar over the head. */
export function drawHealthBar({ wizard, x, y }: WizardPaint) {
  ctx.fillStyle = '#132018';
  ctx.fillRect(x - 37, y - 79, 74, 7);
  ctx.fillStyle = greenSide(wizard) ? '#4ade80' : dummy(game, wizard) ? '#fbbf24' : '#fb7185';
  ctx.fillRect(x - 37, y - 79, 74 * clamp(wizard.hp / wizard.max, 0, 1), 7);
}

/** Everyone else's health as text beside their bar (your own is in the top left). */
export function drawHpText({ wizard, x, y }: WizardPaint) {
  if (wizard !== me()) {
    // everyone else's health, by their bar (your own is in the top left)
    ctx.save();
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e2e8f0';
    ctx.shadowColor = '#081018';
    ctx.shadowBlur = 4;
    ctx.fillText(
      dummy(game, wizard) && game.mode !== 'mortal'
        ? '∞'
        : Math.ceil(Math.max(0, wizard.hp)) + '/' + wizard.max,
      x + 41,
      y - 72,
    );
    ctx.restore();
  }
}

/** The name (or dummy label) over the health bar. Sets the text state `drawSilenced` relies on. */
export function drawNameTag({ wizard, style, x, y }: WizardPaint) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = dummy(game, wizard) ? '#fbbf24' : greenSide(wizard) ? '#86efac' : '#fda4af';
  ctx.shadowColor = '#081018';
  ctx.shadowBlur = 5;
  ctx.fillText(
    dummy(game, wizard)
      ? game.mode === 'mortal'
        ? 'MORTAL DUMMY'
        : game.mode === 'moving'
          ? 'MOVING DUMMY'
          : 'TARGET DUMMY'
      : playerName({ seat: wizard.seat, style }).toUpperCase(),
    x,
    y - 101,
  );
  ctx.shadowBlur = 0;
}

/** Call right after drawNameTag: it reuses the text alignment and font that sets. */
export function drawSilenced({ wizard, x, y }: WizardPaint) {
  if (wizard.silence > 0) {
    ctx.fillStyle = SPELL_COLOR.PLASMA;
    ctx.fillText('SILENCED', x, y - (wizard.away ? 134 : 120));
  }
}

/** Call right after drawNameTag (same text state): the tag over a wizard whose player dropped. */
export function drawAwayTag({ wizard, x, y }: WizardPaint) {
  if (wizard.away) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('DISCONNECTED', x, y - 120);
  }
}

/** One bar per status buildup above 0.5, stacked upwards. */
export function drawStatusBars({ wizard, x, y }: WizardPaint) {
  const statusBars: [string, number, string][] = [
    ['BURN', wizard.burn, SPELL_COLOR.FIRE],
    ['WET', wizard.wet, SPELL_COLOR.WATER],
    ['CHILL', wizard.chill, SPELL_COLOR.ICE],
    ['SCALD', wizard.scald, SPELL_COLOR.STEAM],
    ['MAG', wizard.magnetized, SPELL_COLOR.MAGNETIC],
    ['OVER', wizard.overload, SPELL_COLOR.PLASMA],
    ['STATIC', wizard.static, SPELL_COLOR.STORM],
  ];
  statusBars
    .filter((entry) => entry[1] > 0.5)
    .forEach((entry, i) => bar(x, y - 140 - i * 19, entry[1], entry[2], entry[0]));
}
