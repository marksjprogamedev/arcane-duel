import type { Wizard } from '../../../../../shared/types';
import { game, greenSide } from '../../../state';
import { drawWorkshopWizard, hasWorkshopLook } from '../../../workshop/inMatch';
import { ellipse } from '../../shapes';
import { drawBody } from './body';
import { drawSwingArc, drawSword } from './sword';
import { ctx } from '../../../dom';
import { paintContext, type WizardPaint } from './context';
import {
  drawAwayTag,
  drawHealthBar,
  drawHpText,
  drawNameTag,
  drawSilenced,
  drawStatusBars,
} from './overhead';
import {
  drawBurn,
  drawChargeTelegraph,
  drawFlurryRing,
  drawFrozen,
  drawShield,
  drawWetIcon,
} from './statusEffects';

/** Draws one wizard: shadow, body (or the Workshop sprite), status effects, then the overhead bars and name. */
export function drawWizard(wizard: Wizard) {
  const x = wizard.x,
    y = wizard.y,
    bob = Math.sin(game.t * 0.09 + (greenSide(wizard) ? 0 : 2)) * (wizard.freeze > 0 ? 0 : 2);
  const paint = paintContext(wizard, x, y, bob);
  // The legacy silhouette is intentionally offset seven pixels right. The
  // Workshop boots use the logical centre as their ground anchor, so centre
  // the local Workshop shadow beneath them without changing collision data.
  const workshop = hasWorkshopLook(wizard);
  ellipse(workshop ? x : x + 7, y + (workshop ? 10 : 14), 25, 11, '#00000070');
  // A wizard with a Workshop look (your own, or one the server sent for that seat) draws from it; the others keep their original art.
  if (!drawWorkshopWizard(x, y, wizard)) drawBody(paint);
  else if (wizard.swing > 0) drawWorkshopSwing(paint);
  drawChargeTelegraph(paint);
  drawShield(paint);
  drawBurn(paint);
  drawFrozen(paint);
  drawWetIcon(paint);
  drawHealthBar(paint);
  drawHpText(paint);
  drawFlurryRing(paint);
  drawNameTag(paint);
  drawAwayTag(paint);
  drawSilenced(paint);
  drawStatusBars(paint);
}

/** The Workshop sprite has no sword of its own, so the melee swing is drawn over it. */
function drawWorkshopSwing(paint: WizardPaint) {
  ctx.save();
  ctx.translate(paint.x, paint.y);
  drawSword(paint);
  ctx.restore();
  drawSwingArc(paint);
}
