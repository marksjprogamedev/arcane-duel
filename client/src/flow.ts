import { styles } from '../../shared/constants';
import { newSeed } from '../../shared/random';
import type { GameMode } from '../../shared/types';
import { $, cv } from './dom';
import { interpolatedOpponent, netState, send } from './net/client';
import { drawGuestFX, guestFXAt } from './net/prediction';
import { draw } from './render/scene';
import { walk } from '../../shared/sim/geometry';
import { resetMatch } from '../../shared/sim/match';
import { resolveDeaths, update } from '../../shared/sim/update';
import { game, localInput, net } from './state';
import { hud } from './ui/hud';

export function loop(now: number) {
  if (!game.active) return;
  let dt = Math.min(2, (now - (game.last || now)) / 16.667);
  game.last = now;
  if (!game.paused) {
    if (net.mpRole !== 'guest') {
      if (update(game, dt)) {
        sendSnapshotIfDue();
        resolveDeaths(game);
        hud();
      }
      handleSimEvents();
    } else game.t += dt;
  }
  if (net.mpRole === 'guest') {
    for (const k of Object.keys(net.guestCooldowns))
      net.guestCooldowns[k] = Math.max(0, net.guestCooldowns[k] - dt);
  }
  if (net.mpRole === 'guest' && net.guestFiring && game.active && !game.ending) {
    net.guestFireClock -= dt;
    if (net.guestFireClock <= 0) {
      guestFXAt(net.guestSpell, localInput().mouse.x, localInput().mouse.y);
      net.guestFireClock +=
        net.guestSpell === 'LIGHTNING' ? 19 : net.guestSpell === 'WATER' ? 6 : 5;
    }
  }
  if (net.mpRole === 'guest' && game.ending && net.guestFinished) {
    game.endClock += dt;
    if (game.death) game.death.age += dt;
    if (game.endClock >= 115) {
      net.guestFinished = false;
      finish();
    }
  }
  if (net.mpRole === 'guest' && game.p && game.e) {
    const blend = 1 - Math.exp((-Math.max(0.001, dt) * 16.667) / 48);
    const smooth = (v, w) => {
      if (!v) return { x: w.x, y: w.y };
      let d = Math.hypot(w.x - v.x, w.y - v.y);
      if (d > 140) return { x: w.x, y: w.y };
      return { x: v.x + (w.x - v.x) * blend, y: v.y + (w.y - v.y) * blend };
    };
    net.visualP = interpolatedOpponent(performance.now()) || smooth(net.visualP, game.p);
    // Predict local movement immediately. Authoritative snapshots are delayed,
    // so do not extrapolate them by RTT and then pull the player backwards.
    // Instead, maintain a small correction offset which decays smoothly.
    if (!net.visualE) net.visualE = { x: game.e.x, y: game.e.y };
    let gx = Number(!!localInput().keys.KeyD) - Number(!!localInput().keys.KeyA);
    let gy = Number(!!localInput().keys.KeyS) - Number(!!localInput().keys.KeyW);
    let gl = Math.hypot(gx, gy) || 1;
    if (game.e.freeze <= 0) {
      let speed = 3.5 * (1 - (0.75 * game.e.chill) / 100) * dt;
      walk(net.visualE, (gx / gl) * speed, (gy / gl) * speed);
    }
    // Only correct after a fresh snapshot. The snapshot is already old on
    // arrival; a continuously moving target causes oscillation/rubber-banding.
    if (net.guestCorrection) {
      let fade = 1 - Math.exp((-Math.max(0.001, dt) * 16.667) / 260);
      let dx = net.guestCorrection.x * fade,
        dy = net.guestCorrection.y * fade;
      walk(net.visualE, dx, dy);
      net.guestCorrection.x -= dx;
      net.guestCorrection.y -= dy;
      if (Math.hypot(net.guestCorrection.x, net.guestCorrection.y) < 0.25)
        net.guestCorrection = null;
    }
    // Hard correction is reserved for teleports or large knockbacks.
    if (net.guestTeleport) {
      net.visualE = { x: game.e.x, y: game.e.y };
      net.guestTeleport = false;
      net.guestCorrection = null;
    }

    // Only the drawing coordinates are modified. Game logic always uses host positions.
    let px = game.p.x,
      py = game.p.y,
      ex = game.e.x,
      ey = game.e.y;
    game.p.x = net.visualP.x;
    game.p.y = net.visualP.y;
    game.e.x = net.visualE.x;
    game.e.y = net.visualE.y;
    // Smooth projectile motion by tracking successive snapshots in order.
    let originalShots = game.shots.map((s) => [s, s.x, s.y] as const);
    let nextVisual = new Map();
    for (let i = 0; i < game.shots.length; i++) {
      let s = game.shots[i],
        key = i + ':' + s.k + ':' + (s.owner === game.p ? 'p' : 'e');
      let v = smooth(net.visualShots.get(key), s);
      nextVisual.set(key, v);
      s.x = v.x;
      s.y = v.y;
    }
    net.visualShots = nextVisual;
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
  } else draw();
  if (game.active) game.frame = requestAnimationFrame(loop);
}

export function start(m: GameMode) {
  $<HTMLButtonElement>('rematch').disabled = false;
  cancelAnimationFrame(game.frame);
  net.visualP = null;
  net.visualE = null;
  net.visualShots = new Map();
  net.guestCorrection = null;
  net.guestTeleport = false;
  net.guestLastAuth = null;
  net.lastNetAt = 0;
  net.netTick = 0;
  net.guestFX = [];
  net.guestPending.clear();
  net.inputPending.clear();
  net.guestCastSequence = 0;
  net.spellActions.clear();
  net.spellActionSequence = 0;
  net.opponentSamples = [];
  net.netSnapshotSeq = 0;
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
  if (net.mpRole === 'host') send({ type: 'finished', winner: game.winner });
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
  if (net.mpRole) {
    net.guestFiring = false;
    send({ type: 'leave' });
    net.mpRole = null;
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
  if (net.mpRole) {
    $('hint').textContent = 'Pausing is disabled during online matches';
    return;
  }
  if (!game.active || game.ending) return;
  game.paused = !game.paused;
  $('pause').style.display = game.paused ? 'flex' : 'none';
  game.last = 0;
  if (!game.paused) cv.focus();
}

/** Host only: broadcasts the game state to the guest every third tick. */
function sendSnapshotIfDue() {
  if (
    net.mpRole === 'host' &&
    net.socket &&
    net.socket.readyState === 1 &&
    ++net.netTick % 3 === 0 &&
    net.socket.bufferedAmount < 16000
  )
    send({ type: 'state', state: netState() });
}

/** Applies the side effects (UI, network) of things the simulation reported. */
function handleSimEvents() {
  for (const ev of game.events.splice(0)) {
    switch (ev.type) {
      case 'hint':
        $('hint').textContent = ev.text;
        break;
      case 'death':
        if (net.mpRole === 'host')
          send({ type: 'death_start', loser: ev.loser, winner: ev.winner });
        break;
      case 'round_over':
        finish();
        break;
    }
  }
}
