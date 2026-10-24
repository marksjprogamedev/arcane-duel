import { styles } from '../../shared/constants';
import { DEFAULT_MAP, startPositions } from '../../shared/maps';
import { createWizard } from '../../shared/sim/wizard';
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
import { hud } from './ui/hud/hud';
import { initHudScale } from './ui/hud/hudScale';
import { initActionBar } from './ui/hud/hud';
import { enhanceSelects } from './ui/select';
import { initSettingsPanel } from './ui/menus/settingsPanel';
import { initSpellbookIcons } from './ui/menus/spellbook';
import { initWorkshop } from './workshop/panel';
import { loadSharedWorkshop } from './workshop/store';
import { initIllustratedMenu, preloadIllustratedMenu } from './ui/menus/illustratedMenu';
import { initAccountMenu } from './ui/menus/account';
import { initFriendsMenu } from './ui/menus/friends';

// `?debug` exposes internal state to browser-driven tests (tests/feel.mjs).
if (new URLSearchParams(location.search).has('debug'))
  Object.assign(window, { __arcane: { game, net } });

enhanceSelects();
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
// the layouts everyone shares come from the server; the bundled copy is drawn until they arrive
void loadSharedWorkshop();
initHudScale();
initActionBar();
initSettingsPanel();
initInput();
initLobby();
initIllustratedMenu();
// the account chip and screens (HTTPS only); asks the server who we are
initAccountMenu();
initFriendsMenu();
const [spawn0, spawn1] = startPositions(DEFAULT_MAP, 1);
game.wizards[0] = createWizard(spawn0.x, spawn0.y, 200, styles[0]);
game.wizards[1] = createWizard(spawn1.x, spawn1.y, 200, styles[3], 1, 1);
// a resize blanks the canvas; a running match repaints next frame, otherwise paint it now
fitCanvasToWindow(() => game.active || draw());
hud();
// a reloaded tab that was in an online match takes its seat back
resumeSavedSession();
