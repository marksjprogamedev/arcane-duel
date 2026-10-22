import { COL } from '../../../../../shared/constants';
import type { Shot } from '../../../../../shared/types';
import { g } from '../../../dom';
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
  s: Pick<Shot, 'x' | 'y' | 'vx' | 'vy' | 'k' | 'r' | 'life'> & Partial<Shot>,
) {
  const x = s.x,
    y = s.y - 20,
    c = COL[s.k],
    ang = Math.atan2(s.vy, s.vx);
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.shadowColor = c;
  g.shadowBlur = 20;
  if (s.variant === 'pyro_disc') drawPyroDisc(s, ang);
  else if (s.variant === 'pebbles') drawPebbles();
  else if (s.variant === 'fireball') drawFireball(s);
  else if (s.variant === 'shards') drawShards();
  else if (s.k === 'MAGMA') drawMagma();
  else if (s.k === 'STEAM') drawSteam();
  else if (s.k === 'PLASMA') drawPlasma();
  else if (s.k === 'STORM') drawStorm();
  else if (s.k === 'ICE') drawIce();
  else if (s.k === 'MAGNETIC') drawMagnetic();
  else if (s.k === 'EARTH') drawEarth();
  else ellipse(0, 0, s.r, s.r, c);
  g.shadowBlur = 0;
  g.restore();
}
