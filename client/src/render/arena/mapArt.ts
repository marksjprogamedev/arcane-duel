// Painted map pieces (SVGs in client/public/art/map). Loaded once, on first use; `onReady` fires when
// they are all decoded so a cached background can repaint itself with them.
const FILES = {
  rockA: '/art/map/rock_a.svg',
  rockB: '/art/map/rock_b.svg',
  rockC: '/art/map/rock_c.svg',
  bush: '/art/map/bush.svg',
  grass: '/art/map/grass_tile.svg',
} as const;

export type MapArtName = keyof typeof FILES;

const images = new Map<MapArtName, HTMLImageElement>();
let started = false;
const waiting: (() => void)[] = [];

/** The decoded image, or undefined while it is still loading (the first call starts loading them all). */
export function mapArt(name: MapArtName): HTMLImageElement | undefined {
  if (!started && typeof Image !== 'undefined') {
    started = true;
    let left = Object.keys(FILES).length;
    for (const [key, url] of Object.entries(FILES) as [MapArtName, string][]) {
      const img = new Image();
      img.onload = () => {
        images.set(key, img);
        if (--left === 0) for (const fn of waiting.splice(0)) fn();
      };
      img.src = url;
    }
  }
  return images.get(name);
}

/** Calls `fn` once every piece has loaded. */
export function onMapArtReady(fn: () => void) {
  waiting.push(fn);
}
