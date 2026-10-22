import { COOLDOWN_TICKS, styles } from '../../shared/constants';
import { advanceCosmetics, spawnFx } from './fx/cosmetics';
import { canChargeSpell, CHARGE_TICKS, MAX_HOLD_TICKS } from '../../shared/charge';
import { clamp } from '../../shared/math';
import { newSeed } from '../../shared/random';
import { resetMatch } from '../../shared/sim/match';
import { beamAngle, beamPoint } from '../../shared/sim/aim';
import { moveKeysToBits } from '../../shared/sim/movement';
import { chargeableVariant } from '../../shared/sim/variants';
import { resolveDeaths } from '../../shared/sim/update/deaths';
import { update } from '../../shared/sim/update';
import type { GameMode } from '../../shared/types';
import { $, cv } from './dom';
import { stopMenuMusic } from './audio/menuMusic';
import { startBattleMusic, stopBattleMusic, pauseBattleMusic } from './audio/battleMusic';
import { resetFreezeSound, updateFreezeSound } from './audio/freezeSound';
import { FixedStepper } from './loop/fixedStep';
import { interpolatedPosition, send, sendInput } from './net/client';
import { serverClock, TICK_MS } from './net/clock';
import { clearSession } from './net/session';
import { clearAway } from './ui/awayOverlay';
import { movePredictor } from './net/movePrediction';
import { extrapolatedShot } from './net/shotExtrapolation';
import { drawCastPreviews, showCastPreview, releasePreview } from './net/prediction';
import { RenderInterpolator } from './render/interpolate';
import { followMouse, resetCamera, updateCamera, withCamera } from './render/camera';
import { draw } from './render/scene';
import { currentMap, selectMap } from './render/arena/maps';
import { mapFor, type MapId } from '../../shared/maps';
import type { MatchRules, SpellLoadout } from '../../shared/types';
import { startText } from './startText';
import { game, isHidden, isUnseen, localInput, me, mySeat, net, others, watchers } from './state';
import { hud } from './ui/hud';
import { hideSettings, showSettings } from './ui/settingsPanel';
import { readLoadout } from './ui/spellbook';
import { stopSpellDemo } from './ui/spellDemo';

const stepper = new FixedStepper(TICK_MS);
const interpolator = new RenderInterpolator();
/** How far into the next simulation step the current frame is (0..1). */
let renderAlpha = 1;

/** Longest a projectile is carried past the newest snapshot (about 133 ms). */
const MAX_SHOT_EXTRAPOLATION_TICKS = 8;

