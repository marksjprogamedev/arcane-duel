import { COL, names } from '../../../shared/constants';
import { CHARGE_TICKS, showChargeMeter } from '../../../shared/charge';
import { TAU, clamp, rand } from '../../../shared/math';
import { dummy } from '../../../shared/sim/wizard';
import type { Wizard } from '../../../shared/types';
import { g } from '../dom';
import { game, greenSide, me } from '../state';
import { bar, ellipse, poly } from './primitives';

export function actor(w: Wizard) {
  let x = w.x,
    y = w.y,
    bob = Math.sin(game.t * 0.09 + (greenSide(w) ? 0 : 2)) * (w.freeze > 0 ? 0 : 2),
    s = w.style;
  ellipse(x + 7, y + 14, 25, 11, '#00000070');
  // Render every wizard with the original Canvas illustration.
  {
    // Training dummies use the same wizard silhouette and animations as players.
    // Their targeting and damage behaviour remain unchanged.
    g.save();
    g.translate(x, y + bob);
    // Hand-drawn miniature character art: eight distinct silhouettes, all built
    // from the same inexpensive canvas primitives as the existing arena.
    const styleNames = [
      'Ember Mage',
      'Frost Scholar',
      'Grove Keeper',
      'Void Arcanist',
      'Royal Magister',
      'Dune Mystic',
      'Stormcaller',
      'Arcane Alchemist',
    ];
    const v = Math.max(0, styleNames.indexOf(s.name));
    const stroke = (color: string, width: number, points: number[][]) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      points.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.stroke();
    };
    const jewel = (px: number, py: number, radius: number, color = s.gem) => {
      g.save();
      g.shadowColor = color;
      g.shadowBlur = 8;
      ellipse(px, py, radius, radius * 1.12, color);
      g.restore();
      ellipse(
        px - radius * 0.3,
        py - radius * 0.4,
        Math.max(1, radius * 0.25),
        Math.max(1, radius * 0.3),
        '#ffffffcc',
      );
    };
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
    // Distinct hats, not just recoloured versions of the same triangle.
    if (v === 0) {
      // Ember: broad, low-brimmed adventurer's hat with a feather.
      poly(
        [
          [-23, -19],
          [-13, -37],
          [0, -47],
          [13, -37],
          [19, -19],
        ],
        s.hat,
      );
      poly(
        [
          [0, -47],
          [13, -37],
          [19, -19],
          [0, -23],
        ],
        s.shadow,
      );
      ellipse(0, -19, 30, 6, s.hat);
      stroke(s.trim, 3, [
        [-15, -23],
        [14, -23],
      ]);
      poly(
        [
          [15, -24],
          [26, -40],
          [22, -26],
        ],
        '#f5d58d',
      );
    } else if (v === 1) {
      // Frost: austere, tall, crystalline spire.
      poly(
        [
          [-18, -19],
          [-3, -57],
          [7, -48],
          [20, -19],
        ],
        s.hat,
      );
      poly(
        [
          [7, -48],
          [20, -19],
          [0, -22],
        ],
        s.shadow,
      );
      ellipse(0, -19, 23, 5, s.light);
      poly(
        [
          [-3, -57],
          [3, -42],
          [-5, -37],
        ],
        '#f0fbff',
      );
    } else if (v === 2) {
      // Grove: crooked, weathered witch's hat with leaves.
      poly(
        [
          [-20, -19],
          [-10, -39],
          [8, -48],
          [24, -43],
          [15, -34],
          [20, -19],
        ],
        s.hat,
      );
      poly(
        [
          [8, -48],
          [24, -43],
          [15, -34],
          [4, -27],
        ],
        s.shadow,
      );
      ellipse(0, -19, 27, 6, s.hat);
      poly(
        [
          [-22, -21],
          [-31, -34],
          [-16, -29],
        ],
        s.light,
      );
      poly(
        [
          [16, -27],
          [30, -35],
          [22, -19],
        ],
        s.light,
      );
    } else if (v === 3) {
      // Void: long curled silhouette and crescent ornament.
      poly(
        [
          [-20, -19],
          [-7, -42],
          [9, -50],
          [25, -45],
          [27, -53],
          [15, -55],
          [16, -39],
          [20, -19],
        ],
        s.hat,
      );
      poly(
        [
          [9, -50],
          [16, -39],
          [20, -19],
          [0, -23],
        ],
        s.shadow,
      );
      ellipse(0, -19, 27, 5, s.hat);
      stroke(s.trim, 2, [
        [-19, -22],
        [17, -22],
      ]);
      jewel(19, -47, 3);
    } else if (v === 4) {
      // Royal: ceremonial ivory mitre with gold seams.
      poly(
        [
          [-19, -19],
          [-4, -55],
          [5, -55],
          [19, -19],
        ],
        s.hat,
      );
      poly(
        [
          [5, -55],
          [19, -19],
          [0, -21],
        ],
        s.shadow,
      );
      ellipse(0, -19, 25, 5, s.light);
      stroke(s.trim, 2, [
        [0, -49],
        [0, -24],
      ]);
      jewel(0, -26, 3);
    } else if (v === 5) {
      // Dune: wrapped turban, low crown and trailing scarf.
      ellipse(0, -29, 19, 14, s.hat);
      ellipse(0, -21, 25, 7, s.light);
      stroke(s.trim, 3, [
        [-19, -28],
        [-7, -36],
        [11, -33],
        [19, -26],
      ]);
      poly(
        [
          [17, -24],
          [28, -16],
          [23, 0],
          [17, -8],
        ],
        s.shadow,
      );
      jewel(10, -27, 3);
    } else if (v === 6) {
      // Storm: angular brim with twin metal horns.
      poly(
        [
          [-20, -19],
          [-13, -39],
          [2, -47],
          [18, -35],
          [21, -19],
        ],
        s.hat,
      );
      poly(
        [
          [2, -47],
          [18, -35],
          [21, -19],
          [0, -23],
        ],
        s.shadow,
      );
      ellipse(0, -19, 25, 5, s.light);
      poly(
        [
          [-17, -31],
          [-27, -51],
          [-24, -29],
        ],
        '#b7c8d8',
      );
      poly(
        [
          [17, -31],
          [27, -51],
          [24, -29],
        ],
        '#b7c8d8',
      );
    } else {
      // Alchemist: flat-topped hood with mechanical lenses.
      poly(
        [
          [-18, -20],
          [-16, -45],
          [16, -45],
          [19, -20],
        ],
        s.hat,
      );
      poly(
        [
          [5, -45],
          [16, -45],
          [19, -20],
          [5, -22],
        ],
        s.shadow,
      );
      ellipse(0, -20, 24, 5, s.light);
      stroke(s.trim, 3, [
        [-16, -29],
        [16, -29],
      ]);
      jewel(-9, -31, 4, '#a3e635');
      jewel(9, -31, 4, '#a3e635');
    }
    // Staff is deliberately larger than before and the tip is an exact
    // anchor shared with the charge VFX below. All variants keep that anchor.
    const tipX = -35,
      tipY = -47;
    stroke('#261d1b', 8, [
      [-15, -3],
      [-25, -26],
      [tipX, tipY + 7],
    ]);
    stroke(v === 4 ? '#caa65c' : v === 6 ? '#677c98' : '#94704a', 5, [
      [-15, -3],
      [-25, -26],
      [tipX, tipY + 7],
    ]);
    stroke(s.trim, 2, [
      [-22, -20],
      [-27, -28],
    ]);
    if (v === 0) {
      // Flame prongs.
      poly(
        [
          [-44, -44],
          [-39, -60],
          [-35, -52],
          [-30, -62],
          [-25, -44],
        ],
        '#e87924',
      );
      jewel(tipX, tipY, 7, '#ffb23e');
    } else if (v === 1) {
      poly(
        [
          [tipX, -64],
          [-24, -48],
          [tipX, -35],
          [-46, -48],
        ],
        '#b9f0ff',
      );
      poly(
        [
          [tipX, -64],
          [-24, -48],
          [tipX, -48],
        ],
        '#f0fdff',
      );
    } else if (v === 2) {
      stroke('#547b42', 4, [
        [-35, -39],
        [-45, -51],
        [-46, -57],
      ]);
      stroke('#547b42', 4, [
        [-35, -39],
        [-25, -52],
      ]);
      poly(
        [
          [-45, -51],
          [-54, -56],
          [-50, -45],
        ],
        '#8dbd62',
      );
      jewel(tipX, tipY, 7, '#9cf9a1');
    } else if (v === 3) {
      g.strokeStyle = s.trim;
      g.lineWidth = 5;
      g.beginPath();
      g.arc(tipX, tipY, 11, 0.4, 5.3);
      g.stroke();
      jewel(tipX + 3, tipY - 2, 5);
    } else if (v === 4) {
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        stroke('#f0cb6c', 3, [
          [tipX + Math.cos(a) * 9, tipY + Math.sin(a) * 9],
          [tipX + Math.cos(a) * 15, tipY + Math.sin(a) * 15],
        ]);
      }
      jewel(tipX, tipY, 8, '#ffe69b');
    } else if (v === 5) {
      poly(
        [
          [-43, -57],
          [-29, -57],
          [-24, -46],
          [-35, -36],
          [-46, -46],
        ],
        '#b68c51',
      );
      jewel(tipX, tipY, 7, '#5be4ce');
    } else if (v === 6) {
      poly(
        [
          [tipX, -65],
          [-24, -46],
          [tipX, -35],
          [-46, -46],
        ],
        '#7dd3fc',
      );
      poly(
        [
          [tipX, -65],
          [-24, -46],
          [tipX, -46],
        ],
        '#d6f8ff',
      );
    } else {
      ellipse(tipX, tipY, 12, 12, '#a17b4a');
      stroke('#d3b177', 3, [
        [-45, -48],
        [-35, -59],
        [-25, -48],
        [-35, -37],
        [-45, -48],
      ]);
      jewel(tipX, tipY, 6);
    }
    // Painterly prototype — Ember Mage only. Layered warm highlights,
    // stitched embroidery and brushed edge lighting retain the chibi silhouette.
    if (v === 0) {
      g.save();
      g.globalAlpha = 0.78;
      stroke('#f5bf7a', 1.5, [
        [-16, -7],
        [-19, 3],
        [-23, 16],
      ]);
      stroke('#f8d8a1', 1.2, [
        [-9, -7],
        [-12, 2],
        [-14, 11],
      ]);
      stroke('#6b2535', 2, [
        [11, -5],
        [16, 7],
        [19, 15],
      ]);
      stroke('#f0a95e', 1.2, [
        [5, 3],
        [9, 10],
        [12, 14],
      ]);
      // Ornamental hem: asymmetric embroidered flame motifs.
      for (let i = 0; i < 4; i++) {
        const xx = -16 + i * 10;
        stroke('#e9ad64', 1.2, [
          [xx, 13],
          [xx + 2, 9],
          [xx + 4, 14],
        ]);
      }
      // Hat brim catches a narrow streak of sunset light.
      stroke('#f7c68b', 1.8, [
        [-22, -20],
        [-12, -22],
        [1, -22],
      ]);
      stroke('#543047', 1.8, [
        [5, -39],
        [10, -31],
        [12, -26],
      ]);
      // A glowing buckle and flecks of molten brass on the mantle.
      jewel(-9, -10, 2, '#f6bd63');
      jewel(10, -10, 2, '#f6bd63');
      g.globalAlpha = 0.25;
      g.fillStyle = '#ffb866';
      g.beginPath();
      g.ellipse(-10, -2, 9, 16, -0.25, 0, TAU);
      g.fill();
      g.restore();
    }
    // Illustrated Ember Mage: bold ink contours, translucent paint washes,
    // stitched gold filigree and a lit face. Keep the compact silhouette.
    if (v === 0) {
      g.save();
      g.lineJoin = 'round';
      g.lineCap = 'round';
      // Hand-inked irregular outer contour gives the robe illustrated weight.
      g.strokeStyle = '#2a1728';
      g.lineWidth = 2.8;
      g.beginPath();
      g.moveTo(-15, -9);
      g.lineTo(-19, 2);
      g.lineTo(-23, 20);
      g.lineTo(-10, 17);
      g.lineTo(0, 22);
      g.lineTo(9, 16);
      g.lineTo(21, 19);
      g.lineTo(17, 3);
      g.lineTo(12, -9);
      g.stroke();
      // Transparent glaze creates a warm reflected-firelight gradient.
      const robeLight = g.createLinearGradient(-22, -12, 21, 21);
      robeLight.addColorStop(0, '#ffc27c65');
      robeLight.addColorStop(0.42, '#ec774c28');
      robeLight.addColorStop(1, '#200f3300');
      g.fillStyle = robeLight;
      g.beginPath();
      g.moveTo(-15, -8);
      g.lineTo(-18, 6);
      g.lineTo(-21, 18);
      g.lineTo(-10, 16);
      g.lineTo(-1, 19);
      g.lineTo(2, -9);
      g.closePath();
      g.fill();
      // Sculpted folds with thin warm rims and dark ink valleys.
      stroke('#381b30', 2.3, [
        [-8, -3],
        [-6, 6],
        [-9, 17],
      ]);
      stroke('#f8c28a', 1.4, [
        [-13, -5],
        [-15, 5],
        [-18, 15],
      ]);
      stroke('#e78865', 1.5, [
        [7, -1],
        [10, 7],
        [15, 16],
      ]);
      stroke('#321b2e', 2, [
        [12, 0],
        [16, 10],
        [18, 17],
      ]);
      // Ornate shoulder mantle, with contrasting seams.
      stroke('#f5d39a', 2, [
        [-16, -10],
        [-10, -14],
        [-3, -11],
      ]);
      stroke('#f5d39a', 2, [
        [4, -11],
        [12, -14],
        [17, -9],
      ]);
      for (let i = 0; i < 5; i++) {
        const px = -15 + i * 8;
        stroke('#f2c16c', 1, [
          [px, 13],
          [px + 2, 10],
          [px + 4, 14],
        ]);
      }
      // A little painted light catches the cheeks and brim.
      ellipse(-5, -13, 3.2, 1.4, '#ffe0b766');
      stroke('#f8d2a0', 1.8, [
        [-21, -20],
        [-11, -23],
        [2, -23],
      ]);
      stroke('#2a1728', 2.2, [
        [-23, -19],
        [-13, -37],
        [0, -47],
        [13, -37],
        [19, -19],
      ]);
      // Glowing staff jewel casts a warm halo on nearby clothing.
      const halo = g.createRadialGradient(-27, -34, 0, -27, -34, 31);
      halo.addColorStop(0, '#ffb95b48');
      halo.addColorStop(1, '#ffb95b00');
      g.fillStyle = halo;
      g.fillRect(-60, -65, 65, 65);
      g.restore();
    }
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

    // A signature offhand accessory for each wizard. During the sword
    // ability the original sword returns, so its swing and hit cues remain.
    if (w.swing <= 0) {
      g.save();
      g.translate(16, -8);
      g.rotate(0.12 + Math.sin(game.t * 0.055 + v) * 0.055);
      if (v === 0) {
        // ember lantern
        stroke('#d9a356', 2, [
          [0, -2],
          [0, -19],
        ]);
        g.fillStyle = '#533222';
        g.fillRect(-7, -21, 14, 16);
        jewel(0, -14, 5, '#ff9a32');
        stroke('#e7c77a', 2, [
          [-7, -21],
          [0, -27],
          [7, -21],
        ]);
      } else if (v === 1) {
        // frost prism
        poly(
          [
            [0, -30],
            [9, -17],
            [0, -4],
            [-9, -17],
          ],
          '#6dd6ff',
        );
        poly(
          [
            [0, -30],
            [0, -4],
            [-9, -17],
          ],
          '#d7f7ff',
        );
        stroke('#ffffffaa', 1, [
          [0, -30],
          [9, -17],
          [0, -4],
        ]);
      } else if (v === 2) {
        // leafy familiar / charm
        ellipse(0, -16, 9, 10, '#426a39');
        ellipse(-4, -19, 2, 2, '#baff8c');
        ellipse(4, -19, 2, 2, '#baff8c');
        poly(
          [
            [-8, -25],
            [-15, -31],
            [-13, -20],
          ],
          '#7db55e',
        );
        poly(
          [
            [8, -25],
            [15, -31],
            [13, -20],
          ],
          '#7db55e',
        );
      } else if (v === 3) {
        // floating void orb
        jewel(0, -18, 10, '#a855f7');
        stroke('#e9c4ff', 1.4, [
          [-11, -18],
          [0, -29],
          [11, -18],
          [0, -7],
          [-11, -18],
        ]);
      } else if (v === 4) {
        // gold-bound tome
        poly(
          [
            [-12, -27],
            [0, -24],
            [0, -5],
            [-12, -9],
          ],
          '#f5e4ae',
        );
        poly(
          [
            [0, -24],
            [12, -27],
            [12, -9],
            [0, -5],
          ],
          '#fff6d7',
        );
        stroke('#c69d44', 2, [
          [0, -24],
          [0, -5],
        ]);
        jewel(6, -17, 2, '#eab94b');
      } else if (v === 5) {
        // brass astrolabe
        g.strokeStyle = '#dfba70';
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(0, -17, 11, 14, 0.4, 0, TAU);
        g.stroke();
        g.beginPath();
        g.ellipse(0, -17, 11, 5, -0.4, 0, TAU);
        g.stroke();
        jewel(0, -17, 4, '#65ead3');
      } else if (v === 6) {
        // charged storm globe
        jewel(0, -18, 9, '#60a5fa');
        stroke('#e8f7ff', 2, [
          [-7, -20],
          [-1, -16],
          [-4, -12],
          [7, -22],
        ]);
      } else {
        // runic alchemical tablet
        poly(
          [
            [-10, -29],
            [10, -29],
            [12, -8],
            [-12, -8],
          ],
          '#6b5b42',
        );
        poly(
          [
            [-7, -26],
            [7, -26],
            [8, -11],
            [-8, -11],
          ],
          '#a78b57',
        );
        jewel(0, -19, 4, '#a3e635');
      }
      g.restore();
    }
    // Existing sword and its swing transform are retained.
    if (w.swing > 0) {
      g.save();
      g.translate(15, -10);
      g.rotate(-1.25 + Math.sin(((22 - w.swing) / 22) * Math.PI) * 2.3);
      g.fillStyle = '#5b422c';
      g.fillRect(-3, -2, 6, 13);
      g.fillStyle = '#e2e8f0';
      g.fillRect(-5, -5, 10, 4);
      poly(
        [
          [-3, -5],
          [3, -5],
          [2, -36],
          [0, -44],
          [-2, -36],
        ],
        '#e2e8f0',
      );
      g.restore();
    }
    g.restore();
    if (w.swing > 0) {
      g.strokeStyle = '#e2e8f0dd';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(x, y - 14, 57, w.face - 0.9, w.face + 0.9);
      g.stroke();
    }
    g.strokeStyle = greenSide(w) ? '#4ade80' : '#fb7185';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(x, y + 8, 23, 11, 0, 0, TAU);
    g.stroke();
  }
  if (showChargeMeter(w.chargeTicks, w.chargeSpell)) {
    // Arcane charge ring and a growing elemental orb: one visual telegraph
    // shared by both wizards via the authoritative charge state.
    const color = COL[w.chargeSpell!];
    const earthCharge = w.chargeSpell === 'EARTH';
    const moss = '#465f3b';
    const stone = '#765838';
    const progress = clamp(w.chargeTicks / CHARGE_TICKS, 0, 1);
    const t = game.t * 0.055;
    const cx = x,
      cy = y - 18;
    const orbX = x - 35,
      orbY = y + bob - 47;
    const orbRadius = 5 + progress * 10;
    g.save();

    // Rotating rune circle with a progress sweep.
    g.lineCap = 'round';
    g.strokeStyle = earthCharge ? moss : color;
    g.globalAlpha = 0.23 + progress * 0.2;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, cy, 43, 0, TAU);
    g.stroke();
    g.globalAlpha = 0.95;
    g.shadowColor = earthCharge ? moss : color;
    g.strokeStyle = earthCharge ? stone : color;
    g.shadowBlur = 9 + progress * 14;
    g.lineWidth = 3.5;
    g.beginPath();
    g.arc(cx, cy, 43, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
    g.stroke();
    g.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const angle = t + (i * TAU) / 7;
      const rx = cx + Math.cos(angle) * 48;
      const ry = cy + Math.sin(angle) * 48;
      if (earthCharge) g.strokeStyle = i % 2 ? moss : stone;
      g.beginPath();
      g.moveTo(rx - Math.cos(angle) * 4, ry - Math.sin(angle) * 4);
      g.lineTo(rx + Math.cos(angle) * 4, ry + Math.sin(angle) * 4);
      g.stroke();
    }

    // Energy converges toward the casting hand. Deterministic motion avoids
    // allocating persistent particles or affecting the combat simulation.
    for (let i = 0; i < 5 + Math.floor(progress * 7); i++) {
      const angle = i * 2.39996 + t * (0.6 + progress);
      const distance = 13 + ((i * 17 + game.t * 1.2) % 28);
      const px = orbX + Math.cos(angle) * distance;
      const py = orbY + Math.sin(angle) * distance * 0.65;
      g.globalAlpha = 0.35 + progress * 0.5;
      g.fillStyle = w.chargeSpell === 'EARTH' ? (i % 2 ? '#465f3b' : '#765838') : color;
      g.beginPath();
      g.arc(px, py, 1.1 + progress * 1.1, 0, TAU);
      g.fill();
    }

    // Elemental energy orb, brighter and larger toward maximum charge.
    g.globalAlpha = 0.5;
    g.fillStyle = earthCharge ? moss : color;
    g.beginPath();
    g.arc(orbX, orbY, orbRadius + 4, 0, TAU);
    g.fill();
    g.globalAlpha = 1;
    g.fillStyle = earthCharge ? stone : color;
    g.beginPath();
    g.arc(orbX, orbY, orbRadius, 0, TAU);
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#ffffff';
    g.globalAlpha = 0.55 + progress * 0.4;
    g.beginPath();
    g.arc(orbX - orbRadius * 0.22, orbY - orbRadius * 0.25, Math.max(2, orbRadius * 0.42), 0, TAU);
    g.fill();

    // A small spell label remains readable without a boxed HUD element.
    g.globalAlpha = 1;
    g.textAlign = 'center';
    g.font = 'bold 10px monospace';
    g.fillStyle = color;
    g.shadowColor = '#081018';
    g.shadowBlur = 5;
    g.fillText(w.chargeSpell!, x, y - 74);
    g.restore();
  }
  if (w.shield) {
    let c = w.shield.type === 4 ? '#4ade80' : COL[names[w.shield.type]];
    g.strokeStyle = c;
    g.lineWidth = 5;
    g.shadowColor = c;
    g.shadowBlur = 24;
    g.beginPath();
    g.ellipse(x, y - 14, 35, 47, 0, 0, TAU);
    g.stroke();
    g.shadowBlur = 0;
  }
  if (w.burn >= 25) {
    let count = Math.ceil(w.burn / 20);
    g.save();
    g.globalAlpha = 0.55 + w.burn / 250;
    for (let i = 0; i < count; i++) {
      let a = (i * TAU) / count + game.t * 0.025,
        r = 14 + Math.sin(game.t * 0.13 + i) * 5,
        fx = x + Math.cos(a) * r,
        fy = y - 23 + Math.sin(a) * 10;
      poly(
        [
          [fx - 7, fy + 10],
          [fx, fy - 13 - w.burn * 0.11 - Math.sin(game.t * 0.2 + i) * 6],
          [fx + 7, fy + 10],
        ],
        i % 2 ? '#f97316' : '#facc15',
      );
    }
    g.restore();
    if (Math.random() < 0.12 + w.burn / 400)
      game.particles.push({
        x: x + rand(-18, 18),
        y: y - 40,
        vx: rand(-1, 1),
        vy: rand(-2.5, -1),
        c: Math.random() < 0.5 ? '#f97316' : '#fde047',
        life: rand(10, 20),
        r: rand(2, 4),
      });
  }
  // Only fully frozen wizards are encased. Partial chill remains a status bar.
  if (w.freeze > 0 && w.chill >= 100) {
    g.save();
    g.translate(x, y);
    // Jagged translucent shell, shaped like a chunk of ice rather than a box.
    g.beginPath();
    const shell: [number, number][] = [
      [-25, 16],
      [-29, -2],
      [-24, -23],
      [-28, -40],
      [-12, -55],
      [0, -63],
      [14, -55],
      [26, -36],
      [23, -18],
      [29, 2],
      [22, 19],
      [0, 23],
    ];
    shell.forEach(([sx, sy], i) => (i ? g.lineTo(sx, sy) : g.moveTo(sx, sy)));
    g.closePath();
    g.fillStyle = '#8bdcff55';
    g.fill();
    g.strokeStyle = '#d8f8ffdd';
    g.lineWidth = 2;
    g.stroke();
    // Ice facets, highlights and a solid frosty base. The wizard remains visible.
    poly(
      [
        [-25, -40],
        [-12, -55],
        [-5, -20],
        [-22, 10],
      ],
      '#d9f8ff66',
    );
    poly(
      [
        [0, -63],
        [14, -55],
        [23, -18],
        [7, -32],
      ],
      '#b5efff77',
    );
    poly(
      [
        [-22, 10],
        [-5, -20],
        [7, 18],
        [0, 23],
      ],
      '#b6eaff88',
    );
    g.strokeStyle = '#ffffffaa';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-12, -55);
    g.lineTo(-5, -20);
    g.lineTo(-17, 5);
    g.moveTo(14, -55);
    g.lineTo(7, -32);
    g.lineTo(21, 1);
    g.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i * TAU) / 5 + 0.3;
      const sx = Math.cos(a) * 25,
        sy = 10 + Math.sin(a) * 7;
      poly(
        [
          [sx - 6, sy + 5],
          [sx, sy - 9],
          [sx + 7, sy + 4],
        ],
        i % 2 ? '#b9efff' : '#e0f9ff',
      );
    }
    g.restore();

    // Frost countdown beside the encased wizard (simulation runs at 60 ticks/s).
    // The ring shrinks with the authoritative freeze timer in multiplayer too.
    const progress = clamp(w.freeze / (w.freezeMax || w.freeze), 0, 1);
    const cx = x + 43,
      cy = y - 28;
    g.save();
    g.fillStyle = '#112e42dd';
    g.strokeStyle = '#a5f3fc';
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(cx, cy, 17, 0, TAU);
    g.fill();
    g.stroke();
    g.strokeStyle = '#67e8f9';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
    g.stroke();
    // Snowflake motif behind the timer.
    g.strokeStyle = '#b7f2ff77';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cx - 8, cy);
    g.lineTo(cx + 8, cy);
    g.moveTo(cx, cy - 8);
    g.lineTo(cx, cy + 8);
    g.stroke();
    g.font = 'bold 10px monospace';
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';
    g.shadowColor = '#123447';
    g.shadowBlur = 3;
    g.fillText((w.freeze / 60).toFixed(1) + 's', cx, cy + 3.5);
    g.restore();
  }
  if (w.wet > 0) {
    g.font = '17px sans-serif';
    g.fillText('💧', x + 8, y - 66);
  }
  g.fillStyle = '#132018';
  g.fillRect(x - 37, y - 79, 74, 7);
  g.fillStyle = greenSide(w) ? '#4ade80' : dummy(game, w) ? '#fbbf24' : '#fb7185';
  g.fillRect(x - 37, y - 79, 74 * clamp(w.hp / w.max, 0, 1), 7);
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
  if (w.flurryTime > 0) {
    // Pebble Flurry: a ring just under the health bar that empties over its 1.5 seconds.
    const left = clamp(w.flurryTime / 90, 0, 1);
    g.save();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    g.beginPath();
    g.arc(x, y - 63, 8, 0, TAU);
    g.stroke();
    g.strokeStyle = COL.EARTH;
    g.beginPath();
    g.arc(x, y - 63, 8, -Math.PI / 2, -Math.PI / 2 + TAU * left);
    g.stroke();
    g.restore();
  }
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
  if (w.silence > 0) {
    g.fillStyle = COL.PLASMA;
    g.fillText('SILENCED', x, y - 120);
  }
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
