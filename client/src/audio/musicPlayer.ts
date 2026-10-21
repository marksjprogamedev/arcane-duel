// What the menu music, the battle music and the settings preview share: one audio context and music
// volume, a cache of decoded songs, and looping a decoded song.
import { musicGain, onSettings } from '../settings';

let context: AudioContext | null = null;
let volume: GainNode | null = null;

/** The one audio context for music, made on first use; null where audio is unavailable. */
export function musicContext(): AudioContext | null {
  if (context) return context;
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    // the settings page changes the volume live
    onSettings((s) => gain.gain.setTargetAtTime(musicGain(s), ctx.currentTime, 0.03));
    context = ctx;
    volume = gain;
  } catch (err) {
    console.warn('Arcane Duel music unavailable:', err);
  }
  return context;
}

/** Browsers only allow sound after a click or key press: call this from one. */
export function unlockMusic(): Promise<void> {
  const ctx = musicContext();
  return ctx && ctx.state !== 'running' ? ctx.resume().catch(() => {}) : Promise.resolve();
}

const decoded = new Map<string, Promise<AudioBuffer>>();

/** Fetches and decodes a song once; later calls share the result. Songs are about 1 MB, so only load what is about to play. */
export function loadTrack(url: string): Promise<AudioBuffer> {
  let song = decoded.get(url);
  if (!song) {
    const ctx = musicContext();
    song = !ctx
      ? Promise.reject(new Error('no audio'))
      : fetch(url)
          .then((response) => {
            if (!response.ok) throw new Error('Song unavailable: ' + response.status);
            return response.arrayBuffer();
          })
          .then((bytes) => ctx.decodeAudioData(bytes));
    decoded.set(url, song);
    song.catch(() => decoded.delete(url)); // try again next time
  }
  return song;
}

export interface Loop {
  /** Stops the song; returns how far into it (seconds) it had got, to carry on from there. */
  stop(): number;
}

/** Starts a song looping from `offset` seconds, or null if the context is not running yet. */
export function playLoop(song: AudioBuffer, offset = 0): Loop | null {
  const ctx = musicContext();
  if (!ctx || !volume || ctx.state !== 'running') return null;
  const source = ctx.createBufferSource();
  source.buffer = song;
  source.loop = true;
  source.connect(volume);
  const at = offset % song.duration;
  const startedAt = ctx.currentTime - at;
  source.start(0, at);
  return {
    stop() {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      source.disconnect();
      return (ctx.currentTime - startedAt) % song.duration;
    },
  };
}

// ---- preview: the settings page plays a song to try it, and the other music steps aside

let preview: Loop | null = null;
const previewListeners = new Set<() => void>();

export const isPreviewing = () => preview !== null;

/** Calls `fn` whenever a preview starts or stops. */
export function onPreviewChange(fn: () => void) {
  previewListeners.add(fn);
}

export function startPreview(song: AudioBuffer) {
  stopPreview();
  preview = playLoop(song);
  if (preview) for (const fn of previewListeners) fn();
}

export function stopPreview() {
  if (!preview) return;
  preview.stop();
  preview = null;
  for (const fn of previewListeners) fn();
}
