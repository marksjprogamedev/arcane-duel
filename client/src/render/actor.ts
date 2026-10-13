import { COL, names } from '../../../shared/constants';
import { TAU, clamp, rand } from '../../../shared/math';
import { g } from '../dom';
import { dummy } from '../sim/wizard';
import { game } from '../state';
import { bar, ellipse, poly } from './primitives';

export function actor(w) {
  let x = w.x,
    y = w.y,
    bob = Math.sin(game.t * 0.09 + (w === game.p ? 0 : 2)) * (w.freeze > 0 ? 0 : 2),
    s = w.style;
  ellipse(x + 7, y + 14, 25, 11, '#00000070');
  if (dummy(w)) {
    ellipse(x + 6, y + 17, 29, 11, '#473b27');
    poly(
      [
        [x - 14, y + 16],
        [x + 14, y + 16],
        [x + 18, y + 4],
        [x - 18, y + 4],
      ],
      '#8b7952',
    );
    g.fillStyle = '#76502b';
    g.fillRect(x - 7, y - 41, 14, 49);
    g.fillRect(x - 31, y - 27, 62, 11);
    ellipse(x, y - 44, 17, 18, '#a97943');
    ellipse(x, y - 44, 12, 12, '#f1d0a0');
    ellipse(x, y - 44, 8, 8, '#b45309');
    ellipse(x, y - 44, 4, 4, '#fef3c7');
  } else {
    g.save();
    g.translate(x, y + bob);
    poly(
      [
        [-15, -6],
        [15, -6],
        [21, 20],
        [-21, 20],
      ],
      s.robe,
    );
    poly(
      [
        [15, -6],
        [21, 20],
        [8, 16],
        [4, -8],
      ],
      s.shadow,
    );
    poly(
      [
        [-14, -6],
        [-2, -12],
        [8, -6],
        [2, 12],
        [-15, 17],
      ],
      s.light,
    );
    g.strokeStyle = s.trim;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-16, 12);
    g.lineTo(17, 12);
    g.moveTo(-10, 2);
    g.lineTo(9, 2);
    g.stroke();
    ellipse(0, -13, 10, 11, '#e9c7a4');
    poly(
      [
        [-23, -15],
        [0, -49],
        [23, -15],
      ],
      s.hat,
    );
    poly(
      [
        [0, -49],
        [23, -15],
        [0, -20],
      ],
      s.shadow,
    );
    ellipse(0, -15, 25, 5, s.light);
    ellipse(0, -17, 4, 3, s.gem);
    g.strokeStyle = '#9b8058';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(-15, -4);
    g.lineTo(-26, -32);
    g.stroke();
    ellipse(-26, -34, 5, 6, s.gem);
    g.save();
    g.translate(15, -10);
    g.rotate(w.swing > 0 ? -1.25 + Math.sin(((22 - w.swing) / 22) * Math.PI) * 2.3 : 0.42);
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
    g.restore();
    if (w.swing > 0) {
      g.strokeStyle = '#e2e8f0dd';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(x, y - 14, 57, w.face - 0.9, w.face + 0.9);
      g.stroke();
    }
    g.strokeStyle = w === game.p ? '#4ade80' : '#fb7185';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(x, y + 8, 23, 11, 0, 0, TAU);
    g.stroke();
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
  if (w.freeze > 0) {
    g.fillStyle = '#7ddeff33';
    g.fillRect(x - 23, y - 55, 46, 75);
    g.strokeStyle = COL.ICE;
    g.lineWidth = 4;
    g.strokeRect(x - 23, y - 55, 46, 75);
  }
  if (w.wet > 0) {
    g.font = '17px sans-serif';
    g.fillText('💧', x + 8, y - 66);
  }
  g.fillStyle = '#132018';
  g.fillRect(x - 37, y - 79, 74, 7);
  g.fillStyle = w === game.p ? '#4ade80' : dummy(w) ? '#fbbf24' : '#fb7185';
  g.fillRect(x - 37, y - 79, 74 * clamp(w.hp / w.max, 0, 1), 7);
  g.textAlign = 'center';
  g.font = 'bold 12px monospace';
  g.fillStyle = dummy(w) ? '#fbbf24' : w === game.p ? '#86efac' : '#fda4af';
  g.shadowColor = '#081018';
  g.shadowBlur = 5;
  g.fillText(
    dummy(w)
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
  [
    ['BURN', w.burn, COL.FIRE],
    ['WET', w.wet, COL.WATER],
    ['CHILL', w.chill, COL.ICE],
    ['SCALD', w.scald, COL.STEAM],
    ['MAG', w.mag, COL.MAGNETIC],
    ['OVER', w.over, COL.PLASMA],
    ['STATIC', w.stat, COL.STORM],
  ]
    .filter((a) => a[1] > 0.5)
    .forEach((a, i) => bar(x, y - 140 - i * 19, a[1], a[2], a[0]));
}
