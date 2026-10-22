import { TAU } from '../../../../../shared/math';
import { g } from '../../../dom';
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
export function drawBody(c: WizardPaint) {
  const { w, x, y, bob } = c;
  // Training dummies use the same wizard silhouette and animations as players.
  // Their targeting and damage behaviour remain unchanged.
  g.save();
  g.translate(x, y + bob);
  drawRobe(c);
  drawHat(c);
  drawStaff(c);
  drawEmberMage(c);
  drawTexture(c);
  drawBloom(c);
  if (w.swing <= 0) drawOffhand(c);
  else drawSword(c);
  g.restore();
  if (w.swing > 0) drawSwingArc(c);
  drawTeamRing(c);
}

function drawRobe({ s, v, stroke, jewel }: WizardPaint) {
  // Uneven robe hems, asymmetric folds and shoulder mantles give the tiny
  // sprites personality without enlarging their collision footprint.
  const hem = v === 2 || v === 7 ? 25 : v === 4 ? 23 : 21;
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
    s.robe,
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
    s.shadow,
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
    s.light,
  );
  // Layered collar and clasp; the mantle changes between character classes.
  poly(
    [
      [-17, -11],
      [-4, -16],
      [1, -7],
      [-9, 0],
    ],
    v === 2 ? s.shadow : s.trim,
  );
  poly(
    [
      [2, -8],
      [12, -15],
      [18, -7],
      [8, 1],
    ],
    v === 6 ? s.shadow : s.trim,
  );
  stroke(s.trim, 2, [
    [-13, 12],
    [-4, 15],
    [5, 13],
    [15, 15],
  ]);
  stroke(s.shadow, 1.5, [
    [0, -6],
    [1, 13],
  ]);
  jewel(0, -6, 2.5);
  if (v === 0 || v === 3) {
    poly(
      [
        [-18, 7],
        [-25, 20],
        [-16, 17],
      ],
      s.shadow,
    );
    poly(
      [
        [17, 7],
        [24, 20],
        [15, 17],
      ],
      s.shadow,
    );
  } else if (v === 2 || v === 7) {
    poly(
      [
        [-17, 3],
        [-27, 17],
        [-17, 13],
      ],
      s.light,
    );
    poly(
      [
        [16, 3],
        [27, 17],
        [16, 13],
      ],
      s.light,
    );
  } else if (v === 4) {
    stroke(s.trim, 3, [
      [-13, 7],
      [0, 10],
      [14, 7],
    ]);
  }
  // Face in shadow beneath the brim: just enough expression at arena scale.
  ellipse(0, -15, 10, 10, '#d6ae88');
  ellipse(0, -17, 10, 6, s.shadow);
  ellipse(-4, -13, 1.5, 1.5, '#171b24');
  ellipse(4, -13, 1.5, 1.5, '#171b24');
}

function drawTexture({ s, stroke }: WizardPaint) {
  // Material pass: short, low-contrast strokes suggest woven fabric,
  // hat fibres, seams and natural wood grain at actual gameplay scale.
  // Everything is deterministic and stays attached to the actor transform.
  g.save();
  g.globalAlpha = 0.32;
  for (let i = 0; i < 9; i++) {
    const yy = -4 + i * 2.5;
    const xx = -11 + ((i * 7) % 22);
    stroke(i % 2 ? s.light : s.shadow, 0.8, [
      [xx, yy],
      [xx + 2, yy + 3],
    ]);
  }
  g.globalAlpha = 0.45;
  for (let i = 0; i < 7; i++) {
    const xx = -14 + i * 4;
    stroke(i % 2 ? s.trim : s.shadow, 0.8, [
      [xx, -19],
      [xx + 3, -20],
    ]);
  }
  // Grain follows the actual staff shaft, rather than floating over it.
  g.globalAlpha = 0.7;
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
  g.restore();
}

function drawBloom({ s, v }: WizardPaint) {
  const tipX = STAFF_TIP_X,
    tipY = STAFF_TIP_Y;
  // Restrained layered bloom: a soft aura and tiny orbiting motes.
  // Unlike charge VFX, this is purely an idle material glow.
  g.save();
  const glow = 0.65 + 0.2 * Math.sin(game.t * 0.08 + v);
  g.globalAlpha = glow * 0.22;
  g.fillStyle = s.gem;
  g.shadowColor = s.gem;
  g.shadowBlur = 19;
  g.beginPath();
  g.arc(tipX, tipY, 13, 0, TAU);
  g.fill();
  g.globalAlpha = glow * 0.65;
  g.shadowBlur = 9;
  for (let i = 0; i < 3; i++) {
    const a = game.t * 0.027 + (i * TAU) / 3 + v;
    ellipse(tipX + Math.cos(a) * 13, tipY + Math.sin(a) * 11, 1.2, 1.2, s.gem);
  }
  g.restore();
}
