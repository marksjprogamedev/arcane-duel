import { styles } from '../../shared/constants';
import { DEFAULT_MAP, startPositions } from '../../shared/maps';
import { make } from '../../shared/sim/wizard';
import { initInput } from './input';
import { initMenuMusic } from './audio/menuMusic';
import { initBattleMusic } from './audio/battleMusic';
import { initFreezeSound } from './audio/freezeSound';
import { initLobby, resumeSavedSession } from './net/client';
import { draw } from './render/scene';
import { selectMap } from './render/arena/maps';
import { fitCanvasToWindow } from './render/resolution';
import { $ } from './dom';
import { game, net } from './state';
import { hud } from './ui/hud';
import { initHudScale } from './ui/hudScale';
import { initActionBar } from './ui/hud';
import { initSettingsPanel } from './ui/settingsPanel';
import { initSpellbookIcons } from './ui/spellbook';
import { initWorkshop } from './workshop/panel';
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
initFreezeSound();
initSpellbookIcons();
// Dispatches the saved look; the in-match wizard (workshop/inMatch) is already listening.
initWorkshop();
initHudScale();
initActionBar();
initSettingsPanel();
initInput();
initLobby();
initIllustratedMenu();
const [spawn0, spawn1] = startPositions(DEFAULT_MAP, 1);
game.wizards[0] = make(spawn0.x, spawn0.y, 200, styles[0]);
game.wizards[1] = make(spawn1.x, spawn1.y, 200, styles[3], 1, 1);
// a resize blanks the canvas; a running match repaints next frame, otherwise paint it now
fitCanvasToWindow(() => game.active || draw());
hud();
// a reloaded tab that was in an online match takes its seat back
resumeSavedSession();
