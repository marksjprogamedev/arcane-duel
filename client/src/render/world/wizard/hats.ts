import { poly, ellipse } from '../../primitives';
import type { WizardPaint } from './context';

/** Distinct hats, not just recoloured versions of the same triangle. */
export function drawHat({ s, v, stroke, jewel }: WizardPaint) {
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
}
