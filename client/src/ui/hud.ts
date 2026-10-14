import { COL, COOLDOWN_TICKS, emoji, names } from '../../../shared/constants';
import { comb, dummy } from '../../../shared/sim/wizard';
import { $ } from '../dom';
import { game, localInput } from '../state';

export function uiLoad() {
  let k = comb(localInput().loaded);
  $('attack').textContent = localInput().attack;
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
  $('spell').textContent = localInput().attack;
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
    { key: 'magma', v: game.p.magmaCD, max: COOLDOWN_TICKS.MAGMA },
  ]) {
    $(a.key + 'text').textContent = a.v > 0 ? (a.v / 60).toFixed(1) + 's' : 'READY';
    $(a.key + 'meter').style.width = 100 * (1 - a.v / a.max) + '%';
  }
}
