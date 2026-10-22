import { TAU } from '../../../../../shared/math';
import { ctx } from '../../../dom';
import { game } from '../../../state';
import { ellipse, poly } from '../../shapes';
import type { WizardPaint } from './context';
import { drawEmberMage } from './emberMage';
import { drawHat } from './hats';
import { drawOffhand } from './offhand';
import { drawStaff, STAFF_TIP_X, STAFF_TIP_Y } from './staff';
import { drawSwingArc, drawSword, drawTeamRing } from './sword';

/**
 * The wizard's own art: robe, hat, staff, offhand or sword, then the swing arc and team ring.
 * Hand-drawn miniature character art: eight distinct silhouettes, all built
 * from the same inexpensive canvas primitives as the existing arena.
 */
export function drawBody(paint: WizardPaint) {
  const { wizard, x, y, bob } = paint;
  // Training dummies use the same wizard silhouette and animations as players.
  // Their targeting and damage behaviour remain unchanged.
  ctx.save();
  ctx.translate(x, y + bob);
  drawRobe(paint);
  drawHat(paint);
  drawStaff(paint);
  drawEmberMage(paint);
  drawTexture(paint);
  drawBloom(paint);
  if (wizard.swing <= 0) drawOffhand(paint);
  else drawSword(paint);
  ctx.restore();
  if (wizard.swing > 0) drawSwingArc(paint);
  drawTeamRing(paint);
}

function drawRobe({ style, styleIndex, stroke, jewel }: WizardPaint) {
  // Uneven robe hems, asymmetric folds and shoulder mantles give the tiny
  // sprites personality without enlarging their collision footprint.
  const hem = styleIndex === 2 || styleIndex === 7 ? 25 : styleIndex === 4 ? 23 : 21;
  poly(
    [
      [-13, -9],
      [12, -9],
      [19, 5],
      [hem, 19],
      [9, 16],
      [0, 22],
      [-10, 17],
      [-hem, 20],
      [-18, 3],
    ],
    style.robe,
  );
  poly(
    [
      [6, -9],
      [13, -8],
      [19, 5],
      [hem, 19],
      [9, 16],
      [4, 1],
    ],
    style.shadow,
  );
  poly(
    [
      [-13, -9],
      [-2, -13],
      [4, -7],
      [-3, 12],
      [-12, 17],
      [-hem, 20],
    ],
    style.light,
  );
  // Layered collar and clasp; the mantle changes between character classes.
  poly(
    [
      [-17, -11],
      [-4, -16],
      [1, -7],
      [-9, 0],
    ],
    styleIndex === 2 ? style.shadow : style.trim,
  );
  poly(
    [
      [2, -8],
      [12, -15],
      [18, -7],
      [8, 1],
    ],
    styleIndex === 6 ? style.shadow : style.trim,
  );
  stroke(style.trim, 2, [
    [-13, 12],
    [-4, 15],
    [5, 13],
    [15, 15],
  ]);
  stroke(style.shadow, 1.5, [
    [0, -6],
    [1, 13],
  ]);
  jewel(0, -6, 2.5);
  if (styleIndex === 0 || styleIndex === 3) {
    poly(
      [
        [-18, 7],
        [-25, 20],
        [-16, 17],
      ],
      style.shadow,
    );
    poly(
      [
        [17, 7],
        [24, 20],
        [15, 17],
      ],
      style.shadow,
    );
  } else if (styleIndex === 2 || styleIndex === 7) {
    poly(
      [
        [-17, 3],
        [-27, 17],
        [-17, 13],
      ],
      style.light,
    );
    poly(
      [
        [16, 3],
        [27, 17],
        [16, 13],
      ],
      style.light,
    );
  } else if (styleIndex === 4) {
    stroke(style.trim, 3, [
      [-13, 7],
      [0, 10],
      [14, 7],
    ]);
  }
  // Face in shadow beneath the brim: just enough expression at arena scale.
  ellipse(0, -15, 10, 10, '#d6ae88');
  ellipse(0, -17, 10, 6, style.shadow);
  ellipse(-4, -13, 1.5, 1.5, '#171b24');
  ellipse(4, -13, 1.5, 1.5, '#171b24');
}

function drawTexture({ style, stroke }: WizardPaint) {
  // Material pass: short, low-contrast strokes suggest woven fabric,
  // hat fibres, seams and natural wood grain at actual gameplay scale.
  // Everything is deterministic and stays attached to the actor transform.
  ctx.save();
  ctx.globalAlpha = 0.32;
  for (let i = 0; i < 9; i++) {
    const yy = -4 + i * 2.5;
    const xx = -11 + ((i * 7) % 22);
    stroke(i % 2 ? style.light : style.shadow, 0.8, [
      [xx, yy],
      [xx + 2, yy + 3],
    ]);
  }
  ctx.globalAlpha = 0.45;
  for (let i = 0; i < 7; i++) {
    const xx = -14 + i * 4;
    stroke(i % 2 ? style.trim : style.shadow, 0.8, [
      [xx, -19],
      [xx + 3, -20],
    ]);
  }
  // Grain follows the actual staff shaft, rather than floating over it.
  ctx.globalAlpha = 0.7;
  stroke('#e4b879', 0.9, [
    [-18, -10],
    [-23, -22],
    [-27, -31],
  ]);
  stroke('#4d3526', 1, [
    [-20, -13],
    [-24, -24],
    [-31, -38],
  ]);
  stroke('#e4b879', 0.8, [
    [-29, -34],
    [-32, -40],
  ]);
  ctx.restore();
}

function drawBloom({ style, styleIndex }: WizardPaint) {
  const tipX = STAFF_TIP_X,
    tipY = STAFF_TIP_Y;
  // Restrained layered bloom: a soft aura and tiny orbiting motes.
  // Unlike charge VFX, this is purely an idle material glow.
  ctx.save();
  const glow = 0.65 + 0.2 * Math.sin(game.t * 0.08 + styleIndex);
  ctx.globalAlpha = glow * 0.22;
  ctx.fillStyle = style.gem;
  ctx.shadowColor = style.gem;
  ctx.shadowBlur = 19;
  ctx.beginPath();
  ctx.arc(tipX, tipY, 13, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = glow * 0.65;
  ctx.shadowBlur = 9;
  for (let i = 0; i < 3; i++) {
    const angle = game.t * 0.027 + (i * TAU) / 3 + styleIndex;
    ellipse(tipX + Math.cos(angle) * 13, tipY + Math.sin(angle) * 11, 1.2, 1.2, style.gem);
  }
  ctx.restore();
}