export function loop(now: number) {
  if (!game.active) return;
  const elapsedMs = now - (game.last || now);
  const dt = Math.min(2, elapsedMs / TICK_MS);
  game.last = now;
  if (!game.paused) {
    // Everything advances in fixed 1/60 s steps, exactly like on the server, no matter how fast
    // the display refreshes.
    const { steps, alpha } = stepper.advance(elapsedMs);
    renderAlpha = alpha;
    if (!net.online) {
      // Solo, AI and training: we run the simulation.
      let live = false;
      for (let i = 0; i < steps; i++) {
        interpolator.capture(game);
        live = update(game, 1);
        if (live) resolveDeaths(game);
        handleSimEvents();
      }
      if (steps > 0 && live) hud();
    } else {
      // Online: the server simulates. We only send our inputs and predict our own movement.
      for (let i = 0; i < steps; i++) sendMoveCommand();
      game.t += dt;
    }
    advanceCosmetics(game, dt);
  }
  if (net.online) {
    for (const spell of Object.keys(net.spellCooldowns))
      net.spellCooldowns[spell] = Math.max(0, net.spellCooldowns[spell] - dt);
  }
  if (net.online && net.holdingAttack && game.active && !game.ending) {
    // our own spray turns toward the cursor no faster than the server's does
    const from = net.drawnSelf ?? me();
    const cursor = localInput().mouse;
    net.beamAim = beamAngle(net.beamAim, from, cursor, dt);
    net.beamFireClock -= dt;
    if (net.beamFireClock <= 0) {
      const at = beamPoint(from, net.beamAim, cursor);
      showCastPreview(net.selectedSpell, at.x, at.y);
      net.beamFireClock += COOLDOWN_TICKS[net.selectedSpell] ?? COOLDOWN_TICKS.FIRE;
    }
  }
  if (net.online && game.ending && net.endAnnounced) {
    game.endClock += dt;
    if (game.death) game.death.age += dt;
    if (game.endClock >= 115) {
      net.endAnnounced = false;
      finish();
    }
  }
  // Play Winter Breath on the transition into freeze (solo and server snapshots).
  updateFreezeSound(
    game.wizards,
    game.active,
    game.paused,
    (wizard) => !isHidden(wizard) && !isUnseen(wizard),
  );
  if (net.online && me()) {
    const blend = 1 - Math.exp((-Math.max(0.001, dt) * 16.667) / 48);
    const smooth = (previous, wizard) => {
      if (!previous) return { x: wizard.x, y: wizard.y };
      let distance = Math.hypot(wizard.x - previous.x, wizard.y - previous.y);
      if (distance > 140) return { x: wizard.x, y: wizard.y };
      return {
        x: previous.x + (wizard.x - previous.x) * blend,
        y: previous.y + (wizard.y - previous.y) * blend,
      };
    };
    const mine = me();
    const foes = others();
    for (const w of foes)
      net.visual.set(
        w.seat,
        interpolatedPosition(w.seat, performance.now()) || smooth(net.visual.get(w.seat), w),
      );
    net.drawnOther = (foes[0] && net.visual.get(foes[0].seat)) || null;
    // our own wizard: predicted from our inputs, reconciled with every snapshot
    net.drawnSelf = movePredictor.drawPosition(renderAlpha, elapsedMs) ?? { x: mine.x, y: mine.y };

    // Only the drawing coordinates are modified. Game logic always uses the server's positions.
    const real = game.wizards.map((w) => [w.x, w.y]);
    for (const w of foes) Object.assign(w, net.visual.get(w.seat));
    mine.x = net.drawnSelf.x;
    mine.y = net.drawnSelf.y;
    // Projectiles fly straight, so draw them where they should be *now* by carrying each one
    // forward from the newest snapshot along its velocity (our own are drawn by the local effects).
    const serverNow = serverClock.serverNow(performance.now());
    const age =
      serverNow === null
        ? 0
        : clamp((serverNow - net.snapshotServerMs) / TICK_MS, 0, MAX_SHOT_EXTRAPOLATION_TICKS);
    const originalShots = game.shots.map((shot) => [shot, shot.x, shot.y] as const);
    for (const shot of game.shots) {
      const at = extrapolatedShot(shot, age, game.bubbles);
      shot.x = at.x;
      shot.y = at.y;
    }
    net.drawnShots = game.shots.map((shot) => ({
      id: shot.id,
      x: shot.x,
      y: shot.y,
      mine: shot.owner === mine,
    }));
    // a fallen player watches through a standing teammate
    updateCamera(game.map, mine.fallen ? (watchers()[0] ?? mine) : mine);
    followMouse();
    withCamera(() => {
      draw();
      drawCastPreviews(dt);
    });
    game.wizards.forEach((w, i) => ([w.x, w.y] = real[i]));
    for (let [shot, x, y] of originalShots) {
      shot.x = x;
      shot.y = y;
    }
  } else {
    // draw part-way between the last two simulation steps so motion is smooth at any refresh rate
    const restore = interpolator.apply(game, renderAlpha);
    updateCamera(game.map, me());
    followMouse();
    withCamera(draw);
    restore();
  }
  if (game.active) game.frame = requestAnimationFrame(loop);
}

