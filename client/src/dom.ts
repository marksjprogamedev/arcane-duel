export const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

export const cv = $<HTMLCanvasElement>('game');

/** The context every draw call paints on: the match canvas, or the spellbook's demo while it draws. */
export let g = cv.getContext('2d')!;

/** Points all drawing at another canvas; returns the previous context so the caller can put it back. */
export function drawOn(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
  const previous = g;
  g = ctx;
  return previous;
}
