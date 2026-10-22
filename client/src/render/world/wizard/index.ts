import type { Wizard } from '../../../../../shared/types';
import { game, greenSide, me } from '../../../state';
import { drawWorkshopWizard } from '../../../workshop/inMatch';
import { ellipse } from '../../shapes';
import { drawBody } from './body';
import { paintContext } from './context';
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
  ellipse(x + 7, y + 14, 25, 11, '#00000070');
  // Only the local player's appearance changes; other actors keep their original art.
  if (wizard !== me() || !drawWorkshopWizard(x, y, wizard)) drawBody(paint);
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
