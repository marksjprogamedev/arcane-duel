// The Dark Wizards' Circle arena: the Varrock stone circle from Old School RuneScape, the one the
// dark wizards use to summon Delrith. The stones, the ritual table in the middle and the trees are
// the game's own renders (client/public/arena/dark-circle, trimmed and scaled by hand); the grass
// and the broken paving around the monuments are drawn here. Every monument and the table stand on
// a solid circle from shared/maps.ts, which the simulation uses for walking and for stopping
// projectiles, so what looks solid is solid.
import { DARK_CIRCLE } from '../../../shared/maps';
import { TAU } from '../../../shared/math';

const SPRITES = {
  stones: 'standing-stones',
  twin: 'twin-pillars',
  arcA: 'arc-a',
  arcB: 'arc-b',
  arcC: 'arc-c',
  table: 'centre-stone',
  tree: 'tree',
  oak: 'oak',
  dead: 'dead-tree-sandy',
} as const;
type SpriteName = keyof typeof SPRITES;
const SPRITE_COUNT = Object.keys(SPRITES).length;

const images = {} as Record<SpriteName, HTMLImageElement>;
let loaded = 0;
let cache: HTMLCanvasElement | null = null;
let builtWithSprites = false;
for (const name of Object.keys(SPRITES) as SpriteName[]) {
  const img = new Image();
  img.onload = () => {
    loaded++;
  };
  img.src = `arena/dark-circle/${SPRITES[name]}.png`;
  images[name] = img;
}

const GRASS = ['#4e6f47', '#4a6a43', '#53744b', '#46633f', '#587850'];
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

function ground(c: CanvasRenderingContext2D) {
  const rnd = seeded(7);
  for (let ty = 0; ty < 600; ty += TILE)
    for (let tx = 0; tx < 800; tx += TILE) {
      c.fillStyle = GRASS[Math.floor(rnd() * GRASS.length)];
      c.fillRect(tx, ty, TILE, TILE);
    }
  // dry, olive ground outside the circle, fading in towards the edges
  c.save();
  c.translate(CENTER.x, CENTER.y);
  c.scale(1, 0.78);
  const dry = c.createRadialGradient(0, 0, 300, 0, 0, 470);
  dry.addColorStop(0, '#7a7a3e00');
  dry.addColorStop(1, '#7d7a3ecc');
  c.fillStyle = dry;
  c.fillRect(-CENTER.x, -CENTER.y / 0.78, 800, 600 / 0.78);
  c.restore();
  // blades of grass
  for (let i = 0; i < 900; i++) {
    const x = rnd() * 800,
      y = rnd() * 600,
      lean = (rnd() - 0.5) * 6,
      len = 5 + rnd() * 7;
    c.strokeStyle = i % 3 ? '#3e5c39' : i % 3 === 0 ? '#668b58' : '#5a7d4d';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + lean, y - len);
    c.stroke();
  }
}

/** A patch of broken paving: scattered pale slabs, thickest in the middle. */
function paving(c: CanvasRenderingContext2D, rnd: () => number, x: number, y: number, r: number) {
  const n = Math.round(r * 0.6);
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU,
      d = Math.sqrt(rnd()) * r,
      px = x + Math.cos(a) * d,
      py = y + Math.sin(a) * d * 0.72,
      s = 6 + rnd() * 9,
      tilt = rnd() * TAU;
    const pts = [0, 1, 2, 3].map((k) => {
      const ang = tilt + (k * TAU) / 4 + (rnd() - 0.5) * 0.9;
      const rr = s * (0.7 + rnd() * 0.5);
      return [px + Math.cos(ang) * rr, py + Math.sin(ang) * rr * 0.7];
    });
    const shade = 150 + Math.floor(rnd() * 70);
    c.fillStyle = `rgb(${shade}, ${shade}, ${shade - 6})`;
    c.strokeStyle = '#2f3a2c';
    c.lineWidth = 1;
    c.beginPath();
    pts.forEach(([qx, qy], k) => (k ? c.lineTo(qx, qy) : c.moveTo(qx, qy)));
    c.closePath();
    c.fill();
    c.stroke();
    // a lit top edge
    c.strokeStyle = `rgb(${Math.min(255, shade + 30)}, ${Math.min(255, shade + 30)}, ${shade + 20})`;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    c.lineTo(pts[1][0], pts[1][1]);
    c.stroke();
  }
}

