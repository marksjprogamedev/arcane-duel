import { SimState } from '../simState';

/** Uniform random number in [a, b) from the match's seeded generator. */
export const simRand = (game: SimState, min: number, max: number) => min + game.rng() * (max - min);
