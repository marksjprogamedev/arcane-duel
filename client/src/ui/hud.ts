import { COL, COOLDOWN_TICKS, emoji, names, PART } from '../../../shared/constants';
import { dummy } from '../../../shared/sim/wizard';
import { $ } from '../dom';
import { game, localInput, net } from '../state';
import type { SpellName } from '../../../shared/types';
import { variantName, spellArtName } from '../../../shared/sim/variants';

const SPELLS: SpellName[] = [
  'FIRE',
  'WATER',
  'LIGHTNING',
  'EARTH',
  'STEAM',
  'PLASMA',
  'MAGMA',
  'STORM',
  'ICE',
  'MAGNETIC',
];
const SPELL_ICONS: Record<SpellName, string> = {
  FIRE: '🔥',
  WATER: '💧',
  LIGHTNING: '⚡',
  EARTH: '🪨',
  STEAM: '🌫️',
  PLASMA: '🔮',
  MAGMA: '🌋',
  STORM: '🌩️',
  ICE: '❄️',
  MAGNETIC: '🧲',
};

const ATLAS_ORDER = [
  'Flamethrower', 'Fireball', 'Pyrodisk', 'Water Spray', 'Water Surge',
  'Lightning', 'Earth Shot', 'Pebble Flurry', 'Steam Shot', 'Plasma Shot',
  'Plasma Beam', 'Magma Shot', 'Lava Pool', 'Storm Shot', 'Thundercloud',
  'Ice Shot', 'Frost Shards', 'Magnetic Shot', 'Magnetic Pull',
];
const DETAILED = new Set(['Plasma Shot', 'Plasma Beam', 'Magnetic Shot', 'Magnetic Pull', 'Ice Shot', 'Frost Shards', 'Water Spray', 'Pyrodisk']);
function legendArtwork(name: string): HTMLElement {
  const art = document.createElement('span');
  art.className = 'legend-spell-art';
  const artName = spellArtName(name);
  if (DETAILED.has(artName)) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = '/spells/' + artName.toLowerCase().replaceAll(' ', '_') + '.png' +
      (name === 'Water Spray' || name === 'Pyrodisk' ? '?v=e0a11be' : '');
    art.appendChild(img);
  } else {
    const index = ATLAS_ORDER.indexOf(artName);
    if (index >= 0) art.style.backgroundPosition = `${index % 5 * 25}% ${Math.floor(index / 5) * (100 / 3)}%`;
  }
  if (artName === 'Lightning') art.classList.add('legend-art-lightning');
  if (artName === 'Storm Shot') art.classList.add('legend-art-storm');
  if (artName === 'Earth Shot' || artName === 'Pebble Flurry') art.classList.add('legend-art-earth');
  return art;
}

let legendSignature = '';

/** The spell the player has loaded: online it is tracked by the client, solo by the simulation. */
const currentSpell = (): SpellName => (net.online ? net.guestSpell : localInput().attack);

function updateSpellLegend() {
  const loadout = localInput().loadout;
  const selectedElements = net.online ? net.guestElements : localInput().loaded;
  const healArmed = net.online ? net.guestHeal : localInput().healArmed;
  const current = currentSpell();
  const signature =
    current + '|' + SPELLS.map((k) => k + ':' + (loadout[k] ?? 'default')).join('|') +
    '|' + selectedElements.join(',') + '|' + healArmed;
  if (signature === legendSignature) return;
  legendSignature = signature;

  const grid = $('legendgrid');
  grid.replaceChildren();
  for (const spell of SPELLS) {
    const tile = document.createElement('span');
    tile.className = 'legendtile';
    tile.dataset.spell = spell;
    tile.style.setProperty('--spell-color', COL[spell]);
    const name = variantName(spell, loadout);
    tile.appendChild(legendArtwork(name));
    tile.title = name + ' · ' + PART[spell].map((i) => emoji[i]).join(' + ');
    tile.setAttribute('aria-label', name + (spell === current ? ' — selected' : ''));
    if (spell === current) tile.classList.add('active');
    grid.append(tile);
  }

  const selectedLabel = $('legendselected');
  selectedLabel.replaceChildren(legendArtwork(variantName(current, loadout)));
  const selectedText = document.createElement('span');
  selectedText.textContent = variantName(current, loadout);
  selectedLabel.appendChild(selectedText);

  // These are the two primary elements being queued for the next cast.
  // Online play keeps its own queue; never read the solo queue for a guest.
  for (let i = 0; i < 2; i++) {
    const slot = $('elementslot' + (i + 1));
    const element = selectedElements[i];
    const healing = healArmed && i === 0;
    const filled = healing || (!healArmed && element !== undefined);
    const label = healing ? 'Heal armed' : filled ? names[element] : 'Empty';
    slot.classList.toggle('filled', filled);
    slot.classList.toggle('healing', healing);
    slot.style.setProperty('--element-color', healing ? '#86efac' : filled ? COL[names[element]] : '#556778');
    slot.title = 'Element ' + (i + 1) + ': ' + label;
    slot.setAttribute('aria-label', 'Element ' + (i + 1) + ': ' + label);
    const symbol = document.createElement('span');
    symbol.className = 'actionbar-slot-icon';
    if (filled && !healing && element !== undefined) {
      const art = document.createElement('img');
      art.className = 'actionbar-element-art';
      art.src = '/spells/element_' + names[element].toLowerCase() + '.svg';
      art.alt = '';
      symbol.appendChild(art);
    } else {
      symbol.textContent = healing ? '💚' : '—';
    }
    const number = document.createElement('span');
    number.className = 'actionbar-slot-number';
    number.textContent = String(i + 1);
    slot.replaceChildren(symbol, number);
  }
}

/** Refresh the action bar after selecting a spell or element, including online. */
export function refreshLegend() {
  updateSpellLegend();
}

export function uiLoad() {
  updateSpellLegend();
}

export function hud() {
  if (!game.p) return;
  $('hp').textContent = String(Math.ceil(Math.max(0, game.p.hp)));
  $('enemy').textContent =
    game.mode === 'mortal'
      ? game.respawn > 0
        ? 'RESPAWNING ' + Math.ceil(game.respawn / 60) + 's'
        : 'DUMMY ' + Math.ceil(Math.max(0, game.e.hp)) + '/' + game.e.max
      : dummy(game, game.e)
        ? 'DUMMY ∞ HP'
        : 'RIVAL ' + Math.ceil(Math.max(0, game.e.hp)) + '/' + game.e.max;
  uiLoad();
  for (let k of ['earth', 'sword', 'force']) {
    let n = game.p[k + 'CD'];
    $(k).textContent = n > 0 ? (n / 60).toFixed(1) + 's' : 'READY';
  }
  $('shield').textContent = game.p.shield
    ? game.p.shield.type === 4
      ? 'HEALING'
      : names[game.p.shield.type]
    : 'NONE';
  $('kills').textContent = String(game.kills);
  for (let a of [
    { key: 'heal', v: game.p.healCD, max: COOLDOWN_TICKS.HEAL },
    { key: 'bubble', v: game.p.bubbleCD, max: COOLDOWN_TICKS.BUBBLE },
    { key: 'trap', v: game.p.trapCD, max: COOLDOWN_TICKS.TRAP },
    { key: 'magma', v: game.p.magmaCD, max: COOLDOWN_TICKS.MAGMA },
  ]) {
    $(a.key + 'text').textContent = a.v > 0 ? (a.v / 60).toFixed(1) + 's' : 'READY';
    $(a.key + 'meter').style.width = 100 * (1 - a.v / a.max) + '%';
  }
}
