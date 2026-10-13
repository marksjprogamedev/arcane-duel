import { COL, emoji, names } from '../../../shared/constants';
import { $ } from '../dom';
import { comb, dummy } from '../sim/wizard';
import { game } from '../state';

export function uiLoad() {
  let k = comb(game.loaded);
  $('attack').textContent = game.attack;
  $('attack').style.color = COL[game.attack];
  $('loaded').textContent = game.healArmed
    ? '💚 HEAL ARMED'
    : game.loaded.length
      ? game.loaded.map((i) => emoji[i]).join(' + ') + ' ' + k
      : '— EMPTY —';
  $('loaded').style.color = game.healArmed ? '#86efac' : k ? COL[k] : '#cbd5e1';
  $('spell').textContent = game.attack;
  $('spell').style.color = COL[game.attack];
}

export function hud() {
  if (!game.p) return;
  $('hp').textContent = String(Math.ceil(Math.max(0, game.p.hp)));
  $('enemy').textContent =
    game.mode === 'mortal'
      ? game.respawn > 0
        ? 'RESPAWNING ' + Math.ceil(game.respawn / 60) + 's'
        : 'DUMMY ' + Math.ceil(Math.max(0, game.e.hp)) + '/' + game.e.max
      : dummy(game.e)
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
    { key: 'heal', v: game.p.healCD, max: 600 },
    { key: 'magma', v: game.p.magmaCD, max: 195 },
  ]) {
    $(a.key + 'text').textContent = a.v > 0 ? (a.v / 60).toFixed(1) + 's' : 'READY';
    $(a.key + 'meter').style.width = 100 * (1 - a.v / a.max) + '%';
  }
}
