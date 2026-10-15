import { COL, COOLDOWN_TICKS, emoji, names, PART } from '../../../shared/constants';
import { comb, dummy } from '../../../shared/sim/wizard';
import { $ } from '../dom';
import { game, localInput } from '../state';
import type { SpellName } from '../../../shared/types';
import { variantName } from '../../../shared/sim/variants';

const SPELLS: SpellName[] = [
  'FIRE', 'WATER', 'LIGHTNING', 'EARTH', 'STEAM',
  'PLASMA', 'MAGMA', 'STORM', 'ICE', 'MAGNETIC',
];
const SPELL_ICONS: Record<SpellName, string> = {
  FIRE: '🔥', WATER: '💧', LIGHTNING: '⚡', EARTH: '🪨',
  STEAM: '🌫️', PLASMA: '🔮', MAGMA: '🌋', STORM: '🌩️',
  ICE: '❄️', MAGNETIC: '🧲',
};
let legendSignature = '';

function updateSpellLegend() {
  const loadout = localInput().loadout;
  const signature = SPELLS.map(k => k + ':' + (loadout[k] ?? 'default')).join('|');
  if (signature === legendSignature) return;
  legendSignature = signature;
  const grid = $('legendgrid');
  grid.replaceChildren();
  for (const spell of SPELLS) {
    const tile = document.createElement('span');
    tile.className = 'legendtile';
    tile.dataset.spell = spell;
    tile.style.setProperty('--spell-color', COL[spell]);
    tile.textContent = SPELL_ICONS[spell];
    tile.title = variantName(spell, loadout) + ' · ' + PART[spell].map(i => emoji[i]).join(' + ');
    grid.append(tile);
  }
  const current = localInput().attack;
  $('legendselected').textContent = SPELL_ICONS[current] + ' ' + variantName(current, loadout) + ' · ' + PART[current].map(i => emoji[i]).join(' + ');
  for (const tile of Array.from(grid.children) as HTMLElement[])
    tile.classList.toggle('active', tile.dataset.spell === current);
}

let toggleReady = false;
export function uiLoad() {
  if (!toggleReady) {
    toggleReady = true;
    const toggle = $('legendtoggle');
    toggle.addEventListener('click', () => {
      const body = $('legendbody');
      body.hidden = !body.hidden;
      toggle.textContent = body.hidden ? '▾' : '▴';
      toggle.setAttribute('aria-expanded', String(!body.hidden));
    });
  }
  legendSignature = '';
  updateSpellLegend();
  let k = comb(localInput().loaded);
  $('attack').textContent = variantName(localInput().attack, localInput().loadout);
  $('attack').style.color = COL[localInput().attack];
  $('loaded').textContent = localInput().healArmed
    ? '💚 HEAL ARMED'
    : localInput().loaded.length
      ? localInput()
          .loaded.map((i) => emoji[i])
          .join(' + ') +
        ' ' +
        k
      : '— EMPTY —';
  $('loaded').style.color = localInput().healArmed ? '#86efac' : k ? COL[k] : '#cbd5e1';
  $('spell').textContent = variantName(localInput().attack, localInput().loadout);
  $('spell').style.color = COL[localInput().attack];
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
        : 'RIVAL ' + Math.ceil(Math.max(0, game.e.hp)) + '/200';
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
