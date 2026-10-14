import { styles } from '../../shared/constants';
import { make } from '../../shared/sim/wizard';
import { initInput } from './input';
import { initLobby } from './net/client';
import { draw } from './render/scene';
import { selectMap } from './render/maps';
import { $ } from './dom';
import { game, net } from './state';
import { hud } from './ui/hud';

// `?debug` exposes internal state to browser-driven tests (tests/feel.mjs).
if (new URLSearchParams(location.search).has('debug'))
  Object.assign(window, { __arcane: { game, net } });

$<HTMLSelectElement>('arenaMap').addEventListener('change', (ev) => {
  selectMap((ev.target as HTMLSelectElement).value);
  if (!game.active) draw();
});
initInput();
initLobby();
game.p = make(155, 300, 200, styles[0]);
game.e = make(645, 300, 200, styles[3]);
draw();
hud();