interface Item {
  /** Where its feet are; items are painted from the back of the arena to the front. */
  y: number;
  draw: (c: CanvasRenderingContext2D) => void;
}

function sprite(name: SpriteName, x: number, y: number): Item {
  return {
    y,
    draw(c) {
      const img = images[name];
      c.fillStyle = '#0a14058c';
      c.beginPath();
      c.ellipse(x + 4, y - 2, img.width * 0.36, 6, 0, 0, TAU);
      c.fill();
      c.drawImage(img, x - img.width / 2, y - img.height);
    },
  };
}

/** A stone monument: a base (pillars) with an ornamental arch resting on top, as in the circle. */
function monument(base: 'stones' | 'twin', arch: 'arcA' | 'arcB' | 'arcC', x: number, y: number) {
  const baseImg = images[base];
  return {
    y,
    draw(c: CanvasRenderingContext2D) {
      sprite(base, x, y).draw(c);
      const a = images[arch];
      c.drawImage(a, x - a.width / 2, y - baseImg.height * 0.78 - a.height + 14);
    },
  } satisfies Item;
}

function items(): Item[] {
  const out: Item[] = [];
  // monuments stand on the circles that block, in this order: the four corner pillars, then
  // north, south, west and east
  const arches = ['arcA', 'arcB', 'arcB', 'arcA', 'arcC', 'arcA', 'arcB', 'arcA'] as const;
  DARK_CIRCLE.monuments.forEach((m, i) =>
    out.push(monument(i < 6 ? 'stones' : 'twin', arches[i], m.x, m.y + 20)),
  );
  out.push(sprite('table', DARK_CIRCLE.table.x, DARK_CIRCLE.table.y + 16));
  // the trees outside
  const rnd = seeded(21);
  const tree = (x: number, y: number) =>
    out.push(sprite(rnd() < 0.3 ? 'dead' : rnd() < 0.5 ? 'oak' : 'tree', x, y));
  // keep the trees off the monuments at the top, bottom and sides
  for (let x = 10; x < 800; x += 96 + rnd() * 24) {
    const y = 100 + rnd() * 30;
    if (Math.abs(x - 400) > 120) tree(x, y);
  }
  for (let x = 40; x < 800; x += 100 + rnd() * 24) {
    const y = 596 + rnd() * 10;
    if (Math.abs(x - 400) > 120) tree(x, y);
  }
  for (let y = 215; y < 560; y += 105 + rnd() * 20) {
    const left = 18 + rnd() * 14,
      right = 782 - rnd() * 14;
    if (Math.abs(y - 310) > 90) tree(left, y);
    if (Math.abs(y + 24 - 310) > 90) tree(right, y + 24);
  }
  return out.sort((a, b) => a.y - b.y);
}

/** Where the broken paving lies: around each monument, and in loose patches inside the ring. */
const PAVING: [number, number, number][] = [
  ...DARK_CIRCLE.monuments.map((m): [number, number, number] => [m.x, m.y + 24, 82]),
  [310, 396, 70],
  [500, 214, 62],
  [480, 396, 54],
  [300, 200, 54],
];

function vignette(c: CanvasRenderingContext2D) {
  const v = c.createRadialGradient(400, 310, 300, 400, 310, 540);
  v.addColorStop(0, '#00000000');
  v.addColorStop(1, '#10140a88');
  c.fillStyle = v;
  c.fillRect(0, 0, 800, 600);
}

function build() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const c = canvas.getContext('2d')!;
  ground(c);
  const rnd = seeded(99);
  for (const [x, y, r] of PAVING) paving(c, rnd, x, y, r);
  if (loaded === SPRITE_COUNT) for (const item of items()) item.draw(c);
  vignette(c);
  return canvas;
}

/** Draws the whole arena. It is painted once into an off-screen canvas and copied each frame. */
export function darkCircleScenery(g: CanvasRenderingContext2D) {
  const ready = loaded === SPRITE_COUNT;
  // paint again once the sprites have arrived, if the first picture was made without them
  if (!cache || (ready && !builtWithSprites)) {
    cache = build();
    builtWithSprites = ready;
  }
  g.drawImage(cache, 0, 0);
}
