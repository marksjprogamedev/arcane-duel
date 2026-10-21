// Shuffle for the music: every song plays once, in a random order, before any song repeats, and the
// same song never plays twice in a row (not even where one round ends and the next begins).

export interface ShuffleState {
  /** Songs still to play this round; the next one is taken from the end. */
  bag: string[];
  /** The song picked last. */
  last: string | null;
}

export const newShuffle = (): ShuffleState => ({ bag: [], last: null });

/** A random order of `ids` (Fisher-Yates); `rng` returns a number from 0 up to, not including, 1. */
function shuffled(ids: string[], rng: () => number): string[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The song to play next out of `ids` (the songs that exist now), and the new state.
 * Songs that have been removed since the last pick are dropped from the round.
 */
export function pickNext(
  state: ShuffleState,
  ids: string[],
  rng: () => number,
): { id: string | null; state: ShuffleState } {
  if (ids.length === 0) return { id: null, state: newShuffle() };
  let bag = state.bag.filter((id) => ids.includes(id));
  if (bag.length === 0) {
    bag = shuffled(ids, rng);
    // a new round must not open with the song that closed the last one
    if (ids.length > 1 && bag[bag.length - 1] === state.last) bag.unshift(bag.pop() as string);
  }
  const id = bag[bag.length - 1];
  return { id, state: { bag: bag.slice(0, -1), last: id } };
}

/** The song `pickNext` will give next, when that is already decided (null at the start of a round). */
export function peekNext(state: ShuffleState, ids: string[]): string | null {
  const bag = state.bag.filter((id) => ids.includes(id));
  return bag.length ? bag[bag.length - 1] : null;
}
