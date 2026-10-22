import { ctx } from '../../../dom';
import { TAU } from '../../../../../shared/math';
export function drawIceBomb() {
  // Fractured snow-white ice sphere based on the supplied crystalline bomb drawing.
  // Uneven faceted perimeter, echoing the hand-drawn reference rather than a circle.
  const iceOutline: [number, number][] = [
    [-13, -8],
    [-8, -13],
    [-1, -15],
    [6, -13],
    [12, -9],
    [14, -2],
    [15, 5],
    [11, 12],
    [5, 15],
    [-3, 16],
    [-10, 12],
    [-15, 5],
    [-15, -2],
  ];
  const traceIceOutline = () => {
    ctx.beginPath();
    iceOutline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  ctx.fillStyle = '#c9f4fa';
  traceIceOutline();
  ctx.fill();
  ctx.save();
  traceIceOutline();
  ctx.clip();
  // Irregular polygon facets: icy whites above, turquoise shadows below.
  const facets: { points: number[][]; fill: string }[] = [
    {
      points: [
        [-13, -2],
        [-6, -11],
        [0, -6],
        [-5, 1],
      ],
      fill: '#edfefe',
    },
    {
      points: [
        [0, -13],
        [9, -10],
        [12, -3],
        [4, -5],
      ],
      fill: '#a0e0ea',
    },
    {
      points: [
        [-12, 2],
        [-5, 1],
        [0, 9],
        [-9, 10],
      ],
      fill: '#9ddae5',
    },
    {
      points: [
        [-5, 1],
        [2, -5],
        [10, 0],
        [2, 7],
      ],
      fill: '#e7fcff',
    },
    {
      points: [
        [2, 7],
        [10, 0],
        [13, 7],
        [7, 12],
      ],
      fill: '#5cbccd',
    },
    {
      points: [
        [-9, 10],
        [0, 9],
        [7, 12],
        [0, 15],
      ],
      fill: '#72c7d4',
    },
    {
      points: [
        [-5, -11],
        [0, -13],
        [4, -5],
        [-5, 1],
      ],
      fill: '#ffffff',
    },
  ];
  for (const facet of facets) {
    ctx.fillStyle = facet.fill;
    ctx.beginPath();
    facet.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = '#70c5d4';
  ctx.lineWidth = 1.15;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.lineTo(-6, -11);
  ctx.lineTo(0, -6);
  ctx.lineTo(4, -5);
  ctx.lineTo(12, -3);
  ctx.moveTo(-12, 2);
  ctx.lineTo(-5, 1);
  ctx.lineTo(2, 7);
  ctx.lineTo(7, 12);
  ctx.moveTo(-5, 1);
  ctx.lineTo(2, -5);
  ctx.lineTo(10, 0);
  ctx.lineTo(13, 7);
  ctx.moveTo(-9, 10);
  ctx.lineTo(0, 9);
  ctx.lineTo(2, 7);
  ctx.stroke();
  ctx.restore(); // Clip applies only to crystalline interior, not fuse or frost.
  ctx.strokeStyle = '#78c9d7';
  ctx.lineWidth = 1.35;
  ctx.lineJoin = 'bevel';
  traceIceOutline();
  ctx.stroke();
  // Little gold fuse emerges from the snow-encrusted crown.
  ctx.fillStyle = '#b88724';
  ctx.fillRect(-2.4, -23, 5, 11);
  ctx.strokeStyle = '#f5cf61';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-1, -22);
  ctx.lineTo(2, -19);
  ctx.moveTo(-1, -18);
  ctx.lineTo(2, -15);
  ctx.moveTo(-1, -14);
  ctx.lineTo(2, -12);
  ctx.stroke();
  ctx.fillStyle = '#ecfbff';
  ctx.beginPath();
  ctx.ellipse(0, -12, 7, 2.5, 0, 0, TAU);
  ctx.fill();
}
