import {
  BEAM,
  SPELL_COLOR,
  COOLDOWN_TICKS,
  ELEMENT_EMOJI,
  FLURRY_COOLDOWN_TICKS,
  ELEMENT_NAMES,
  SPELL_ELEMENTS,
} from '../../../shared/constants';
import { $, cv } from '../dom';
import { game, isTeamMatch, localInput, me, net } from '../state';
import type { SpellName } from '../../../shared/types';
import {
  continuousVariant,
  variantName,
  spellArtName,
  spellVariant,
} from '../../../shared/sim/variants';
import { cooldownSeconds } from './cooldownText';
import { barSpells, partnerOf, type BarState } from './actionBarMath';
import { getSettings, onSettings, updateSettings } from '../settings';
import { combineElements } from '../../../shared/sim/wizard';
import type { Wizard, SpellLoadout } from '../../../shared/types';

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
  'Flamethrower',
  'Fireball',
  'Pyrodisk',
  'Water Spray',
  'Water Surge',
  'Lightning',
  'Earth Shot',
  'Pebble Flurry',
  'Steam Shot',
  'Plasma Shot',
  'Plasma Beam',
  'Magma Shot',
  'Lava Pool',
  'Storm Shot',
  'Thundercloud',
  'Ice Shot',
  'Frost Shards',
  'Magnetic Shot',
  'Magnetic Pull',
];
const DETAILED = new Set([
  'Plasma Shot',
  'Plasma Beam',
  'Magnetic Shot',
  'Magnetic Pull',
  'Ice Shot',
  'Frost Shards',
  'Water Spray',
  'Pyrodisk',
]);
function legendArtwork(name: string): HTMLElement {
  const art = document.createElement('span');
  art.className = 'legend-spell-art';
  const artName = spellArtName(name);
  if (DETAILED.has(artName)) {
    const img = document.createElement('img');
    img.alt = '';
    img.src =
      '/spells/' +
      artName.toLowerCase().replaceAll(' ', '_') +
      '.png' +
      (name === 'Frost Shards'
        ? '?v=three-shards-1'
        : name === 'Water Spray' || name === 'Pyrodisk'
          ? '?v=e0a11be'
          : '');
    art.appendChild(img);
  } else {
    const index = ATLAS_ORDER.indexOf(artName);
    if (index >= 0)
      art.style.backgroundPosition = `${(index % 5) * 25}% ${Math.floor(index / 5) * (100 / 3)}%`;
  }
  if (artName === 'Lightning') art.classList.add('legend-art-lightning');
  if (artName === 'Storm Shot') art.classList.add('legend-art-storm');
  if (artName === 'Earth Shot' || artName === 'Pebble Flurry')
    art.classList.add('legend-art-earth');
  return art;
}

/** Cooldown source and its full duration mirror the simulation's cast gates. */
function spellCooldown(spell: SpellName, wizard: Wizard, loadout: SpellLoadout) {
  const variant = spellVariant(spell, loadout);
  if (variant === 'pebbles') return { left: wizard.flurryCD, max: FLURRY_COOLDOWN_TICKS };
  if (variant === 'fireball') return { left: wizard.fireCD, max: 30 };
  if (variant === 'pyro_disc') return { left: wizard.fireCD, max: 62 };
  if (variant === 'shards') return { left: wizard.iceCD, max: 34 };
  if (variant === 'water_surge') return { left: wizard.waterCD, max: 300 };
  if (variant === 'thundercloud') return { left: wizard.stormCD, max: 480 };
  if (variant === 'lava_pool') return { left: wizard.magmaCD, max: 160 };
  if (variant === 'plasma_beam') return { left: wizard.plasmaCD, max: 8 };
  if (variant === 'magnetic_pull') return { left: wizard.magneticCD, max: 5 };
  switch (spell) {
    case 'FIRE':
      return { left: wizard.fireCD, max: COOLDOWN_TICKS.FIRE };
    case 'WATER':
      return { left: wizard.waterCD, max: COOLDOWN_TICKS.WATER };
    case 'LIGHTNING':
      return { left: wizard.lightCD, max: COOLDOWN_TICKS.LIGHTNING };
    case 'EARTH':
      return { left: wizard.earthCD, max: COOLDOWN_TICKS.EARTH };
    case 'MAGMA':
      return { left: wizard.magmaCD, max: COOLDOWN_TICKS.MAGMA };
    case 'STEAM':
      return { left: wizard.steamCD, max: COOLDOWN_TICKS.STEAM };
    case 'PLASMA':
      return { left: wizard.plasmaCD, max: COOLDOWN_TICKS.PLASMA };
    case 'ICE':
      return { left: wizard.iceCD, max: COOLDOWN_TICKS.ICE };
    case 'MAGNETIC':
      return { left: wizard.magneticCD, max: COOLDOWN_TICKS.MAGNETIC };
    default:
      return { left: 0, max: 1 };
  }
}

