import { ctx } from '../../../dom';
import { game } from '../../../state';
import { ellipse, poly } from '../../shapes';

export function drawMagma() {
  ctx.rotate(game.t * 0.045);
  ctx.shadowColor = '#ff4500';
  ctx.shadowBlur = 34;
  ellipse(0, 0, 25, 25, '#ff6b12');
  ellipse(0, 0, 20, 20, '#ffcf45');
  poly(
    [
      [-23, -8],
      [-13, -23],
      [5, -26],
      [18, -14],
      [12, -5],
      [-12, 0],
    ],
    '#292524',
  );
  poly(
    [
      [15, -15],
      [25, -3],
      [20, 14],
      [6, 22],
      [-1, 11],
      [9, 5],
    ],
    '#3f3029',
  );
  poly(
    [
      [-18, 5],
      [-5, 15],
      [8, 20],
      [-9, 26],
      [-25, 14],
    ],
    '#292524',
  );
  ctx.strokeStyle = '#ffec8b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-11, -10);
  ctx.lineTo(-3, -2);
  ctx.lineTo(7, -7);
  ctx.lineTo(14, 1);
  ctx.stroke();
  ellipse(-5, -4, 4, 4, '#fff5b0');
}
