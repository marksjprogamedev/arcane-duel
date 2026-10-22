import { ctx } from '../../../dom';
import { TAU } from '../../../../../shared/math';
import { game } from '../../../state';
export function drawEarthBomb() {
  // Four distinctly separated charcoal boulders held together by liquid green energy.
  // Follow the lava-rock reference's negative spaces, not painted-on surface cracks.
  ctx.save();
  ctx.lineJoin = 'round';
  const glowPulse = 0.92 + 0.08 * Math.sin(game.t * 0.085);
  // Opaque, sticky emerald magma is the physical bond between the stones.
  // Dark viscous banks, a broad mid-green body and concentrated molten streaks
  // keep it looking like a substance, not transparent backlighting.
  const molten = ctx.createRadialGradient(-3, -4, 1, 0, 0, 21);
  molten.addColorStop(0, '#b2f36c');
  molten.addColorStop(0.32, '#5ebf42');
  molten.addColorStop(0.64, '#277b39');
  molten.addColorStop(1, '#103f2c');
  ctx.save();
  ctx.globalAlpha = glowPulse;
  ctx.fillStyle = molten;
  ctx.strokeStyle = '#153b29';
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  // Rounded outline, with a slightly uneven circular perimeter.
  ctx.moveTo(-17, -8);
  ctx.lineTo(-13, -15);
  ctx.lineTo(-6, -19);
  ctx.lineTo(3, -20);
  ctx.lineTo(11, -17);
  ctx.lineTo(17, -11);
  ctx.lineTo(20, -4);
  ctx.lineTo(19, 5);
  ctx.lineTo(15, 13);
  ctx.lineTo(8, 18);
  ctx.lineTo(-1, 20);
  ctx.lineTo(-10, 17);
  ctx.lineTo(-17, 11);
  ctx.lineTo(-20, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Short submerged ribbons follow the river-like branches; their softly
  // rounded shapes imply folds and movement in thick, hot molten material.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const streams: [number, number][][] = [
    [
      [1, -17],
      [-1, -11],
      [1, -7],
      [0, -3],
      [2, 1],
      [0, 6],
      [-2, 12],
    ],
    [
      [-13, 1],
      [-8, 2],
      [-5, 5],
      [-2, 8],
      [2, 12],
      [7, 16],
    ],
    [
      [14, -4],
      [10, 0],
      [6, 2],
      [3, 5],
      [0, 8],
    ],
  ];
  for (let i = 0; i < streams.length; i++) {
    const pts = streams[i];
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
    ctx.strokeStyle = '#164b2d';
    ctx.lineWidth = 4.1;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.strokeStyle = i === 0 ? '#94df56' : '#64bb4c';
    ctx.lineWidth = 1.7;
    ctx.globalAlpha = 0.65 + 0.15 * glowPulse;
    ctx.stroke();
  }
  ctx.restore();
  // The rock edges interlock like riverbanks. Their narrow, winding gaps form
  // one connected, branching green river system rather than an open central pool.
  const rock = (points: [number, number][], fill: string) => {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = '#202830';
    ctx.lineWidth = 1.3;
    ctx.fill();
    ctx.stroke();
  };
  // Northwest boulder: stepped inward edge makes the upper channel serpentine.
  rock(
    [
      [-18, -5],
      [-16, -12],
      [-10, -17],
      [-3, -19],
      [2, -16],
      [1, -12],
      [-3, -9],
      [-1, -5],
      [-4, -2],
      [-2, 1],
      [-7, 3],
      [-11, 0],
      [-16, -1],
    ],
    '#41444b',
  );
  rock(
    [
      [-15, -12],
      [-10, -17],
      [-4, -17],
      [-8, -12],
      [-12, -9],
    ],
    '#71757e',
  );
  rock(
    [
      [-15, -5],
      [-11, -9],
      [-7, -7],
      [-9, -4],
    ],
    '#5d6169',
  );
  // Northeast crown stone, separated from northwest by a winding fissure.
  rock(
    [
      [5, -18],
      [12, -16],
      [17, -11],
      [19, -5],
      [15, -3],
      [12, 1],
      [7, 2],
      [4, -1],
      [2, -6],
      [3, -13],
    ],
    '#41414a',
  );
  rock(
    [
      [8, -16],
      [12, -16],
      [17, -11],
      [12, -12],
    ],
    '#70717a',
  );
  // Southeast boulder: irregular inward ledge redirects the lower green fork.
  rock(
    [
      [13, 3],
      [18, 0],
      [19, 7],
      [16, 14],
      [9, 18],
      [3, 15],
      [1, 12],
      [4, 9],
      [2, 6],
      [6, 3],
      [10, 6],
    ],
    '#373a43',
  );
  rock(
    [
      [17, 4],
      [19, 9],
      [15, 14],
      [12, 15],
      [14, 9],
    ],
    '#575c67',
  );
  // Southwest base stone forms a staggered opposing bank, without closing the channel.
  rock(
    [
      [-18, 4],
      [-12, 2],
      [-9, 4],
      [-6, 3],
      [-4, 6],
      [-1, 5],
      [1, 8],
      [-2, 11],
      [2, 14],
      [3, 18],
      [-5, 18],
      [-13, 14],
      [-18, 9],
    ],
    '#373940',
  );
  rock(
    [
      [-15, 7],
      [-11, 5],
      [-8, 8],
      [-11, 12],
      [-15, 11],
    ],
    '#656872',
  );
  // No central stone: the four irregular banks nearly meet, but the flowing
  // emerald channels remain connected through the middle.
  // Small moss patches remain confined to the outer faces.
  const moss: [number, number, number, number, string][] = [
    [-13, -13, 2, 0.7, '#4c6940'],
    [-11, -12, 1, 0.55, '#788b51'],
    [13, -12, 1.9, 0.7, '#4d6944'],
    [-13, 12, 2.1, 0.7, '#4b643c'],
    [15, 12, 1.8, 0.65, '#5a7444'],
  ];
  for (const [x, y, rx, ry, c] of moss) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
