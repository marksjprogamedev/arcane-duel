// Which song plays next. A song chosen in Settings is always used; on "random" the songs shuffle
// (see shuffle.ts). The next song is picked ("armed") ahead of time so it can load while this one plays.
import { getSettings, onSettings } from '../settings';
import { loadTrack } from './musicPlayer';
import { newShuffle, pickNext, type ShuffleState } from './shuffle';
import { TRACKS, type MusicKind, type Track } from './tracks';

const shuffles: Record<MusicKind, ShuffleState> = { menu: newShuffle(), battle: newShuffle() };
const armed: Record<MusicKind, Track | null> = { menu: null, battle: null };

const chosen = (kind: MusicKind) => getSettings()[kind === 'menu' ? 'menuTrack' : 'battleTrack'];

function choose(kind: MusicKind): Track | null {
  const list = TRACKS[kind];
  const pinned = chosen(kind);
  const song = pinned !== 'random' && list.find((t) => t.id === pinned);
  if (song) return song;
  const next = pickNext(
    shuffles[kind],
    list.map((t) => t.id),
    Math.random,
  );
  shuffles[kind] = next.state;
  return list.find((t) => t.id === next.id) ?? null;
}

/** Picks the song for next time and starts loading it. */
export function arm(kind: MusicKind) {
  armed[kind] = choose(kind);
  const song = armed[kind];
  if (song) void loadTrack(song.url).catch(() => {});
}

/** The song to play now (the one armed, or a fresh pick), and arms the one after it. */
export function takeTrack(kind: MusicKind): Track | null {
  const song = armed[kind] ?? choose(kind);
  armed[kind] = null;
  arm(kind);
  return song;
}

/** The song for a preview of `id` ("random" gives any song). */
export function previewTrack(kind: MusicKind, id: string): Track | null {
  const list = TRACKS[kind];
  return list.find((t) => t.id === id) ?? list[Math.floor(Math.random() * list.length)] ?? null;
}

/** Calls `fn(kind)` when the song chosen in Settings for that kind changes. */
export function onChoiceChange(fn: (kind: MusicKind) => void) {
  const last = { menu: chosen('menu'), battle: chosen('battle') };
  onSettings(() => {
    for (const kind of ['menu', 'battle'] as const) {
      if (chosen(kind) === last[kind]) continue;
      last[kind] = chosen(kind);
      if (armed[kind]) arm(kind); // the armed song may no longer be the one asked for
      fn(kind);
    }
  });
}
