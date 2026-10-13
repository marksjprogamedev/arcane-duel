import { $ } from '../dom';
import { game } from '../state';
import { uiLoad } from '../ui/hud';
import { comb } from './wizard';

export function load(i) {
  game.healArmed = false;
  game.loaded = game.loaded.length >= 2 || game.loaded.includes(i) ? [i] : [...game.loaded, i];
  $('hint').textContent = 'Loaded ' + comb(game.loaded) + ' · Click to attack or Space for shield';
  uiLoad();
}

export function commit() {
  if (game.loaded.length) {
    game.attack = comb(game.loaded);
    game.loaded = [];
    game.healArmed = false;
    uiLoad();
  }
}
