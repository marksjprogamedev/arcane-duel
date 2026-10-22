// Tints the grayscale heads sheet with the chosen skin tone. Shared by the Workshop preview and
// the in-match renderer so the tinting is written once.
import { HEADS_MASK_URL, HEADS_URL } from './parts';

const base = new Image();
const mask = new Image();
const listeners: (() => void)[] = [];

function loaded() {
  if (!base.complete || !mask.complete || !base.naturalWidth || !mask.naturalWidth) return;
  for (const listener of listeners) listener();
}
base.onload = loaded;
mask.onload = loaded;
base.src = HEADS_URL;
mask.src = HEADS_MASK_URL;

/** Calls `listener` once both images have loaded. */
export function onHeadsLoaded(listener: () => void) {
  listeners.push(listener);
}

/**
 * Recolors the masked skin and extracts each head into its own transparent 32×44 canvas, so the
 * browser never samples adjacent sheet cells when a head is scaled or rotated.
 * Returns null until both images are ready.
 */
export function tintHeads(skin: string): HTMLCanvasElement[] | null {
  if (!base.naturalWidth || !mask.naturalWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 88;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(base, 0, 0);
  const pixels = ctx.getImageData(0, 0, 128, 88);
  ctx.clearRect(0, 0, 128, 88);
  ctx.drawImage(mask, 0, 0);
  const maskPixels = ctx.getImageData(0, 0, 128, 88);
  const color = [1, 3, 5].map((i) => parseInt(skin.slice(i, i + 2), 16));
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (maskPixels.data[i] < 128 || pixels.data[i + 3] === 0) continue;
    const shade = pixels.data[i] / 160;
    for (let channel = 0; channel < 3; channel++)
      pixels.data[i + channel] = Math.min(255, Math.round(color[channel] * shade));
  }
  const heads: HTMLCanvasElement[] = [];
  for (let index = 0; index < 8; index++) {
    const head = document.createElement('canvas');
    head.width = 32;
    head.height = 44;
    const headCtx = head.getContext('2d');
    if (!headCtx) return null;
    // Exact cell extraction; no CSS background-position, interpolation,
    // or neighboring pixels can leak into this standalone image.
    const tile = headCtx.createImageData(32, 44);
    const startX = (index % 4) * 32;
    const startY = Math.floor(index / 4) * 44;
    for (let row = 0; row < 44; row++) {
      const source = ((startY + row) * 128 + startX) * 4;
      tile.data.set(pixels.data.subarray(source, source + 32 * 4), row * 32 * 4);
    }
    headCtx.putImageData(tile, 0, 0);
    heads.push(head);
  }
  return heads;
}