/** Starts a match. Online, `mapId` is the arena the server chose; solo reads the menu's picker. */
export function start(
  mode: GameMode,
  mapId?: MapId,
  rules?: MatchRules,
  loadouts?: SpellLoadout[],
) {
  stopSpellDemo(); // an online match can start while the spellbook is open in the lobby
  selectMap(mapId ?? $<HTMLSelectElement>('arenaMap').value);
  const map = mapFor(currentMap());
  $<HTMLButtonElement>('rematch').disabled = false;
  cancelAnimationFrame(game.frame);
  net.drawnOther = null;
  net.drawnSelf = null;
  net.visual.clear();
  serverClock.reset();
  stepper.reset();
  interpolator.reset();
  resetFreezeSound();
  renderAlpha = 1;
  net.snapshotServerMs = 0;
  net.drawnShots = [];
  movePredictor.reset(map);
  resetCamera();
  net.lastNetAt = 0;
  net.castPreviews = [];
  net.pendingCasts.clear();
  net.inputPending.clear();
  net.castSequence = 0;
  net.spellActions.clear();
  net.spellActionSequence = 0;
  net.samples.clear();
  net.hiddenSeats.clear();
  net.seenSeats.clear();
  net.hitHint = null;
  net.receivedSnapshotSeq = 0;
  net.holdingAttack = false;
  net.beamFireClock = 0;
  net.spellCooldowns = {};
  net.lastSpacePressAt = -Infinity;
  net.selectedSpell = 'FIRE';
  net.selectedElements = [];
  net.healArmed = false;
  let firstStyle = Math.floor(Math.random() * styles.length),
    secondStyle = Math.floor(Math.random() * (styles.length - 1));
  if (secondStyle >= firstStyle) secondStyle++;
  // Solo wizard selection; online styles remain server-assigned.
  const chosen = $<HTMLSelectElement>('wizardStyle').value;
  if (mode !== 'online' && chosen !== 'random') {
    firstStyle = Number(chosen);
    secondStyle =
      (firstStyle + 1 + Math.floor(Math.random() * (styles.length - 1))) % styles.length;
  }
  resetMatch(game, {
    mode,
    seed: newSeed(),
    styles: [styles[firstStyle], styles[secondStyle]],
    dummyHP: Number($<HTMLSelectElement>('dummyhp').value),
    dummyMoving: $<HTMLSelectElement>('dummymove').value === 'moving',
    map,
    rules,
    // solo reads the spellbook; online, the server says what every seat picked
    loadout: mode === 'online' ? {} : readLoadout(),
    loadouts,
  });
  const text = startText(game, mySeat());
  $('styles').textContent = text.header;
  closeGameSettings();
  stopMenuMusic();
  $('spellbook').style.display = 'none';
  game.active = true;
  game.paused = false;
  startBattleMusic();
  game.last = 0;
  $('menu').style.display = 'none';
  $('lobby').style.display = 'none';
  $('pause').style.display = 'none';
  $('end').style.display = 'none';
  $('cooldowns').style.display = 'flex';
  $('playerinfo').style.display = 'flex';
  $('legend').style.display = 'flex';
  $('hint').textContent = text.hint;
  hud();
  cv.focus();
  game.frame = requestAnimationFrame(loop);
}

export function finish() {
  closeGameSettings();
  game.active = false;
  stopBattleMusic();
  // Select the illustrated outcome before revealing the result overlay.
  // Its two sets of layers stay in the DOM but only the matching art is visible.
  $('end').dataset.outcome = game.team0Won ? 'victory' : 'defeat';
  $('end').style.display = 'flex';
  $('cooldowns').style.display = 'none';
  $('playerinfo').style.display = 'none';
  $('legend').style.display = 'none';
  $('toLobby').style.display = net.online ? '' : 'none';
  $('result').textContent = game.team0Won ? '🏆 VICTORY' : '💀 DEFEAT';
  $('result').style.color = game.team0Won ? '#fde68a' : '#fda4af';
  $('detail').textContent = game.team0Won
    ? 'You defeated the rival! Remaining health: ' +
      Math.ceil(Math.max(0, me().hp)) +
      '/' +
      me().max
    : 'The rival wizard defeated you.';
}

export function home() {
  if (net.room) {
    net.holdingAttack = false;
    send({ type: 'leave' });
    net.online = false;
    net.room = null;
    net.resumeToken = null;
    net.reconnecting = false;
    clearSession(); // we left on purpose: nothing to come back to after a reload
    localInput().keys = {};
  }
  stopMatchView();
  $('menu').style.display = 'flex';
  $('lobby').style.display = 'none';
}

/** Stops drawing the match and hides everything that belongs to it (not the menu or lobby). */
export function stopMatchView() {
  clearAway();
  closeGameSettings();
  game.active = false;
  stopBattleMusic();
  game.paused = false;
  localInput().holding = false;
  localInput().keys = {};
  cancelAnimationFrame(game.frame);
  $('pause').style.display = 'none';
  $('end').style.display = 'none';
  $('cooldowns').style.display = 'none';
  $('playerinfo').style.display = 'none';
  $('legend').style.display = 'none';
}

