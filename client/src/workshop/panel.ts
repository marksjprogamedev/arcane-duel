// The Wizard Workshop dialog: option fieldsets, random / reset, and open / close / Escape.
import { $ } from '../dom';
import {
  AVAILABLE,
  DEFAULTS,
  DEFAULT_SKIN,
  DEFAULT_ROBE_COLOR,
  ROBE_COLORS,
  SETS,
  SKIN_COLORS,
} from './parts';
import type { PartKey } from './parts';
import { initLayoutEditor, refreshEditor } from './layoutEditor';
import {
  drawAtlas,
  drawSvg,
  initPreview,
  updateTintedGrip,
  updateTintedHats,
  updateTintedHeads,
  updateTintedLeftHand,
  updateTintedRobes,
} from './preview';
import {
  loadAppearance,
  loadLayout,
  picked,
  saveAppearance,
  setPicked,
  setSkinTone,
  skinTone,
  robeColor,
  hatColor,
  setRobeColor,
  setHatColor,
} from './store';

let dyeTarget: 'hat' | 'robe' = 'robe';

/** Saves the choice (which also tells the in-match wizard) and redraws the preview. */
function render() {
  saveAppearance();
  drawSvg();
  drawAtlas();
}

function controls() {
  const dyes = $('ww-item-color-options');
  dyes.innerHTML = '';
  const targets = document.createElement('div');
  targets.className = 'choices ww-dye-targets';
  for (const [target, title] of [
    ['hat', 'Hat'],
    ['robe', 'Robe'],
  ] as const) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ui-btn ui-btn--secondary${dyeTarget === target ? ' is-green' : ''}`;
    button.textContent = title;
    button.setAttribute('aria-pressed', String(dyeTarget === target));
    button.addEventListener('click', () => {
      dyeTarget = target;
      controls();
    });
    targets.append(button);
  }
  dyes.append(targets);
  const currentColor = dyeTarget === 'hat' ? hatColor : robeColor;
  for (const color of ROBE_COLORS) {
    const label = document.createElement('label');
    label.className = 'choice ww-skin-choice';
    label.title = color === 'original' ? `Original ${dyeTarget} colours` : color;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'wardrobe-color';
    input.value = color;
    input.checked = currentColor === color;
    input.addEventListener('change', () => {
      if (dyeTarget === 'hat') {
        setHatColor(color);
        updateTintedHats();
      } else {
        setRobeColor(color);
        updateTintedRobes();
      }
      render();
    });
    const swatch = document.createElement('span');
    swatch.className = 'ww-skin-swatch';
    if (color === 'original') {
      swatch.textContent = '★';
      swatch.style.textAlign = 'center';
    } else swatch.style.backgroundColor = color;
    label.append(input, swatch);
    dyes.appendChild(label);
  }
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
      updateTintedLeftHand();
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
  for (const [key, choices] of Object.entries(AVAILABLE) as [PartKey, number[]][]) {
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
    choices.forEach((i) => {
      const name = SETS[key][i];
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

/** Re-reads the saved look (an account's look was written to storage) and redraws everything showing it. */
export function reloadAppearance() {
  loadAppearance();
  updateTintedRobes();
  updateTintedHats();
  updateTintedHeads();
  updateTintedGrip();
  updateTintedLeftHand();
  controls();
  render();
  refreshEditor();
}

export function initWorkshop() {
  loadAppearance();
  loadLayout();
  initLayoutEditor();
  $('ww-random').addEventListener('click', () => {
    const next = { ...picked };
    for (const k of Object.keys(AVAILABLE) as PartKey[]) {
      const choices = AVAILABLE[k];
      next[k] = choices[Math.floor(Math.random() * choices.length)];
    }
    setPicked(next);
    controls();
    render();
    refreshEditor();
  });
  $('ww-reset').addEventListener('click', () => {
    setPicked({ ...DEFAULTS });
    setSkinTone(DEFAULT_SKIN);
    setRobeColor(DEFAULT_ROBE_COLOR);
    setHatColor(DEFAULT_ROBE_COLOR);
    updateTintedRobes();
    updateTintedHats();
    updateTintedHeads();
    updateTintedGrip();
    updateTintedLeftHand();
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
