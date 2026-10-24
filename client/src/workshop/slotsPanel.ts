// The outfit controls: a row in the Wizard Workshop (pick, copy to a new outfit, rename, delete) and a small
// dropdown in the lobby to change outfit without opening the Workshop. Both follow `slots.ts`.
import { $ } from '../dom';
import { MAX_SLOT_NAME, MAX_WARDROBE_SLOTS } from '../../../shared/wardrobe';
import { createConfirm } from '../ui/menus/confirmClick';
import { SLOTS_EVENT, deleteSlot, newSlot, renameSlotTo, useSlot, wardrobe } from './slots';

/** Rebuilds the Workshop's outfit row from the saved outfits. */
function drawRow() {
  const w = wardrobe();
  const row = $('ww-slots');
  row.replaceChildren(
    ...w.slots.map((slot, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ui-btn ui-btn--secondary${i === w.active ? ' is-green' : ''}`;
      button.textContent = slot.name;
      button.setAttribute('aria-pressed', String(i === w.active));
      button.addEventListener('click', () => useSlot(i));
      return button;
    }),
  );
  const name = $<HTMLInputElement>('ww-slot-name');
  // do not overwrite what is being typed
  if (document.activeElement !== name) name.value = w.slots[w.active].name;
  $<HTMLButtonElement>('ww-slot-new').disabled = w.slots.length >= MAX_WARDROBE_SLOTS;
  $<HTMLButtonElement>('ww-slot-delete').disabled = w.slots.length <= 1;
  $('ww-slot-count').textContent = `${w.slots.length} of ${MAX_WARDROBE_SLOTS} outfits`;
}

/** Rebuilds the lobby dropdown; hidden while there is only one outfit to choose. */
function drawLobbyPicker() {
  const w = wardrobe();
  const select = $<HTMLSelectElement>('lobbyOutfit');
  select.replaceChildren(
    ...w.slots.map((slot, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = slot.name;
      return option;
    }),
  );
  select.value = String(w.active);
  $('lobbyOutfitBox').hidden = w.slots.length <= 1;
}

export function initSlots() {
  const name = $<HTMLInputElement>('ww-slot-name');
  name.maxLength = MAX_SLOT_NAME;
  name.addEventListener('change', () => {
    renameSlotTo(wardrobe().active, name.value);
    name.value = wardrobe().slots[wardrobe().active].name; // the cleaned-up name
  });
  $('ww-slot-new').addEventListener('click', newSlot);
  const label = $('ww-slot-delete');
  const confirm = createConfirm({
    onArm: () => (label.textContent = 'Click again to delete'),
    onDisarm: () => (label.textContent = 'Delete outfit'),
    onConfirm: () => deleteSlot(wardrobe().active),
  });
  label.addEventListener('click', () => confirm.click());
  $<HTMLSelectElement>('lobbyOutfit').addEventListener('change', (event) =>
    useSlot(Number((event.target as HTMLSelectElement).value)),
  );
  const draw = () => {
    confirm.reset();
    drawRow();
    drawLobbyPicker();
  };
  window.addEventListener(SLOTS_EVENT, draw);
  // the look changed under the saved outfits (the Workshop, a reload): the names and count are the same,
  // but a fresh browser's single outfit is made from the look, so redraw once it is loaded
  window.addEventListener('arcane-wizard-appearance', draw);
  draw();
}
