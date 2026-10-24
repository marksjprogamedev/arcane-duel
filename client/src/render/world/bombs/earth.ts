import { ctx } from '../../../dom';
import { TAU } from '../../../../../shared/math';

const outline: [number, number][] = [
  [-12, -7],
  [-10, -12],
  [-4, -15],
  [3, -14],
  [10, -10],
  [14, -4],
  [14, 4],
  [10, 11],
  [4, 14],
  [-4, 14],
  [-11, 10],
  [-15, 3],
  [-15, -3],
];

function trace(points: [number, number][]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

export function drawEarthBomb() {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Compact irregular stone body, sized and outlined like the other bomb sprites.
  trace(outline);
  ctx.fillStyle = '#393d43';
  ctx.strokeStyle = '#202830';
  ctx.lineWidth = 1.6;
  ctx.fill();
  ctx.stroke();

  ctx.save();
  trace(outline);
  ctx.clip();

  // A few broad, simple facets keep the rock readable at arena scale.
  trace([
    [-12, -5],
    [-9, -11],
    [-3, -13],
    [1, -9],
    [-2, -4],
    [-7, -2],
  ]);
  ctx.fillStyle = '#666b72';
  ctx.fill();
  trace([
    [-8, -8],
    [-3, -13],
    [2, -12],
    [-1, -8],
    [-5, -6],
  ]);
  ctx.fillStyle = '#858991';
  ctx.fill();
  trace([
    [2, -10],
    [9, -8],
    [12, -3],
    [6, -2],
    [2, -5],
  ]);
  ctx.fillStyle = '#4e535b';
  ctx.fill();
  trace([
    [-11, 2],
    [-5, 0],
    [-1, 4],
    [-4, 10],
    [-9, 8],
  ]);
  ctx.fillStyle = '#4b5057';
  ctx.fill();
  trace([
    [4, 2],
    [11, 0],
    [12, 5],
    [8, 10],
    [2, 8],
    [0, 5],
  ]);
  ctx.fillStyle = '#30343a';
  ctx.fill();
  trace([
    [-3, 9],
    [1, 7],
    [6, 10],
    [3, 13],
    [-2, 13],
  ]);
  ctx.fillStyle = '#555a62';
  ctx.fill();

  // Dark green channels with a narrow lime centre suggest magma in the cracks.
  const cracks: [number, number][][] = [
    [
      [-1, -14],
      [-2, -9],
      [1, -5],
      [-2, -1],
      [0, 4],
      [-1, 9],
      [2, 14],
    ],
    [
      [-14, -1],
      [-9, 0],
      [-5, 3],
      [-2, 6],
      [2, 8],
    ],
    [
      [13, -3],
      [9, -1],
      [6, 2],
      [2, 4],
    ],
  ];
  for (const crack of cracks) {
    ctx.beginPath();
    crack.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = '#173d29';
    ctx.lineWidth = 4.2;
    ctx.stroke();
    ctx.strokeStyle = '#287a3e';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = '#8acb4a';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.restore();

  trace(outline);
  ctx.strokeStyle = '#202830';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Small surface glint, matching the restrained highlights on other bombs.
  ctx.fillStyle = '#a4a7ad';
  ctx.beginPath();
  ctx.ellipse(-7, -9, 2.3, 1.1, -0.45, 0, TAU);
  ctx.fill();
  ctx.restore();
}
