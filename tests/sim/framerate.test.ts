import { describe, expect, it } from 'vitest';
import { FixedStepper } from '../../client/src/loop/fixedStep';
import { applyInput } from '../../shared/sim/input';
import { resolveDeaths, update } from '../../shared/sim/update';
import { game, press, resetDuel } from './helpers';

const STEP = 1000 / 60;

/** Plays a scripted AI duel for `targetTicks` simulation ticks using the given frame times. */
function play(nextFrameMs: () => number, targetTicks = 1200) {
  resetDuel('duel', 11);
  const stepper = new FixedStepper(STEP, 1000);
  let ticks = 0;
  while (ticks < targetTicks) {
    const { steps } = stepper.advance(nextFrameMs());
    for (let i = 0; i < steps && ticks < targetTicks; i++) {
      // inputs depend only on the tick number, never on the frame
      if (ticks === 5) applyInput(game, 0, { kind: 'pointerdown', x: 500, y: 300 });
      if (ticks % 120 === 30) applyInput(game, 0, press('KeyD'));
      if (ticks % 120 === 90) applyInput(game, 0, press('KeyA'));
      if (ticks % 200 === 150) applyInput(game, 0, { kind: 'bomb', x: 500, y: 300 });
      if (update(game, 1)) resolveDeaths(game);
      ticks++;
    }
  }
  return JSON.stringify([
    game.p.x,
    game.p.y,
    game.p.hp,
    game.e.x,
    game.e.y,
    game.e.hp,
    game.t,
    game.shots.length,
  ]);
}

describe('frame-rate independence', () => {
  const reference = play(() => STEP);

  it.each([
    ['30 Hz', () => 1000 / 30],
    ['144 Hz', () => 1000 / 144],
    ['240 Hz', () => 1000 / 240],
    ['75 Hz', () => 1000 / 75],
  ])('a match plays identically at %s', (_name, frame) => {
    expect(play(frame)).toBe(reference);
  });

  it('a match plays identically with jittery frame times', () => {
    let i = 0;
    expect(play(() => 4 + ((i++ * 7919) % 31))).toBe(reference);
  });

  it('the AI actually did something (so the comparison is meaningful)', () => {
    const [, , , , , eHp] = JSON.parse(reference);
    expect(eHp).toBeLessThan(200);
  });
});
