/** Fight music: a song is picked at the start of each fight and loops until it ends. */
import {
  isPreviewing,
  loadTrack,
  musicContext,
  onPreviewChange,
  playLoop,
  stopPreview,
  unlockMusic,
  type Loop,
} from './musicPlayer';
import { arm, takeTrack } from './trackChoice';

let song: AudioBuffer | null = null;
let playing: Loop | null = null;
let requested = false;
let paused = false;
let offset = 0;
/** Counts fights, so a song still loading for a fight that is already over is ignored. */
let session = 0;

function silence(rememberPosition = false) {
  if (!playing) return;
  const position = playing.stop();
  if (rememberPosition) offset = position;
  playing = null;
}

function sync() {
  if (!requested || paused || isPreviewing() || !song || playing) return;
  if (musicContext()?.state !== 'running') return;
  playing = playLoop(song, offset);
}

export function initBattleMusic() {
  if (!musicContext()) return;
  arm('battle'); // the song for the first fight loads while the menus show
  onPreviewChange(() => {
    if (isPreviewing()) silence(true);
    else sync();
  });

  // Unlock Web Audio during a real user gesture; online start messages arrive asynchronously.
  const unlock = () => void unlockMusic().then(sync);
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
}

/** Fresh start, with a newly picked song, for each solo or multiplayer round. */
export function startBattleMusic() {
  stopPreview();
  silence();
  offset = 0;
  paused = false;
  requested = true;
  song = null;
  const mine = ++session;
  const track = takeTrack('battle');
  if (track)
    loadTrack(track.url)
      .then((buffer) => {
        if (mine !== session) return;
        song = buffer;
        sync();
      })
      .catch((err) => console.warn('Arcane Duel battle music:', err));
  void unlockMusic().then(sync);
}

/** Paused solo matches should not continue their soundtrack. */
export function pauseBattleMusic(isPaused: boolean) {
  if (!requested) return;
  paused = isPaused;
  if (paused) silence(true);
  else sync();
}

/** Stop on results, returning to a menu/lobby, or losing the online room. */
export function stopBattleMusic() {
  session++;
  requested = false;
  paused = false;
  silence();
  song = null;
  offset = 0;
}
