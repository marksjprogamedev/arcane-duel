import { game, net } from './state';
import { clamp, dist, rand, TAU } from '../../shared/math';
import { COL, emoji, grass, names, pairs, PART, pillars, styles } from '../../shared/constants';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T,
  cv = $<HTMLCanvasElement>('game'),
  g = cv.getContext('2d');

function make(x, y, hp, style) {
  return {
    x,
    y,
    hp,
    max: hp,
    style,
    shield: null,
    cast: 0,
    swing: 0,
    swordCD: 0,
    forceCD: 0,
    bombCD: 0,
    magmaCD: 0,
    earthCD: 0,
    fireCD: 0,
    waterCD: 0,
    lightCD: 0,
    healCD: 0,
    freeze: 0,
    burn: 0,
    burnTime: 0,
    burnTick: 0,
    wet: 0,
    chill: 0,
    scald: 0,
    mag: 0,
    over: 0,
    stat: 0,
    rest: {},
    healTick: 0,
    silence: 0,
    kx: 0,
    ky: 0,
    face: 0,
    spell: 'FIRE',
  };
}
const dummy = (w) => w === game.e && game.mode !== 'duel' && game.mode !== 'online',
  immortal = (w) => dummy(w) && game.mode !== 'mortal',
  comb = (a) =>
    a.length === 1
      ? names[a[0]]
      : a.length === 2
        ? pairs[
            a
              .slice()
              .sort((x, y) => x - y)
              .join(',')
          ]
        : null;
