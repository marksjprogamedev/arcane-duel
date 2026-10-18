/** Menu/lobby-only music. Never plays during a match or pause overlay. */
import { game } from '../state';

const THEME_URL = '/audio/arcane_duel_menu_waltz_FINAL_no_cymbal.ogg';
let track: HTMLAudioElement | null = null;
let unlocked = false;

function inMenu(): boolean {
  const menu = document.getElementById('menu');
  const lobby = document.getElementById('lobby');
  const visible = (el: HTMLElement | null) => !!el && getComputedStyle(el).display !== 'none';
  return !game.active && (visible(menu) || visible(lobby));
}

function syncMenuMusic() {
  if (!track) return;
  if (!inMenu()) {
    track.pause();
    track.currentTime = 0;
    return;
  }
  if (unlocked && track.paused) void track.play().catch(() => {});
}

export function initMenuMusic() {
  track = new Audio(THEME_URL);
  track.loop = true;
  track.volume = 0.42;
  track.preload = 'auto';

  // Browsers require a user interaction before audio can play.
  const unlock = () => {
    if (!inMenu()) return;
    unlocked = true;
    syncMenuMusic();
  };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);

  // Menu, lobby and match transitions already change visibility on these elements.
  const observer = new MutationObserver(syncMenuMusic);
  for (const id of ['menu', 'lobby']) {
    const el = document.getElementById(id);
    if (el) observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
  }
  syncMenuMusic();
}

/** Called at match start: silence the theme immediately, before changing the overlays. */
export function stopMenuMusic() {
  if (!track) return;
  track.pause();
  track.currentTime = 0;
}
