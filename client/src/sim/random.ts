import { game } from '../state';

/** Uniform random number in [a, b) from the match's seeded generator. */
export const simRand = (a: number, b: number) => a + game.rng() * (b - a);
