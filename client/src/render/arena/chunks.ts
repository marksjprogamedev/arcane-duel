// A big static background drawn from cached tiles. Each tile is painted once, when it first comes
// into view, and later frames just copy the tiles the camera can see.
import { camera, VIEW_H, VIEW_W } from '../camera';

export const CHUNK = 512;

export class ChunkedBackground {
  private tiles = new Map<number, HTMLCanvasElement>();

  /** `paint` draws the world region of one tile; the context is already moved to the tile's origin. */
  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly paint: (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => void,
  ) {}

  /** Draws the visible tiles in world coordinates (call inside the camera transform). */
  draw(ctx: CanvasRenderingContext2D) {
    const x0 = Math.max(0, Math.floor(camera.x / CHUNK));
    const y0 = Math.max(0, Math.floor(camera.y / CHUNK));
    const x1 = Math.min(Math.ceil(this.width / CHUNK) - 1, Math.floor((camera.x + VIEW_W) / CHUNK));
    const y1 = Math.min(
      Math.ceil(this.height / CHUNK) - 1,
      Math.floor((camera.y + VIEW_H) / CHUNK),
    );
    for (let cy = y0; cy <= y1; cy++)
      for (let cx = x0; cx <= x1; cx++) ctx.drawImage(this.tile(cx, cy), cx * CHUNK, cy * CHUNK);
  }

  /** Forgets every painted tile so they are painted again (when the art they use has loaded). */
  invalidate() {
    this.tiles.clear();
  }

  /** How many tiles have been painted so far. */
  get painted() {
    return this.tiles.size;
  }

  private tile(cx: number, cy: number): HTMLCanvasElement {
    const key = cy * 1000 + cx;
    let tile = this.tiles.get(key);
    if (!tile) {
      const x = cx * CHUNK,
        y = cy * CHUNK;
      const w = Math.min(CHUNK, this.width - x),
        h = Math.min(CHUNK, this.height - y);
      tile = document.createElement('canvas');
      tile.width = w;
      tile.height = h;
      const t = tile.getContext('2d')!;
      t.translate(-x, -y);
      this.paint(t, x, y, w, h);
      this.tiles.set(key, tile);
    }
    return tile;
  }
}
