import { SPELL_COLOR } from '../../../../../shared/constants';
import type { Shot } from '../../../../../shared/types';
import { ctx } from '../../../dom';
import { ellipse } from '../../shapes';
import { drawEarth } from './earth';
import { drawFireball } from './fireball';
import { drawIce } from './ice';
import { drawMagma } from './magma';
import { drawMagnetic } from './magnetic';
import { drawPebbles } from './pebbles';
import { drawPlasma } from './plasma';
import { drawPyroDisc } from './pyroDisc';
import { drawShards } from './shards';
import { drawSteam } from './steam';
import { drawStorm } from './storm';

export function drawProjectile(
  shot: Pick<Shot, 'x' | 'y' | 'vx' | 'vy' | 'spell' | 'r' | 'life'> & Partial<Shot>,
) {
  const x = shot.x,
    y = shot.y - 20,
    color = SPELL_COLOR[shot.spell],
    ang = Math.atan2(shot.vy, shot.vx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  if (shot.variant === 'pyro_disc') drawPyroDisc(shot, ang);
  else if (shot.variant === 'pebbles') drawPebbles();
  else if (shot.variant === 'fireball') drawFireball(shot);
  else if (shot.variant === 'shards') drawShards();
  else if (shot.spell === 'MAGMA') drawMagma();
  else if (shot.spell === 'STEAM') drawSteam();
  else if (shot.spell === 'PLASMA') drawPlasma();
  else if (shot.spell === 'STORM') drawStorm();
  else if (shot.spell === 'ICE') drawIce();
  else if (shot.spell === 'MAGNETIC') drawMagnetic();
  else if (shot.spell === 'EARTH') drawEarth();
  else ellipse(0, 0, shot.r, shot.r, color);
  ctx.shadowBlur = 0;
  ctx.restore();
}