function uiLoad() {
  let k = comb(game.loaded);
  $('attack').textContent = game.attack;
  $('attack').style.color = COL[game.attack];
  $('loaded').textContent = game.healArmed
    ? '💚 HEAL ARMED'
    : game.loaded.length
      ? game.loaded.map((i) => emoji[i]).join(' + ') + ' ' + k
      : '— EMPTY —';
  $('loaded').style.color = game.healArmed ? '#86efac' : k ? COL[k] : '#cbd5e1';
  $('spell').textContent = game.attack;
  $('spell').style.color = COL[game.attack];
}
function load(i) {
  game.healArmed = false;
  game.loaded = game.loaded.length >= 2 || game.loaded.includes(i) ? [i] : [...game.loaded, i];
  $('hint').textContent = 'Loaded ' + comb(game.loaded) + ' · Click to attack or Space for shield';
  uiLoad();
} // Combat numbers are presentation-only; actual damage is applied immediately.
const damageBatches = new Map();
function float(x, y, s, c) {
  game.labels.push({ x, y, s, c, life: 60 });
}
function queueDamageNumber(w, n, c, kind = 'direct') {
  const id = (w === game.p ? 'p' : 'e') + ':' + kind;
  let batch = damageBatches.get(id);
  if (!batch) {
    batch = { w, n: 0, c, kind, elapsed: 0 };
    damageBatches.set(id, batch);
  }
  batch.n += n;
  batch.c = c;
}
function flushDamageNumbers(dt) {
  for (const [id, b] of damageBatches) {
    b.elapsed += dt;
    if (b.elapsed < 30) continue; // 0.5 seconds at the game's 60Hz tick
    const owner = id.slice(0, 1),
      kind = b.kind;
    // Limit each wizard to three simultaneous damage labels, without
    // discarding status messages or other important notifications.
    const own = game.labels.filter((q) => q.damageOwner === owner);
    while (own.length >= 3) {
      const oldest = own.shift();
      const i = game.labels.indexOf(oldest);
      if (i >= 0) game.labels.splice(i, 1);
    }
    game.labels.push({
      x: b.w.x + (kind === 'burn' ? 13 : 0),
      y: b.w.y - (kind === 'burn' ? 105 : 85),
      s: (kind === 'burn' ? '-' : '') + String(Math.round(b.n)) + (kind === 'burn' ? ' 🔥' : ''),
      c: b.c,
      life: 52,
      damageOwner: owner,
    });
    damageBatches.delete(id);
  }
}
function burst(x, y, c, n = 10, power = 4, castOwner = null) {
  for (let i = 0; i < n; i++) {
    let a = rand(0, TAU),
      v = rand(0.5, power);
    game.particles.push({
      castOwner,
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      c,
      life: rand(12, 28),
      r: rand(2, 5),
    });
  }
}
function walk(w, dx, dy) {
  let x = clamp(w.x + dx, 28, 772);
  if (!pillars.some((o) => Math.hypot(x - o.x, w.y - o.y) < o.r + 18)) w.x = x;
  let y = clamp(w.y + dy, 28, 572);
  if (!pillars.some((o) => Math.hypot(w.x - o.x, y - o.y) < o.r + 18)) w.y = y;
}
function ray(x, y, tx, ty, margin = 0) {
  let dx = tx - x,
    dy = ty - y,
    A = dx * dx + dy * dy;
  if (A < 0.001) return null;
  let best = null;
  for (let o of pillars) {
    let ox = x - o.x,
      oy = y - o.y,
      r = o.r + margin,
      B = 2 * (ox * dx + oy * dy),
      D = B * B - 4 * A * (ox * ox + oy * oy - r * r);
    if (D < 0) continue;
    let u = (-B - Math.sqrt(D)) / (2 * A);
    if (u >= 0 && u <= 1 && (!best || u < best.u)) best = { u, x: x + dx * u, y: y + dy * u };
  }
  return best;
}
const clear = (a, b, m = 0) => !ray(a.x, a.y, b.x, b.y, m);
function damage(w, n, c) {
  if (game.ending || (w === game.e && game.respawn > 0)) return;
  if (!immortal(w)) w.hp -= n;
  queueDamageNumber(w, n, c, 'direct');
  burst(w.x, w.y - 20, c, 7);
}
function status(w, k, n, d, c) {
  const before = w[k];
  w[k] = clamp(before + n, 0, 100);
  w.rest[k] = d;
  if (k === 'wet') {
    if (before < 100 && w[k] >= 100) float(w.x, w.y - 115, 'WET 100%', c);
  } else if (before < 1 || [25, 50, 75, 100].some((level) => before < level && w[k] >= level))
    float(w.x, w.y - 115, k.toUpperCase() + ' ' + Math.round(w[k]) + '%', c);
}
function extinguish(w) {
  if (w.burn > 0) {
    w.burn = 0;
    w.burnTime = 0;
    w.burnTick = 0;
    float(w.x, w.y - 130, 'EXTINGUISHED', '#7dd3fc');
    burst(w.x, w.y - 25, '#7dd3fc', 10, 3);
  }
}
function ignite(w) {
  let was = w.burn;
  w.burn = clamp(w.burn + 12, 0, 100);
  w.burnTime = 180;
  if (was === 0) w.burnTick = 0;
  if (was < 100 && w.burn >= 100) float(w.x, w.y - 130, 'BURN 100%', COL.FIRE);
  burst(w.x, w.y - 30, COL.FIRE, 5, 2);
}
function blocked(w, k) {
  if (w.shield && w.shield.type !== 4 && PART[k].includes(w.shield.type)) {
    float(w.x, w.y - 120, 'BLOCKED!', COL[names[w.shield.type]]);
    burst(w.x, w.y - 20, COL[names[w.shield.type]], 15);
    return true;
  }
  return false;
}
function hit(w, k, n, charged = false, bomb = false) {
  if (game.ending || (w === game.e && game.respawn > 0) || blocked(w, k)) return;
  if (k === 'FIRE') {
    w.wet = 0;
    ignite(w);
  }
  if (k === 'WATER') {
    extinguish(w);
    status(w, 'wet', bomb ? 50 : charged ? 35 : 11, 130, COL.WATER);
  }
  if (k === 'LIGHTNING') {
    n *= 1 + (1.5 * w.wet) / 100;
    if (w.wet > 0) float(w.x, w.y - 140, 'ELECTROCUTION', COL.LIGHTNING);
  }
  if (k === 'EARTH' && w.freeze > 0) {
    n *= 2;
    w.freeze = 0;
    w.chill = 0;
    float(w.x, w.y - 145, 'SHATTER!', COL.ICE);
  }
  if (k === 'ICE') {
    if (bomb) {
      w.freeze = 165;
      w.chill = 100;
      w.rest.chill = 165;
    } else {
      status(w, 'chill', charged ? 38 : 25, 160, COL.ICE);
      if (w.chill >= 100) w.freeze = 140;
    }
  }
  if (k === 'STEAM') status(w, 'scald', bomb ? 45 : charged ? 36 : 26, 170, COL.STEAM);
  if (k === 'MAGNETIC') status(w, 'mag', bomb ? 45 : charged ? 38 : 27, 195, COL.MAGNETIC);
  if (k === 'PLASMA') {
    status(w, 'over', bomb ? 48 : charged ? 38 : 28, 175, COL.PLASMA);
    if (w.over >= 100) {
      w.over = 0;
      w.silence = 105;
      damage(w, 16, COL.PLASMA);
      float(w.x, w.y - 145, 'SILENCED!', COL.PLASMA);
    }
  }
  if (k === 'STORM') {
    status(w, 'stat', bomb ? 42 : charged ? 34 : 26, 165, COL.STORM);
    if (w.stat >= 100) {
      w.stat = 0;
      damage(w, 18, COL.STORM);
      float(w.x, w.y - 145, 'DISCHARGE!', COL.STORM);
    }
  }
  damage(w, n, COL[k]);
}
function shield(w, k) {
  w.shield = { type: k, life: 250 };
  if (k === 4) w.healTick = 0;
  if (k === 0) {
    w.wet = 0;
    w.chill = 0;
    w.freeze = 0;
    extinguish(w);
  }
  if (k === 1) extinguish(w);
  burst(w.x, w.y - 20, k === 4 ? '#4ade80' : COL[names[k]], 24, 6);
}
function heal(w) {
  if (w.healCD > 0 || w.freeze > 0 || w.silence > 0 || w.swing > 0 || w.hp <= 0) return false;
  w.healCD = 600;
  let amount = Math.min(w.max - w.hp, w.max * 0.25 * (1 - (0.6 * w.scald) / 100));
  w.hp += amount;
  burst(w.x, w.y - 20, '#4ade80', 42, 7);
  float(w.x, w.y - 115, '+' + Math.round(amount) + ' HP', '#86efac');
  game.waves.push({ x: w.x, y: w.y, r: 10, life: 25, c: '#4ade80' });
  return true;
}
function sword(w, target) {
  if (
    w.swordCD > 0 ||
    w.cast > 0 ||
    w.freeze > 0 ||
    w.silence > 0 ||
    (w === game.p && game.holding)
  )
    return;
  w.swordCD = 43;
  w.swing = 22;
  w.face = Math.atan2(target.y - w.y, target.x - w.x);
  if (target === game.e && game.respawn > 0) return;
  if (dist(w, target) > 80 || !clear(w, target, 8)) return;
  if (target.shield && target.shield.type === 3) {
    float(target.x, target.y - 125, 'BLOCKED!', COL.EARTH);
    return;
  }
  let n = target.freeze > 0 ? 50 : 25;
  if (n === 50) {
    target.freeze = 0;
    target.chill = 0;
    float(target.x, target.y - 145, 'SHATTER!', COL.ICE);
  }
  damage(target, n, '#f8fafc');
}
function force(w, target) {
  if (w.forceCD > 0 || w.freeze > 0 || w.silence > 0 || w.swing > 0) return;
  w.forceCD = 150;
  game.waves.push({ x: w.x, y: w.y, r: 8, life: 22, c: '#d8b4fe' });
  if (target === game.e && game.respawn > 0) return;
  if (dist(w, target) < 160 && clear(w, target, 5)) {
    let d = dist(w, target) || 1;
    target.kx += ((target.x - w.x) / d) * 19;
    target.ky += ((target.y - w.y) / d) * 19;
    damage(target, 5, '#d8b4fe');
  }
}
function crater(x, y, owner) {
  game.zones = game.zones.filter((z) => z.k !== 'MAGMA' || Math.hypot(z.x - x, z.y - y) > z.r + 65);
  game.zones.push({ x, y, k: 'MAGMA', r: 65, owner, life: 230, tick: 0 });
  burst(x, y, COL.MAGMA, 55, 9);
  burst(x, y, '#fde047', 18, 7);
  float(x, y - 65, 'MAGMA CRATER!', COL.MAGMA);
}
function magma(w, x, y, power = 1) {
  if (w.magmaCD > 0 || w.swing > 0 || w.freeze > 0 || w.silence > 0) return false;
  let dx = x - w.x,
    dy = y - w.y,
    d = Math.hypot(dx, dy) || 1,
    range = Math.min(d, 400),
    ux = dx / d,
    uy = dy / d,
    tx = clamp(w.x + ux * range, 30, 770),
    ty = clamp(w.y + uy * range, 30, 570);
  game.shots.push({
    x: w.x + ux * 26,
    y: w.y + uy * 26,
    vx: ux * 4,
    vy: uy * 4,
    k: 'MAGMA',
    owner: w,
    r: 27,
    life: 220,
    damage: 40 * power,
    tx,
    ty,
    magma: true,
    hitTargets: new Set(),
    trail: 0,
  });
  w.magmaCD = 195;
  burst(w.x, w.y - 20, COL.MAGMA, 20);
  return true;
}
function launch(w, x, y, k, power = 1) {
  if (w.swing > 0 || w.freeze > 0 || w.silence > 0) return false;
  if (k === 'MAGMA') return magma(w, x, y, power);
  if (k === 'EARTH' && w.earthCD > 0) return false;
  let dx = x - w.x,
    dy = y - w.y,
    d = Math.hypot(dx, dy) || 1,
    sp = k === 'EARTH' ? 9 : 7.5;
  if (k === 'EARTH') w.earthCD = 39;
  game.shots.push({
    x: w.x + (dx / d) * 25,
    y: w.y + (dy / d) * 25,
    vx: (dx / d) * sp,
    vy: (dy / d) * sp,
    k,
    owner: w,
    r: k === 'EARTH' ? 14 : power > 1.2 ? 15 : 9,
    travel: 25,
    maxTravel: 450,
    life: 110,
    damage:
      (k === 'EARTH' ? 25 : { STEAM: 14, PLASMA: 12, STORM: 13, ICE: 12, MAGNETIC: 12 }[k] || 18) *
      power,
    charged: power > 1.2,
    trail: 0,
  });
  burst(w.x, w.y - 18, COL[k], 9);
  return true;
}
function bomb(w, x, y, k) {
  if (w.bombCD > 0 || w.swing > 0 || w.freeze > 0 || w.silence > 0) return;
  if (k === 'MAGMA') {
    magma(w, x, y, 1.5);
    return;
  }
  let dx = x - w.x,
    dy = y - w.y,
    d = Math.hypot(dx, dy) || 1,
    range = Math.min(d, 520);
  game.bombs.push({
    x: w.x,
    y: w.y,
    sx: w.x,
    sy: w.y,
    tx: clamp(w.x + (dx / d) * range, 30, 770),
    ty: clamp(w.y + (dy / d) * range, 30, 570),
    u: 0,
    flight: Math.max(25, range / 12),
    fuse: 75,
    k,
    owner: w,
    landed: false,
    dead: false,
  });
  w.bombCD = 240;
}
function makeSprayParticles(w, x, y, k, owner) {
  const fire = k === 'FIRE',
    a = Math.atan2(y - w.y, x - w.x),
    range = fire ? 300 : 350,
    spread = fire ? 0.27 : 0.1,
    out = [];
  for (let i = 0; i < (fire ? 19 : 15); i++) {
    let q = a + rand(-spread, spread),
      r = rand(25, range),
      tx = w.x + Math.cos(q) * r,
      ty = w.y + Math.sin(q) * r,
      b = ray(w.x, w.y, tx, ty, 2);
    if (b) {
      tx = b.x;
      ty = b.y;
      if (Math.random() < 0.35) burst(tx, ty, fire ? '#fb923c' : '#7dd3fc', 2, 2, owner);
    }
    out.push({
      castOwner: owner,
      x: tx,
      y: ty - 12,
      vx: b ? 0 : Math.cos(q) * rand(fire ? 3 : 11, fire ? 6 : 16),
      vy: b ? 0 : Math.sin(q) * rand(fire ? 3 : 11, fire ? 6 : 16),
      c: fire
        ? Math.random() < 0.5
          ? '#facc15'
          : '#ef4444'
        : Math.random() < 0.5
          ? '#38bdf8'
          : '#bae6fd',
      life: rand(9, 21),
      r: rand(fire ? 5 : 2, fire ? 13 : 5),
    });
  }
  return out;
}
function renderParticle(q) {
  g.globalAlpha = Math.min(1, q.life / 12);
  g.shadowColor = q.c;
  g.shadowBlur = q.r * 2;
  ellipse(q.x, q.y - 15, q.r, q.r, q.c);
}
function renderLightningArc(a) {
  g.globalAlpha = Math.min(1, a.life / 7);
  for (let width of [9, 3]) {
    g.strokeStyle = width === 9 ? '#fde04766' : '#fff7bb';
    g.lineWidth = width;
    g.shadowColor = '#facc15';
    g.shadowBlur = width === 9 ? 20 : 6;
    g.beginPath();
    g.moveTo(a.points[0].x, a.points[0].y);
    for (let i = 1; i < a.points.length; i++) g.lineTo(a.points[i].x, a.points[i].y);
    g.stroke();
  }
  g.shadowBlur = 0;
}
function drawWave(q) {
  g.globalAlpha = q.life / 25;
  g.strokeStyle = q.c;
  g.lineWidth = 6;
  g.beginPath();
  g.ellipse(q.x, q.y, q.r, q.r * 0.7, 0, 0, TAU);
  g.stroke();
}
function spray(w, x, y, k) {
  if (w.swing > 0 || w.freeze > 0 || w.silence > 0) return false;
  const particleStart = game.particles.length;
  let target = w === game.p ? game.e : game.p,
    a = Math.atan2(y - w.y, x - w.x);
  w.face = a;
  let d = dist(w, target),
    diff = Math.atan2(
      Math.sin(Math.atan2(target.y - w.y, target.x - w.x) - a),
      Math.cos(Math.atan2(target.y - w.y, target.x - w.x) - a),
    );
  if (k === 'FIRE' || k === 'WATER') {
    let fire = k === 'FIRE',
      range = fire ? 300 : 350,
      cd = fire ? 'fireCD' : 'waterCD';
    if (w[cd] > 0) return false;
    w[cd] = fire ? 5 : 6;
    let sprayParts = makeSprayParticles(w, x, y, k, w === game.e ? 'e' : 'p');
    game.particles.push(...sprayParts);
    if (game.mode === 'online' && w === game.e)
      for (let i = particleStart; i < game.particles.length; i++) game.particles[i].castOwner = 'e';
    if (
      (target !== game.e || game.respawn <= 0) &&
      d < range &&
      Math.abs(diff) < (fire ? 0.34 : 0.16) &&
      clear(w, target, 12)
    )
      hit(target, k, fire ? 2.2 : 1.5);
    return true;
  }
  if (k === 'LIGHTNING') {
    if (w.lightCD > 0) return false;
    w.lightCD = 19;
    let end = { x: w.x + Math.cos(a) * 300, y: w.y + Math.sin(a) * 300 },
      b = ray(w.x, w.y, end.x, end.y, 3);
    if (b) end = { x: b.x, y: b.y };
    if (
      d < 300 &&
      Math.abs(diff) < 0.25 &&
      (target !== game.e || game.respawn <= 0) &&
      clear(w, target, 7)
    ) {
      end = { x: target.x, y: target.y };
      hit(target, k, 15);
    }
    let pts = [{ x: w.x, y: w.y - 20 }];
    for (let i = 1; i < 12; i++) {
      let u = i / 12;
      pts.push({
        x: w.x + (end.x - w.x) * u + rand(-11, 11),
        y: w.y - 20 + (end.y - w.y) * u + rand(-11, 11),
      });
    }
    pts.push({ x: end.x, y: end.y - 20 });
    game.arcs.push({ points: pts, life: 11, castOwner: w === game.e ? 'e' : 'p' });
    burst(end.x, end.y, COL.LIGHTNING, 12, 4, w === game.e ? 'e' : 'p');
    return true;
  }
  return launch(w, x, y, k);
}
function cast(w, x, y, power = 1, k = w === game.p ? game.attack : w.spell) {
  if (w.swing > 0 || w.silence > 0 || w.freeze > 0) return false;
  return ['FIRE', 'WATER', 'LIGHTNING'].includes(k) ? spray(w, x, y, k) : launch(w, x, y, k, power);
}
function commit() {
  if (game.loaded.length) {
    game.attack = comb(game.loaded);
    game.loaded = [];
    game.healArmed = false;
    uiLoad();
  }
}
function tick(w, dt) {
  for (let k of [
    'cast',
    'swing',
    'swordCD',
    'forceCD',
    'bombCD',
    'magmaCD',
    'earthCD',
    'fireCD',
    'waterCD',
    'lightCD',
    'healCD',
    'silence',
    'freeze',
  ])
    w[k] = Math.max(0, w[k] - dt);
  if (Math.abs(w.kx) + Math.abs(w.ky) > 0.15) {
    walk(w, w.kx * dt, w.ky * dt);
    w.kx *= Math.pow(0.82, dt);
    w.ky *= Math.pow(0.82, dt);
  }
  if (w.shield) {
    w.shield.life -= dt;
    if (w.shield.type === 4) {
      w.healTick += dt;
      if (w.healTick >= 30) {
        w.healTick = 0;
        w.hp = Math.min(w.max, w.hp + 3 * (1 - (0.6 * w.scald) / 100));
      }
    }
    if (w.shield.life <= 0) w.shield = null;
  }
  if (w.burnTime > 0) {
    w.burnTime = Math.max(0, w.burnTime - dt);
    w.burnTick += dt;
    while (w.burnTick >= 30 && w.burnTime > 0) {
      w.burnTick -= 30;
      if (w.burn >= 25) {
        let n = Math.max(1, Math.round(w.burn / 25));
        if (!immortal(w)) w.hp -= n;
        queueDamageNumber(w, n, '#fb923c', 'burn');
        burst(w.x + rand(-10, 10), w.y - 28, '#fb923c', 6, 3);
      }
    }
    if (w.burnTime <= 0) {
      w.burn = 0;
      w.burnTick = 0;
    }
  } else w.burn = 0;
  for (let k of ['wet', 'scald', 'mag', 'over', 'stat', 'chill']) {
    w.rest[k] = Math.max(0, (w.rest[k] || 0) - dt);
    if (w.rest[k] === 0 && w.freeze <= 0) w[k] = Math.max(0, w[k] - 0.3 * dt);
  }
}
function startDeath(w, mortal) {
  game.death = { w, x: w.x, y: w.y, age: 0, mortal };
  burst(w.x, w.y - 20, mortal ? '#fbbf24' : w === game.p ? '#a78bfa' : '#fb7185', 65, 9);
  float(w.x, w.y - 110, mortal ? 'DEFEATED!' : w === game.e ? 'VICTORY!' : 'DEFEAT!', '#fde68a');
  if (mortal) {
    game.kills++;
    game.respawn = 120;
    $('hint').textContent = 'Dummy defeated — respawning in 2 seconds';
  } else {
    game.ending = true;
    game.endClock = 0;
    game.winner = w === game.e;
    game.holding = false;
    if (net.mpRole === 'host')
      send({ type: 'death_start', loser: w === game.p ? 'p' : 'e', winner: game.winner });
  }
}
function update(dt) {
  game.t += dt;
  flushDamageNumbers(dt);
  if (game.ending) {
    if (game.death) game.death.age += dt;
    game.endClock += dt;
    for (let q of game.particles) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.life -= dt;
    }
    game.particles = game.particles.filter((q) => q.life > 0);
    for (let q of game.labels) {
      q.y -= 0.6 * dt;
      q.life -= dt;
    }
    game.labels = game.labels.filter((q) => q.life > 0);
    if (game.endClock >= 115) finish();
    return;
  }
  tick(game.p, dt);
  if (game.respawn > 0) {
    game.respawn -= dt;
    if (game.death) game.death.age += dt;
    if (game.respawn <= 0) {
      game.e = make(645, 300, game.dummyHP, game.e.style);
      game.death = null;
      game.dummyClock = 60;
      burst(game.e.x, game.e.y - 20, '#4ade80', 35, 7);
      float(game.e.x, game.e.y - 80, 'RESPAWNED', '#4ade80');
    }
  } else tick(game.e, dt);
  let mx = Number(!!game.keys.KeyD) - Number(!!game.keys.KeyA),
    my = Number(!!game.keys.KeyS) - Number(!!game.keys.KeyW),
    ml = Math.hypot(mx, my) || 1;
  if (game.p.freeze <= 0)
    walk(
      game.p,
      (mx / ml) * 3.5 * (1 - (0.75 * game.p.chill) / 100) * dt,
      (my / ml) * 3.5 * (1 - (0.75 * game.p.chill) / 100) * dt,
    );
  if (game.holding) {
    if (['FIRE', 'WATER', 'LIGHTNING'].includes(game.attack)) {
      if (game.p.cast <= 0) cast(game.p, game.mouse.x, game.mouse.y);
    } else game.charge = Math.min(90, game.charge + dt);
  }
  if (
    (game.mode === 'moving' || (game.mode === 'mortal' && game.dummyMoving)) &&
    game.respawn <= 0 &&
    game.e.freeze <= 0
  ) {
    game.dummyClock -= dt;
    if (game.dummyClock <= 0) {
      game.dummyAngle = rand(0, TAU);
      game.dummyClock = rand(50, 110);
    }
    let sp = 1.7 * (1 - (0.75 * game.e.chill) / 100),
      ox = game.e.x,
      oy = game.e.y;
    walk(game.e, Math.cos(game.dummyAngle) * sp * dt, Math.sin(game.dummyAngle) * sp * dt);
    if (dist(game.e, { x: ox, y: oy }) < sp * dt * 0.4) {
      game.dummyAngle += rand(1.7, 3.5);
      game.dummyClock = rand(30, 60);
    }
  }
  if (game.mode === 'online') {
    let mx = Number(!!net.remoteKeys.KeyD) - Number(!!net.remoteKeys.KeyA),
      my = Number(!!net.remoteKeys.KeyS) - Number(!!net.remoteKeys.KeyW),
      l = Math.hypot(mx, my) || 1;
    if (game.e.freeze <= 0)
      walk(
        game.e,
        (mx / l) * 3.5 * (1 - (0.75 * game.e.chill) / 100) * dt,
        (my / l) * 3.5 * (1 - (0.75 * game.e.chill) / 100) * dt,
      );
    if (net.remoteHolding) {
      if (['FIRE', 'WATER', 'LIGHTNING'].includes(net.remoteAttack)) {
        if (game.e.cast <= 0)
          cast(game.e, net.remoteMouse.x, net.remoteMouse.y, 1, net.remoteAttack);
      } else net.remoteCharge = Math.min(90, net.remoteCharge + dt);
    }
  }
  if (game.mode === 'duel') {
    game.aiClock -= dt;
    if (game.aiClock <= 0) {
      game.aiClock = rand(45, 80);
      game.aiSide = Math.random() < 0.5 ? -1 : 1;
      game.e.spell = Object.keys(COL)[Math.floor(rand(0, 10))];
      if (Math.random() < 0.25 && game.e.bombCD <= 0)
        bomb(game.e, game.p.x, game.p.y, game.e.spell);
      if (Math.random() < 0.2) shield(game.e, Math.floor(rand(0, 4)));
    }
    let d = dist(game.p, game.e) || 1,
      dx = (game.p.x - game.e.x) / d,
      dy = (game.p.y - game.e.y) / d;
    if (game.e.freeze <= 0) {
      let f = d > 235 ? 1 : d < 130 ? -1 : 0,
        sx = dx * f - dy * game.aiSide * 0.8,
        sy = dy * f + dx * game.aiSide * 0.8,
        l = Math.hypot(sx, sy) || 1;
      walk(
        game.e,
        (sx / l) * 2.3 * (1 - (0.75 * game.e.chill) / 100) * dt,
        (sy / l) * 2.3 * (1 - (0.75 * game.e.chill) / 100) * dt,
      );
    }
    if (game.e.hp < game.e.max * 0.48 && game.e.healCD <= 0 && Math.random() < 0.025) heal(game.e);
    if (d < 80 && game.e.swordCD <= 0 && game.e.cast <= 0) sword(game.e, game.p);
    if (game.e.cast <= 0 && game.e.swing <= 0) {
      if (cast(game.e, game.p.x, game.p.y, 1, game.e.spell))
        game.e.cast = ['FIRE', 'WATER', 'LIGHTNING'].includes(game.e.spell) ? 10 : rand(33, 52);
    }
  }
  for (let s of game.shots) {
    let target = s.owner === game.p ? game.e : game.p;
    if (s.magma) {
      let dx = s.tx - s.x,
        dy = s.ty - s.y,
        d = Math.hypot(dx, dy),
        step = 4 * dt,
        ox = s.x,
        oy = s.y;
      if (d <= step + 1) {
        s.x = s.tx;
        s.y = s.ty;
        s.life = 0;
      } else {
        s.x += (dx / d) * step;
        s.y += (dy / d) * step;
        s.life -= dt;
      }
      let b = ray(ox, oy, s.x, s.y, 8);
      if (b) {
        s.x = b.x;
        s.y = b.y;
        s.life = 0;
      }
      s.trail += dt;
      if (s.trail >= 2) {
        s.trail = 0;
        for (let j = 0; j < 4; j++)
          game.particles.push({
            x: s.x + rand(-13, 13),
            y: s.y - 18 + rand(-12, 12),
            vx: rand(-2.5, 2.5) - s.vx * 0.25,
            vy: rand(-3, 1) - s.vy * 0.25,
            c: Math.random() < 0.4 ? '#fde047' : Math.random() < 0.6 ? '#fb923c' : '#3f3f46',
            life: rand(14, 32),
            r: rand(3, 9),
          });
      }
      if (
        (target !== game.e || game.respawn <= 0) &&
        dist(s, target) < s.r + 17 &&
        !s.hitTargets.has(target)
      ) {
        s.hitTargets.add(target);
        hit(target, 'MAGMA', s.damage);
        s.life = 0;
      }
      if (s.life <= 0) crater(s.x, s.y, s.owner);
      continue;
    }
    if (target.mag > 0) {
      let d = dist(s, target) || 1,
        sp = Math.hypot(s.vx, s.vy),
        turn = ((0.013 * target.mag) / 100) * dt,
        ux = (s.vx / sp) * (1 - turn) + ((target.x - s.x) / d) * turn,
        uy = (s.vy / sp) * (1 - turn) + ((target.y - s.y) / d) * turn,
        l = Math.hypot(ux, uy) || 1;
      s.vx = (ux / l) * sp;
      s.vy = (uy / l) * sp;
    }
    let ox = s.x,
      oy = s.y,
      step = Math.hypot(s.vx, s.vy) * dt,
      remaining = s.maxTravel - s.travel,
      mult = remaining < step ? Math.max(0, remaining / Math.max(step, 0.001)) : 1;
    s.x += s.vx * dt * mult;
    s.y += s.vy * dt * mult;
    s.travel += step * mult;
    s.life -= dt;
    s.trail += dt;
    if (s.trail > 3 && ['STEAM', 'PLASMA', 'STORM', 'ICE', 'MAGNETIC'].includes(s.k)) {
      s.trail = 0;
      game.particles.push({
        x: s.x + rand(-8, 8),
        y: s.y - 18 + rand(-8, 8),
        vx: rand(-1.5, 1.5),
        vy: rand(-1.5, 1.5),
        c: COL[s.k],
        life: rand(8, 19),
        r: rand(2, 6),
      });
    }
    let b = ray(ox, oy, s.x, s.y, s.r * 0.6);
    if (b) {
      s.x = b.x;
      s.y = b.y;
      s.life = 0;
      burst(s.x, s.y, COL[s.k], 12, 4);
    }
    if (s.life > 0 && (target !== game.e || game.respawn <= 0) && dist(s, target) < s.r + 17) {
      s.life = 0;
      hit(target, s.k, s.damage, s.charged);
      if (['ICE', 'PLASMA', 'MAGNETIC'].includes(s.k)) burst(s.x, s.y, COL[s.k], 22, 7);
    }
    if (s.travel >= s.maxTravel - 0.01) {
      s.life = 0;
      burst(s.x, s.y, COL[s.k], 10, 3);
    }
  }
  for (let b of game.bombs) {
    if (!b.landed) {
      b.u += dt / b.flight;
      let u = Math.min(1, b.u);
      b.x = b.sx + (b.tx - b.sx) * u;
      b.y = b.sy + (b.ty - b.sy) * u;
      if (u >= 1) b.landed = true;
    } else {
      b.fuse -= dt;
      if (b.fuse <= 0) {
        burst(b.x, b.y, COL[b.k], 45, 8);
        let target = b.owner === game.p ? game.e : game.p;
        if ((target !== game.e || game.respawn <= 0) && dist(b, target) < 100)
          hit(
            target,
            b.k,
            ({ STEAM: 14, PLASMA: 12, STORM: 13, ICE: 12, MAGNETIC: 12 }[b.k] || 18) * 2.5,
            false,
            true,
          );
        if (b.k === 'STORM')
          game.zones.push({
            x: b.x,
            y: b.y,
            k: 'STORM',
            r: 75,
            owner: b.owner,
            life: 175,
            tick: 0,
          });
        b.dead = true;
      }
    }
  }
  for (let z of game.zones) {
    z.life -= dt;
    z.tick += dt;
    if (z.tick >= 24) {
      z.tick = 0;
      let target = z.owner === game.p ? game.e : game.p;
      if ((target !== game.e || game.respawn <= 0) && dist(z, target) < z.r + 17) {
        if (z.k === 'MAGMA') {
          if (!target.shield || ![0, 3].includes(target.shield.type)) damage(target, 4, COL.MAGMA);
        } else if (!blocked(target, 'STORM')) {
          status(target, 'stat', 13, 165, COL.STORM);
          if (target.stat >= 100) {
            target.stat = 0;
            damage(target, 18, COL.STORM);
          }
        }
      }
    }
  }
  for (let q of game.particles) {
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.life -= dt;
  }
  for (let q of game.labels) {
    q.y -= 0.6 * dt;
    q.life -= dt;
  }
  for (let q of game.arcs) q.life -= dt;
  for (let q of game.waves) {
    q.r += 8 * dt;
    q.life -= dt;
  }
  game.shots = game.shots.filter(
    (s) => s.life > 0 && s.x > -40 && s.x < 840 && s.y > -40 && s.y < 640,
  );
  game.bombs = game.bombs.filter((b) => !b.dead);
  game.zones = game.zones.filter((z) => z.life > 0);
  game.particles = game.particles.filter((q) => q.life > 0);
  game.labels = game.labels.filter((q) => q.life > 0);
  game.arcs = game.arcs.filter((q) => q.life > 0);
  game.waves = game.waves.filter((q) => q.life > 0);
  if (
    net.mpRole === 'host' &&
    net.socket &&
    net.socket.readyState === 1 &&
    ++net.netTick % 3 === 0 &&
    net.socket.bufferedAmount < 16000
  )
    send({ type: 'state', state: netState() });
  if (game.p.hp <= 0) startDeath(game.p, false);
  else if ((game.mode === 'duel' || game.mode === 'online') && game.e.hp <= 0)
    startDeath(game.e, false);
  else if (game.mode === 'mortal' && game.respawn <= 0 && game.e.hp <= 0) startDeath(game.e, true);
  hud();
}
function ellipse(x, y, rx, ry, c) {
  g.fillStyle = c;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fill();
}
function poly(pts: [number, number][], c) {
  g.fillStyle = c;
  g.beginPath();
  g.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]);
  g.closePath();
  g.fill();
}
function tree(x, y, r) {
  ellipse(x + 8, y + 14, r + 6, r * 0.45, '#06190e80');
  g.fillStyle = '#624f36';
  g.fillRect(x - 7, y - 18, 14, 37);
  ellipse(x, y - 30, r, r * 0.75, '#17452f');
  ellipse(x - 12, y - 42, r * 0.65, r * 0.53, '#286f42');
  ellipse(x + 13, y - 38, r * 0.55, r * 0.5, '#37804b');
}
function pillar(o) {
  let x = o.x,
    y = o.y;
  ellipse(x + 12, y + 16, 39, 15, '#07191188');
  poly(
    [
      [x - 21, y + 12],
      [x + 21, y + 12],
      [x + 21, y - 50],
      [x - 21, y - 50],
    ],
    '#697b70',
  );
  poly(
    [
      [x + 21, y + 12],
      [x + 34, y + 3],
      [x + 34, y - 59],
      [x + 21, y - 50],
    ],
    '#40564b',
  );
  poly(
    [
      [x - 21, y - 50],
      [x + 21, y - 50],
      [x + 34, y - 59],
      [x - 8, y - 59],
    ],
    '#b3c0b2',
  );
  poly(
    [
      [x - 28, y - 48],
      [x + 26, y - 48],
      [x + 38, y - 59],
      [x - 16, y - 59],
    ],
    '#90a393',
  );
  poly(
    [
      [x - 28, y - 48],
      [x + 26, y - 48],
      [x + 26, y - 38],
      [x - 28, y - 38],
    ],
    '#657f6e',
  );
}
function scenery() {
  let bg = g.createLinearGradient(0, 0, 0, 600);
  bg.addColorStop(0, '#233c32');
  bg.addColorStop(1, '#10261e');
  g.fillStyle = bg;
  g.fillRect(0, 0, 800, 600);
  ellipse(400, 310, 345, 255, '#3a4b39');
  ellipse(400, 307, 315, 225, '#58654d');
  g.strokeStyle = '#829077';
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(400, 307, 313, 223, 0, 0, TAU);
  g.stroke();
  for (let y = 100; y < 550; y += 45)
    for (let x = 110; x < 700; x += 60) {
      let v = Math.sin(x * 0.08 + y * 0.1) * 5;
      poly(
        [
          [x + v, y],
          [x + 56 + v, y],
          [x + 53 + v, y + 38],
          [x + 3 + v, y + 38],
        ],
        Math.sin(x + y) > 0 ? '#18271e20' : '#c6cda010',
      );
    }
  for (let q of grass) {
    g.strokeStyle = q.h % 3 ? '#456e43' : '#9f9b6a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(q.x, q.y);
    g.lineTo(q.x + q.h * 0.5, q.y - q.h);
    g.stroke();
  }
  for (let x = 55; x < 800; x += 135) {
    tree(x, 40, 34);
    tree(x + 40, 575, 38);
  }
  for (let y = 130; y < 560; y += 140) {
    tree(22, y, 34);
    tree(780, y + 30, 32);
  }
  pillars.forEach(pillar);
}
function bar(x, y, v, c, k) {
  g.fillStyle = '#071118db';
  g.fillRect(x - 34, y, 68, 7);
  g.fillStyle = c;
  g.fillRect(x - 34, y, (68 * v) / 100, 7);
  g.textAlign = 'center';
  g.font = 'bold 10px monospace';
  g.fillText(k + ' ' + Math.round(v) + '%', x, y - 3);
}
function actor(w) {
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
function projectile(s) {
  let x = s.x,
    y = s.y - 20,
    c = COL[s.k],
    ang = Math.atan2(s.vy, s.vx);
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.shadowColor = c;
  g.shadowBlur = 20;
  if (s.k === 'MAGMA') {
    g.rotate(game.t * 0.045);
    g.shadowColor = '#ff4500';
    g.shadowBlur = 34;
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
    g.strokeStyle = '#ffec8b';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-11, -10);
    g.lineTo(-3, -2);
    g.lineTo(7, -7);
    g.lineTo(14, 1);
    g.stroke();
    ellipse(-5, -4, 4, 4, '#fff5b0');
  } else if (s.k === 'STEAM') {
    for (let i = 0; i < 7; i++) {
      let a = game.t * 0.07 + i * 2.4,
        r = 6 + i * 2.5;
      g.globalAlpha = 0.18 + i * 0.07;
      ellipse(
        Math.cos(a) * r,
        Math.sin(a) * r,
        10 + i * 2,
        9 + i * 2,
        i % 2 ? '#cbd5e1' : '#f8fafc',
      );
    }
    g.globalAlpha = 1;
  } else if (s.k === 'PLASMA') {
    g.rotate(-ang);
    let pulse = 1 + 0.18 * Math.sin(game.t * 0.22);
    g.shadowColor = '#d946ef';
    g.shadowBlur = 28;
    ellipse(0, 0, 16 * pulse, 16 * pulse, '#8613b6');
    ellipse(0, 0, 11 * pulse, 11 * pulse, '#d946ef');
    ellipse(0, 0, 6 * pulse, 6 * pulse, '#fff1ff');
    for (let i = 0; i < 6; i++) {
      let a = game.t * 0.12 + (i * TAU) / 6,
        r = 18 + 4 * Math.sin(game.t * 0.18 + i);
      g.strokeStyle = i % 2 ? '#f0abfc' : '#c084fc';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      g.lineTo(Math.cos(a + 0.23) * (r + 5), Math.sin(a + 0.23) * (r + 5));
      g.lineTo(Math.cos(a - 0.14) * (r + 11), Math.sin(a - 0.14) * (r + 11));
      g.stroke();
    }
  } else if (s.k === 'STORM') {
    g.rotate(-ang);
    g.shadowColor = '#818cf8';
    g.shadowBlur = 24;
    for (let i = 0; i < 6; i++) {
      let a = game.t * 0.045 + (i * TAU) / 6;
      ellipse(Math.cos(a) * 8, Math.sin(a) * 5, 12, 10, i % 2 ? '#6366f1' : '#a5b4fc');
    }
    ellipse(0, 0, 11, 9, '#e0e7ff');
    g.strokeStyle = '#c7d2fe99';
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(0, 0, 21, 16, game.t * 0.03, 0, TAU);
    g.stroke();
  } else if (s.k === 'ICE') {
    poly(
      [
        [-20, -5],
        [11, -7],
        [29, 0],
        [11, 7],
        [-20, 5],
      ],
      '#7dd3fc',
    );
    poly(
      [
        [-20, -5],
        [11, -7],
        [29, 0],
        [-5, 0],
      ],
      '#e0f2fe',
    );
    poly(
      [
        [-10, 2],
        [9, 0],
        [-8, 9],
      ],
      '#38bdf8',
    );
  } else if (s.k === 'MAGNETIC') {
    ellipse(0, 0, 9, 9, '#65a30d');
    ellipse(0, 0, 4, 4, '#ecfccb');
    for (let i = 0; i < 5; i++) {
      let a = game.t * 0.11 + (i * TAU) / 5,
        r = 15 + Math.sin(game.t * 0.12 + i) * 3;
      g.save();
      g.translate(Math.cos(a) * r, Math.sin(a) * r);
      g.rotate(a);
      poly(
        [
          [-7, -3],
          [5, -5],
          [9, 1],
          [-2, 5],
        ],
        i % 2 ? '#a3a3a3' : '#d4d4d8',
      );
      g.restore();
    }
  } else if (s.k === 'EARTH') {
    poly(
      [
        [-14, -11],
        [-8, -24],
        [8, -26],
        [18, -13],
        [11, 0],
        [-7, 1],
      ],
      '#6b7767',
    );
    poly(
      [
        [-14, -11],
        [-8, -24],
        [8, -26],
        [1, -9],
      ],
      '#b0b9a3',
    );
  } else ellipse(0, 0, s.r, s.r, c);
  g.shadowBlur = 0;
  g.restore();
}
function deathDraw() {
  if (!game.death) return;
  let d = game.death,
    u = clamp(d.age / 95, 0, 1),
    c = d.w === game.p ? '#a78bfa' : d.mortal ? '#fbbf24' : '#fb7185';
  g.save();
  g.globalAlpha = 1 - u;
  g.translate(d.x, d.y);
  g.rotate(u * 1.5);
  g.scale(1 - u * 0.35, Math.max(0.03, 1 - u));
  g.translate(-d.x, -d.y);
  actor(d.w);
  g.restore();
  g.globalAlpha = (1 - u) * 0.9;
  g.strokeStyle = c;
  g.lineWidth = 5;
  g.shadowColor = c;
  g.shadowBlur = 25;
  g.beginPath();
  g.arc(d.x, d.y - 20, 20 + u * 100, 0, TAU);
  g.stroke();
  g.shadowBlur = 0;
  g.globalAlpha = 1;
}
function draw() {
  scenery();
  for (let z of game.zones) {
    g.globalAlpha = Math.min(0.65, z.life / 80);
    g.fillStyle = COL[z.k] + '55';
    g.beginPath();
    g.ellipse(z.x, z.y, z.r, z.r * 0.7, 0, 0, TAU);
    g.fill();
    g.strokeStyle = COL[z.k];
    g.lineWidth = 3;
    g.stroke();
    if (z.k === 'MAGMA')
      for (let i = 0; i < 9; i++) {
        let a = (i * TAU) / 9 + game.t * 0.008,
          r = z.r * 0.55;
        ellipse(
          z.x + Math.cos(a) * r,
          z.y + Math.sin(a) * r * 0.7,
          4 + Math.sin(game.t * 0.1 + i) * 2,
          3,
          '#ffb347',
        );
      }
    g.globalAlpha = 1;
  }
  [
    { y: game.p.y, w: game.p },
    { y: game.e.y, w: game.e },
  ]
    .filter((o) => !game.death || o.w !== game.death.w)
    .sort((a, b) => a.y - b.y)
    .forEach((o) => actor(o.w));
  deathDraw();
  for (let b of game.bombs) {
    let h = b.landed ? 0 : Math.sin(Math.min(1, b.u) * Math.PI) * 105;
    ellipse(b.x, b.y - h - 12, 13, 13, COL[b.k]);
    if (b.landed) {
      g.strokeStyle = COL[b.k];
      g.lineWidth = 2;
      g.beginPath();
      g.arc(b.x, b.y, 85, 0, TAU);
      g.stroke();
    }
  }
  for (let s of game.shots) {
    if (net.mpRole === 'guest' && s.owner === game.e) continue;
    projectile(s);
  }
  for (let a of game.arcs) {
    if (
      net.mpRole === 'guest' &&
      (a.castOwner === 'e' ||
        (a.points?.length &&
          Math.hypot(a.points[0].x - game.e.x, a.points[0].y - (game.e.y - 20)) < 110))
    )
      continue;
    renderLightningArc(a);
  }
  g.globalAlpha = 1;
  for (let q of game.waves) {
    if (
      net.mpRole === 'guest' &&
      net.guestFX.some(
        (f) =>
          (f.kind === 'HEAL' || f.kind === 'FORCE') &&
          Math.hypot(q.x - f.x, q.y - f.y) < 75 &&
          f.age < f.life,
      )
    )
      continue;
    drawWave(q);
  }
  g.globalAlpha = 1;
  for (let q of game.particles) {
    if (net.mpRole === 'guest' && q.castOwner === 'e') continue;
    renderParticle(q);
  }
  g.shadowBlur = 0;
  g.globalAlpha = 1;
  for (let q of game.labels) {
    g.globalAlpha = Math.min(1, q.life / 18);
    g.font = 'bold 15px monospace';
    g.textAlign = 'center';
    g.fillStyle = q.c;
    g.fillText(q.s, q.x, q.y);
  }
  g.globalAlpha = 1;
  g.strokeStyle = '#ffffffaa';
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(game.mouse.x, game.mouse.y, 9, 0, TAU);
  g.moveTo(game.mouse.x - 15, game.mouse.y);
  g.lineTo(game.mouse.x - 5, game.mouse.y);
  g.moveTo(game.mouse.x + 5, game.mouse.y);
  g.lineTo(game.mouse.x + 15, game.mouse.y);
  g.stroke();
}
function hud() {
  if (!game.p) return;
  $('hp').textContent = String(Math.ceil(Math.max(0, game.p.hp)));
  $('enemy').textContent =
    game.mode === 'mortal'
      ? game.respawn > 0
        ? 'RESPAWNING ' + Math.ceil(game.respawn / 60) + 's'
        : 'DUMMY ' + Math.ceil(Math.max(0, game.e.hp)) + '/' + game.e.max
      : dummy(game.e)
        ? 'DUMMY ∞ HP'
        : 'RIVAL ' + Math.ceil(Math.max(0, game.e.hp)) + '/200';
  uiLoad();
  for (let k of ['earth', 'sword', 'force']) {
    let n = game.p[k + 'CD'];
    $(k).textContent = n > 0 ? (n / 60).toFixed(1) + 's' : 'READY';
  }
  $('shield').textContent = game.p.shield
    ? game.p.shield.type === 4
      ? 'HEALING'
      : names[game.p.shield.type]
    : 'NONE';
  $('kills').textContent = String(game.kills);
  for (let a of [
    { key: 'heal', v: game.p.healCD, max: 600 },
    { key: 'magma', v: game.p.magmaCD, max: 195 },
  ]) {
    $(a.key + 'text').textContent = a.v > 0 ? (a.v / 60).toFixed(1) + 's' : 'READY';
    $(a.key + 'meter').style.width = 100 * (1 - a.v / a.max) + '%';
  }
}
function loop(now) {
  if (!game.active) return;
  let dt = Math.min(2, (now - (game.last || now)) / 16.667);
  game.last = now;
  if (!game.paused) {
    if (net.mpRole !== 'guest') update(dt);
    else game.t += dt;
  }
  if (net.mpRole === 'guest') {
    for (const k of Object.keys(net.guestCooldowns))
      net.guestCooldowns[k] = Math.max(0, net.guestCooldowns[k] - dt);
  }
  if (net.mpRole === 'guest' && net.guestFiring && game.active && !game.ending) {
    net.guestFireClock -= dt;
    if (net.guestFireClock <= 0) {
      guestFXAt(net.guestSpell, game.mouse.x, game.mouse.y);
      net.guestFireClock +=
        net.guestSpell === 'LIGHTNING' ? 19 : net.guestSpell === 'WATER' ? 6 : 5;
    }
  }
  if (net.mpRole === 'guest' && game.ending && net.guestFinished) {
    game.endClock += dt;
    if (game.death) game.death.age += dt;
    if (game.endClock >= 115) {
      net.guestFinished = false;
      finish();
    }
  }
  if (net.mpRole === 'guest' && game.p && game.e) {
    const blend = 1 - Math.exp((-Math.max(0.001, dt) * 16.667) / 48);
    const smooth = (v, w) => {
      if (!v) return { x: w.x, y: w.y };
      let d = Math.hypot(w.x - v.x, w.y - v.y);
      if (d > 140) return { x: w.x, y: w.y };
      return { x: v.x + (w.x - v.x) * blend, y: v.y + (w.y - v.y) * blend };
    };
    net.visualP = interpolatedOpponent(performance.now()) || smooth(net.visualP, game.p);
    // Predict local movement immediately. Authoritative snapshots are delayed,
    // so do not extrapolate them by RTT and then pull the player backwards.
    // Instead, maintain a small correction offset which decays smoothly.
    if (!net.visualE) net.visualE = { x: game.e.x, y: game.e.y };
    let gx = Number(!!game.keys.KeyD) - Number(!!game.keys.KeyA);
    let gy = Number(!!game.keys.KeyS) - Number(!!game.keys.KeyW);
    let gl = Math.hypot(gx, gy) || 1;
    if (game.e.freeze <= 0) {
      let speed = 3.5 * (1 - (0.75 * game.e.chill) / 100) * dt;
      walk(net.visualE, (gx / gl) * speed, (gy / gl) * speed);
    }
    // Only correct after a fresh snapshot. The snapshot is already old on
    // arrival; a continuously moving target causes oscillation/rubber-banding.
    if (net.guestCorrection) {
      let fade = 1 - Math.exp((-Math.max(0.001, dt) * 16.667) / 260);
      let dx = net.guestCorrection.x * fade,
        dy = net.guestCorrection.y * fade;
      walk(net.visualE, dx, dy);
      net.guestCorrection.x -= dx;
      net.guestCorrection.y -= dy;
      if (Math.hypot(net.guestCorrection.x, net.guestCorrection.y) < 0.25)
        net.guestCorrection = null;
    }
    // Hard correction is reserved for teleports or large knockbacks.
    if (net.guestTeleport) {
      net.visualE = { x: game.e.x, y: game.e.y };
      net.guestTeleport = false;
      net.guestCorrection = null;
    }

    // Only the drawing coordinates are modified. Game logic always uses host positions.
    let px = game.p.x,
      py = game.p.y,
      ex = game.e.x,
      ey = game.e.y;
    game.p.x = net.visualP.x;
    game.p.y = net.visualP.y;
    game.e.x = net.visualE.x;
    game.e.y = net.visualE.y;
    // Smooth projectile motion by tracking successive snapshots in order.
    let originalShots = game.shots.map((s) => [s, s.x, s.y]);
    let nextVisual = new Map();
    for (let i = 0; i < game.shots.length; i++) {
      let s = game.shots[i],
        key = i + ':' + s.k + ':' + (s.owner === game.p ? 'p' : 'e');
      let v = smooth(net.visualShots.get(key), s);
      nextVisual.set(key, v);
      s.x = v.x;
      s.y = v.y;
    }
    net.visualShots = nextVisual;
    draw();
    drawGuestFX(dt);
    game.p.x = px;
    game.p.y = py;
    game.e.x = ex;
    game.e.y = ey;
    for (let [s, x, y] of originalShots) {
      s.x = x;
      s.y = y;
    }
  } else draw();
  if (game.active) game.frame = requestAnimationFrame(loop);
}
function start(m) {
  damageBatches.clear();
  $<HTMLButtonElement>('rematch').disabled = false;
  cancelAnimationFrame(game.frame);
  net.visualP = null;
  net.visualE = null;
  net.visualShots = new Map();
  net.guestCorrection = null;
  net.guestTeleport = false;
  net.guestLastAuth = null;
  net.lastNetAt = 0;
  net.netTick = 0;
  net.guestFX = [];
  net.guestPending.clear();
  net.inputPending.clear();
  net.guestCastSequence = 0;
  net.spellActions.clear();
  net.spellActionSequence = 0;
  net.opponentSamples = [];
  net.netSnapshotSeq = 0;
  net.receivedSnapshotSeq = 0;
  net.guestFiring = false;
  net.guestFireClock = 0;
  net.guestCooldowns = {};
  net.guestSpell = 'FIRE';
  net.guestElements = [];
  net.guestHeal = false;
  game.mode = m;
  game.dummyHP = Number($<HTMLSelectElement>('dummyhp').value);
  game.dummyMoving = $<HTMLSelectElement>('dummymove').value === 'moving';
  let a = Math.floor(Math.random() * styles.length),
    b = Math.floor(Math.random() * (styles.length - 1));
  if (b >= a) b++;
  game.p = make(155, 300, 200, styles[a]);
  game.e = make(
    645,
    300,
    m === 'duel' || m === 'online' ? 200 : m === 'mortal' ? game.dummyHP : 100000,
    styles[b],
  );
  $('styles').textContent =
    '🟢 ' +
    game.p.style.name +
    ' · 🔴 ' +
    (m === 'duel' || m === 'online' ? game.e.style.name : 'Training Dummy');
  game.active = true;
  game.paused = false;
  game.ending = false;
  game.death = null;
  game.endClock = 0;
  game.keys = {};
  game.loaded = [];
  game.attack = 'FIRE';
  game.healArmed = false;
  game.holding = false;
  game.charge = 0;
  game.shots = [];
  game.bombs = [];
  game.zones = [];
  game.particles = [];
  game.labels = [];
  game.arcs = [];
  game.waves = [];
  game.t = 0;
  game.last = 0;
  game.aiClock = 10;
  game.aiSide = 1;
  game.dummyAngle = Math.PI;
  game.dummyClock = 85;
  game.kills = 0;
  game.respawn = 0;
  $('menu').style.display = 'none';
  $('pause').style.display = 'none';
  $('end').style.display = 'none';
  $('cooldowns').style.display = 'flex';
  $('legend').style.display = 'block';
  $('hint').textContent =
    'Your wizard: ' +
    game.p.style.name +
    ' · ' +
    (m === 'duel' || m === 'online' ? 'Rival: ' + game.e.style.name : 'Training mode');
  hud();
  cv.focus();
  game.frame = requestAnimationFrame(loop);
}
function finish() {
  if (net.mpRole === 'host') send({ type: 'finished', winner: game.winner });
  game.active = false;
  $('end').style.display = 'flex';
  $('cooldowns').style.display = 'none';
  $('legend').style.display = 'none';
  $('result').textContent = game.winner ? '🏆 VICTORY' : '💀 DEFEAT';
  $('result').style.color = game.winner ? '#fde68a' : '#fda4af';
  $('detail').textContent = game.winner
    ? 'You defeated the rival! Remaining health: ' + Math.ceil(Math.max(0, game.p.hp)) + '/200'
    : 'The rival wizard defeated you.';
}
function home() {
  if (net.mpRole) {
    net.guestFiring = false;
    send({ type: 'leave' });
    net.mpRole = null;
    net.room = null;
    net.remoteKeys = {};
  }
  game.active = false;
  game.paused = false;
  game.holding = false;
  game.keys = {};
  cancelAnimationFrame(game.frame);
  $('menu').style.display = 'flex';
  $('pause').style.display = 'none';
  $('end').style.display = 'none';
  $('cooldowns').style.display = 'none';
  $('legend').style.display = 'none';
}
function pause() {
  if (net.mpRole) {
    $('hint').textContent = 'Pausing is disabled during online matches';
    return;
  }
  if (!game.active || game.ending) return;
  game.paused = !game.paused;
  $('pause').style.display = game.paused ? 'flex' : 'none';
  game.last = 0;
  if (!game.paused) cv.focus();
}
function aim(ev) {
  let r = cv.getBoundingClientRect();
  if (r.width && r.height) {
    game.mouse.x = ((ev.clientX - r.left) * 800) / r.width;
    game.mouse.y = ((ev.clientY - r.top) * 600) / r.height;
  }
}
function release() {
  if (!game.holding || !game.active || game.paused || game.ending) return;
  game.holding = false;
  if (!['FIRE', 'WATER', 'LIGHTNING'].includes(game.attack)) {
    let power = game.charge >= 20 ? 1.5 + (game.charge / 90) * 1.5 : 1;
    if (game.p.cast <= 0 && cast(game.p, game.mouse.x, game.mouse.y, power)) game.p.cast = 20;
  }
  game.charge = 0;
}

