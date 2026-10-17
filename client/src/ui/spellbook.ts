// Clickable, sprite-backed spellbook. Keep the original selects as the source of truth:
// solo play, multiplayer lobby sync, and saved variants all read the same controls.
import { sanitizeLoadout, SPELL_VARIANTS, VARIANT_SPELLS, variantName } from '../../../shared/sim/variants';
import type { SpellLoadout, SpellName, SpellVariant } from '../../../shared/types';
import { $ } from '../dom';

const ORDER: SpellName[] = [
  'FIRE', 'WATER', 'LIGHTNING', 'EARTH', 'STEAM',
  'PLASMA', 'MAGMA', 'STORM', 'ICE', 'MAGNETIC',
];

// Matches the 5-column sprite atlas in client/public/spells/spellbook-atlas.png.
const ICON_ORDER = [
  'Flamethrower', 'Fireball', 'Pyrodisk', 'Water Spray', 'Water Surge',
  'Lightning', 'Earth Shot', 'Pebble Flurry', 'Steam Shot', 'Plasma Shot',
  'Plasma Beam', 'Magma Shot', 'Lava Pool', 'Storm Shot', 'Thundercloud',
  'Ice Shot', 'Frost Shards', 'Magnetic Shot', 'Magnetic Pull',
] as const;
const ICONS = new Map<string, number>(ICON_ORDER.map((name, i) => [name, i]));

const SYMBOL: Record<SpellName, string> = {
  FIRE: '🔥', WATER: '💧', LIGHTNING: '⚡', EARTH: '🪨', STEAM: '☁️',
  PLASMA: '🔮', MAGMA: '🌋', STORM: '🌩️', ICE: '❄️', MAGNETIC: '🧲',
};

type Choice = { value: SpellVariant; label: string };
function choicesFor(spell: SpellName): Choice[] {
  const [base, a, aName, b, bName] = SPELL_VARIANTS[spell];
  const choices: Choice[] = [{ value: 'default', label: base }];
  if (a && aName) choices.push({ value: a, label: aName });
  if (b && bName) choices.push({ value: b, label: bName });
  return choices;
}

/** What the spellbook currently has picked: only real variants, the rest play as the original. */
export function readLoadout(): SpellLoadout {
  return sanitizeLoadout(
    Object.fromEntries(
      VARIANT_SPELLS.map((spell) => [spell, $<HTMLSelectElement>('variant' + spell).value]),
    ),
  );
}

/** Calls `onChange` whenever any spell choice changes, including clicks on sprite cards. */
export function onLoadoutChange(onChange: () => void) {
  for (const spell of VARIANT_SPELLS)
    $<HTMLSelectElement>('variant' + spell).addEventListener('change', onChange);
}

