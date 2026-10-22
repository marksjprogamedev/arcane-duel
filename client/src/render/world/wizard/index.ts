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
export function drawWizard(w: Wizard) {
  const x = w.x,
    y = w.y,
    bob = Math.sin(game.t * 0.09 + (greenSide(w) ? 0 : 2)) * (w.freeze > 0 ? 0 : 2);
  const c = paintContext(w, x, y, bob);
  ellipse(x + 7, y + 14, 25, 11, '#00000070');
  // Only the local player's appearance changes; other actors keep their original art.
  if (w !== me() || !drawWorkshopWizard(x, y)) drawBody(c);
  drawChargeTelegraph(c);
  drawShield(c);
  drawBurn(c);
  drawFrozen(c);
  drawWetIcon(c);
  drawHealthBar(c);
  drawHpText(c);
  drawFlurryRing(c);
  drawNameTag(c);
  drawAwayTag(c);
  drawSilenced(c);
  drawStatusBars(c);
}
