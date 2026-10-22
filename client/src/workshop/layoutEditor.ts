// Per-asset layout editor: position, size and tilt of one piece, by sliders or by dragging it
// in the preview. Changes show at once; "Save layout" is what applies them to matches.
import { $ } from '../dom';
import { drawAtlas, parts } from './preview';
import type { SlotId } from './parts';
import {
  clearLayoutPiece,
  layoutValue,
  sanitiseLayout,
  saveLayout,
  setLayoutField,
  workingLayout,
  picked,
} from './store';

type Field = 'x' | 'y' | 'scale' | 'rotate';
const FIELDS: Field[] = ['x', 'y', 'scale', 'rotate'];

let editSlot: SlotId = 'head';

/** Syncs the sliders and the highlighted piece with the working layout. */
export function refreshEditor() {
  const item = layoutValue(editSlot);
  for (const field of FIELDS) {
    const value = field === 'scale' ? Math.round(item.scale * 100) : (item[field] ?? 0);
    $<HTMLInputElement>('ww-edit-' + field).value = String(value);
    $('ww-edit-' + field + '-value').textContent =
      field === 'scale' ? value + '%' : field === 'rotate' ? value + '°' : String(value);
  }
  for (const node of parts)
    node.classList.toggle('ww-edit-selected', node.dataset.slot === editSlot);
}

export function initLayoutEditor() {
  const editPart = $<HTMLSelectElement>('ww-edit-part');
  const status = $('ww-layout-status');
  const changed = () => {
    status.textContent = 'Unsaved changes — choose Save layout to use them in matches.';
    drawAtlas();
    refreshEditor();
  };
  editPart.addEventListener('change', () => {
    editSlot = editPart.value as SlotId;
    refreshEditor();
  });
  for (const field of FIELDS) {
    const slider = $<HTMLInputElement>('ww-edit-' + field);
    slider.addEventListener('input', () => {
      setLayoutField(editSlot, {
        [field]: field === 'scale' ? Number(slider.value) / 100 : Number(slider.value),
      });
      changed();
    });
  }
  $('ww-layout-save').addEventListener('click', () => {
    status.textContent = saveLayout()
      ? 'Saved on this browser and applied to your in-game wizard.'
      : 'Browser storage is unavailable. Copy your layout to keep it.';
  });
  $('ww-layout-reset').addEventListener('click', () => {
    clearLayoutPiece(editSlot);
    status.textContent = 'Piece reset. Save layout to keep this change.';
    drawAtlas();
    refreshEditor();
  });
  const exportPanel = $('ww-layout-export');
  const exportText = $<HTMLTextAreaElement>('ww-layout-export-text');
  const selectExport = () => {
    exportText.focus();
    exportText.select();
    exportText.setSelectionRange(0, exportText.value.length);
  };
  $('ww-layout-export-select').addEventListener('click', selectExport);
  $('ww-layout-copy').addEventListener('click', async () => {
    const payload = JSON.stringify(
      { appearance: picked, layout: sanitiseLayout(workingLayout) },
      null,
      2,
    );
    // Always offer a manual-copy option, including on HTTP hosts where
    // navigator.clipboard is unavailable (or permission is denied).
    exportText.value = payload;
    exportPanel.hidden = false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(payload);
      status.textContent = 'Layout copied. Paste it into our chat, or use the text box below.';
    } catch {
      status.textContent = 'Automatic clipboard access is blocked. Select and copy the layout text below.';
      selectExport();
    }
  });

  // Pointer capture allows dragging even if the cursor leaves a small sprite.
  type Drag = {
    pointerId: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    slot: SlotId;
  };
  let drag: Drag | null = null;
  const wizard = $('ww-wizard');
  wizard.addEventListener('pointerdown', (event) => {
    const node = (event.target as Element).closest<HTMLElement>('.ww-atlas-part');
    if (!node || node.style.display === 'none') return;
    editSlot = node.dataset.slot as SlotId;
    editPart.value = editSlot;
    refreshEditor();
    const start = layoutValue(editSlot);
    drag = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: start.x,
      startY: start.y,
      slot: editSlot,
    };
    wizard.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  wizard.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const clamp = (v: number) => Math.max(-150, Math.min(150, Math.round(v)));
    setLayoutField(drag.slot, {
      x: clamp(drag.startX + event.clientX - drag.x),
      y: clamp(drag.startY + event.clientY - drag.y),
    });
    changed();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    wizard.addEventListener(type, () => {
      drag = null;
    });
}