/**
 * What a spell's cooldown readout shows: whether it is cooling down, the ticks left, and how far
 * (0..1) its fill has risen. Used by the action bar in a match and the spellbook's bar.
 */
export function cooldownDisplay(spell: SpellName, wizard: Wizard, loadout: SpellLoadout) {
  const { left, max } = spellCooldown(spell, wizard, loadout);
  // Every cooldown, however short, fills up from the bottom of its tile, except for spells you
  // hold down to keep firing (sprays, Lightning, the beams): their tiny cooldown is just the rate
  // of fire, and a fill would flicker the whole time. Those show it only for the wait after you
  // let go (`BEAM.COOLDOWN_TICKS`), which is longer than any rate of fire. Pebble Flurry is
  // held-to-fire too, but it has a real cooldown after each flurry, so it always shows.
  const holdToFire =
    continuousVariant(spell, loadout) && spellVariant(spell, loadout) !== 'pebbles';
  const cooling = left > (holdToFire ? max : 0);
  const filled = Math.max(0, Math.min(1, 1 - left / (holdToFire ? BEAM.COOLDOWN_TICKS : max)));
  return { left, cooling, filled };
}

/** Animate only the cooldown layer; rebuilding tiles each frame would flicker. */
export function updateSpellCooldowns() {
  const wizard = me();
  if (!wizard) return;
  const loadout = localInput().loadout;
  for (const tile of document.querySelectorAll<HTMLElement>('#legendgrid .legendtile')) {
    const spell = tile.dataset.spell as SpellName;
    if (!spell) continue;
    const { left, cooling, filled } = cooldownDisplay(spell, wizard, loadout);
    const fill = tile.querySelector<HTMLElement>('.legend-cooldown-fill');
    if (fill) fill.style.height = cooling ? 100 * filled + '%' : '0%';
    tile.classList.toggle('on-cooldown', cooling);
    const time = tile.querySelector<HTMLElement>('.legend-cooldown-time');
    if (time) time.textContent = cooling ? cooldownSeconds(left) : '';
    const name = variantName(spell, loadout);
    tile.title =
      `${name} (${spellKeys(spell)}) — ` +
      (cooling ? (left / 60).toFixed(1) + 's until ready' : 'ready');
    tile.setAttribute('aria-label', tile.title + (spell === currentSpell() ? ' — selected' : ''));
  }
}

let legendSignature = '';

/** The number keys that load a spell: "1" for a single element, "1+2" for a combination. */
const spellKeys = (spell: SpellName) => SPELL_ELEMENTS[spell].map((i) => i + 1).join('+');

/** The spell the player has loaded: online it is tracked by the client, solo by the simulation. */
const currentSpell = (): SpellName => (net.online ? net.selectedSpell : localInput().attack);

/** What was loaded when the player stepped back to the four elements: the bar stays there until it changes. */
let baseOverride: string | null = null;

/** The action bar's inputs, from the player's own state (online it is tracked by the client). */
function barState(): BarState {
  const loaded = net.online ? net.selectedElements : localInput().loaded;
  return {
    legacy: getSettings().legacyActionBar,
    loaded,
    healArmed: net.online ? net.healArmed : localInput().healArmed,
    showBase: baseOverride !== null && baseOverride === loaded.join(','),
  };
}

