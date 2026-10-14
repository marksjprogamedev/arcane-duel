import { SimState } from '../simState';

/** Uniform random number in [a, b) from the match's seeded generator. */
export const simRand = (game: SimState, a: number, b: number) => a + game.rng() * (b - a);
