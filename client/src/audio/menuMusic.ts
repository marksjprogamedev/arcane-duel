/** Menu and lobby music only. Web Audio buffer loops without HTMLAudioElement restart gaps. */
import { musicGain, onSettings } from '../settings';
import { game } from '../state';

const THEME_URL = '/audio/arcane_duel_menu_waltz_FINAL_no_cymbal.ogg';
let context: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let source: AudioBufferSourceNode | null = null;
let volume: GainNode | null = null;
let unlocked = false;
let loading: Promise<void> | null = null;

function menuVisible(): boolean {
  const visible = (id: string) => {
    const el = document.getElementById(id);
    return !!el && getComputedStyle(el).display !== 'none';
  };
  return !game.active && (visible('menu') || visible('lobby'));
}

function silence() {
  if (!source) return;
  try {
    source.stop();
  } catch {
    /* already stopped */
  }
  source.disconnect();
  source = null;
}

function sync() {
  if (!menuVisible() || !unlocked) {
    silence();
    return;
  }
  if (!context || !buffer || !volume || context.state !== 'running' || source) return;
  source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(volume);
  source.start();
}

export function initMenuMusic() {
  // Pre-fetch and decode on load, but don't begin playback before an allowed user gesture.
  try {
    context = new AudioContext();
    volume = context.createGain();
    volume.connect(context.destination);
    // the settings page changes the volume live
    onSettings((s) => volume!.gain.setTargetAtTime(musicGain(s), context!.currentTime, 0.03));
    loading = fetch(THEME_URL)
      .then((response) => {
        if (!response.ok) throw new Error('Menu theme unavailable: ' + response.status);
        return response.arrayBuffer();
      })
      .then((data) => context!.decodeAudioData(data))
      .then((decoded) => {
        buffer = decoded;
        sync();
      })
      .catch((err) => {
        console.warn('Arcane Duel menu music:', err);
      });
  } catch (err) {
    console.warn('Arcane Duel menu audio unavailable:', err);
    return;
  }

  // Browsers require a user gesture for sound. Resume within the actual gesture handler,
  // even when the audio file is still decoding.
  const unlock = () => {
    if (!menuVisible() || !context) return;
    unlocked = true;
    void context
      .resume()
      .then(sync)
      .catch(() => {});
  };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);

  const observer = new MutationObserver(sync);
  for (const id of ['menu', 'lobby']) {
    const el = document.getElementById(id);
    if (el) observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
  }
  void loading;
  sync();
}

/** Silence instantly on match start. Menu music never runs during a duel. */
export function stopMenuMusic() {
  silence();
}
