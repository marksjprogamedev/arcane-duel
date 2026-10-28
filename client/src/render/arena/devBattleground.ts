// Art for the development battleground: a painted grass field with bushes, and a boulder on every
// solid circle from shared/maps.ts. Painted once into cached tiles (chunks.ts); only the tiles in
// the camera's view are drawn each frame. The art is SVGs (mapArt.ts); until they load the tiles show
// a plain field, and they repaint when the art is ready.
import { DEV_BATTLEGROUND_OBSTACLES, MAPS } from '../../../../shared/maps';
import { ChunkedBackground } from './chunks';
import { mapArt, MapArtName, onMapArtReady } from './mapArt';

const { width, height } = MAPS.devbattle;

const ROCKS: MapArtName[] = ['rockA', 'rockB', 'rockC'];
const GRASS_SCALE = 0.6;
const ROCK_ASPECT = 88 / 96;
/** A boulder's picture is this many times wider than the collision circle's radius. */
const ROCK_WIDTH = 2.7;

/** Decorative bushes, scattered the same everywhere (a small linear congruential generator). They never block. */
const BUSHES = (() => {
  let seed = 7731;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const out: { x: number; y: number; w: number }[] = [];
  for (let tries = 0; tries < 400 && out.length < 36; tries++) {
    const x = Math.round(120 + next() * 2160),
      y = Math.round(200 + next() * 1480),
      w = 44 + Math.floor(next() * 3) * 10;
    if (DEV_BATTLEGROUND_OBSTACLES.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + 50))
      out.push({ x, y, w });
  }
  return out.sort((a, b) => a.y - b.y);
})();

function paint(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const grass = mapArt('grass');
  const pattern = grass && ctx.createPattern(grass, 'repeat');
  pattern?.setTransform(new DOMMatrix().scale(GRASS_SCALE)); // the tufts are drawn big; shrink them to wizard size
  ctx.fillStyle = pattern || '#245a33';
  ctx.fillRect(x, y, w, h);
  // the border of the playable world
  ctx.strokeStyle = '#0b2514';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, width - 10, height - 10);
  ctx.strokeStyle = '#6fbf73';
  ctx.lineWidth = 4;
  ctx.strokeRect(5, 5, width - 10, height - 10);
  const bush = mapArt('bush');
  if (bush) {
    for (const b of BUSHES) {
      if (b.x + b.w < x || b.x - b.w > x + w || b.y + b.w < y || b.y - b.w > y + h) continue;
      const bh = b.w * (56 / 72);
      ctx.drawImage(bush, b.x - b.w / 2, b.y - bh * 0.8, b.w, bh);
    }
  }
  const rocks = [...DEV_BATTLEGROUND_OBSTACLES.entries()].sort((a, b) => a[1].y - b[1].y);
  for (const [i, o] of rocks) {
    if (o.x + o.r * 2 < x || o.x - o.r * 2 > x + w || o.y + o.r * 2 < y || o.y - o.r * 2 > y + h)
      continue;
    const img = mapArt(ROCKS[(i * 7) % ROCKS.length]);
    if (!img) continue;
    const rw = o.r * ROCK_WIDTH,
      rh = rw * ROCK_ASPECT;
    // the boulder's base (about 80% of the way down its picture) sits just below the circle's centre
    ctx.drawImage(img, o.x - rw / 2, o.y + o.r * 0.5 - rh * 0.8, rw, rh);
  }
}

export const devBattleground = new ChunkedBackground(width, height, paint);

export const devBattlegroundScenery = (ctx: CanvasRenderingContext2D) => {
  mapArt('grass'); // starts loading the art on first use
  onceReady();
  devBattleground.draw(ctx);
};

let queued = false;
function onceReady() {
  if (queued) return;
  queued = true;
  onMapArtReady(() => devBattleground.invalidate());
}
