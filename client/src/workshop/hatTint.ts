import { HAT_SPRITES } from './parts';

const HAT_HUES: Record<number, number> = { 11: 220, 12: 278, 13: 122 };

function hueAndSaturation(r: number, g: number, b: number): [number, number] {
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  const delta = hi - lo;
  if (!delta) return [0, 0];
  let hue = hi === r ? ((g - b) / delta) % 6 : hi === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return [hue, delta / hi];
}

/** Returns a recoloured pixel, or null when the original pixel is trim, highlight or outline. */
export function tintHatPixel(
  id: number,
  r: number,
  g: number,
  b: number,
  color: string,
): [number, number, number] | null {
  if (color === 'original' || !HAT_SPRITES[id]) return null;
  const tone = [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16));
  if (tone.some((channel) => !Number.isFinite(channel))) return null;

  return tintHatPixelWithTone(id, r, g, b, tone as [number, number, number]);
}

function tintHatPixelWithTone(
  id: number,
  r: number,
  g: number,
  b: number,
  tone: [number, number, number],
): [number, number, number] | null {
  const brightness = Math.max(r, g, b);
  if (id === 14) {
    const [, saturation] = hueAndSaturation(r, g, b);
    // The Golden Star hat has charcoal fabric and bright gold details.
    if (brightness < 16 || brightness > 112 || saturation > 0.35) return null;
    const shade = 0.36 + ((brightness - 16) / 96) * 0.56;
    return tone.map((channel) => Math.min(255, Math.round(channel * shade))) as [
      number,
      number,
      number,
    ];
  }

  const sourceHue = HAT_HUES[id];
  const [hue, saturation] = hueAndSaturation(r, g, b);
  const hueDistance = Math.abs(((hue - sourceHue + 540) % 360) - 180);
  if (brightness < 30 || saturation < 0.18 || hueDistance > 45) return null;
  const shade = Math.max(0.14, brightness / 240);
  return tone.map((channel) => Math.min(255, Math.round(channel * shade))) as [
    number,
    number,
    number,
  ];
}

/** Extracts and recolours the main cloth of a hat, leaving trims and outlines intact. */
export function tintHatSprite(
  id: number,
  source: HTMLImageElement,
  color: string,
): HTMLCanvasElement | null {
  const hat = HAT_SPRITES[id];
  if (!hat || color === 'original' || !source.naturalWidth) return null;
  const tone = [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16));
  if (tone.some((channel) => !Number.isFinite(channel))) return null;
  const [x, y, width, height] = hat.rect;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (pixels.data[i + 3] < 8) continue;
    const recoloured = tintHatPixelWithTone(
      id,
      pixels.data[i],
      pixels.data[i + 1],
      pixels.data[i + 2],
      tone as [number, number, number],
    );
    if (!recoloured) continue;
    pixels.data[i] = recoloured[0];
    pixels.data[i + 1] = recoloured[1];
    pixels.data[i + 2] = recoloured[2];
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}
