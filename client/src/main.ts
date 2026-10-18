import { styles } from '../../shared/constants';
import { DEFAULT_MAP } from '../../shared/maps';
import { make } from '../../shared/sim/wizard';
import { initInput } from './input';
import { initMenuMusic } from './audio/menuMusic';
import { initLobby } from './net/client';
import { draw } from './render/scene';
import { selectMap } from './render/maps';
import { $ } from './dom';
import { game, net } from './state';
import { hud } from './ui/hud';
import { initHudScale } from './ui/hudScale';
import { initSettingsPanel } from './ui/settingsPanel';
import { initSpellbookIcons } from './ui/spellbook';

// `?debug` exposes internal state to browser-driven tests (tests/feel.mjs).
if (new URLSearchParams(location.search).has('debug'))
  Object.assign(window, { __arcane: { game, net } });

$<HTMLSelectElement>('arenaMap').addEventListener('change', (ev) => {
  selectMap((ev.target as HTMLSelectElement).value);
  if (!game.active) draw();
});
// Show the accessible HTML title if the artwork has not yet been uploaded.
const menuArtwork = new Image();
menuArtwork.onload = () => document.getElementById('menu')?.classList.add('art-loaded');
menuArtwork.src = '/ui/arcane_duel_battle_above_the_clouds.png';
initMenuMusic();
initSpellbookIcons();
initHudScale();
initSettingsPanel();
initInput();
initLobby();
game.p = make(DEFAULT_MAP.spawns.p.x, DEFAULT_MAP.spawns.p.y, 200, styles[0]);
game.e = make(DEFAULT_MAP.spawns.e.x, DEFAULT_MAP.spawns.e.y, 200, styles[3], 1, 1);
draw();
hud();
