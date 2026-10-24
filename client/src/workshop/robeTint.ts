// Four pixel-art robes share a compact transparent 2x2 sheet.
// Dye only the main fabric; belts, gold trim and dark outlines retain their art.
import {
  ROBE_FIRST,
  ROBE_LAST,
  ROBE_SHEET_URL,
  ROBE_TILE,
  SLEEVELESS_ROBE,
  SLEEVELESS_ROBE_INDEX,
  SLEEVELESS_ROBE_URL,
} from './parts';

const source = new Image();
const listeners: (() => void)[] = [];
source.onload = () => listeners.forEach((listener) => listener());
source.src = ROBE_SHEET_URL;
const sleevelessSource = new Image();
sleevelessSource.onload = () => listeners.forEach((listener) => listener());
sleevelessSource.src = SLEEVELESS_ROBE_URL;

export function onRobesLoaded(listener: () => void) {
  listeners.push(listener);
  if (source.naturalWidth || sleevelessSource.naturalWidth) listener();
}

function hueAndSaturation(r: number, g: number, b: number): [number, number] {
  const hi = Math.max(r, g, b),
    lo = Math.min(r, g, b),
    delta = hi - lo;
  if (!delta) return [0, 0];
  let hue = hi === r ? ((g - b) / delta) % 6 : hi === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return [hue, delta / hi];
}
const FABRIC_HUES = [36, 350, 139, 276];
const FABRIC_BRIGHTNESS = [225, 176, 155, 175];

/** Extract one robe and optionally recolor its cloth without touching its trim. */
export function tintRobe(index: number, color: string): HTMLCanvasElement | null {
  const sleeveless = index === SLEEVELESS_ROBE_INDEX;
  const image = sleeveless ? sleevelessSource : source;
  if (!image.naturalWidth || (!sleeveless && (index < ROBE_FIRST || index > ROBE_LAST)))
    return null;
  const n = index - ROBE_FIRST;
  const canvas = document.createElement('canvas');
  canvas.width = sleeveless ? SLEEVELESS_ROBE.w : ROBE_TILE.w;
  canvas.height = sleeveless ? SLEEVELESS_ROBE.h : ROBE_TILE.h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    image,
    sleeveless ? 0 : (n % 2) * ROBE_TILE.w,
    sleeveless ? 0 : Math.floor(n / 2) * ROBE_TILE.h,
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  if (color === 'original') return canvas;
  const tone = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  if (tone.some((v) => !Number.isFinite(v))) return canvas;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const originalHue = sleeveless ? 220 : FABRIC_HUES[n];
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i],
      g = pixels.data[i + 1],
      b = pixels.data[i + 2];
    if (pixels.data[i + 3] < 8 || Math.max(r, g, b) < 35) continue;
    const [hue, saturation] = hueAndSaturation(r, g, b);
    const distance = Math.abs(((hue - originalHue + 540) % 360) - 180);
    // Sand robe is naturally gold; its pale highlights remain unchanged.
    if (distance > (n === 0 ? 27 : 43) || saturation < 0.22 || (n === 0 && Math.max(r, g, b) > 235))
      continue;
    const shade = Math.max(0.13, Math.max(r, g, b) / (sleeveless ? 230 : FABRIC_BRIGHTNESS[n]));
    for (let channel = 0; channel < 3; channel++)
      pixels.data[i + channel] = Math.min(255, Math.round(tone[channel] * shade));
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}
