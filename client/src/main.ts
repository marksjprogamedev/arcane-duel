import { styles } from '../../shared/constants';
import { initInput } from './input';
import { initLobby } from './net/client';
import { draw } from './render/scene';
import { make } from '../../shared/sim/wizard';
import { game } from './state';
import { hud } from './ui/hud';

initInput();
initLobby();
game.p = make(155, 300, 200, styles[0]);
game.e = make(645, 300, 200, styles[3]);
draw();
hud();
