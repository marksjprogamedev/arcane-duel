// The Dark Wizards' Circle arena: the Varrock stone circle from Old School RuneScape. The ground
// is tiled like RuneScape's (32 px squares in a few shades), and the stones and trees are the
// game's own renders (client/public/arena/dark-circle, trimmed and scaled by hand). The four
// standing stones sit exactly on the simulation's pillars, so they are the ones that block.
import { pillars } from '../../../shared/constants';
import { TAU } from '../../../shared/math';

const SPRITES = {
  stones: 'standing-stones',
  fallen: 'fallen-stones',
  wall: 'broken-wall',
  tree: 'tree',
  oak: 'oak',
  dead: 'dead-tree',
} as const;
type SpriteName = keyof typeof SPRITES;

const images = {} as Record<SpriteName, HTMLImageElement>;
let loaded = 0;
let cache: HTMLCanvasElement | null = null;
for (const name of Object.keys(SPRITES) as SpriteName[]) {
  const img = new Image();
  img.onload = () => {
    // rebuild the cached picture once every sprite is in
    if (++loaded === Object.keys(SPRITES).length) cache = null;
  };
  img.src = `arena/dark-circle/${SPRITES[name]}.png`;
  images[name] = img;
}

const GRASS = ['#4a7c23', '#44761f', '#4f8227', '#3f6e1d', '#527f2a'];
const DIRT = ['#7b5a35', '#735330', '#85633b', '#6b4c2b', '#7e5d38'];
const TILE = 32;
const CENTER = { x: 400, y: 300 };

/** Small deterministic generator, so the map looks the same on every draw and every machine. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The path from Varrock's south gate: a gently curving track up to the circle. */
const pathCentre = (y: number) => 400 + 26 * Math.sin((y - 300) / 70);

function isDirt(x: number, y: number, jitter: number) {
  const dx = (x - CENTER.x) / 215,
    dy = (y - CENTER.y) / 168;
  if (dx * dx + dy * dy < 1 + jitter * 0.18) return true;
  return y > 420 && Math.abs(x - pathCentre(y)) < 40 + jitter * 12;
}

function ground(c: CanvasRenderingContext2D) {
  const rnd = seeded(7);
  for (let ty = 0; ty < 600; ty += TILE)
    for (let tx = 0; tx < 800; tx += TILE) {
      const dirt = isDirt(tx + TILE / 2, ty + TILE / 2, rnd() - 0.5);
      const shades = dirt ? DIRT : GRASS;
      c.fillStyle = shades[Math.floor(rnd() * shades.length)];
      c.fillRect(tx, ty, TILE, TILE);
    }
  // grass tufts and the odd flower, outside the dirt
  for (let i = 0; i < 170; i++) {
    const x = rnd() * 800,
      y = rnd() * 600;
    if (isDirt(x, y, 0)) continue;
    c.strokeStyle = i % 3 ? '#3a6a1a' : '#5d9230';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 2, y - 5);
    c.moveTo(x, y);
    c.lineTo(x + 2, y - 6);
    c.stroke();
    if (i % 17 === 0) {
      c.fillStyle = i % 2 ? '#f5e663' : '#f1f5f9';
      c.beginPath();
      c.arc(x + 4, y - 3, 1.8, 0, TAU);
      c.fill();
    }
  }
  // pebbles on the dirt
  for (let i = 0; i < 60; i++) {
    const x = 120 + rnd() * 560,
      y = 130 + rnd() * 440;
    if (!isDirt(x, y, 0)) continue;
    c.fillStyle = i % 2 ? '#8a7d6b' : '#5e4d38';
    c.fillRect(x, y, 3, 2);
  }
}

