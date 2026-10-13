import { $ } from './dom';
import { comb } from './sim/wizard';
import { localInput } from './state';
import { uiLoad } from './ui/hud';

export function load(i: number) {
  localInput().healArmed = false;
  localInput().loaded =
    localInput().loaded.length >= 2 || localInput().loaded.includes(i)
      ? [i]
      : [...localInput().loaded, i];
  $('hint').textContent =
    'Loaded ' + comb(localInput().loaded) + ' · Click to attack or Space for shield';
  uiLoad();
}

export function commit() {
  if (localInput().loaded.length) {
    localInput().attack = comb(localInput().loaded);
    localInput().loaded = [];
    localInput().healArmed = false;
    uiLoad();
  }
}
