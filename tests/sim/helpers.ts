import { resetMatch } from '../../client/src/sim/match';
import { net } from '../../client/src/state';
import { styles } from '../../shared/constants';
import { GameMode } from '../../shared/types';

/** Puts the shared game state into a fresh 1v1 duel, exactly like the game does when starting. */
export function resetDuel(mode: GameMode = 'online', seed = 1) {
  resetMatch({ mode, seed, styles: [styles[0], styles[3]], dummyHP: 160, dummyMoving: false });
  net.mpRole = null;
}

export const press = (code: string) => ({ kind: 'key' as const, code, down: true });
export const release = (code: string) => ({ kind: 'key' as const, code, down: false });