/** Flat summoning circle in the middle of the ring, where the dark wizards gather. */
function ritual(c: CanvasRenderingContext2D) {
  c.save();
  c.translate(CENTER.x, CENTER.y);
  c.scale(1, 0.76);
  c.fillStyle = '#2b2622aa';
  c.beginPath();
  c.arc(0, 0, 100, 0, TAU);
  c.fill();
  c.strokeStyle = '#17121c';
  c.lineWidth = 6;
  c.beginPath();
  c.arc(0, 0, 100, 0, TAU);
  c.stroke();
  c.strokeStyle = '#7a3b9a';
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(0, 0, 86, 0, TAU);
  c.stroke();
  c.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + ((i * 2) / 5) * TAU;
    const px = Math.cos(a) * 86,
      py = Math.sin(a) * 86;
    if (i) c.lineTo(px, py);
    else c.moveTo(px, py);
  }
  c.closePath();
  c.stroke();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * TAU;
    c.fillStyle = '#b91c1c';
    c.beginPath();
    c.arc(Math.cos(a) * 86, Math.sin(a) * 86, 4, 0, TAU);
    c.fill();
    c.fillStyle = '#fde68a';
    c.beginPath();
    c.arc(Math.cos(a) * 86, Math.sin(a) * 86 - 3, 1.6, 0, TAU);
    c.fill();
  }
  c.restore();
}

interface Placed {
  name: SpriteName;
  x: number;
  y: number;
}

/** Everything standing on the ground, as sprites whose feet are at (x, y). */
function placements(): Placed[] {
  const out: Placed[] = [];
  // the four stones that block: exactly on the simulation's pillars
  for (const p of pillars) out.push({ name: 'stones', x: p.x, y: p.y + 20 });
  // rubble you can walk over, in the lower corners, and flanking the path in the south
  out.push({ name: 'fallen', x: 120, y: 470 }, { name: 'fallen', x: 690, y: 474 });
  out.push({ name: 'wall', x: 330, y: 128 }, { name: 'wall', x: 470, y: 130 });
  out.push({ name: 'wall', x: 285, y: 545 }, { name: 'wall', x: 520, y: 548 });
  // the tree line
  const rnd = seeded(21);
  const tree = (x: number, y: number) =>
    out.push({ name: rnd() < 0.18 ? 'dead' : rnd() < 0.5 ? 'oak' : 'tree', x, y });
  for (let x = 10; x < 800; x += 82 + rnd() * 20) tree(x, 128 + rnd() * 36);
  for (let x = 20; x < 800; x += 86 + rnd() * 20)
    if (Math.abs(x - 400) > 95) tree(x, 592 + rnd() * 12);
  for (let y = 215; y < 560; y += 92 + rnd() * 20) {
    tree(22 + rnd() * 24, y);
    tree(776 - rnd() * 24, y + 20);
  }
  return out.sort((a, b) => a.y - b.y);
}

function vignette(c: CanvasRenderingContext2D) {
  const v = c.createRadialGradient(400, 310, 260, 400, 310, 520);
  v.addColorStop(0, '#00000000');
  v.addColorStop(1, '#0a1405aa');
  c.fillStyle = v;
  c.fillRect(0, 0, 800, 600);
}

function build() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const c = canvas.getContext('2d')!;
  ground(c);
  ritual(c);
  if (loaded === Object.keys(SPRITES).length)
    for (const p of placements()) {
      const img = images[p.name];
      c.fillStyle = '#0a14058c';
      c.beginPath();
      c.ellipse(p.x + 4, p.y - 2, img.width * 0.36, 6, 0, 0, TAU);
      c.fill();
      c.drawImage(img, p.x - img.width / 2, p.y - img.height);
    }
  vignette(c);
  return canvas;
}

/** Draws the whole arena. It is painted once into an off-screen canvas and copied each frame. */
export function darkCircleScenery(g: CanvasRenderingContext2D) {
  const ready = loaded === Object.keys(SPRITES).length;
  if (!cache || (ready && !builtWithSprites)) {
    cache = build();
    builtWithSprites = ready;
  }
  g.drawImage(cache, 0, 0);
}
let builtWithSprites = false;