cv.addEventListener('pointermove', (ev) => {
  if (net.mpRole === 'guest') {
    aim(ev);
    let now = performance.now();
    if (now - net.lastAimSent >= 33) {
      net.lastAimSent = now;
      send({
        type: 'input',
        action: 'aim',
        roundId: net.roundId,
        x: game.mouse.x,
        y: game.mouse.y,
      });
    }
  }
});
cv.addEventListener('pointermove', aim);
cv.addEventListener('pointerdown', (ev) => {
  if (!game.active || game.paused || game.ending) return;
  aim(ev);
  ev.preventDefault();
  cv.focus();
  if (net.mpRole === 'guest') {
    guestCommit();
    net.guestPressAt = performance.now();
    if (ev.button === 0 && ['FIRE', 'WATER', 'LIGHTNING'].includes(net.guestSpell)) {
      net.guestFiring = true;
      guestFXAt(net.guestSpell);
      net.guestFireClock = net.guestSpell === 'LIGHTNING' ? 19 : net.guestSpell === 'WATER' ? 6 : 5;
    }
    if (ev.button === 2) guestFXAt('BOMB');
    const kind = ev.button === 2 ? 'BOMB' : net.guestSpell;
    const castId = spellAction(kind);
    sendInput(ev.button === 0 ? 'down' : 'bomb', { x: game.mouse.x, y: game.mouse.y, castId });
    return;
  }
  if (ev.button === 0) {
    if (game.p.swing > 0 || game.p.silence > 0 || game.p.freeze > 0) return;
    commit();
    game.holding = true;
    game.charge = 0;
    try {
      cv.setPointerCapture(ev.pointerId);
    } catch (err) {}
  } else if (ev.button === 2) {
    commit();
    bomb(game.p, game.mouse.x, game.mouse.y, game.attack);
  }
});
cv.addEventListener('pointerup', (ev) => {
  if (ev.button === 0) {
    aim(ev);
    if (net.mpRole === 'guest') {
      net.guestFiring = false;
      if (!['FIRE', 'WATER', 'LIGHTNING'].includes(net.guestSpell)) {
        if (guestFXAt(net.guestSpell))
          net.guestCooldowns[net.guestSpell] = Math.max(
            net.guestCooldowns[net.guestSpell] || 0,
            net.guestSpell === 'EARTH' ? 39 : net.guestSpell === 'MAGMA' ? 195 : 20,
          );
      }
      sendInput('up', { x: game.mouse.x, y: game.mouse.y, castId: spellAction(net.guestSpell) });
    } else release();
  }
});
cv.addEventListener('pointercancel', () => {
  game.holding = false;
  net.guestFiring = false;
  game.charge = 0;
});
cv.addEventListener('contextmenu', (ev) => ev.preventDefault());
const controls = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyQ',
  'KeyE',
  'KeyB',
  'KeyP',
  'Escape',
  'Space',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
]);
function keydown(ev) {
  if (!game.active) return;
  let k = ev.code;
  if (net.mpRole === 'guest') {
    if (controls.has(k)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    if (!ev.repeat) {
      guestSelect(k);
      const spellKey =
        k === 'KeyF' ||
        k === 'KeyQ' ||
        k === 'KeyB' ||
        k === 'Space' ||
        (k === 'Digit2' && net.guestHeal);
      sendInput('key', { key: k, down: true, ...(spellKey ? { castId: spellAction(k) } : {}) });
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k)) game.keys[k] = true;
    return;
  }
  if (controls.has(k)) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  if ((k === 'KeyP' || k === 'Escape') && !ev.repeat) {
    pause();
    return;
  }
  if (game.paused || game.ending) return;
  if (k === 'KeyE' && !ev.repeat) {
    game.healArmed = true;
    game.loaded = [];
    $('hint').textContent = 'Healing loaded · Press 2 for Greater Heal or Space for Healing Shield';
    uiLoad();
    return;
  }
  if (k === 'Digit2' && game.healArmed && !ev.repeat) {
    game.healArmed = false;
    game.loaded = [];
    $('hint').textContent = heal(game.p)
      ? 'Greater Healing cast!'
      : 'Greater Healing unavailable or cooling down';
    hud();
    return;
  }
  if (k === 'Space' && !ev.repeat) {
    if (game.healArmed) {
      shield(game.p, 4);
      game.healArmed = false;
      game.loaded = [];
      $('hint').textContent = 'Healing Shield cast · Attack remains ' + game.attack;
    } else if (game.loaded.length) {
      let sh = game.loaded[game.loaded.length - 1];
      shield(game.p, sh);
      game.loaded = [];
      $('hint').textContent = names[sh] + ' Shield cast · Attack remains ' + game.attack;
    } else $('hint').textContent = 'Load an element with 1–4 before pressing Space';
    hud();
    return;
  }
  if (k.startsWith('Digit') && !ev.repeat) {
    load(Number(k.slice(-1)) - 1);
    return;
  }
  if (k === 'KeyF' && !ev.repeat) {
    game.healArmed = false;
    sword(game.p, game.e);
  }
  if (k === 'KeyQ' && !ev.repeat) {
    game.healArmed = false;
    force(game.p, game.e);
  }
  if (k === 'KeyB' && !ev.repeat) {
    commit();
    bomb(game.p, game.mouse.x, game.mouse.y, game.attack);
  }
  game.keys[k] = true;
}
window.addEventListener('keydown', keydown, true);
window.addEventListener(
  'keyup',
  (ev) => {
    if (net.mpRole === 'guest') sendInput('key', { key: ev.code, down: false });
    game.keys[ev.code] = false;
  },
  true,
);
window.addEventListener('blur', () => {
  if (net.mpRole === 'guest') sendInput('clear');
  game.keys = {};
  game.holding = false;
  game.charge = 0;
});
document
  .querySelectorAll<HTMLElement>('[data-mode]')
  .forEach((b) => b.addEventListener('click', () => start(b.dataset.mode)));
