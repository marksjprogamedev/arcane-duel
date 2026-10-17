import { COL, COOLDOWN_TICKS, emoji, names, PART } from '../../../shared/constants';
import { dummy } from '../../../shared/sim/wizard';
import { $ } from '../dom';
import { game, localInput, me, net } from '../state';
import type { SpellName } from '../../../shared/types';
import { variantName, spellArtName, spellVariant } from '../../../shared/sim/variants';
import { FLURRY_COOLDOWN_TICKS } from '../../../shared/sim/combat';
import type { Wizard, SpellLoadout } from '../../../shared/types';

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
      (name === 'Frost Shards' ? '?v=three-shards-1' : name === 'Water Spray' || name === 'Pyrodisk' ? '?v=e0a11be' : '');
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

/** Cooldown source and its full duration mirror the simulation's cast gates. */
function spellCooldown(spell: SpellName, wizard: Wizard, loadout: SpellLoadout) {
  const variant = spellVariant(spell, loadout);
  if (variant === 'pebbles') return { left: wizard.flurryCD, max: FLURRY_COOLDOWN_TICKS };
  if (variant === 'fireball') return { left: wizard.fireCD, max: 30 };
  if (variant === 'pyro_disc') return { left: wizard.fireCD, max: 62 };
  if (variant === 'shards') return { left: wizard.earthCD, max: 34 };
  if (variant === 'water_surge') return { left: wizard.waterCD, max: 300 };
  if (variant === 'thundercloud') return { left: wizard.waterCD, max: 480 };
  if (variant === 'lava_pool') return { left: wizard.magmaCD, max: 160 };
  if (variant === 'plasma_beam') return { left: wizard.fireCD, max: 8 };
  if (variant === 'magnetic_pull') return { left: wizard.earthCD, max: 5 };
  switch (spell) {
    case 'FIRE': return { left: wizard.fireCD, max: COOLDOWN_TICKS.FIRE };
    case 'WATER': return { left: wizard.waterCD, max: COOLDOWN_TICKS.WATER };
    case 'LIGHTNING': return { left: wizard.lightCD, max: COOLDOWN_TICKS.LIGHTNING };
    case 'EARTH': return { left: wizard.earthCD, max: COOLDOWN_TICKS.EARTH };
    case 'MAGMA': return { left: wizard.magmaCD, max: COOLDOWN_TICKS.MAGMA };
    default: return { left: 0, max: 1 };
  }
}

/** Animate only the cooldown layer; rebuilding tiles each frame would flicker. */
function updateSpellCooldowns() {
  const wizard = me();
  if (!wizard) return;
  const loadout = localInput().loadout;
  for (const tile of document.querySelectorAll<HTMLElement>('#legendgrid .legendtile')) {
    const spell = tile.dataset.spell as SpellName;
    if (!spell) continue;
    const { left, max } = spellCooldown(spell, wizard, loadout);
    const cooling = left > 0;
    const fill = tile.querySelector<HTMLElement>('.legend-cooldown-fill');
    if (fill) fill.style.height = cooling ? (100 * Math.max(0, Math.min(1, 1 - left / max))) + '%' : '0%';
    tile.classList.toggle('on-cooldown', cooling);
    const name = variantName(spell, loadout);
    tile.title = cooling ? name + ' — ' + (left / 60).toFixed(1) + 's until ready' : name + ' — ready';
    tile.setAttribute('aria-label', tile.title + (spell === currentSpell() ? ' — selected' : ''));
  }
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
    const cooldownFill = document.createElement('span');
    cooldownFill.className = 'legend-cooldown-fill';
    cooldownFill.setAttribute('aria-hidden', 'true');
    tile.appendChild(cooldownFill);
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
  updateSpellCooldowns();
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
