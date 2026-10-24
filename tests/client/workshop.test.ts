import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AVAILABLE,
  DEFAULTS,
  DEFAULT_ROBE_COLOR,
  DEFAULT_SKIN,
  HAT_SPRITES,
  OFFHAND_SPRITES,
  MAINHAND_SPRITES,
} from '../../client/src/workshop/parts';
import {
  effectiveLayout,
  DEFAULT_LAYOUT,
  loadAppearance,
  loadLayout,
  picked,
  hatColor,
  robeColor,
  setPicked,
  setHatColor,
  setRobeColor,
  setSkinTone,
  skinTone,
  editPairField,
  pairExport,
  sanitiseLayout,
  saveCurrentPair,
  saveLayout,
  saveAppearance,
  setLayoutField,
  startPairEditing,
  pairAlignments,
  DEFAULT_PAIR_ALIGNMENTS,
  layoutValue,
} from '../../client/src/workshop/store';
import { groundedSpritePlacement } from '../../client/src/workshop/grounding';
import { tintHatPixel } from '../../client/src/workshop/hatTint';
import { SHIELD_VISUAL } from '../../client/src/render/world/shieldVisual';
import sharedWorkshop from '../../client/src/workshop/shared-workshop.json';

describe('Elemental shield visual', () => {
  it('is raised and wider while keeping the same height', () => {
    expect(SHIELD_VISUAL).toMatchObject({ offsetY: -29, radiusX: 44, radiusY: 52 });
  });
});

