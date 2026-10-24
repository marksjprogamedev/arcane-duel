// The player's saved outfits ("appearance slots", rules in shared/wardrobe.ts): up to 8 named Workshop looks, one
// in use. Kept in localStorage for everyone and synced to the account (account/profileSync.ts, the `slots`
// part). The outfit in use is also the look the Workshop shows and a match draws, so it is mirrored into the
// Workshop's own save: picking a part while an outfit is selected edits that outfit, with no Save button.
import type { Wardrobe, WorkshopLook } from '../../../shared/protocol';
import {
  activeLook,
  addSlot,
  parseWardrobe,
  removeSlot,
  renameSlot,
  selectSlot,
  setActiveLook,
  startWardrobe,
} from '../../../shared/wardrobe';
import { APPEARANCE_KEY, currentLook, loadAppearance } from './store';

export const SLOTS_KEY = 'arcane-wizard-slots';
/** Fired (on window) whenever the saved outfits change, so the pickers redraw. */
export const SLOTS_EVENT = 'arcane-wizard-slots';
/** Fired after another outfit has been put on, so the Workshop redraws its pickers and preview from it. */
export const OUTFIT_WORN_EVENT = 'arcane-wizard-outfit-worn';

/** The outfits saved on this device; null until the player makes one (a fresh browser, or an old save). */
export function readWardrobe(): Wardrobe | null {
  try {
    return parseWardrobe(JSON.parse(localStorage.getItem(SLOTS_KEY) ?? 'null'));
  } catch {
    return null;
  }
}

/** The outfits to show: the saved ones, or a single outfit holding what is being worn. */
export const wardrobe = (): Wardrobe => readWardrobe() ?? startWardrobe(currentLook());

function write(next: Wardrobe) {
  try {
    localStorage.setItem(SLOTS_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: this visit only */
  }
  window.dispatchEvent(new CustomEvent(SLOTS_EVENT));
}

/** Makes `look` what the Workshop shows and a match draws, and tells everything that follows the look. */
function wear(look: WorkshopLook) {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(look));
  } catch {
    /* storage blocked: this visit only */
  }
  loadAppearance();
  window.dispatchEvent(new CustomEvent(OUTFIT_WORN_EVENT));
  window.dispatchEvent(new CustomEvent('arcane-wizard-appearance', { detail: currentLook() }));
}

/** Switches to outfit `index` and wears it. */
export function useSlot(index: number) {
  const before = wardrobe();
  const next = selectSlot(before, index);
  if (next === before) return;
  write(next);
  wear(activeLook(next));
}

/** A new outfit copying what is being worn, selected: the way to keep the current one and try something else. */
export function newSlot() {
  const before = wardrobe();
  const next = addSlot(before, activeLook(before));
  if (next !== before) write(next);
}

export function renameSlotTo(index: number, name: string) {
  const before = wardrobe();
  const next = renameSlot(before, index, name);
  if (JSON.stringify(next) !== JSON.stringify(before)) write(next);
}

/** Deletes an outfit (never the last); wears whichever one is then in use. */
export function deleteSlot(index: number) {
  const before = wardrobe();
  const next = removeSlot(before, index);
  if (next === before) return;
  write(next);
  wear(activeLook(next));
}

/** The account's outfits arrived (or came back from the backup): keep them and wear the one in use. */
export function applyWardrobe(next: Wardrobe) {
  write(next);
  wear(activeLook(next));
}

// Picking a part saves the look (store.saveAppearance): while outfits are saved, that edits the selected one.
// With none saved there is nothing to keep in step: the single outfit is made from the look when it is shown.
window.addEventListener('arcane-wizard-appearance', ((event: Event) => {
  const saved = readWardrobe();
  if (!saved) return;
  const look = parseWardrobeLook((event as CustomEvent<unknown>).detail);
  if (!look) return;
  const next = setActiveLook(saved, look);
  if (JSON.stringify(next) !== JSON.stringify(saved)) write(next);
}) as EventListener);

function parseWardrobeLook(raw: unknown): WorkshopLook | null {
  const parsed = parseWardrobe({ active: 0, slots: [{ name: 'x', look: raw }] });
  return parsed ? parsed.slots[0].look : null;
}