$('resume').addEventListener('click', pause);
document.querySelectorAll('.home').forEach((b) => b.addEventListener('click', home));
$('rematch').addEventListener('click', () => {
  if (net.mpRole) {
    send({ type: 'rematch_ready' });
    $('detail').textContent = 'Waiting for the other player to accept the rematch…';
    $<HTMLButtonElement>('rematch').disabled = true;
  } else start(game.mode);
});
// Visual-only guest spell prediction. The host remains authoritative for hits and HP.
// Visual prediction is cooldown gated and never applies damage locally.
const guestCD = {
  FIRE: 5,
  WATER: 6,
  LIGHTNING: 19,
  EARTH: 39,
  MAGMA: 195,
  SWORD: 43,
  FORCE: 150,
  BOMB: 240,
  HEAL: 600,
};
function guestFXAt(kind, x = game.mouse.x, y = game.mouse.y) {
  if (net.mpRole !== 'guest' || !game.active || !net.visualE || game.ending) return false;
  const cdKey = kind === 'SHIELD' ? null : kind === 'BOMB' ? 'BOMB' : kind;
  if (cdKey && (net.guestCooldowns[cdKey] || 0) > 0) return false;
  if (game.e && (game.e.freeze > 0 || game.e.silence > 0 || game.e.swing > 0) && kind !== 'SHIELD')
    return false;
  if (cdKey) net.guestCooldowns[cdKey] = guestCD[cdKey] || 20;
  const w = net.visualE,
    dx = x - w.x,
    dy = y - w.y,
    d = Math.hypot(dx, dy) || 1;
  const continuous = ['FIRE', 'WATER', 'LIGHTNING'].includes(kind);
  const q: any = {
    castId: ++net.guestCastSequence,
    kind,
    x: w.x,
    y: w.y,
    dx: dx / d,
    dy: dy / d,
    age: 0,
    life: continuous
      ? kind === 'LIGHTNING'
        ? 9
        : 19
      : kind === 'MAGMA'
        ? 115
        : kind === 'BOMB'
          ? 75
          : kind === 'EARTH'
            ? 60
            : 70,
    continuous,
    seed: Math.random() * 10000,
    parts: [],
    confirmed: false,
    tx: x,
    ty: y,
    shieldType: null,
  };
  if (kind === 'LIGHTNING')
    q.jag = Array.from({ length: 11 }, () => ({ x: rand(-11, 11), y: rand(-11, 11) }));
  if (kind === 'FIRE' || kind === 'WATER') q.parts = makeSprayParticles(w, x, y, kind, 'e');
  if (kind === 'HEAL') {
    q.parts = Array.from({ length: 42 }, () => {
      let a = rand(0, TAU),
        v = rand(0.5, 7);
      return {
        x: w.x,
        y: w.y - 20,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        c: '#4ade80',
        life: rand(12, 28),
        r: rand(2, 5),
      };
    });
    q.wave = { x: w.x, y: w.y, r: 10, life: 25, c: '#4ade80' };
  }
  if (kind === 'FORCE') q.wave = { x: w.x, y: w.y, r: 8, life: 22, c: '#d8b4fe' };
  net.guestFX.push(q);
  net.guestPending.set(q.castId, q);
  if (net.guestPending.size > 120) net.guestPending.delete(net.guestPending.keys().next().value);
  if (net.guestFX.length > 45) net.guestFX.splice(0, net.guestFX.length - 45);
  return true;
}
function drawGuestFX(dt) {
  if (net.mpRole !== 'guest') return;
  g.save();
  for (const q of net.guestFX) {
    q.age += dt;
    // Keep the locally rendered projectile; authoritative copies are hidden
    // on this client. Damage, collision and status remain host-controlled.
    const fade = Math.min(1, Math.max(0, (q.life - q.age) / Math.min(12, q.life * 0.3)));
    const col = COL[q.kind] || '#d8b4fe';
    g.globalAlpha = fade * 0.9;
    g.strokeStyle = col;
    g.fillStyle = col;
    if (q.kind === 'FIRE' || q.kind === 'WATER') {
      for (const part of q.parts) {
        if (part.life <= 0) continue;
        part.x += part.vx * dt;
        part.y += part.vy * dt;
        part.life -= dt;
        renderParticle(part);
      }
      g.shadowBlur = 0;
      g.globalAlpha = fade * 0.9;
    } else if (q.kind === 'LIGHTNING') {
      const ox = net.visualE?.x ?? q.x,
        oy = net.visualE?.y ?? q.y;
      // Same sharp, independently jagged segments as the host's spray() lightning.
      let end = { x: ox + q.dx * 300, y: oy + q.dy * 300 };
      const wall = ray(ox, oy, end.x, end.y, 3);
      if (wall) end = { x: wall.x, y: wall.y };
      const pts = [{ x: ox, y: oy - 20 }];
      for (let i = 1; i < 12; i++) {
        const u = i / 12;
        pts.push({
          x: ox + (end.x - ox) * u + q.jag[i - 1].x,
          y: oy - 20 + (end.y - oy) * u + q.jag[i - 1].y,
        });
      }
      pts.push({ x: end.x, y: end.y - 20 });
      renderLightningArc({ points: pts, life: Math.max(0, 11 - q.age) });
      if (q.age < 5) {
        for (let i = 0; i < 9; i++) {
          const a = i * 2.399 + q.seed,
            rr = (i % 4) * 4 + q.age * 2;
          const tx = ox + q.dx * 300 + Math.cos(a) * rr,
            ty = oy + q.dy * 300 + Math.sin(a) * rr;
          renderParticle({ x: tx, y: ty - 5, r: 2.5 + (i % 3), c: '#fde047', life: 12 });
        }
      }
    } else if (q.kind === 'HEAL' || q.kind === 'FORCE') {
      if (q.kind === 'HEAL')
        for (const part of q.parts) {
          if (q.age >= part.life) continue;
          renderParticle({
            x: part.x + part.vx * q.age,
            y: part.y + part.vy * q.age + 15,
            c: part.c,
            r: part.r,
            life: part.life - q.age,
          });
        }
      if (q.wave) {
        q.wave.r += (q.kind === 'HEAL' ? 3.8 : 6) * dt;
        q.wave.life = Math.max(0, (q.kind === 'HEAL' ? 25 : 22) - q.age);
        if (q.wave.life > 0) drawWave(q.wave);
      }
    } else if (q.kind === 'SHIELD') {
      // Match the host's actor() shield outline; never show the generic
      // purple expanding ring. Keep the preview until the host's shield
      // appears in a snapshot, preventing a gap on higher-latency connections.
      if (!game.e?.shield && q.age < q.life) {
        const ox = net.visualE?.x ?? q.x,
          oy = net.visualE?.y ?? q.y;
        const c = q.shieldType === 4 ? '#4ade80' : COL[names[q.shieldType]] || '#4ade80';
        g.strokeStyle = c;
        g.lineWidth = 5;
        g.shadowColor = c;
        g.shadowBlur = 24;
        g.globalAlpha = fade;
        g.beginPath();
        g.ellipse(ox, oy - 14, 35, 47, 0, 0, TAU);
        g.stroke();
        g.shadowBlur = 0;
      }
    } else if (q.kind === 'SWORD') {
      g.lineWidth = 8;
      g.beginPath();
      g.arc(q.x, q.y - 20, 12 + q.age * 2, 0, TAU);
      g.stroke();
    } else {
      const speed = q.kind === 'MAGMA' ? 4 : q.kind === 'EARTH' ? 9 : 7.5;
      const radius = q.kind === 'MAGMA' ? 27 : q.kind === 'EARTH' ? 14 : 10;
      // Magma stops at the clicked target, matching the host's target-locked projectile.
      const maxDist = q.kind === 'MAGMA' ? Math.hypot(q.tx - q.x, q.ty - q.y) : 450;
      const travel = Math.min(q.age * speed, maxDist);
      if (q.kind === 'MAGMA' && q.age * speed >= maxDist) continue;
      const offset = q.kind === 'MAGMA' ? 0 : 25;
      const px = q.x + q.dx * (offset + travel),
        py = q.y + q.dy * (offset + travel);
      if (px >= 10 && px <= 790 && py >= 10 && py <= 590) {
        if (q.kind === 'BOMB') {
          g.shadowColor = col;
          g.shadowBlur = 12;
          g.beginPath();
          g.arc(px, py - 20, 12, 0, TAU);
          g.fill();
          g.shadowBlur = 0;
        } else
          projectile({
            x: px,
            y: py,
            vx: q.dx * speed,
            vy: q.dy * speed,
            k: q.kind,
            r: radius,
            life: 90,
          });
      }
    }
  }
  g.restore();
  net.guestFX = net.guestFX.filter((q) => !q.confirmed && q.age < q.life);
}
function guestSelect(k) {
  if (k === 'KeyE') {
    net.guestHeal = true;
    net.guestElements = [];
    return;
  }
  if (k === 'Digit2' && net.guestHeal) {
    net.guestHeal = false;
    guestFXAt('HEAL');
    return;
  }
  if (/^Digit[1-4]$/.test(k)) {
    let i = Number(k.slice(-1)) - 1;
    net.guestHeal = false;
    net.guestElements =
      net.guestElements.length >= 2 || net.guestElements.includes(i)
        ? [i]
        : [...net.guestElements, i];
    $('loaded').textContent = net.guestElements.map((j) => emoji[j]).join(' + ');
    return;
  }
  if (k === 'Space') {
    // The host does nothing when Space is pressed without a loaded element.
    if (net.guestHeal) {
      if (guestFXAt('SHIELD')) net.guestFX.at(-1).shieldType = 4;
    } else if (net.guestElements.length) {
      const type = net.guestElements.at(-1);
      if (guestFXAt('SHIELD')) net.guestFX.at(-1).shieldType = type;
    }
    net.guestHeal = false;
    net.guestElements = [];
    return;
  }
  if (k === 'KeyF') guestFXAt('SWORD');
  if (k === 'KeyQ') guestFXAt('FORCE');
}
function guestCommit() {
  if (net.guestElements.length) {
    net.guestSpell = comb(net.guestElements) || net.guestSpell;
    net.guestElements = [];
    $('attack').textContent = net.guestSpell;
    $('attack').style.color = COL[net.guestSpell];
    $('spell').textContent = net.guestSpell;
    $('loaded').textContent = '— EMPTY —';
  }
}
function send(v) {
  if (net.socket && net.socket.readyState === 1) net.socket.send(JSON.stringify(v));
}

