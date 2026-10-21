/** Menu and lobby music: one song loops for as long as a menu is showing, and a new one is picked next visit. */
import { game } from '../state';
import {
  isPreviewing,
  loadTrack,
  musicContext,
  onPreviewChange,
  playLoop,
  unlockMusic,
  type Loop,
} from './musicPlayer';
import { arm, onChoiceChange, takeTrack } from './trackChoice';

let playing: Loop | null = null;
let starting = false;
let unlocked = false;

function menuVisible(): boolean {
  const visible = (id: string) => {
    const el = document.getElementById(id);
    return !!el && getComputedStyle(el).display !== 'none';
  };
  return !game.active && (visible('menu') || visible('lobby'));
}

const wanted = () => menuVisible() && unlocked && !isPreviewing();

function silence() {
  playing?.stop();
  playing = null;
}

function sync() {
  if (!wanted()) {
    silence();
    return;
  }
  const ctx = musicContext();
  if (playing || starting || !ctx || ctx.state !== 'running') return;
  const song = takeTrack('menu');
  if (!song) return;
  starting = true;
  loadTrack(song.url)
    .then((buffer) => {
      starting = false;
      if (!playing && wanted()) playing = playLoop(buffer);
    })
    .catch((err) => {
      starting = false;
      console.warn('Arcane Duel menu music:', err);
    });
}

export function initMenuMusic() {
  // Pre-fetch the first song on load, but don't begin playback before an allowed user gesture.
  if (!musicContext()) return;
  arm('menu');
  // choosing a menu song in Settings switches to it at once
  onChoiceChange((kind) => {
    if (kind !== 'menu' || !playing) return;
    silence();
    sync();
  });
  onPreviewChange(sync);

  // Browsers require a user gesture for sound. Resume within the actual gesture handler,
  // even when the song is still loading.
  const unlock = () => {
    if (!menuVisible()) return;
    unlocked = true;
    void unlockMusic().then(sync);
  };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);

  const observer = new MutationObserver(sync);
  for (const id of ['menu', 'lobby']) {
    const el = document.getElementById(id);
    if (el) observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
  }
  sync();
}

/** Silence instantly on match start. Menu music never runs during a duel. */
export function stopMenuMusic() {
  silence();
}
