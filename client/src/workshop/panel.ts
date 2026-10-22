// The Wizard Workshop dialog: option fieldsets, random / reset, and open / close / Escape.
import { $ } from '../dom';
import { DEFAULTS, DEFAULT_SKIN, SETS, SKIN_COLORS } from './parts';
import type { PartKey } from './parts';
import { initLayoutEditor, refreshEditor } from './layoutEditor';
import { drawAtlas, drawSvg, initPreview, updateTintedGrip, updateTintedHeads } from './preview';
import {
  loadAppearance,
  loadLayout,
  picked,
  saveAppearance,
  setPicked,
  setSkinTone,
  skinTone,
} from './store';

/** Saves the choice (which also tells the in-match wizard) and redraws the preview. */
function render() {
  saveAppearance();
  drawSvg();
  drawAtlas();
}

function controls() {
  const swatches = $('ww-skin-options');
  swatches.innerHTML = '';
  for (const color of SKIN_COLORS) {
    const label = document.createElement('label');
    label.className = 'choice ww-skin-choice';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'skin-tone';
    input.value = color;
    input.checked = skinTone === color;
    input.addEventListener('change', () => {
      setSkinTone(color);
      updateTintedHeads();
      updateTintedGrip();
      render();
    });
    const swatch = document.createElement('span');
    swatch.className = 'ww-skin-swatch';
    swatch.style.backgroundColor = color;
    label.append(input, swatch);
    label.title = color;
    swatches.appendChild(label);
  }
  const root = $('ww-options');
  root.innerHTML = '';
  for (const [key, values] of Object.entries(SETS) as [PartKey, string[]][]) {
    const field = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent =
      key === 'off'
        ? 'Offhand'
        : key === 'staff'
          ? 'Main hand'
          : key[0].toUpperCase() + key.slice(1);
    field.appendChild(legend);
    const row = document.createElement('div');
    row.className = 'choices';
    values.forEach((name, i) => {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = key;
      input.value = String(i);
      input.checked = picked[key] === i;
      input.addEventListener('change', () => {
        picked[key] = i;
        render();
        refreshEditor();
      });
      label.append(input, document.createTextNode(name));
      row.appendChild(label);
    });
    field.appendChild(row);
    root.appendChild(field);
  }
}

export function initWorkshop() {
  loadAppearance();
  loadLayout();
  initLayoutEditor();
  $('ww-random').addEventListener('click', () => {
    const next = { ...picked };
    for (const k of Object.keys(SETS) as PartKey[])
      next[k] = Math.floor(Math.random() * SETS[k].length);
    setPicked(next);
    controls();
    render();
    refreshEditor();
  });
  $('ww-reset').addEventListener('click', () => {
    setPicked({ ...DEFAULTS });
    setSkinTone(DEFAULT_SKIN);
    controls();
    render();
    refreshEditor();
  });
  initPreview();
  controls();
  render();
  refreshEditor();

  const dialog = $('arcaneWizardWorkshop');
  const open = $('arcaneOpenWorkshop');
  const close = $('ww-close');
  open.addEventListener('click', () => {
    dialog.hidden = false;
    close.focus();
  });
  close.addEventListener('click', () => {
    dialog.hidden = true;
    open.focus();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close.click();
    }
  });
}