function spellAction(kind) {
  const id = ++net.spellActionSequence;
  net.spellActions.set(id, { kind, at: performance.now() });
  if (net.spellActions.size > 100) net.spellActions.delete(net.spellActions.keys().next().value);
  return id;
}
function interpolatedOpponent(now) {
  if (!net.opponentSamples.length) return null;
  const target = now - Math.max(65, Math.min(135, net.netRTT * 0.5 + 45));
  while (net.opponentSamples.length > 2 && net.opponentSamples[1].at <= target)
    net.opponentSamples.shift();
  const a = net.opponentSamples[0],
    b = net.opponentSamples[1];
  if (!b) return { x: a.x, y: a.y };
  const f = clamp((target - a.at) / Math.max(1, b.at - a.at), 0, 1);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
function sendInput(action, extras = {}) {
  const id = ++net.inputSequence;
  net.inputPending.set(id, performance.now());
  if (net.inputPending.size > 120) net.inputPending.delete(net.inputPending.keys().next().value);
  send({ type: 'input', action, inputId: id, roundId: net.roundId, ...extras });
  return id;
}
function ackInput(m, accepted = true) {
  if (Number.isSafeInteger(m.inputId))
    send({ type: 'input_ack', inputId: m.inputId, accepted: !!accepted });
}

function netState() {
  let own = (o) => (o === game.p ? 'p' : 'e'),
    plain = (w) => ({ ...w, style: styles.indexOf(w.style) });
  return {
    roundId: net.roundId,
    seq: ++net.netSnapshotSeq,
    p: plain(game.p),
    e: plain(game.e),
    shots: game.shots.map((s) => ({ ...s, owner: own(s.owner), hitTargets: undefined })),
    bombs: game.bombs.map((b) => ({ ...b, owner: own(b.owner) })),
    zones: game.zones.map((z) => ({ ...z, owner: own(z.owner) })),
    particles: game.particles.slice(-35),
    labels: game.labels.slice(-16),
    arcs: game.arcs.slice(-10),
    waves: game.waves.slice(-14),
    t: game.t,
    ending: game.ending,
    death: game.death ? { ...game.death, w: own(game.death.w) } : null,
  };
}
function applyState(s) {
  if (!s || !s.p || !s.e || s.roundId !== net.roundId) return;
  if (Number.isSafeInteger(s.seq)) {
    if (s.seq <= net.receivedSnapshotSeq) return;
    net.receivedSnapshotSeq = s.seq;
  }
  const now = performance.now();
  net.opponentSamples.push({ x: s.p.x, y: s.p.y, at: now });
  if (net.opponentSamples.length > 20) net.opponentSamples.shift();
  // Compare consecutive authoritative positions to detect true discontinuities.
  // Ordinary motion should never reset the guest's locally predicted position.
  if (net.visualE) {
    const delta = net.guestLastAuth
      ? Math.hypot(s.e.x - net.guestLastAuth.x, s.e.y - net.guestLastAuth.y)
      : 0;
    if (delta > 115) {
      net.guestTeleport = true;
    } else {
      // Corrections are deliberately capped and applied only once per snapshot.
      // Ignore the small normal network lead while the player is moving.
      const moving = game.keys.KeyW || game.keys.KeyA || game.keys.KeyS || game.keys.KeyD;
      const dx = s.e.x - net.visualE.x,
        dy = s.e.y - net.visualE.y;
      const error = Math.hypot(dx, dy);
      if (error > 170) net.guestTeleport = true;
      else if (error > (moving ? Math.max(22, net.netRTT * 0.24) : 5)) {
        const factor = moving ? 0.22 : 0.65;
        net.guestCorrection = {
          x: Math.max(-28, Math.min(28, dx * factor)),
          y: Math.max(-28, Math.min(28, dy * factor)),
        };
      }
    }
  }
  // Snapshot cooldowns are authoritative. Local cooldowns prevent phantom
  // casts between snapshots, while the host can extend a cooldown if needed.
  for (const [spell, field] of Object.entries({
    EARTH: 'earthCD',
    MAGMA: 'magmaCD',
    FIRE: 'fireCD',
    WATER: 'waterCD',
    LIGHTNING: 'lightCD',
    SWORD: 'swordCD',
    FORCE: 'forceCD',
    BOMB: 'bombCD',
    HEAL: 'healCD',
  })) {
    const remote = Number(s.e[field]) || 0;
    if (remote > 0 && !['FIRE', 'WATER', 'LIGHTNING'].includes(spell))
      net.guestCooldowns[spell] = Math.max(net.guestCooldowns[spell] || 0, remote);
  }
  net.guestLastAuth = { x: s.e.x, y: s.e.y };
  net.lastNetAt = performance.now();
  let unpack = (w) => ({ ...w, style: styles[w.style] || styles[0] });
  game.p = unpack(s.p);
  game.e = unpack(s.e);
  game.shots = s.shots.map((v) => ({ ...v, owner: v.owner === 'p' ? game.p : game.e }));
  game.bombs = s.bombs.map((v) => ({ ...v, owner: v.owner === 'p' ? game.p : game.e }));
  game.zones = s.zones.map((v) => ({ ...v, owner: v.owner === 'p' ? game.p : game.e }));
  game.particles = s.particles;
  game.labels = s.labels;
  game.arcs = s.arcs;
  game.waves = s.waves;
  game.t = s.t;
  if (!net.guestFinished) game.ending = !!s.ending;
  game.death = s.death ? { ...s.death, w: s.death.w === 'p' ? game.p : game.e } : game.death;
  $('hp').textContent = String(Math.ceil(Math.max(0, game.e.hp)));
  $('enemy').textContent = 'HOST ' + Math.ceil(Math.max(0, game.p.hp)) + '/200';
  $('styles').textContent = '🟢 Host ' + game.p.style.name + ' · 🔴 You ' + game.e.style.name;
  $('shield').textContent = game.e.shield
    ? game.e.shield.type === 4
      ? 'HEALING'
      : names[game.e.shield.type]
    : 'NONE';
  for (let k of ['earth', 'sword', 'force'])
    $(k).textContent = game.e[k + 'CD'] > 0 ? (game.e[k + 'CD'] / 60).toFixed(1) + 's' : 'READY';
  for (let a of [
    { key: 'heal', v: game.e.healCD, max: 600 },
    { key: 'magma', v: game.e.magmaCD, max: 195 },
  ]) {
    $(a.key + 'text').textContent = a.v > 0 ? (a.v / 60).toFixed(1) + 's' : 'READY';
    $(a.key + 'meter').style.width = 100 * (1 - a.v / a.max) + '%';
  }
}
function remoteInput(m) {
  if (net.mpRole !== 'host' || !game.e || game.ending || m.roundId !== net.roundId) {
    ackInput(m, false);
    if (Number.isSafeInteger(m.castId))
      send({ type: 'cast_ack', castId: m.castId, roundId: net.roundId, accepted: false });
    return;
  }
  try {
    let action = m.action,
      x = clamp(Number(m.x) || 0, 0, 800),
      y = clamp(Number(m.y) || 0, 0, 600);
    if (action === 'aim') {
      net.remoteMouse = { x, y };
      return;
    }
    if (action === 'clear') {
      net.remoteKeys = {};
      net.remoteHolding = false;
      return;
    }
    if (action === 'down') {
      net.remoteMouse = { x, y };
      if (net.remoteLoaded.length) {
        net.remoteAttack = comb(net.remoteLoaded);
        net.remoteLoaded = [];
      }
      net.remoteHolding = true;
      net.remoteCharge = 0;
      return;
    }
    if (action === 'up') {
      net.remoteMouse = { x, y };
      if (net.remoteHolding && !['FIRE', 'WATER', 'LIGHTNING'].includes(net.remoteAttack)) {
        let power = net.remoteCharge >= 20 ? 1.5 + (net.remoteCharge / 90) * 1.5 : 1;
        if (game.e.cast <= 0 && cast(game.e, x, y, power, net.remoteAttack)) game.e.cast = 20;
      }
      net.remoteHolding = false;
      net.remoteCharge = 0;
      return;
    }
    if (action === 'bomb') {
      net.remoteMouse = { x, y };
      if (net.remoteLoaded.length) {
        net.remoteAttack = comb(net.remoteLoaded);
        net.remoteLoaded = [];
      }
      bomb(game.e, x, y, net.remoteAttack);
      return;
    }
    if (action !== 'key') return;
    let k = m.key;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(k)) {
      net.remoteKeys[k] = !!m.down;
      return;
    }
    if (!m.down) return;
    if (k === 'KeyE') {
      net.remoteHealArmed = true;
      net.remoteLoaded = [];
      return;
    }
    if (k === 'Digit2' && net.remoteHealArmed) {
      net.remoteHealArmed = false;
      heal(game.e);
      return;
    }
    if (k === 'Space') {
      if (net.remoteHealArmed) {
        shield(game.e, 4);
        net.remoteHealArmed = false;
      } else if (net.remoteLoaded.length) {
        shield(game.e, net.remoteLoaded.at(-1));
        net.remoteLoaded = [];
      }
      return;
    }
    if (/^Digit[1-4]$/.test(k)) {
      let i = Number(k.slice(-1)) - 1;
      net.remoteHealArmed = false;
      net.remoteLoaded =
        net.remoteLoaded.length >= 2 || net.remoteLoaded.includes(i)
          ? [i]
          : [...net.remoteLoaded, i];
      return;
    }
    if (k === 'KeyF') sword(game.e, game.p);
    if (k === 'KeyQ') force(game.e, game.p);
    if (k === 'KeyB') bomb(game.e, net.remoteMouse.x, net.remoteMouse.y, net.remoteAttack);
  } finally {
    ackInput(m, true);
    if (Number.isSafeInteger(m.castId))
      send({ type: 'cast_ack', castId: m.castId, roundId: net.roundId, accepted: true });
  }
}
function connect() {
  if (net.socket && net.socket.readyState === 1) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    let proto = location.protocol === 'https:' ? 'wss' : 'ws';
    let url =
      location.protocol === 'file:'
        ? 'ws://localhost:3000/ws'
        : proto + '://' + location.host + '/ws';
    net.socket = new WebSocket(url);
    net.socket.onopen = () => {
      resolve();
      setInterval(() => {
        if (net.socket && net.socket.readyState === 1) send({ type: 'ping', stamp: Date.now() });
      }, 2000);
    };
    net.socket.onerror = () =>
      reject(
        new Error(
          'Cannot connect to multiplayer server. Start it using npm start, then open http://localhost:3000',
        ),
      );
    net.socket.onclose = () => {
      if (net.mpRole) {
        game.active = false;
        net.mpRole = null;
        $('menu').style.display = 'flex';
        $('roomStatus').textContent = 'Disconnected from server.';
      }
    };
    net.socket.onmessage = (ev) => {
      let m;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (m.type === 'pong') {
        net.netRTT = net.netRTT * 0.75 + Math.max(1, Date.now() - m.stamp) * 0.25;
        $('netdiag').textContent =
          'MULTIPLAYER · ' +
          Math.round(net.netRTT) +
          ' ms RTT · input ' +
          (net.lastAckMs || '—') +
          ' ms · spell ' +
          (net.spellAckMs || '—') +
          ' ms · ' +
          (net.mpRole || 'not connected');
        return;
      }
      if (m.type === 'created') {
        net.room = m.code;
        net.mpRole = 'host';
        $('roomStatus').textContent =
          'Room ' + net.room + ' created. Share the code and wait for your opponent…';
        $<HTMLInputElement>('roomCode').value = net.room;
      }
      if (m.type === 'joined') {
        net.room = m.code;
        net.mpRole = 'guest';
        $('roomStatus').textContent = 'Joined ' + net.room + '. Waiting for host…';
      }
      if (m.type === 'start') {
        net.roundId = m.roundId || 1;
        if (m.role === 'host') {
          net.mpRole = 'host';
          start('online');
          net.remoteKeys = {};
          net.remoteAttack = 'FIRE';
          net.remoteLoaded = [];
          net.remoteHolding = false;
          send({ type: 'state', state: netState() });
        } else {
          net.mpRole = 'guest';
          start('online');
          $('hint').textContent = 'Online duel · You control the RED wizard';
          $('hp').textContent = '200';
          $('spell').textContent = 'ONLINE';
        }
      }
      if (m.type === 'rematch_start') {
        net.roundId = m.roundId;
        net.mpRole = m.role;
        net.guestFinished = false;
        start('online');
        if (net.mpRole === 'host') {
          net.remoteKeys = {};
          net.remoteAttack = 'FIRE';
          net.remoteLoaded = [];
          net.remoteHolding = false;
          send({ type: 'state', state: netState() });
        } else $('hint').textContent = 'Online rematch · You control the RED wizard';
      }
      if (m.type === 'input_ack' && net.mpRole === 'guest') {
        const at = net.inputPending.get(m.inputId);
        if (at !== undefined) {
          net.lastAckMs = Math.round(performance.now() - at);
          net.inputPending.delete(m.inputId);
        }
      }
      if (m.type === 'cast_ack' && net.mpRole === 'guest' && m.roundId === net.roundId) {
        const a = net.spellActions.get(m.castId);
        if (a) {
          net.spellAckMs = Math.round(performance.now() - a.at);
          net.spellActions.delete(m.castId);
        }
      }
      if (m.type === 'input') remoteInput(m);
      if (m.type === 'state' && net.mpRole === 'guest' && game.active) applyState(m.state);
      if (
        (m.type === 'death_start' || m.type === 'finished') &&
        net.mpRole === 'guest' &&
        !net.guestFinished
      ) {
        game.ending = true;
        game.winner = !m.winner;
        net.guestFinished = true;
        game.endClock = 0;
        {
          const fallen = m.loser === 'p' || (m.loser == null && !m.winner) ? game.p : game.e;
          game.death = { w: fallen, x: fallen.x, y: fallen.y, age: 0, mortal: false };
          burst(fallen.x, fallen.y - 20, fallen === game.p ? '#a78bfa' : '#fb7185', 65, 9);
        }
        // Keep the render loop alive for the same death animation used by the host.
      }
      if (m.type === 'error') $('roomStatus').textContent = m.message;
      if (m.type === 'peer_left') {
        game.active = false;
        net.mpRole = null;
        $('menu').style.display = 'flex';
        $('roomStatus').textContent = 'Opponent disconnected. Create a new room to play again.';
      }
    };
  });
}
$('createRoom').onclick = async () => {
  try {
    await connect();
    send({ type: 'create' });
  } catch (e) {
    $('roomStatus').textContent = e.message;
  }
};
$('joinRoom').onclick = async () => {
  let code = $<HTMLInputElement>('roomCode').value.toUpperCase().trim();
  if (!/^[A-Z]{6}$/.test(code)) {
    $('roomStatus').textContent = 'Enter a six-letter room code';
    return;
  }
  try {
    await connect();
    send({ type: 'join', code });
  } catch (e) {
    $('roomStatus').textContent = e.message;
  }
};
game.p = make(155, 300, 200, styles[0]);
game.e = make(645, 300, 200, styles[3]);
draw();
hud();

export {};
