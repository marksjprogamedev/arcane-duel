import { createRng } from '../random';
import { newPlayerInput, SimState } from '../simState';
import { pillars } from '../constants';
import type { GameMode, Obstacle, WizardStyle } from '../types';
import { make } from './wizard';

export interface MatchSetup {
  mode: GameMode;
  seed: number;
  /** Visual style of the local wizard (`p`) and its opponent (`e`). */
  styles: [WizardStyle, WizardStyle];
  /** HP of the mortal training dummy. */
  dummyHP: number;
  dummyMoving: boolean;
  /** What is solid in the arena; the four pillars when left out (and always online). */
  obstacles?: readonly Obstacle[];
}

/** Resets all simulation state for a new match. Contains no UI or network work. */
export function resetMatch(game: SimState, setup: MatchSetup) {
  const { mode } = setup;
  game.damageBatches.clear();
  game.mode = mode;
  game.dummyHP = setup.dummyHP;
  game.dummyMoving = setup.dummyMoving;
  game.obstacles = setup.obstacles ?? pillars;
  game.rng = createRng(setup.seed);
  game.p = make(155, 300, 200, setup.styles[0]);
  game.e = make(
    645,
    300,
    mode === 'duel' || mode === 'online' ? 200 : mode === 'mortal' ? setup.dummyHP : 100000,
    setup.styles[1],
  );
  game.input = { p: newPlayerInput({ x: 430, y: 300 }), e: newPlayerInput({ x: 150, y: 300 }) };
  game.ending = false;
  game.death = null;
  game.endClock = 0;
  game.winner = false;
  game.shots = [];
  game.bombs = [];
  game.zones = [];
  game.bubbles = [];
  game.particles = [];
  game.labels = [];
  game.arcs = [];
  game.waves = [];
  game.events = [];
  game.t = 0;
  game.aiClock = 10;
  game.aiSide = 1;
  game.dummyAngle = Math.PI;
  game.dummyClock = 85;
  game.nextId = 1;
  game.kills = 0;
  game.respawn = 0;
}
