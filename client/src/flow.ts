import { COOLDOWN_TICKS, styles } from '../../shared/constants';
import { advanceCosmetics, spawnFx } from '../../shared/fx/cosmetics';
import { canChargeSpell } from '../../shared/charge';
import { clamp } from '../../shared/math';
import { newSeed } from '../../shared/random';
import { resetMatch } from '../../shared/sim/match';
import { moveKeysToBits } from '../../shared/sim/movement';
import { resolveDeaths, update } from '../../shared/sim/update';
import type { GameMode } from '../../shared/types';
import { $, cv } from './dom';
import { FixedStepper } from './loop/fixedStep';
import { interpolatedPosition, send } from './net/client';
import { serverClock, TICK_MS } from './net/clock';
import { movePredictor } from './net/movePrediction';
import { extrapolatedShot } from './net/shotExtrapolation';
import { drawGuestFX, guestFXAt } from './net/prediction';
import { RenderInterpolator } from './render/interpolate';
import { followMouse, resetCamera, updateCamera, withCamera } from './render/camera';
import { draw } from './render/scene';
import { currentMap, selectMap } from './render/maps';
import { mapFor, type MapId } from '../../shared/maps';
import type { MatchRules, SpellLoadout } from '../../shared/types';
import { game, localInput, me, net, others, watchers } from './state';
import { hud } from './ui/hud';
import { readLoadout } from './ui/spellbook';

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
    for (const k of Object.keys(net.guestCooldowns))
      net.guestCooldowns[k] = Math.max(0, net.guestCooldowns[k] - dt);
  }
  if (net.online && net.guestFiring && game.active && !game.ending) {
    net.guestFireClock -= dt;
    if (net.guestFireClock <= 0) {
      guestFXAt(net.guestSpell, localInput().mouse.x, localInput().mouse.y);
      net.guestFireClock += COOLDOWN_TICKS[net.guestSpell] ?? COOLDOWN_TICKS.FIRE;
    }
  }
  if (net.online && game.ending && net.guestFinished) {
    game.endClock += dt;
    if (game.death) game.death.age += dt;
    if (game.endClock >= 115) {
      net.guestFinished = false;
      finish();
    }
  }
  if (net.online && me()) {
    const blend = 1 - Math.exp((-Math.max(0.001, dt) * 16.667) / 48);
    const smooth = (v, w) => {
      if (!v) return { x: w.x, y: w.y };
      let d = Math.hypot(w.x - v.x, w.y - v.y);
      if (d > 140) return { x: w.x, y: w.y };
      return { x: v.x + (w.x - v.x) * blend, y: v.y + (w.y - v.y) * blend };
    };
    const mine = me();
    const foes = others();
    for (const w of foes)
      net.visual.set(
        w.seat,
        interpolatedPosition(w.seat, performance.now()) || smooth(net.visual.get(w.seat), w),
      );
    net.visualP = (foes[0] && net.visual.get(foes[0].seat)) || null;
    // our own wizard: predicted from our inputs, reconciled with every snapshot
    net.visualE = movePredictor.drawPosition(renderAlpha, elapsedMs) ?? { x: mine.x, y: mine.y };

    // Only the drawing coordinates are modified. Game logic always uses the server's positions.
    const real = game.wizards.map((w) => [w.x, w.y]);
    for (const w of foes) Object.assign(w, net.visual.get(w.seat));
    mine.x = net.visualE.x;
    mine.y = net.visualE.y;
    // Projectiles fly straight, so draw them where they should be *now* by carrying each one
    // forward from the newest snapshot along its velocity (our own are drawn by the local effects).
    const serverNow = serverClock.serverNow(performance.now());
    const age =
      serverNow === null
        ? 0
        : clamp((serverNow - net.snapshotServerMs) / TICK_MS, 0, MAX_SHOT_EXTRAPOLATION_TICKS);
    const originalShots = game.shots.map((s) => [s, s.x, s.y] as const);
    for (const s of game.shots) {
      const at = extrapolatedShot(s, age, game.bubbles);
      s.x = at.x;
      s.y = at.y;
    }
    net.drawnShots = game.shots.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      mine: s.owner === mine,
    }));
    // a fallen player watches through a standing teammate
    updateCamera(game.map, mine.fallen ? (watchers()[0] ?? mine) : mine);
    followMouse();
    withCamera(() => {
      draw();
      drawGuestFX(dt);
    });
    game.wizards.forEach((w, i) => ([w.x, w.y] = real[i]));
    for (let [s, x, y] of originalShots) {
      s.x = x;
      s.y = y;
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
export function start(m: GameMode, mapId?: MapId, rules?: MatchRules, loadouts?: SpellLoadout[]) {
  selectMap(mapId ?? $<HTMLSelectElement>('arenaMap').value);
  const map = mapFor(currentMap());
  $<HTMLButtonElement>('rematch').disabled = false;
  cancelAnimationFrame(game.frame);
  net.visualP = null;
  net.visualE = null;
  net.visual.clear();
  serverClock.reset();
  stepper.reset();
  interpolator.reset();
  renderAlpha = 1;
  net.snapshotServerMs = 0;
  net.drawnShots = [];
  movePredictor.reset(map);
  resetCamera();
  net.lastNetAt = 0;
  net.guestFX = [];
  net.guestPending.clear();
  net.inputPending.clear();
  net.guestCastSequence = 0;
  net.spellActions.clear();
  net.spellActionSequence = 0;
  net.samples.clear();
  net.hiddenSeats.clear();
  net.hitHint = null;
  net.receivedSnapshotSeq = 0;
  net.guestFiring = false;
  net.guestFireClock = 0;
  net.guestCooldowns = {};
  net.guestLastSpace = -Infinity;
  net.guestSpell = 'FIRE';
  net.guestElements = [];
  net.guestHeal = false;
  let a = Math.floor(Math.random() * styles.length),
    b = Math.floor(Math.random() * (styles.length - 1));
  if (b >= a) b++;
  // Solo wizard selection; online styles remain server-assigned.
  const chosen = $<HTMLSelectElement>('wizardStyle').value;
  if (m !== 'online' && chosen !== 'random') {
    a = Number(chosen);
    b = (a + 1 + Math.floor(Math.random() * (styles.length - 1))) % styles.length;
  }
  resetMatch(game, {
    mode: m,
    seed: newSeed(),
    styles: [styles[a], styles[b]],
    dummyHP: Number($<HTMLSelectElement>('dummyhp').value),
    dummyMoving: $<HTMLSelectElement>('dummymove').value === 'moving',
    map,
    rules,
    // solo reads the spellbook; online, the server says what every seat picked
    loadout: m === 'online' ? {} : readLoadout(),
    loadouts,
  });
  $('styles').textContent =
    '🟢 ' +
    game.p.style.name +
    ' · 🔴 ' +
    (m === 'duel' || m === 'online' ? game.e.style.name : 'Training Dummy');
  game.active = true;
  game.paused = false;
  game.last = 0;
  $('menu').style.display = 'none';
  $('lobby').style.display = 'none';
  $('pause').style.display = 'none';
  $('end').style.display = 'none';
  $('cooldowns').style.display = 'flex';
  $('legend').style.display = 'flex';
  $('hint').textContent =
    'Your wizard: ' +
    game.p.style.name +
    ' · ' +
    (m === 'duel' || m === 'online' ? 'Rival: ' + game.e.style.name : 'Training mode');
  hud();
  cv.focus();
  game.frame = requestAnimationFrame(loop);
}

export function finish() {
  game.active = false;
  $('end').style.display = 'flex';
  $('cooldowns').style.display = 'none';
  $('legend').style.display = 'none';
  $('toLobby').style.display = net.online ? '' : 'none';
  $('result').textContent = game.winner ? '🏆 VICTORY' : '💀 DEFEAT';
  $('result').style.color = game.winner ? '#fde68a' : '#fda4af';
  $('detail').textContent = game.winner
    ? 'You defeated the rival! Remaining health: ' +
      Math.ceil(Math.max(0, me().hp)) +
      '/' +
      me().max
    : 'The rival wizard defeated you.';
}

export function home() {
  if (net.room) {
    net.guestFiring = false;
    send({ type: 'leave' });
    net.online = false;
    net.room = null;
    net.resumeToken = null;
    net.reconnecting = false;
    localInput().keys = {};
  }
  stopMatchView();
  $('menu').style.display = 'flex';
  $('lobby').style.display = 'none';
}

/** Stops drawing the match and hides everything that belongs to it (not the menu or lobby). */
export function stopMatchView() {
  game.active = false;
  game.paused = false;
  localInput().holding = false;
  localInput().keys = {};
  cancelAnimationFrame(game.frame);
  $('pause').style.display = 'none';
  $('end').style.display = 'none';
  $('cooldowns').style.display = 'none';
  $('legend').style.display = 'none';
}

export function pause() {
  if (net.online) {
    $('hint').textContent = 'Pausing is disabled during online matches';
    return;
  }
  if (!game.active || game.ending) return;
  game.paused = !game.paused;
  stepper.reset();
  $('pause').style.display = game.paused ? 'flex' : 'none';
  game.last = 0;
  if (!game.paused) cv.focus();
}

/** Online, once per game tick: tell the server which movement keys are held and where we aim. */
function sendMoveCommand() {
  // while disconnected nothing reaches the server, so don't predict moves it will never see
  if (!canSendMoves()) return;
  const input = localInput();
  const { seq, keys } = movePredictor.tick(me().fallen ? {} : input.keys, localChargeSpell());
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
  const spell = net.guestSpell;
  const mine = me(); // our wizard as the server last reported it
  // the simulation ignores a press while frozen, silenced or swinging
  const blocked = mine.freeze > 0 || mine.silence > 0 || mine.swing > 0;
  const charging =
    localInput().holding && !blocked && canChargeSpell(spell, net.guestCooldowns['MAGMA'] || 0);
  return charging ? spell : null;
}

const canSendMoves = () => game.active && !game.ending && net.socket?.readyState === WebSocket.OPEN;

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
