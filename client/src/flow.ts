import { COOLDOWN_TICKS, styles } from '../../shared/constants';
import { advanceCosmetics, spawnFx } from '../../shared/fx/cosmetics';
import { clamp } from '../../shared/math';
import { newSeed } from '../../shared/random';
import { resetMatch } from '../../shared/sim/match';
import { resolveDeaths, update } from '../../shared/sim/update';
import type { GameMode } from '../../shared/types';
import { $, cv } from './dom';
import { FixedStepper } from './loop/fixedStep';
import { interpolatedOpponent, send } from './net/client';
import { serverClock, TICK_MS } from './net/clock';
import { movePredictor } from './net/movePrediction';
import { drawGuestFX, guestFXAt } from './net/prediction';
import { RenderInterpolator } from './render/interpolate';
import { draw } from './render/scene';
import { game, localInput, net } from './state';
import { hud } from './ui/hud';

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
  if (net.online && game.p && game.e) {
    const blend = 1 - Math.exp((-Math.max(0.001, dt) * 16.667) / 48);
    const smooth = (v, w) => {
      if (!v) return { x: w.x, y: w.y };
      let d = Math.hypot(w.x - v.x, w.y - v.y);
      if (d > 140) return { x: w.x, y: w.y };
      return { x: v.x + (w.x - v.x) * blend, y: v.y + (w.y - v.y) * blend };
    };
    net.visualP = interpolatedOpponent(performance.now()) || smooth(net.visualP, game.p);
    // our own wizard: predicted from our inputs, reconciled with every snapshot
    net.visualE = movePredictor.drawPosition(renderAlpha, elapsedMs) ?? {
      x: game.e.x,
      y: game.e.y,
    };

    // Only the drawing coordinates are modified. Game logic always uses the server's positions.
    let px = game.p.x,
      py = game.p.y,
      ex = game.e.x,
      ey = game.e.y;
    game.p.x = net.visualP.x;
    game.p.y = net.visualP.y;
    game.e.x = net.visualE.x;
    game.e.y = net.visualE.y;
    // Projectiles fly straight, so draw them where they should be *now* by carrying each one
    // forward from the newest snapshot along its velocity (our own are drawn by the local effects).
    const serverNow = serverClock.serverNow(performance.now());
    const age =
      serverNow === null
        ? 0
        : clamp((serverNow - net.snapshotServerMs) / TICK_MS, 0, MAX_SHOT_EXTRAPOLATION_TICKS);
    const originalShots = game.shots.map((s) => [s, s.x, s.y] as const);
    for (const s of game.shots) {
      s.x += s.vx * age;
      s.y += s.vy * age;
    }
    net.drawnShots = game.shots.map((s) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      mine: s.owner === game.e,
    }));
    draw();
    drawGuestFX(dt);
    game.p.x = px;
    game.p.y = py;
    game.e.x = ex;
    game.e.y = ey;
    for (let [s, x, y] of originalShots) {
      s.x = x;
      s.y = y;
    }
  } else {
    // draw part-way between the last two simulation steps so motion is smooth at any refresh rate
    const restore = interpolator.apply(game, renderAlpha);
    draw();
    restore();
  }
  if (game.active) game.frame = requestAnimationFrame(loop);
}

export function start(m: GameMode) {
  $<HTMLButtonElement>('rematch').disabled = false;
  cancelAnimationFrame(game.frame);
  net.visualP = null;
  net.visualE = null;
  serverClock.reset();
  stepper.reset();
  interpolator.reset();
  renderAlpha = 1;
  net.snapshotServerMs = 0;
  net.drawnShots = [];
  movePredictor.reset();
  net.lastNetAt = 0;
  net.guestFX = [];
  net.guestPending.clear();
  net.inputPending.clear();
  net.guestCastSequence = 0;
  net.spellActions.clear();
  net.spellActionSequence = 0;
  net.opponentSamples = [];
  net.receivedSnapshotSeq = 0;
  net.guestFiring = false;
  net.guestFireClock = 0;
  net.guestCooldowns = {};
  net.guestSpell = 'FIRE';
  net.guestElements = [];
  net.guestHeal = false;
  let a = Math.floor(Math.random() * styles.length),
    b = Math.floor(Math.random() * (styles.length - 1));
  if (b >= a) b++;
  resetMatch(game, {
    mode: m,
    seed: newSeed(),
    styles: [styles[a], styles[b]],
    dummyHP: Number($<HTMLSelectElement>('dummyhp').value),
    dummyMoving: $<HTMLSelectElement>('dummymove').value === 'moving',
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
  $('pause').style.display = 'none';
  $('end').style.display = 'none';
  $('cooldowns').style.display = 'flex';
  $('legend').style.display = 'block';
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
  $('result').textContent = game.winner ? '🏆 VICTORY' : '💀 DEFEAT';
  $('result').style.color = game.winner ? '#fde68a' : '#fda4af';
  $('detail').textContent = game.winner
    ? 'You defeated the rival! Remaining health: ' + Math.ceil(Math.max(0, game.p.hp)) + '/200'
    : 'The rival wizard defeated you.';
}

export function home() {
  if (net.room) {
    net.guestFiring = false;
    send({ type: 'leave' });
    net.online = false;
    net.room = null;
    game.input.e.keys = {};
  }
  game.active = false;
  game.paused = false;
  localInput().holding = false;
  localInput().keys = {};
  cancelAnimationFrame(game.frame);
  $('menu').style.display = 'flex';
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
  if (!game.active || game.ending) return;
  const input = localInput();
  const { seq, keys } = movePredictor.tick(input.keys);
  send({ type: 'move', roundId: net.roundId, seq, keys, x: input.mouse.x, y: input.mouse.y });
}

/** Applies the side effects (UI) of things the simulation reported. */
function handleSimEvents() {
  for (const ev of game.events.splice(0)) {
    switch (ev.type) {
      case 'hint':
        $('hint').textContent = ev.text;
        break;
      case 'death':
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
