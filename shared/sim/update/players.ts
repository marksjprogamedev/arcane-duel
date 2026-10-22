import { BEAM, FLURRY_COOLDOWN_TICKS } from '../../constants';
import { CHARGE_TICKS, MAX_HOLD_TICKS } from '../../charge';
import { SimState } from '../../simState';
import type { Wizard } from '../../types';
import { cast } from '../combat/cast';
import { beamAngle, beamPoint } from '../aim';
import { applyInput } from '../input';
import { walkWithKeys, WALK_SPEED } from '../movement';
import { humanControlled } from '../teams';
import { beamTimer, chargeableVariant, continuousVariant, spellVariant } from '../variants';

/** A player's wizard walks with their held keys and keeps firing a held continuous spell. */
export function walkAndSpray(game: SimState, w: Wizard, dt: number) {
  if (w.fallen) return;
  const input = game.input[w.seat];
  walkWithKeys(w, input.keys, dt, WALK_SPEED, game.map);
  const firing = input.holding && continuousVariant(input.attack, input.loadout);
  const timer = firing ? beamTimer(input.attack, input.loadout) : null;
  // letting go (or switching to another beam) starts the wait before it can fire again
  if (w.beamTimer && w.beamTimer !== timer) {
    w[w.beamTimer] = Math.max(w[w.beamTimer], BEAM.COOLDOWN_TICKS);
    w.beamTimer = null;
  }
  if (!firing) {
    w.beamAim = null;
    return;
  }
  // the beam follows the cursor, but only turns so fast
  w.beamAim = beamAngle(w.beamAim, w, input.mouse, dt);
  if (w.cast > 0) return;
  const at = beamPoint(w, w.beamAim, input.mouse);
  if (cast(game, w, at.x, at.y, 1, input.attack, input.loadout) && timer) w.beamTimer = timer;
}

/** Everyone's charge state, the one place it is decided. */
export function updateCharges(game: SimState, dt: number) {
  // Charge state, the one place it is decided; snapshots show it to every player.
  for (const wizard of game.wizards) {
    const input = game.input[wizard.seat];
    const charging =
      input.holding &&
      chargeableVariant(input.attack, input.loadout) &&
      (input.attack !== 'MAGMA' || wizard.magmaCD <= 0) &&
      !wizard.fallen &&
      humanControlled(game, wizard);
    wizard.chargeSpell = charging ? input.attack : null;
    input.charge = charging ? Math.min(MAX_HOLD_TICKS, input.charge + dt) : 0;
    wizard.chargeTicks = Math.min(CHARGE_TICKS, input.charge);
    // a charge held 3 s past full is let go, as if the button were released
    if (input.charge >= MAX_HOLD_TICKS)
      applyInput(game, wizard.seat, { kind: 'pointerup', x: input.mouse.x, y: input.mouse.y });
  }
}

/** Releasing the mouse (or switching spells) retracts a held beam completely. */
export function retractBeams(game: SimState) {
  // Releasing the mouse (or switching spells) retracts a held beam completely.
  for (const w of game.wizards) {
    const input = game.input[w.seat];
    if (!input.holding || input.attack !== 'PLASMA' || input.loadout.PLASMA !== 'plasma_beam')
      w.plasmaReach = 0;
    if (!input.holding || input.attack !== 'MAGNETIC' || input.loadout.MAGNETIC !== 'magnetic_pull')
      w.magneticReach = 0;
  }
}

/** A Pebble Flurry ends after 1.5 s of firing or when the button is let go; then it must recharge. */
export function endFlurries(game: SimState, dt: number) {
  // A Pebble Flurry ends after 1.5 s of firing or when the button is let go; then it must recharge.
  for (const w of game.wizards) {
    if (w.flurryTime <= 0) continue;
    const input = game.input[w.seat];
    const firing =
      input.holding &&
      input.attack === 'EARTH' &&
      spellVariant('EARTH', input.loadout) === 'pebbles';
    w.flurryTime -= dt;
    if (w.flurryTime <= 0 || !firing) {
      w.flurryTime = 0;
      w.flurryCD = FLURRY_COOLDOWN_TICKS;
    }
  }
}
