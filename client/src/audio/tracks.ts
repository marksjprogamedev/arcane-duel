// The song list. Songs are the .ogg files in the folders below, found when the game is built: to add a
// song, drop a file in a folder (see docs/AUDIO-PLAN.md). The file name is the song's id, and its title is
// the name with underscores as spaces, so `shadow_runes.ogg` is "Shadow Runes".

export type MusicKind = 'menu' | 'battle';

export interface Track {
  id: string;
  title: string;
  url: string;
}

/** "shadow_runes" becomes "Shadow Runes". */
export function titleFromId(id: string): string {
  return id
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

/** Tracks from a map of file path to URL (what the build gives us), in alphabetical order of id. */
export function tracksFrom(files: Record<string, string>): Track[] {
  return Object.entries(files)
    .map(([path, url]) => {
      const id = (path.split('/').pop() ?? path).replace(/\.[^.]+$/, '');
      return { id, title: titleFromId(id), url };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

const glob = (files: Record<string, unknown>) => files as Record<string, string>;

export const TRACKS: Record<MusicKind, Track[]> = {
  menu: tracksFrom(
    glob(import.meta.glob('./music/menu/*.ogg', { query: '?url', import: 'default', eager: true })),
  ),
  battle: tracksFrom(
    glob(
      import.meta.glob('./music/battle/*.ogg', { query: '?url', import: 'default', eager: true }),
    ),
  ),
};
