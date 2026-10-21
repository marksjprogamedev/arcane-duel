// Player settings, kept in localStorage. To add a setting: give it a key and default here, a row in
// the #settings panel of index.html (an input with `data-setting="<key>"`), and read it where used.

export interface Settings {
  /** Menu music loudness, 0 to 100. */
  musicVolume: number;
  musicMuted: boolean;
  /** The song for the menus and lobby: a song id, or "random" to shuffle through them all. */
  menuTrack: string;
  /** The song for fights: a song id, or "random" for a different one each fight. */
  battleTrack: string;
  /** Loudness of interface and effect sounds, 0 to 100. */
  sfxVolume: number;
  /** Show the classic action bar with all ten spells, instead of the four elements that expand into combinations. */
  legacyActionBar: boolean;
}

/** The music started out at a gain of 0.42, so that is the default. */
export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 42,
  musicMuted: false,
  menuTrack: 'random',
  battleTrack: 'random',
  sfxVolume: 70,
  legacyActionBar: false,
};

const STORAGE_KEY = 'arcane-duel-settings';

/** Settings from stored JSON; anything missing or invalid falls back to its default. */
export function parseSettings(raw: string | null): Settings {
  let stored: Partial<Record<keyof Settings, unknown>> = {};
  try {
    const parsed = JSON.parse(raw ?? '');
    if (parsed && typeof parsed === 'object') stored = parsed;
  } catch {
    /* not saved yet, or damaged */
  }
  const level = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.round(Math.min(100, Math.max(0, value)))
      : fallback;
  const track = (value: unknown) =>
    typeof value === 'string' && value.length > 0 && value.length <= 64 ? value : 'random';
  return {
    menuTrack: track(stored.menuTrack),
    battleTrack: track(stored.battleTrack),
    musicVolume: level(stored.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: level(stored.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    musicMuted:
      typeof stored.musicMuted === 'boolean' ? stored.musicMuted : DEFAULT_SETTINGS.musicMuted,
    legacyActionBar:
      typeof stored.legacyActionBar === 'boolean'
        ? stored.legacyActionBar
        : DEFAULT_SETTINGS.legacyActionBar,
  };
}

/** The gain (0 to 1) the menu music plays at. */
export const musicGain = (s: Settings) => (s.musicMuted ? 0 : s.musicVolume / 100);

/** The gain (0 to 1) interface and effect sounds play at. */
export const sfxGain = (s: Settings) => s.sfxVolume / 100;

const read = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked: settings last for this visit only
  }
};

let current = parseSettings(read());
const listeners = new Set<(s: Settings) => void>();

export const getSettings = (): Readonly<Settings> => current;

/** Calls `fn` with the settings now and after every change. */
export function onSettings(fn: (s: Settings) => void) {
  listeners.add(fn);
  fn(current);
}

export function updateSettings(patch: Partial<Settings>) {
  current = parseSettings(JSON.stringify({ ...current, ...patch }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* storage blocked */
  }
  for (const fn of listeners) fn(current);
}
