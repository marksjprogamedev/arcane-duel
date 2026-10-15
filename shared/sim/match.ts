import { createRng } from '../random';
import { DEFAULT_RULES, newPlayerInput, SimState } from '../simState';
import { DEFAULT_MAP, maxTeamSize, startPositions, type MapDef } from '../maps';
import type { GameMode, MatchRules, SpellLoadout, WizardStyle } from '../types';
import { clamp } from '../math';
import { make } from './wizard';

export interface MatchSetup {
  mode: GameMode;
  seed: number;
  /** Visual styles by seat (the last one repeats if there are fewer than seats). */
  styles: WizardStyle[];
  /** HP of the mortal training dummy. */
  dummyHP: number;
  dummyMoving: boolean;
  /** Where the match is played; the default arena when left out. */
  map?: MapDef;
  /** Online round number; decides which side each wizard starts on (see `spawnsFor`). */
  round?: number;
  loadout?: SpellLoadout;
  /** Team size and rules; a duel when left out. */
  rules?: Partial<MatchRules>;
}

/** Resets all simulation state for a new match. Contains no UI or network work. */
export function resetMatch(game: SimState, setup: MatchSetup) {
  const { mode } = setup;
  game.damageBatches.clear();
  game.mode = mode;
  game.dummyHP = setup.dummyHP;
  game.dummyMoving = setup.dummyMoving;
  game.map = setup.map ?? DEFAULT_MAP;
  game.rng = createRng(setup.seed);
  const teamSize = clamp(setup.rules?.teamSize ?? 1, 1, maxTeamSize(game.map));
  game.rules = { ...DEFAULT_RULES, ...setup.rules, teamSize };
  const starts = startPositions(game.map, teamSize, setup.round);
  game.starts = starts;
  game.score = [0, 0];
  // the training dummy or AI in a solo game has its own health; everyone else has 200
  const rivalHp =
    mode === 'duel' || mode === 'online' ? 200 : mode === 'mortal' ? setup.dummyHP : 100000;
  game.wizards = starts.map((at, seat) =>
    make(
      at.x,
      at.y,
      seat === 1 && teamSize === 1 ? rivalHp : 200,
      setup.styles[Math.min(seat, setup.styles.length - 1)],
      seat,
      seat < teamSize ? 0 : 1,
    ),
  );
  // each wizard starts out facing the other team's first spawn
  game.input = starts.map((_, seat) =>
    newPlayerInput({ ...starts[seat < teamSize ? teamSize : 0] }),
  );
  game.input[0].loadout = { ...setup.loadout };
  game.ending = false;
  game.death = null;
  game.endClock = 0;
  game.winner = false;
  game.shots = [];
  game.bombs = [];
  game.zones = [];
  game.bubbles = [];
  game.traps = [];
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
