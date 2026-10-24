// A player's saved outfits ("appearance slots"): up to MAX_WARDROBE_SLOTS named Workshop looks and which one is
// in use. Pure, shared by the server (what it accepts and stores) and the client (what it reads from storage),
// so both apply the same rules. The look in use is also what a match draws (`set_look`).
import type { Wardrobe, WardrobeSlot, WorkshopLook } from './protocol';

export const MAX_WARDROBE_SLOTS = 8;
export const MAX_SLOT_NAME = 24;

/**
 * A Workshop look: up to 20 keys (letters and digits, up to 24 long), each a string of up to 40 characters or a
 * finite number; null if malformed. The parts themselves are checked by the client that loads it.
 */
export function parseWorkshopLook(raw: unknown): WorkshopLook | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const entries = Object.entries(raw);
  if (entries.length > 20) return null;
  const look: WorkshopLook = {};
  for (const [key, value] of entries) {
    if (!/^[A-Za-z0-9]{1,24}$/.test(key)) return null;
    if (typeof value === 'string' && value.length <= 40) look[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) look[key] = value;
    else return null;
  }
  return look;
}

/** A slot name as typed: trimmed, cut to length; the default if nothing is left. */
export function cleanSlotName(raw: unknown, fallback: string): string {
  const name =
    typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, MAX_SLOT_NAME) : '';
  return name || fallback;
}

/** The name a new slot gets: "Outfit 1", "Outfit 2", ... the first not already used. */
export function defaultSlotName(slots: readonly WardrobeSlot[]): string {
  const taken = new Set(slots.map((s) => s.name));
  for (let n = 1; ; n++) if (!taken.has(`Outfit ${n}`)) return `Outfit ${n}`;
}

/** Saved outfits as received or read back; null if malformed (wrong shape, too many, a bad look or name). */
export function parseWardrobe(raw: unknown): Wardrobe | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const { active, slots } = raw as { active?: unknown; slots?: unknown };
  if (!Array.isArray(slots) || slots.length < 1 || slots.length > MAX_WARDROBE_SLOTS) return null;
  if (
    typeof active !== 'number' ||
    !Number.isInteger(active) ||
    active < 0 ||
    active >= slots.length
  )
    return null;
  const out: WardrobeSlot[] = [];
  for (const slot of slots) {
    if (!slot || typeof slot !== 'object') return null;
    const { name, look } = slot as { name?: unknown; look?: unknown };
    if (typeof name !== 'string' || name.length < 1 || name.length > MAX_SLOT_NAME) return null;
    const parsed = parseWorkshopLook(look);
    if (!parsed) return null;
    out.push({ name, look: parsed });
  }
  return { active, slots: out };
}

// ---- changes, each giving a new Wardrobe (the input is never changed) ----

/** A wardrobe with one outfit holding `look`: where a player with nothing saved starts. */
export const startWardrobe = (look: WorkshopLook): Wardrobe => ({
  active: 0,
  slots: [{ name: 'Outfit 1', look }],
});

/** The look of the outfit in use. */
export const activeLook = (w: Wardrobe): WorkshopLook => w.slots[w.active].look;

/** Changes the outfit in use to `look` (picking a part while a slot is selected edits that slot). */
export function setActiveLook(w: Wardrobe, look: WorkshopLook): Wardrobe {
  return { ...w, slots: w.slots.map((s, i) => (i === w.active ? { ...s, look } : s)) };
}

/** Switches to outfit `index`; unchanged for an index that does not exist. */
export function selectSlot(w: Wardrobe, index: number): Wardrobe {
  return Number.isInteger(index) && index >= 0 && index < w.slots.length
    ? { ...w, active: index }
    : w;
}

/** A new outfit copying `look` (the one being worn), made the one in use; unchanged when full. */
export function addSlot(w: Wardrobe, look: WorkshopLook): Wardrobe {
  if (w.slots.length >= MAX_WARDROBE_SLOTS) return w;
  return {
    active: w.slots.length,
    slots: [...w.slots, { name: defaultSlotName(w.slots), look }],
  };
}

export function renameSlot(w: Wardrobe, index: number, name: string): Wardrobe {
  if (index < 0 || index >= w.slots.length) return w;
  const clean = cleanSlotName(name, w.slots[index].name);
  return { ...w, slots: w.slots.map((s, i) => (i === index ? { ...s, name: clean } : s)) };
}

/** Removes an outfit; the last one cannot go. The one in use stays in use, or the one before it if it was removed. */
export function removeSlot(w: Wardrobe, index: number): Wardrobe {
  if (w.slots.length <= 1 || index < 0 || index >= w.slots.length) return w;
  const slots = w.slots.filter((_, i) => i !== index);
  const active =
    index < w.active ? w.active - 1 : index === w.active ? Math.max(0, index - 1) : w.active;
  return { active, slots };
}