/**
 * Clicking the element tile an element's combinations are shown for steps back to the four
 * elements. True if clicking `spell` does that (call before the click is handled).
 */
export function stepsBackToElements(spell: SpellName): boolean {
  const bar = barState();
  const first = partnerOf(bar);
  return first !== null && spell === ELEMENT_NAMES[first];
}

/** Shows the four elements again while the current selection stays loaded. */
export function showElementTiles() {
  baseOverride = barState().loaded.join(',');
  updateSpellLegend();
}

function updateSpellLegend() {
  const loadout = localInput().loadout;
  const bar = barState();
  const selectedElements = bar.loaded;
  const healArmed = bar.healArmed;
  // The new bar highlights what is loaded now; the classic bar, the spell last cast.
  const current = bar.legacy
    ? currentSpell()
    : ((selectedElements.length ? combineElements([...selectedElements]) : null) ?? currentSpell());
  const spells = barSpells(bar);
  const signature =
    current +
    '|' +
    spells.map((k) => k + ':' + (loadout[k] ?? 'default')).join('|') +
    '|' +
    selectedElements.join(',') +
    '|' +
    healArmed +
    '|' +
    bar.legacy +
    '|' +
    variantName(current, loadout);
  if (signature === legendSignature) return;
  legendSignature = signature;
  // the small icon beside the chosen elements: the attack a click casts now
  const loadedIcon = $('loadedspell');
  const loadedName = variantName(current, loadout);
  loadedIcon.querySelector('.cdicon-art')!.replaceChildren(legendArtwork(loadedName));
  loadedIcon.style.setProperty('--spell-color', SPELL_COLOR[current]);
  loadedIcon.title = `Loaded: ${loadedName} (${spellKeys(current)})`;
  loadedIcon.setAttribute('aria-label', loadedIcon.title);
  $('legendgrid').classList.toggle('compact', !bar.legacy);
  $('legend').classList.toggle('compactbar', !bar.legacy);
  $<HTMLInputElement>('legacybar').checked = bar.legacy;

  const grid = $('legendgrid');
  grid.replaceChildren();
  for (const spell of spells) {
    const tile = document.createElement('span');
    tile.className = 'legendtile';
    tile.dataset.spell = spell;
    tile.style.setProperty('--spell-color', SPELL_COLOR[spell]);
    const name = variantName(spell, loadout);
    tile.appendChild(legendArtwork(name));
    const cooldownFill = document.createElement('span');
    cooldownFill.className = 'legend-cooldown-fill';
    cooldownFill.setAttribute('aria-hidden', 'true');
    tile.appendChild(cooldownFill);
    const cooldownTime = document.createElement('span');
    cooldownTime.className = 'legend-cooldown-time';
    cooldownTime.setAttribute('aria-hidden', 'true');
    tile.appendChild(cooldownTime);
    const keys = document.createElement('span');
    keys.className = 'legend-keys';
    keys.setAttribute('aria-hidden', 'true');
    keys.textContent = spellKeys(spell);
    tile.appendChild(keys);
    tile.title = name + ' · ' + SPELL_ELEMENTS[spell].map((i) => ELEMENT_EMOJI[i]).join(' + ');
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
    const label = healing ? 'Heal armed' : filled ? ELEMENT_NAMES[element] : 'Empty';
    slot.classList.toggle('filled', filled);
    slot.classList.toggle('healing', healing);
    slot.style.setProperty(
      '--element-color',
      healing ? '#86efac' : filled ? SPELL_COLOR[ELEMENT_NAMES[element]] : '#556778',
    );
    slot.title = 'Element ' + (i + 1) + ': ' + label;
    slot.setAttribute('aria-label', 'Element ' + (i + 1) + ': ' + label);
    const symbol = document.createElement('span');
    symbol.className = 'actionbar-slot-icon';
    if (filled && !healing && element !== undefined) {
      const art = document.createElement('img');
      art.className = 'actionbar-element-art';
      art.src = '/spells/element_' + ELEMENT_NAMES[element].toLowerCase() + '.svg';
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

/** Wires the "legacy bar" tick box: it saves the choice and redraws the bar at once. */
export function initActionBar() {
  const box = $<HTMLInputElement>('legacybar');
  box.addEventListener('change', () => {
    updateSettings({ legacyActionBar: box.checked });
    cv.focus(); // a focused tick box would take the Space key (shield, bubble)
  });
  onSettings((s) => {
    box.checked = s.legacyActionBar; // the settings panel can change it too
    updateSpellLegend();
  });
}

/** Refresh the action bar after selecting a spell or element, including online. */
export function refreshLegend() {
  updateSpellLegend();
}

export function uiLoad() {
  updateSpellLegend();
}

const COOLDOWN_ICONS = [
  {
    key: 'sword',
    name: 'Sword (F)',
    info: 'A quick melee swing at a close enemy.',
    cd: 'swordCD',
    max: COOLDOWN_TICKS.SWORD,
  },
  {
    key: 'force',
    name: 'Force (Q)',
    info: 'A shockwave that shoves nearby enemies away.',
    cd: 'forceCD',
    max: COOLDOWN_TICKS.FORCE,
  },
  {
    key: 'heal',
    name: 'Greater Heal (E, then 2)',
    info: 'Restores a quarter of your health.',
    cd: 'healCD',
    max: COOLDOWN_TICKS.HEAL,
  },
  {
    key: 'bubble',
    name: 'Bubble (Space twice)',
    info: 'A dome that reflects any spell touching its edge.',
    cd: 'bubbleCD',
    max: COOLDOWN_TICKS.BUBBLE,
  },
  {
    key: 'trap',
    name: 'Trap (middle click)',
    info: 'Sets a rune at the cursor that goes off when an enemy steps on it.',
    cd: 'trapCD',
    max: COOLDOWN_TICKS.TRAP,
  },
] as const;

/**
 * The ability icons on screen (top right). While one recharges its dark cover sweeps away clockwise
 * from twelve o'clock, like a cooldown in World of Warcraft, with the seconds left on top when the
 * wait is longer than two seconds.
 */
export function updateCooldownPanels(w: Wizard) {
  for (const icon of COOLDOWN_ICONS) {
    const left = w[icon.cd];
    const tile = $(icon.key + 'cd');
    // a spell variant can recharge for longer than the default the sweep is scaled to
    const done = Math.max(0, Math.min(1, 1 - left / icon.max));
    tile.classList.toggle('cooling', left > 0);
    tile.style.setProperty('--p', (done * 360).toFixed(1) + 'deg');
    tile.querySelector<HTMLElement>('.cdicon-time')!.textContent =
      left > 0 && icon.max > 120 ? cooldownSeconds(left) : '';
    const label = `${icon.name}: ${icon.info} ${left > 0 ? (left / 60).toFixed(1) + 's until ready' : 'Ready.'}`;
    tile.title = label;
    tile.setAttribute('aria-label', label);
  }
}

/** Top left of the arena: your own health, and a line for what the rival's health bar can't say. */
export function updatePlayerInfo(w: Wizard, extra: string) {
  // a team match has its own panel on the canvas (teamHud.ts) listing everyone's health, which this would sit on top of
  if (isTeamMatch()) $('playerinfo').style.display = 'none';
  $('hp').textContent = Math.ceil(Math.max(0, w.hp)) + '/' + w.max;
  $('enemy').textContent = extra;
}

export function hud() {
  // seat 0 even online: see docs/REFACTOR-ISSUES.md #2
  const player = game.wizards[0];
  if (!player) return;
  // the rival's own health shows by its health bar; only a respawning dummy has nothing to point at
  updatePlayerInfo(
    player,
    game.mode === 'mortal' && game.respawn > 0
      ? 'DUMMY RESPAWNING ' + Math.ceil(game.respawn / 60) + 's'
      : '',
  );
  uiLoad();
  updateSpellCooldowns();
  updateCooldownPanels(player);
}
