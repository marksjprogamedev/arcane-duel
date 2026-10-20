import { styles } from '../../shared/constants';
import { DEFAULT_MAP } from '../../shared/maps';
import { make } from '../../shared/sim/wizard';
import { initInput } from './input';
import { initMenuMusic } from './audio/menuMusic';
import { initBattleMusic } from './audio/battleMusic';
import { initLobby } from './net/client';
import { draw } from './render/scene';
import { selectMap } from './render/maps';
import { fitCanvasToWindow } from './render/resolution';
import { $ } from './dom';
import { game, net } from './state';
import { hud } from './ui/hud';
import { initHudScale } from './ui/hudScale';
import { initActionBar } from './ui/hud';
import { initSettingsPanel } from './ui/settingsPanel';
import { initSpellbookIcons } from './ui/spellbook';
import { initIllustratedMenu, preloadIllustratedMenu } from './ui/illustratedMenu';

// `?debug` exposes internal state to browser-driven tests (tests/feel.mjs).
if (new URLSearchParams(location.search).has('debug'))
  Object.assign(window, { __arcane: { game, net } });

$<HTMLSelectElement>('arenaMap').addEventListener('change', (ev) => {
  selectMap((ev.target as HTMLSelectElement).value);
  if (!game.active) draw();
});
// Hold the menu behind its loading cover until the illustrated layers are ready.
preloadIllustratedMenu();
initMenuMusic();
initBattleMusic();
initSpellbookIcons();
initHudScale();
initActionBar();
initSettingsPanel();
initInput();
initLobby();
initIllustratedMenu();
game.p = make(DEFAULT_MAP.spawns.p.x, DEFAULT_MAP.spawns.p.y, 200, styles[0]);
game.e = make(DEFAULT_MAP.spawns.e.x, DEFAULT_MAP.spawns.e.y, 200, styles[3], 1, 1);
// a resize blanks the canvas; a running match repaints next frame, otherwise paint it now
fitCanvasToWindow(() => game.active || draw());
hud();
