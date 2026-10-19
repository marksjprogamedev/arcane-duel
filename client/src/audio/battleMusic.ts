/** Shadow Runes V25 — decoded buffer looping during matches only. */
import { musicGain, onSettings } from '../settings';

const BATTLE_THEME_URL = '/audio/arcane_duel_shadow_runes_v25_subdued_bells.ogg';
let context: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let volume: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;
let requested = false;
let paused = false;
let offset = 0;
let startedAt = 0;

function silence(rememberPosition = false) {
  if (!source) return;
  if (rememberPosition && context && buffer) {
    offset = (context.currentTime - startedAt) % buffer.duration;
  }
  try {
    source.stop();
  } catch {
    /* already stopped */
  }
  source.disconnect();
  source = null;
}

function sync() {
  if (!requested || paused || !context || !buffer || !volume) return;
  if (context.state !== 'running' || source) return;
  source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(volume);
  const at = offset % buffer.duration;
  startedAt = context.currentTime - at;
  source.start(0, at);
}

export function initBattleMusic() {
  try {
    context = new AudioContext();
    volume = context.createGain();
    volume.connect(context.destination);
    onSettings((settings) =>
      volume!.gain.setTargetAtTime(musicGain(settings), context!.currentTime, 0.03),
    );
    void fetch(BATTLE_THEME_URL)
      .then((response) => {
        if (!response.ok) throw new Error('Battle theme unavailable: ' + response.status);
        return response.arrayBuffer();
      })
      .then((bytes) => context!.decodeAudioData(bytes))
      .then((decoded) => {
        buffer = decoded;
        sync();
      })
      .catch((err) => console.warn('Arcane Duel battle music:', err));
  } catch (err) {
    console.warn('Arcane Duel battle audio unavailable:', err);
    return;
  }

  // Unlock Web Audio during a real user gesture; online start messages arrive asynchronously.
  const unlock = () => {
    if (context?.state === 'suspended') {
      void context
        .resume()
        .then(sync)
        .catch(() => {});
    }
  };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
}

/** Fresh start for each solo or multiplayer round. */
export function startBattleMusic() {
  silence();
  offset = 0;
  paused = false;
  requested = true;
  sync();
  if (context?.state === 'suspended') {
    void context
      .resume()
      .then(sync)
      .catch(() => {});
  }
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
  requested = false;
  paused = false;
  silence();
  offset = 0;
}
