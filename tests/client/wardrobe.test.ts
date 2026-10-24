import { describe, expect, it } from 'vitest';
import type { Wardrobe } from '../../shared/protocol';
import {
  MAX_SLOT_NAME,
  MAX_WARDROBE_SLOTS,
  activeLook,
  addSlot,
  cleanSlotName,
  defaultSlotName,
  parseWardrobe,
  parseWorkshopLook,
  removeSlot,
  renameSlot,
  selectSlot,
  setActiveLook,
  startWardrobe,
} from '../../shared/wardrobe';

const a = { head: 17, hat: 3, skin: '#c98f70' };
const b = { head: 18, hat: 5, skin: '#704737' };
const c = { head: 19, hat: 4, skin: '#a96e50' };
const three: Wardrobe = {
  active: 1,
  slots: [
    { name: 'Outfit 1', look: a },
    { name: 'Battle', look: b },
    { name: 'Outfit 3', look: c },
  ],
};

describe('parseWorkshopLook', () => {
  it('keeps short keys with short strings or finite numbers, and nothing else', () => {
    expect(parseWorkshopLook(a)).toEqual(a);
    for (const bad of [null, 'x', [1], { 'a b': 1 }, { a: {} }, { a: NaN }, { a: 'x'.repeat(41) }])
      expect(parseWorkshopLook(bad)).toBeNull();
    expect(
      parseWorkshopLook(Object.fromEntries(Array.from({ length: 21 }, (_, i) => ['k' + i, i]))),
    ).toBeNull();
  });
});

describe('parseWardrobe', () => {
  it('accepts a good set and returns a copy of the same data', () => {
    expect(parseWardrobe(three)).toEqual(three);
  });
  it('rejects a bad shape, count, active index, name or look', () => {
    const bad: unknown[] = [
      null,
      [],
      { active: 0 },
      { active: 0, slots: [] },
      { active: 0, slots: 'x' },
      { active: -1, slots: three.slots },
      { active: 3, slots: three.slots },
      { active: 1.5, slots: three.slots },
      { active: '1', slots: three.slots },
      { active: 0, slots: [{ name: '', look: a }] },
      { active: 0, slots: [{ name: 'x'.repeat(MAX_SLOT_NAME + 1), look: a }] },
      { active: 0, slots: [{ name: 5, look: a }] },
      { active: 0, slots: [{ name: 'x', look: 'plain' }] },
      { active: 0, slots: [null] },
      {
        active: 0,
        slots: Array.from({ length: MAX_WARDROBE_SLOTS + 1 }, () => ({ name: 'x', look: a })),
      },
    ];
    for (const value of bad) expect(parseWardrobe(value), JSON.stringify(value)).toBeNull();
  });
  it('allows exactly the maximum number of outfits', () => {
    const full = {
      active: 7,
      slots: Array.from({ length: MAX_WARDROBE_SLOTS }, (_, i) => ({ name: 'n' + i, look: a })),
    };
    expect(parseWardrobe(full)?.slots).toHaveLength(MAX_WARDROBE_SLOTS);
  });
});

describe('names', () => {
  it('cleans what was typed and falls back when nothing is left', () => {
    expect(cleanSlotName('  Battle   robes ', 'Old')).toBe('Battle robes');
    expect(cleanSlotName('x'.repeat(40), 'Old')).toHaveLength(MAX_SLOT_NAME);
    expect(cleanSlotName('   ', 'Old')).toBe('Old');
    expect(cleanSlotName(7, 'Old')).toBe('Old');
  });
  it('gives a new outfit the first free "Outfit N"', () => {
    expect(defaultSlotName(three.slots)).toBe('Outfit 2');
    expect(defaultSlotName(startWardrobe(a).slots)).toBe('Outfit 2');
    expect(defaultSlotName([])).toBe('Outfit 1');
  });
});

describe('changing the outfits', () => {
  it('starts with one outfit holding the look', () => {
    expect(startWardrobe(a)).toEqual({ active: 0, slots: [{ name: 'Outfit 1', look: a }] });
    expect(activeLook(three)).toEqual(b);
  });
  it('edits only the outfit in use, and never changes its input', () => {
    const before = JSON.stringify(three);
    const next = setActiveLook(three, c);
    expect(next.slots.map((s) => s.look)).toEqual([a, c, c]);
    expect(next.slots[1].name).toBe('Battle');
    expect(JSON.stringify(three)).toBe(before);
  });
  it('selects an outfit, and ignores one that does not exist', () => {
    expect(selectSlot(three, 2).active).toBe(2);
    expect(selectSlot(three, 3)).toBe(three);
    expect(selectSlot(three, -1)).toBe(three);
    expect(selectSlot(three, 0.5)).toBe(three);
  });
  it('adds an outfit copying the look, selects it, and stops at the maximum', () => {
    const next = addSlot(three, b);
    expect(next.slots).toHaveLength(4);
    expect(next.active).toBe(3);
    expect(next.slots[3]).toEqual({ name: 'Outfit 2', look: b });
    let full = three;
    while (full.slots.length < MAX_WARDROBE_SLOTS) full = addSlot(full, a);
    expect(addSlot(full, a)).toBe(full);
    expect(parseWardrobe(full)).not.toBeNull();
  });
  it('renames with the same cleaning, and leaves an empty name alone', () => {
    expect(renameSlot(three, 0, ' Day  wear ').slots[0].name).toBe('Day wear');
    expect(renameSlot(three, 0, '   ').slots[0].name).toBe('Outfit 1');
    expect(renameSlot(three, 9, 'x')).toBe(three);
  });
  it('removes an outfit and keeps the right one in use', () => {
    // removing one before the one in use: it moves down with the list
    expect(removeSlot(three, 0)).toEqual({ active: 0, slots: [three.slots[1], three.slots[2]] });
    // removing the one in use: the one before it takes over (or the first)
    expect(removeSlot(three, 1).active).toBe(0);
    expect(removeSlot({ ...three, active: 2 }, 2).active).toBe(1);
    expect(removeSlot({ ...three, active: 0 }, 0).active).toBe(0);
    // removing one after: unchanged index
    expect(removeSlot(three, 2).active).toBe(1);
  });
  it('never removes the last outfit', () => {
    const one = startWardrobe(a);
    expect(removeSlot(one, 0)).toBe(one);
  });
});
