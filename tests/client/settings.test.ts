import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, musicGain, parseSettings } from '../../client/src/settings';

describe('settings', () => {
  it('starts at the volume the music always had, unmuted', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(musicGain(DEFAULT_SETTINGS)).toBeCloseTo(0.42);
  });

  it('reads saved values and clamps the volume to 0..100', () => {
    expect(parseSettings('{"musicVolume":80,"musicMuted":true}')).toEqual({
      musicVolume: 80,
      musicMuted: true,
      legacyActionBar: false,
    });
    expect(parseSettings('{"musicVolume":250}').musicVolume).toBe(100);
    expect(parseSettings('{"musicVolume":-5}').musicVolume).toBe(0);
  });

  it('ignores damaged or wrongly typed storage', () => {
    expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{"musicVolume":"loud","musicMuted":1}')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('null')).toEqual(DEFAULT_SETTINGS);
  });

  it('starts on the new action bar and remembers a choice of the legacy one', () => {
    expect(DEFAULT_SETTINGS.legacyActionBar).toBe(false);
    expect(parseSettings('{"legacyActionBar":true}').legacyActionBar).toBe(true);
    expect(parseSettings('{"legacyActionBar":"yes"}').legacyActionBar).toBe(false);
  });

  it('plays silently while muted without forgetting the volume', () => {
    const muted = parseSettings('{"musicVolume":70,"musicMuted":true}');
    expect(musicGain(muted)).toBe(0);
    expect(muted.musicVolume).toBe(70);
    expect(musicGain({ ...muted, musicMuted: false })).toBeCloseTo(0.7);
  });
});
