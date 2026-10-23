import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AVAILABLE,
  DEFAULTS,
  DEFAULT_ROBE_COLOR,
  DEFAULT_SKIN,
  HAT_SPRITES,
  OFFHAND_SPRITES,
} from '../../client/src/workshop/parts';
import {
  effectiveLayout,
  DEFAULT_LAYOUT,
  loadAppearance,
  loadLayout,
  picked,
  setPicked,
  setSkinTone,
  skinTone,
  editPairField,
  pairExport,
  sanitiseLayout,
  saveCurrentPair,
  saveLayout,
  setLayoutField,
  startPairEditing,
  pairAlignments,
  DEFAULT_PAIR_ALIGNMENTS,
  layoutValue,
} from '../../client/src/workshop/store';

describe('Workshop retired-piece migration', () => {
  let saved: Map<string, string>;
  beforeEach(() => {
    saved = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    setPicked({ ...DEFAULTS });
    setSkinTone(DEFAULT_SKIN);
    startPairEditing(null);
    for (const kind of ['hatHead', 'headBody'] as const) {
      for (const key of Object.keys(pairAlignments[kind])) delete pairAlignments[kind][key];
      Object.assign(pairAlignments[kind], structuredClone(DEFAULT_PAIR_ALIGNMENTS[kind]));
    }
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

  it('offers the approved hats without reusing retired hat IDs', () => {
    expect(AVAILABLE.hat).toEqual([0, 11, 12, 13, 14]);
    for (const hat of AVAILABLE.hat.slice(1)) {
      saved.set('arcane-wizard-workshop', JSON.stringify({ ...DEFAULTS, hat }));
      loadAppearance();
      expect(picked.hat).toBe(hat);
      expect(HAT_SPRITES[hat]).toBeDefined();
    }
  });

  it('keeps the previous fresh-browser defaults while adding the exported build layouts', () => {
    expect(DEFAULTS).toEqual({ head: 16, hat: 0, body: 11, staff: 7, off: 0, feet: 9 });
    expect(DEFAULT_ROBE_COLOR).toBe('original');
    expect(DEFAULT_LAYOUT['body:13']).toEqual({ x: 3, y: 0, scale: 1.4, rotate: 0 });
    expect(DEFAULT_LAYOUT['hat:14']).toEqual({ x: -13, y: 22, scale: 1, rotate: -8 });
    expect(DEFAULT_LAYOUT['off:13']).toEqual({ x: -20, y: -2, scale: 1.7, rotate: 0 });
    expect(DEFAULT_LAYOUT['staff:8']).toEqual({
      x: 25,
      y: -28,
      scale: 1.1,
      rotate: -12,
      flipX: true,
    });
    expect(DEFAULT_LAYOUT['handStaff:8']).toEqual({ x: 4, y: -20, scale: 0.8, rotate: 0 });
  });

  it('offers the uploaded star hat and shields as standalone transparent sprites', () => {
    expect(HAT_SPRITES[14]).toMatchObject({
      url: '/art/workshop/hat_golden_star.png',
      rect: [43, 105, 1161, 1149],
      imageWidth: 1254,
      imageHeight: 1254,
    });
    expect(AVAILABLE.off).toEqual([0, 12, 13]);
    expect(OFFHAND_SPRITES[12]).toMatchObject({
      url: '/art/workshop/round_shield.png',
      rect: [3, 3, 518, 651],
    });
    expect(OFFHAND_SPRITES[13]).toMatchObject({
      url: '/art/workshop/tall_shield.png',
      rect: [3, 3, 431, 789],
    });
    for (const off of [12, 13]) {
      saved.set('arcane-wizard-workshop', JSON.stringify({ ...DEFAULTS, off }));
      loadAppearance();
      expect(picked.off).toBe(off);
    }
  });

  it('saves a head–star-hat pair under the new hat ID', () => {
    setPicked({ ...DEFAULTS, hat: 14 });
    startPairEditing('hatHead');
    editPairField({ x: 7, y: -12, scale: 0.92, rotate: 4 });
    expect(saveCurrentPair()).toBe(true);
    expect(JSON.parse(pairExport()).pairs.hatHead['16:14']).toMatchObject({
      x: 7,
      y: -12,
      scale: 0.92,
      rotate: 4,
    });
  });

  it('round-trips per-hat mirroring independently from position, tilt and size', () => {
    setPicked({ ...DEFAULTS, hat: 11 });
    loadLayout();
    const layout = { x: 4, y: 6, scale: 1.2, rotate: 15, flipX: true };
    setLayoutField('hat', layout);
    expect(saveLayout()).toBe(true);
    loadLayout();
    expect(effectiveLayout('hat', false)).toEqual(layout);
    setPicked({ ...DEFAULTS, hat: 12 });
    expect(effectiveLayout('hat', false).flipX).toBeFalsy();
  });

  it('saves and exports mirror state with a pair, including switching back to unmirrored', () => {
    setPicked({ ...DEFAULTS, hat: 13 });
    loadLayout();
    startPairEditing('hatHead');
    editPairField({ flipX: true, rotate: -12 });
    expect(saveCurrentPair()).toBe(true);
    startPairEditing(null);
    loadLayout();
    expect(effectiveLayout('hat', false)).toMatchObject({ flipX: true, rotate: -12 });
    expect(JSON.parse(pairExport()).pairs.hatHead['16:13'].flipX).toBe(true);
    startPairEditing('hatHead');
    editPairField({ flipX: false });
    saveCurrentPair();
    startPairEditing(null);
    expect(JSON.parse(saved.get('arcane-wizard-pair-alignments')!).hatHead['16:13'].flipX).toBe(
      false,
    );
  });

  it('accepts old layouts while rejecting non-boolean mirror values', () => {
    const old = { x: 0, y: 1, scale: 1, rotate: 0 };
    expect(sanitiseLayout({ 'hat:11': old })['hat:11']).toEqual(old);
    expect(sanitiseLayout({ 'hat:11': { ...old, flipX: 'false' } })['hat:11']).toEqual(old);
  });

  function loadOffsetHat(withHatPair = false) {
    setPicked({ ...DEFAULTS, hat: 11 });
    const hat = { x: 5, y: 12, scale: 1, rotate: 0 };
    saved.set('arcane-wizard-layout', JSON.stringify({ 'hat:11': hat }));
    saved.set(
      'arcane-wizard-pair-alignments',
      JSON.stringify({
        headBody: { '16:11': { x: 15, y: -8, scale: 1, rotate: 0 } },
        hatHead: withHatPair ? { '16:11': hat } : {},
      }),
    );
    loadLayout();
    return hat;
  }

  it('tilts an individual hat without accumulating the head/body position offset', () => {
    const hat = loadOffsetHat();
    const before = effectiveLayout('hat');
    expect(before).toMatchObject({ x: 29, y: -3 });
    for (const rotate of [15, 30, -20, 0]) {
      setLayoutField('hat', { rotate });
      expect(effectiveLayout('hat')).toEqual({ ...before, rotate });
      expect(layoutValue('hat')).toEqual({ ...hat, rotate });
    }
    setLayoutField('hat', { flipX: true });
    expect(effectiveLayout('hat')).toMatchObject({ x: before.x, y: before.y });
    saveLayout();
    loadLayout();
    expect(effectiveLayout('hat')).toMatchObject({ x: before.x, y: before.y });
  });

  it('keeps hat pair position stable when entering, tilting, saving and reopening the editor', () => {
    const hat = loadOffsetHat(true);
    const before = effectiveLayout('hat', false);
    for (const rotate of [15, -10, 0]) {
      startPairEditing('hatHead');
      expect(effectiveLayout('hat')).toMatchObject({ x: before.x, y: before.y });
      editPairField({ rotate });
      expect(layoutValue('hat')).toEqual({ ...hat, rotate });
      expect(effectiveLayout('hat')).toEqual({ ...before, rotate });
      saveCurrentPair();
      startPairEditing(null);
      loadLayout();
      expect(effectiveLayout('hat', false)).toEqual({ ...before, rotate });
    }
    expect(JSON.parse(pairExport()).pairs.hatHead['16:11']).toEqual(hat);
  });
});
