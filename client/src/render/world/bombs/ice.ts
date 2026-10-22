import { g } from '../../../dom';
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
    g.beginPath();
    iceOutline.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  };
  g.fillStyle = '#c9f4fa';
  traceIceOutline();
  g.fill();
  g.save();
  traceIceOutline();
  g.clip();
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
    g.fillStyle = facet.fill;
    g.beginPath();
    facet.points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
  }
  g.strokeStyle = '#70c5d4';
  g.lineWidth = 1.15;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(-13, -2);
  g.lineTo(-6, -11);
  g.lineTo(0, -6);
  g.lineTo(4, -5);
  g.lineTo(12, -3);
  g.moveTo(-12, 2);
  g.lineTo(-5, 1);
  g.lineTo(2, 7);
  g.lineTo(7, 12);
  g.moveTo(-5, 1);
  g.lineTo(2, -5);
  g.lineTo(10, 0);
  g.lineTo(13, 7);
  g.moveTo(-9, 10);
  g.lineTo(0, 9);
  g.lineTo(2, 7);
  g.stroke();
  g.restore(); // Clip applies only to crystalline interior, not fuse or frost.
  g.strokeStyle = '#78c9d7';
  g.lineWidth = 1.35;
  g.lineJoin = 'bevel';
  traceIceOutline();
  g.stroke();
  // Little gold fuse emerges from the snow-encrusted crown.
  g.fillStyle = '#b88724';
  g.fillRect(-2.4, -23, 5, 11);
  g.strokeStyle = '#f5cf61';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(-1, -22);
  g.lineTo(2, -19);
  g.moveTo(-1, -18);
  g.lineTo(2, -15);
  g.moveTo(-1, -14);
  g.lineTo(2, -12);
  g.stroke();
  g.fillStyle = '#ecfbff';
  g.beginPath();
  g.ellipse(0, -12, 7, 2.5, 0, 0, TAU);
  g.fill();
}
