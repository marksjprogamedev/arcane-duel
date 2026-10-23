import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULTS, DEFAULT_SKIN } from '../../client/src/workshop/parts';
import {
  effectiveLayout,
  loadAppearance,
  loadLayout,
  picked,
  setPicked,
  setSkinTone,
  skinTone,
} from '../../client/src/workshop/store';

describe('Workshop retired-piece migration', () => {
  let saved: Map<string, string>;
  beforeEach(() => {
    saved = new Map();
    vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null });
    setPicked({ ...DEFAULTS });
    setSkinTone(DEFAULT_SKIN);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('replaces retired pieces while preserving allowed boots and skin', () => {
    saved.set(
      'arcane-wizard-workshop',
      JSON.stringify({ head: 0, hat: 5, body: 3, staff: 13, off: 11, feet: 4, skin: '#704737' }),
    );
    loadAppearance();
    expect(picked).toEqual({ head: 16, hat: 0, body: 11, staff: 7, off: 0, feet: 4 });
    expect(skinTone).toBe('#704737');
  });

  it('keeps original allowed IDs so saved head/body pairs and layouts still apply', () => {
    const appearance = { head: 9, hat: 0, body: 11, staff: 12, off: 0, feet: 0 };
    const pair = { x: 8, y: 4, scale: 1.1, rotate: 3 };
    const staff = { x: -5, y: 6, scale: 0.9, rotate: 12 };
    saved.set('arcane-wizard-workshop', JSON.stringify(appearance));
    saved.set('arcane-wizard-layout', JSON.stringify({ 'staff:12': staff }));
    saved.set('arcane-wizard-pair-alignments', JSON.stringify({ headBody: { '9:11': pair } }));
    loadAppearance();
    loadLayout();
    expect(picked).toEqual(appearance);
    expect(effectiveLayout('head', false)).toEqual(pair);
    expect(effectiveLayout('staff', false)).toEqual(staff);
  });
});
