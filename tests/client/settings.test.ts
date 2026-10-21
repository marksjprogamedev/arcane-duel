import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, musicGain, parseSettings, sfxGain } from '../../client/src/settings';

describe('settings', () => {
  it('starts at the volume the music always had, unmuted', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(musicGain(DEFAULT_SETTINGS)).toBeCloseTo(0.42);
  });

  it('reads saved values and clamps the volume to 0..100', () => {
    expect(parseSettings('{"musicVolume":80,"musicMuted":true}')).toEqual({
      musicVolume: 80,
      musicMuted: true,
      menuTrack: 'random',
      battleTrack: 'random',
      sfxVolume: 70,
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

  it('keeps a separate, clamped effects volume that mute does not touch', () => {
    expect(DEFAULT_SETTINGS.sfxVolume).toBe(70);
    expect(sfxGain(DEFAULT_SETTINGS)).toBeCloseTo(0.7);
    expect(parseSettings('{"sfxVolume":30}').sfxVolume).toBe(30);
    expect(parseSettings('{"sfxVolume":900}').sfxVolume).toBe(100);
    expect(parseSettings('{"sfxVolume":-1}').sfxVolume).toBe(0);
    expect(parseSettings('{"sfxVolume":"loud"}').sfxVolume).toBe(70);
    expect(sfxGain(parseSettings('{"musicMuted":true,"sfxVolume":50}'))).toBeCloseTo(0.5);
  });

  it('shuffles the songs unless one is chosen, and ignores a bad choice', () => {
    expect(DEFAULT_SETTINGS.menuTrack).toBe('random');
    expect(DEFAULT_SETTINGS.battleTrack).toBe('random');
    const chosen = parseSettings('{"menuTrack":"menu_waltz","battleTrack":"shadow_runes"}');
    expect(chosen.menuTrack).toBe('menu_waltz');
    expect(chosen.battleTrack).toBe('shadow_runes');
    expect(parseSettings('{"battleTrack":42}').battleTrack).toBe('random');
    expect(parseSettings('{"battleTrack":""}').battleTrack).toBe('random');
    expect(parseSettings('{"menuTrack":"' + 'x'.repeat(65) + '"}').menuTrack).toBe('random');
  });
});
