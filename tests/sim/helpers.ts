import { createSimState } from '../../shared/simState';
import { resetMatch } from '../../shared/sim/match';
import { styles } from '../../shared/constants';
import { GameMode } from '../../shared/types';

/** Puts the shared game state into a fresh 1v1 duel, exactly like the game does when starting. */
/** The state the tests operate on. Independent of the client's global state. */
export const game = createSimState(1);

export function resetDuel(mode: GameMode = 'online', seed = 1) {
  resetMatch(game, {
    mode,
    seed,
    styles: [styles[0], styles[3]],
    dummyHP: 160,
    dummyMoving: false,
  });
}

export const press = (code: string) => ({ kind: 'key' as const, code, down: true });
export const release = (code: string) => ({ kind: 'key' as const, code, down: false });