describe('Workshop hat dye', () => {
  it('tints the hat fabric and leaves trim and outlines untouched', () => {
    expect(tintHatPixel(11, 18, 105, 236, '#c4444e')).toEqual([193, 67, 77]);
    expect(tintHatPixel(11, 224, 172, 58, '#c4444e')).toBeNull();
    expect(tintHatPixel(11, 8, 10, 20, '#c4444e')).toBeNull();
  });

  it('dyes the dark fabric of the Golden Star hat without tinting its gold stars', () => {
    expect(tintHatPixel(14, 42, 40, 47, '#3379cf')).not.toBeNull();
    expect(tintHatPixel(14, 240, 181, 47, '#3379cf')).toBeNull();
    expect(tintHatPixel(14, 8, 8, 12, '#3379cf')).toBeNull();
  });
});

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

  it('keeps grounded layers attached to their bottom-centre when rotated', () => {
    const placement = groundedSpritePlacement({ x: 65, y: 141, w: 130, h: 149 }, 130, 131, 0.32, {
      x: 3,
      y: 0,
      scale: 1,
      rotate: 18,
    });
    expect(placement.x).toBeCloseTo(1.6);
    expect(placement.y + placement.pivotY).toBeCloseTo(-23.84);
    expect(placement.width).toBeCloseTo(41.6);
    expect(placement.height).toBeCloseTo(41.92);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('replaces retired pieces while preserving allowed boots and skin', () => {
    saved.set(
      'arcane-wizard-workshop',
      JSON.stringify({ head: 0, hat: 5, body: 3, staff: 13, off: 11, feet: 4, skin: '#704737' }),
    );
    loadAppearance();
    expect(picked).toEqual({ head: 16, hat: 13, body: 14, staff: 9, off: 13, feet: 4 });
    expect(skinTone).toBe('#704737');
  });

  it('migrates saved per-browser layout and pair overrides to shared defaults', () => {
    const appearance = { head: 9, hat: 0, body: 11, staff: 11, off: 0, feet: 0 };
    const pair = { x: 8, y: 4, scale: 1.1, rotate: 3 };
    const staff = { x: -5, y: 6, scale: 0.9, rotate: 12 };
    saved.set('arcane-wizard-workshop', JSON.stringify(appearance));
    saved.set('arcane-wizard-layout', JSON.stringify({ 'staff:11': staff }));
    saved.set('arcane-wizard-pair-alignments', JSON.stringify({ headBody: { '9:11': pair } }));
    loadAppearance();
    loadLayout();
    expect(picked).toEqual(appearance);
    expect(effectiveLayout('head', false)).toEqual(DEFAULT_LAYOUT['head:9']);
    expect(effectiveLayout('staff', false)).toEqual(DEFAULT_LAYOUT['staff:11']);
    expect(saved.get('arcane-wizard-layout')).toBe(JSON.stringify(DEFAULT_LAYOUT));
    expect(saved.get('arcane-wizard-pair-alignments-private-backup-2026-10')).toBe(
      JSON.stringify({ headBody: { '9:11': pair } }),
    );
    expect(saved.get('arcane-wizard-pair-alignments')).toBe(
      JSON.stringify(DEFAULT_PAIR_ALIGNMENTS),
    );
  });

  it('persists hat and robe dyes independently', () => {
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    setHatColor('#c4444e');
    setRobeColor('#3379cf');
    saveAppearance();
    const stored = JSON.parse(saved.get('arcane-wizard-workshop') || '{}');
    expect(stored.hatColor).toBe('#c4444e');
    expect(stored.robeColor).toBe('#3379cf');
    setHatColor(DEFAULT_ROBE_COLOR);
    setRobeColor(DEFAULT_ROBE_COLOR);
    loadAppearance();
    expect(hatColor).toBe('#c4444e');
    expect(robeColor).toBe('#3379cf');
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

  it('restores the wand and keeps its grip adjustments separate from other weapons', () => {
    saved.set('arcane-wizard-workshop', JSON.stringify({ ...DEFAULTS, staff: 14 }));
    loadAppearance();
    loadLayout();
    expect(picked.staff).toBe(14);
    expect(MAINHAND_SPRITES[14].url).toBe('/art/workshop/wooden_wand.png?v=2');
    setLayoutField('handStaff', { x: 5, y: 8, scale: 0.7, rotate: 10 });
    expect(effectiveLayout('handStaff', false)).toMatchObject({ x: 5, y: 8 });
    setPicked({ ...DEFAULTS, staff: 7 });
    expect(effectiveLayout('handStaff', false)).toEqual(DEFAULT_LAYOUT['handStaff:7']);
  });

  it('uses the approved wizard, colours and exported build layouts as fresh-browser defaults', () => {
    expect(DEFAULTS).toEqual({ head: 16, hat: 13, body: 14, staff: 9, off: 13, feet: 7 });
    expect(DEFAULT_ROBE_COLOR).toBe('#151a28');
    expect(DEFAULT_LAYOUT['staff:14']).toEqual({ x: 24, y: -30, scale: 1, rotate: 0 });
    expect(DEFAULT_LAYOUT['handStaff:14']).toEqual({ x: 20, y: -21, scale: 0.75, rotate: 0 });
    expect(DEFAULT_LAYOUT['off:12']).toEqual({ x: -20, y: -5, scale: 1, rotate: 0 });
    expect(DEFAULT_LAYOUT['off:13']).toEqual({ x: -18, y: -7, scale: 1.7, rotate: 0 });
    expect(DEFAULT_LAYOUT['staff:9']).toEqual({ x: 22, y: -22, scale: 1.15, rotate: 13 });
    expect(DEFAULT_LAYOUT['handStaff:9']).toEqual({ x: 16, y: -13, scale: 0.9, rotate: 0 });
    expect(DEFAULT_LAYOUT['body:13']).toEqual({ x: 3, y: 0, scale: 1.4, rotate: 0 });
    expect(DEFAULT_LAYOUT['hat:14']).toEqual({ x: -10, y: 50, scale: 1, rotate: -8 });
    expect(DEFAULT_LAYOUT['staff:8']).toEqual({
      x: 32,
      y: -28,
      scale: 1.1,
      rotate: -12,
      flipX: true,
    });
    expect(DEFAULT_LAYOUT['handStaff:8']).toEqual({ x: 14, y: -10, scale: 0.8, rotate: 0 });
  });

  it('loads shared layout defaults from the full exported Workshop JSON format', () => {
    expect(sharedWorkshop).toMatchObject({
      appearance: { head: 14, hat: 11, body: 13, staff: 7, off: 12, feet: 7 },
      robeColor: '#8051bd',
      hatColor: 'original',
    });
    expect(DEFAULT_LAYOUT).toEqual(sharedWorkshop.layout);
  });

  it('reverts the mistaken offhand shield adjustment for browsers that loaded it', () => {
    saved.set('arcane-wizard-shared-layout-2026-10', '1');
    saved.set('arcane-wizard-shield-layout-2026-10', '1');
    saved.set(
      'arcane-wizard-layout',
      JSON.stringify({
        'off:12': { x: -20, y: -19, scale: 1, rotate: 0 },
        'off:13': { x: -18, y: -21, scale: 1.7, rotate: 0 },
        'off:11': { x: -21, y: -3, scale: 1, rotate: 0 },
      }),
    );
    loadLayout();
    const restored = JSON.parse(saved.get('arcane-wizard-layout') || '{}');
    expect(restored['off:12']).toEqual({ x: -20, y: -5, scale: 1, rotate: 0 });
    expect(restored['off:13']).toEqual({ x: -18, y: -7, scale: 1.7, rotate: 0 });
    expect(restored['off:11']).toEqual({ x: -21, y: -3, scale: 1, rotate: 0 });
    expect(saved.get('arcane-wizard-shield-layout-rollback-2026-10')).toBe('1');
  });

  it('removes the requested staff choices without removing their historical layout records', () => {
    expect(AVAILABLE.staff).toEqual([1, 6, 7, 8, 9, 10, 11, 14]);
    for (const staff of [0, 4]) {
      saved.set('arcane-wizard-workshop', JSON.stringify({ ...DEFAULTS, staff }));
      loadAppearance();
      expect(picked.staff).toBe(9);
    }
    expect(DEFAULT_LAYOUT['staff:4']).toEqual({ x: -6, y: -89, scale: 1, rotate: 0 });
    expect(DEFAULT_LAYOUT['staff:12']).toEqual({ x: 23, y: -10, scale: 0.85, rotate: 0 });
    expect(DEFAULT_LAYOUT['staff:5']).toEqual({ x: 9, y: -13, scale: 1, rotate: 0 });
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
    saved.set('arcane-wizard-shared-layout-2026-10', '1');
    saved.set('arcane-wizard-shared-pairs-2026-10', '1');
    saved.set('arcane-wizard-layout', JSON.stringify({ 'hat:11': hat }));
    saved.set(
      'arcane-wizard-pair-alignments',
      JSON.stringify({
        headBody: { [`16:${DEFAULTS.body}`]: { x: 15, y: -8, scale: 1, rotate: 0 } },
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