/** Render all 19 castable spells as a clickable gallery; one chosen attack per family. */
export function initSpellbookIcons() {
  const gallery = $<HTMLElement>('spellbookChoices');
  if (gallery.childElementCount) return;

  const summary = $<HTMLElement>('spellbookLoadoutSummary');
  summary.setAttribute('aria-label', 'Equipped spells');
  summary.replaceChildren();
  const slots = new Map<SpellName, HTMLElement>();
  for (const spell of ORDER) {
    const slot = document.createElement('div');
    slot.className = 'spellbook-loadout-slot empty';
    slot.dataset.element = spell;
    slot.title = spell + ': no spell selected';
    const placeholder = document.createElement('span');
    placeholder.className = 'spellbook-slot-placeholder';
    placeholder.textContent = '✧';
    placeholder.setAttribute('aria-hidden', 'true');
    slot.appendChild(placeholder);
    slots.set(spell, slot);
    summary.appendChild(slot);
  }
  const updateSummary = () => {
    for (const spell of ORDER) {
      const slot = slots.get(spell)!;
      const selected = gallery.querySelector<HTMLElement>(
        '.spellbook-family[data-element="' + spell + '"] .spellbook-option.selected'
      );
      const art = selected?.querySelector<HTMLElement>('.spellbook-option-art');
      slot.replaceChildren();
      slot.classList.toggle('empty', !art);
      slot.title = spell + ': ' + variantName(spell, readLoadout());
      slot.setAttribute('aria-label', slot.title);
      if (art) {
        const sprite = art.cloneNode(true) as HTMLElement;
        sprite.removeAttribute('aria-hidden');
        // The gallery applies some spell recolours via button-specific CSS.
        // Preserve the computed effect when mirroring artwork in the action bar.
        sprite.style.filter = getComputedStyle(art).filter;
        slot.appendChild(sprite);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'spellbook-slot-placeholder';
        placeholder.textContent = '✧';
        slot.appendChild(placeholder);
      }
    }
  };

  for (const spell of ORDER) {
    const options = choicesFor(spell);
    const select = VARIANT_SPELLS.includes(spell)
      ? $<HTMLSelectElement>('variant' + spell)
      : null;
    const section = document.createElement('section');
    section.className = 'spellbook-family';
    section.dataset.element = spell;

    const title = document.createElement('h3');
    title.className = 'spellbook-family-title';
    title.textContent = SYMBOL[spell] + ' ' + spell;
    section.appendChild(title);

    const tiles = document.createElement('div');
    tiles.className = 'spellbook-family-options';
    const buttons: { button: HTMLButtonElement; value: SpellVariant }[] = [];

    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'spellbook-option';
      button.setAttribute('aria-label', 'Equip ' + option.label);
      button.title = select ? 'Choose ' + option.label : option.label + ' (always equipped)';

      const art = document.createElement('span');
      art.className = 'spellbook-option-art';
      art.setAttribute('aria-hidden', 'true');
      // Plasma and magnetic use dedicated, full-detail images instead of the
      // heavily downscaled atlas. All remaining choices retain their artwork.
      const detailed = new Set(['Plasma Shot', 'Plasma Beam', 'Magnetic Shot', 'Magnetic Pull', 'Ice Shot', 'Frost Shards', 'Water Spray', 'Pyrodisk']);
      if (detailed.has(option.label)) {
        const img = document.createElement('img');
        img.className = 'spellbook-detail-image';
        const assetPath = '/spells/' + option.label.toLowerCase().replaceAll(' ', '_') + '.png';
        // Bump URLs for these revised icons so browsers don't reuse old cached PNGs.
        img.src = assetPath + (option.label === 'Water Spray' || option.label === 'Pyrodisk' ? '?v=e0a11be' : '');
        img.alt = '';
        img.width = 160;
        img.height = 112;
        art.appendChild(img);
        art.classList.add('has-detail');
      } else {
        const index = ICONS.get(option.label);
        if (index !== undefined) {
          art.style.backgroundPosition = `${(index % 5) * 25}% ${Math.floor(index / 5) * (100 / 3)}%`;
        }
      }
      const name = document.createElement('span');
      name.className = 'spellbook-option-name';
      name.textContent = option.label;
      button.append(art, name);
      tiles.appendChild(button);
      buttons.push({ button, value: option.value });

      button.addEventListener('click', () => {
        if (!select) return; // Single-spell families are already equipped.
        if (select.value !== option.value) {
          select.value = option.value;
          // All existing description updates, solo-loadout reads, and online lobby
          // synchronisation stay attached to this native change event.
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }
    section.appendChild(tiles);

    const description = document.createElement('p');
    description.className = 'spellbook-family-description';
    section.appendChild(description);

    const refresh = () => {
      const selected = select?.value ?? 'default';
      for (const { button, value } of buttons) {
        const active = selected === value;
        button.classList.toggle('selected', active);
        button.setAttribute('aria-pressed', String(active));
      }
      const legacyDescription = select?.nextElementSibling;
      description.textContent = legacyDescription?.textContent?.trim() ??
        'This spell is always available in your arsenal.';
      updateSummary();
    };
    select?.addEventListener('change', refresh);
    gallery.appendChild(section);
    refresh();
  }
}
