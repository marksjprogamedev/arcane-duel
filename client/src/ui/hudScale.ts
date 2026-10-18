import { $ } from '../dom';
import { VIEW_W } from '../render/cameraMath';

/**
 * The DOM HUD is laid out in the viewport's logical size; this scales it with the stage, which CSS
 * sizes to the window, so it always covers the canvas exactly.
 */
export function initHudScale() {
  const hud = $('hud');
  new ResizeObserver(([stage]) =>
    hud.style.setProperty('--ui-scale', String(stage.contentRect.width / VIEW_W)),
  ).observe(hud.parentElement!);
}