export function pause() {
  if (net.online) {
    $('hint').textContent = 'Pausing is disabled during online matches';
    return;
  }
  if (!game.active || game.ending) return;
  game.paused = !game.paused;
  pauseBattleMusic(game.paused);
  stepper.reset();
  $('pause').style.display = game.paused ? 'flex' : 'none';
  game.last = 0;
  if (!game.paused) cv.focus();
}

/** Lets go of every held key and button, locally and on the server, so nothing keeps running while a panel has the keyboard. */
export function releaseHeldInputs() {
  if (net.online) sendInput('clear');
  localInput().keys = {};
  localInput().holding = false;
  localInput().charge = 0;
  net.holdingAttack = false;
  sendMoveKeysNow();
}

/**
 * Opens the settings page over the match. Online the match keeps running (no pause exists there), so held keys
 * are released and the match gets no input until the page closes; solo it sits over the pause screen.
 */
export function openGameSettings() {
  if (!game.active || game.ending || game.settingsOpen) return;
  game.settingsOpen = true;
  releaseHeldInputs();
  showSettings({
    live: net.online ? 'online' : 'solo',
    onClose: () => {
      game.settingsOpen = false;
      cv.focus();
    },
  });
}

/** Closes the settings page if it is open over a match (the match ended, or we left it). */
export function closeGameSettings() {
  if (game.settingsOpen) hideSettings();
}

/** Online, once per game tick: tell the server which movement keys are held and where we aim. */
function sendMoveCommand() {
  // while disconnected nothing reaches the server, so don't predict moves it will never see
  if (!canSendMoves()) return;
  const input = localInput();
  const spell = localChargeSpell();
  // `charge` counts ticks of a hold that is charging, as the server does for its slowdown and release
  input.charge = spell ? Math.min(MAX_HOLD_TICKS, input.charge + 1) : 0;
  const { seq, keys } = movePredictor.tick(
    me().fallen ? {} : input.keys,
    spell,
    Math.min(CHARGE_TICKS, input.charge),
  );
  // the server lets a long-held charge go by itself; do the same here so we don't fire twice
  if (input.charge >= MAX_HOLD_TICKS) releasePreview();
  send({ type: 'move', roundId: net.roundId, seq, keys, x: input.mouse.x, y: input.mouse.y });
}

/**
 * Online, the moment a movement key changes: tell the server now instead of at the next tick
 * (up to 17 ms later), so the opponent sees us move sooner. Prediction is unchanged; the next
 * tick sends the same seq again with whatever keys are held then.
 */
export function sendMoveKeysNow() {
  if (!net.online || !canSendMoves()) return;
  const input = localInput();
  send({
    type: 'move',
    roundId: net.roundId,
    seq: movePredictor.nextSeq,
    keys: me().fallen ? 0 : moveKeysToBits(input.keys),
    x: input.mouse.x,
    y: input.mouse.y,
  });
}

/** The spell we are charging (charging slows walking), by the same rules as the simulation. */
function localChargeSpell() {
  const spell = net.selectedSpell;
  const mine = me(); // our wizard as the server last reported it
  // the simulation ignores a press while frozen, silenced or swinging
  const blocked = mine.freeze > 0 || mine.silence > 0 || mine.swing > 0;
  const charging =
    localInput().holding &&
    !blocked &&
    canChargeSpell(spell, net.spellCooldowns['MAGMA'] || 0) &&
    chargeableVariant(spell, localInput().loadout);
  return charging ? spell : null;
}

const canSendMoves = () =>
  game.active && !game.ending && net.countdown <= 0 && net.socket?.readyState === WebSocket.OPEN;

/** Applies the side effects (UI) of things the simulation reported. */
function handleSimEvents() {
  for (const ev of game.events.splice(0)) {
    switch (ev.type) {
      case 'hint':
        $('hint').textContent = ev.text;
        break;
      case 'death':
      case 'fall': // the snapshot tells every client who has fallen
        break;
      case 'round_over':
        finish();
        break;
      default:
        // cosmetic effect: make the particles here
        spawnFx(game, ev);
    }
  }
}
