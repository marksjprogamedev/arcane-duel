// The outfit controls in the Wizard Workshop: a row of picture tiles (pick one, + adds one) with a name box and a
// Delete button. It follows `slots.ts`.
import { $ } from '../dom';
import { MAX_SLOT_NAME, MAX_WARDROBE_SLOTS } from '../../../shared/wardrobe';
import { createConfirm } from '../ui/menus/confirmClick';
import { createCarousel } from './carousel';
import { parseLook } from './look';
import { onOutfitAssets, outfitIcon } from './outfitIcon';
import { SLOTS_EVENT, deleteSlot, newSlot, renameSlotTo, useSlot, wardrobe } from './slots';

/** Rebuilds the Workshop's outfit row: one picture tile per outfit and a plus tile to add one. */
function drawRow() {
  const w = wardrobe();
  const row = $('ww-slots');
  row.replaceChildren(
    createCarousel({
      name: 'outfit',
      label: 'Outfits',
      size: 'large',
      selected: w.active,
      items: w.slots.map((slot, i) => ({
        value: i,
        label: slot.name,
        icon: outfitIcon(parseLook(slot.look)),
      })),
      onPick: useSlot,
      add: {
        label: w.slots.length >= MAX_WARDROBE_SLOTS ? 'All 8 outfit slots are used' : 'New outfit',
        disabled: w.slots.length >= MAX_WARDROBE_SLOTS,
        onClick: newSlot,
      },
    }),
  );
  const name = $<HTMLInputElement>('ww-slot-name');
  // do not overwrite what is being typed
  if (document.activeElement !== name) name.value = w.slots[w.active].name;
  $<HTMLButtonElement>('ww-slot-delete').disabled = w.slots.length <= 1;
  $('ww-slot-count').textContent = `${w.slots.length} of ${MAX_WARDROBE_SLOTS} outfits`;
}

export function initSlots() {
  const name = $<HTMLInputElement>('ww-slot-name');
  name.maxLength = MAX_SLOT_NAME;
  name.addEventListener('change', () => {
    renameSlotTo(wardrobe().active, name.value);
    name.value = wardrobe().slots[wardrobe().active].name; // the cleaned-up name
  });
  const label = $('ww-slot-delete');
  const confirm = createConfirm({
    onArm: () => (label.textContent = 'Click again to delete'),
    onDisarm: () => (label.textContent = 'Delete outfit'),
    onConfirm: () => deleteSlot(wardrobe().active),
  });
  label.addEventListener('click', () => confirm.click());
  // a source image of an outfit's colours arrived after its picture was drawn
  onOutfitAssets(() => draw());
  const draw = () => {
    confirm.reset();
    drawRow();
  };
  window.addEventListener(SLOTS_EVENT, draw);
  // the look changed under the saved outfits (the Workshop, a reload): the names and count are the same,
  // but a fresh browser's single outfit is made from the look, so redraw once it is loaded
  window.addEventListener('arcane-wizard-appearance', draw);
  draw();
}
