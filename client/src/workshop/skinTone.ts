// Tints the grayscale heads sheet and the staff-grip fist with the chosen skin tone. Shared by the Workshop preview and
// the in-match renderer so the tinting is written once.
import { GRIP_URL, HEADS_MASK_URL, HEADS_URL, LEFT_HAND_URL } from './parts';

const base = new Image();
const mask = new Image();
const listeners: (() => void)[] = [];

function loaded() {
  if (!base.complete || !mask.complete || !base.naturalWidth || !mask.naturalWidth) return;
  for (const listener of listeners) listener();
}
base.onload = loaded;
mask.onload = loaded;
const gripSource = new Image();
const gripListeners: (() => void)[] = [];
gripSource.onload = () => {
  for (const listener of gripListeners) listener();
};
base.src = HEADS_URL;
mask.src = HEADS_MASK_URL;
gripSource.src = GRIP_URL;

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

/** Calls `listener` once the greyscale staff-grip image has loaded. */
export function onGripLoaded(listener: () => void) {
  gripListeners.push(listener);
}

/** Recolors the greyscale staff-grip fist with the skin tone. Returns null until it has loaded. */
export function tintGrip(skin: string): HTMLCanvasElement | null {
  if (!gripSource.naturalWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = gripSource.naturalWidth;
  canvas.height = gripSource.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(gripSource, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const tone = [1, 3, 5].map((i) => parseInt(skin.slice(i, i + 2), 16));
  for (let i = 0; i < image.data.length; i += 4) {
    const gray = image.data[i];
    if (image.data[i + 3] === 0 || gray < 48) continue; // Preserve the dark outlines.
    const shade = gray / 175;
    for (let ch = 0; ch < 3; ch++) image.data[i + ch] = Math.min(255, Math.round(tone[ch] * shade));
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

const leftHandSource = new Image();
const leftHandListeners: (() => void)[] = [];
leftHandSource.onload = () => {
  for (const listener of leftHandListeners) listener();
};
leftHandSource.src = LEFT_HAND_URL;

/** Notify the preview and match renderer when the new offhand asset is ready. */
export function onLeftHandLoaded(listener: () => void) {
  leftHandListeners.push(listener);
  if (leftHandSource.naturalWidth) listener();
}

/** Apply the same chosen skin tone as the head and staff grip, preserving alpha and shading. */
export function tintLeftHand(skin: string): HTMLCanvasElement | null {
  if (!leftHandSource.naturalWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = leftHandSource.naturalWidth;
  canvas.height = leftHandSource.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(leftHandSource, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const tone = [1, 3, 5].map((i) => parseInt(skin.slice(i, i + 2), 16));
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (pixels.data[i + 3] === 0) continue;
    // Keep the restored dark border dark while tinting the shaded hand.
    const gray = pixels.data[i];
    if (gray < 38) continue;
    const shade = gray / 150;
    for (let ch = 0; ch < 3; ch++)
      pixels.data[i + ch] = Math.min(255, Math.round(tone[ch] * shade));
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}
