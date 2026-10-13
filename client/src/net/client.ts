import { COOLDOWN_TICKS, names, styles } from '../../../shared/constants';
import { spawnBurst, spawnFx } from '../../../shared/fx/cosmetics';
import { clamp } from '../../../shared/math';
import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage } from '../../../shared/protocol';
import { $ } from '../dom';
import { start } from '../flow';
import { game, localInput, net } from '../state';
import { serverClock, TICK_MS } from './clock';
import { movePredictor } from './movePrediction';

export function send(v: ClientMessage) {
  if (net.socket && net.socket.readyState === 1) net.socket.send(JSON.stringify(v));
}

export function spellAction(kind: string) {
  const id = ++net.spellActionSequence;
  net.spellActions.set(id, { kind, at: performance.now() });
  if (net.spellActions.size > 100) net.spellActions.delete(net.spellActions.keys().next().value);
  return id;
}

/** Snapshots arrive every 50 ms (20 Hz). */
const SNAPSHOT_INTERVAL_MS = 50;
const MIN_INTERPOLATION_DELAY_MS = 70;
const MAX_INTERPOLATION_DELAY_MS = 150;

/**
 * How far behind the server's present the opponent is drawn: one snapshot interval, so there is
 * always a newer snapshot to blend towards, plus a cushion that grows with measured jitter.
 */
export function interpolationDelayMs() {
  const wanted = SNAPSHOT_INTERVAL_MS + serverClock.jitterMs() * 0.6 + 10;
  return clamp(wanted, MIN_INTERPOLATION_DELAY_MS, MAX_INTERPOLATION_DELAY_MS);
}

/** Longest the opponent is extrapolated past the newest snapshot when packets are late. */
const MAX_EXTRAPOLATION_MS = 60;

/**
 * Where to draw the opponent: on the server's timeline, INTERPOLATION_DELAY_MS in the past,
 * blended between the two surrounding snapshots. Late packets don't disturb it (see ServerClock).
 */
export function interpolatedOpponent(localNow: number) {
  const samples = net.opponentSamples;
  const serverNow = serverClock.serverNow(localNow);
  if (!samples.length || serverNow === null) return null;
  const target = serverNow - interpolationDelayMs();
  while (samples.length > 2 && samples[1].st <= target) samples.shift();
  const a = samples[0];
  const b = samples[1];
  if (!b) return { x: a.x, y: a.y };
  if (target > b.st) {
    // snapshots are late: carry on at the last known velocity, but not for long
    const span = Math.max(1, b.st - a.st);
    const ahead = Math.min(target - b.st, MAX_EXTRAPOLATION_MS);
    return { x: b.x + ((b.x - a.x) / span) * ahead, y: b.y + ((b.y - a.y) / span) * ahead };
  }
  const f = clamp((target - a.st) / Math.max(1, b.st - a.st), 0, 1);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

export function sendInput(action, extras = {}) {
  const id = ++net.inputSequence;
  net.inputPending.set(id, performance.now());
  if (net.inputPending.size > 120) net.inputPending.delete(net.inputPending.keys().next().value);
  send({ type: 'input', action, inputId: id, roundId: net.roundId, ...extras });
  return id;
}

export function applyState(s) {
  if (!s || !s.p || !s.e || s.roundId !== net.roundId) return;
  if (Number.isSafeInteger(s.seq)) {
    if (s.seq <= net.receivedSnapshotSeq) return;
    net.receivedSnapshotSeq = s.seq;
  }
  const now = performance.now();
  const serverMs = s.t * TICK_MS;
  serverClock.observe(serverMs, now);
  net.snapshotServerMs = serverMs;
  const last = net.opponentSamples.at(-1);
  if (!last || serverMs > last.st) net.opponentSamples.push({ x: s.p.x, y: s.p.y, st: serverMs });
  if (net.opponentSamples.length > 20) net.opponentSamples.shift();
  // our wizard: start from the server's position and replay the moves it has not seen yet
  movePredictor.reconcile(s.e, s.ack);
  // Snapshot cooldowns are authoritative. Local cooldowns prevent phantom
  // casts between snapshots, while the server can extend a cooldown if needed.
  for (const [spell, field] of Object.entries({
    EARTH: 'earthCD',
    MAGMA: 'magmaCD',
    FIRE: 'fireCD',
    WATER: 'waterCD',
    LIGHTNING: 'lightCD',
    SWORD: 'swordCD',
    FORCE: 'forceCD',
    BOMB: 'bombCD',
    HEAL: 'healCD',
  })) {
    const remote = Number(s.e[field]) || 0;
    if (remote > 0 && !['FIRE', 'WATER', 'LIGHTNING'].includes(spell))
      net.guestCooldowns[spell] = Math.max(net.guestCooldowns[spell] || 0, remote);
  }
  net.lastNetAt = performance.now();
  let unpack = (w) => ({ ...w, style: styles[w.style] || styles[0] });
  game.p = unpack(s.p);
  game.e = unpack(s.e);
  game.shots = s.shots.map((v) => ({ ...v, owner: v.owner === 'p' ? game.p : game.e }));
  game.bombs = s.bombs.map((v) => ({ ...v, owner: v.owner === 'p' ? game.p : game.e }));
  game.zones = s.zones.map((v) => ({ ...v, owner: v.owner === 'p' ? game.p : game.e }));
  for (const ev of s.fx) spawnFx(game, ev);
  game.t = s.t;
  if (!net.guestFinished) game.ending = !!s.ending;
  game.death = s.death ? { ...s.death, w: s.death.w === 'p' ? game.p : game.e } : game.death;
  $('hp').textContent = String(Math.ceil(Math.max(0, game.e.hp)));
  $('enemy').textContent = 'RIVAL ' + Math.ceil(Math.max(0, game.p.hp)) + '/200';
  $('styles').textContent = '🟢 Rival ' + game.p.style.name + ' · 🔴 You ' + game.e.style.name;
  $('shield').textContent = game.e.shield
    ? game.e.shield.type === 4
      ? 'HEALING'
      : names[game.e.shield.type]
    : 'NONE';
  for (let k of ['earth', 'sword', 'force'])
    $(k).textContent = game.e[k + 'CD'] > 0 ? (game.e[k + 'CD'] / 60).toFixed(1) + 's' : 'READY';
  for (let a of [
    { key: 'heal', v: game.e.healCD, max: COOLDOWN_TICKS.HEAL },
    { key: 'magma', v: game.e.magmaCD, max: COOLDOWN_TICKS.MAGMA },
  ]) {
    $(a.key + 'text').textContent = a.v > 0 ? (a.v / 60).toFixed(1) + 's' : 'READY';
    $(a.key + 'meter').style.width = 100 * (1 - a.v / a.max) + '%';
  }
}

/** How long we keep trying to get back into a match after the connection drops. */
const RECONNECT_FOR_MS = 10_000;
const RECONNECT_RETRY_MS = 1000;
const PING_INTERVAL_MS = 2000;
let pingTimer: ReturnType<typeof setInterval> | null = null;

function serverUrl() {
  if (location.protocol === 'file:') return 'ws://localhost:3036/ws';
  return (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/ws';
}

export function connect() {
  if (net.socket && net.socket.readyState === 1) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(serverUrl());
    net.socket = socket;
    socket.onopen = () => {
      send({ type: 'hello', protocolVersion: PROTOCOL_VERSION });
      resolve();
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => send({ type: 'ping', stamp: Date.now() }), PING_INTERVAL_MS);
    };
    socket.onerror = () =>
      reject(
        new Error(
          'Cannot connect to multiplayer server. Start it using npm start, then open http://localhost:3036',
        ),
      );
    socket.onclose = () => {
      if (net.socket !== socket) return; // an older connection we already replaced
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = null;
      if (net.reconnecting) return; // the retry loop takes care of it
      if (net.online && net.room && net.resumeToken) reconnect();
      else if (net.room) leaveOnlinePlay('Disconnected from server.');
    };
    socket.onmessage = (ev) => {
      let m: ServerMessage;
      try {
        m = JSON.parse(ev.data);
      } catch {
        return;
      }
      handleServerMessage(m);
    };
  });
}

/** Back to the menu: the room is gone (we left, the opponent left, or we could not reconnect). */
function leaveOnlinePlay(status: string) {
  game.active = false;
  net.online = false;
  net.room = null;
  net.resumeToken = null;
  net.reconnecting = false;
  $('menu').style.display = 'flex';
  $('roomStatus').textContent = status;
}

/** The connection dropped mid-match: keep trying to get our seat back for a few seconds. */
async function reconnect() {
  net.reconnecting = true;
  const giveUpAt = performance.now() + RECONNECT_FOR_MS;
  $('hint').textContent = 'Connection lost · reconnecting…';
  while (net.reconnecting && performance.now() < giveUpAt) {
    try {
      await connect();
      send({ type: 'resume', code: net.room!, token: net.resumeToken! });
      return; // 'resumed' (or an error) arrives as a message
    } catch {
      await new Promise((r) => setTimeout(r, RECONNECT_RETRY_MS));
    }
  }
  if (net.reconnecting) leaveOnlinePlay('Disconnected from server.');
}

/**
 * After a gap in snapshots (we or the opponent reconnected, the match was paused) the server
 * clock estimate and the opponent's position history are stale: start them afresh.
 */
function restartTimeline() {
  serverClock.reset();
  net.opponentSamples = [];
}

function showNetDiagnostics() {
  $('netdiag').textContent =
    'MULTIPLAYER · ' +
    Math.round(net.netRTT) +
    ' ms RTT · input ' +
    (net.lastAckMs || '—') +
    ' ms · spell ' +
    (net.spellAckMs || '—') +
    ' ms · ' +
    (net.room ? 'room ' + net.room : 'not in a room');
}

function handleServerMessage(m: ServerMessage) {
  switch (m.type) {
    case 'pong':
      net.netRTT = net.netRTT * 0.75 + Math.max(1, Date.now() - m.stamp) * 0.25;
      showNetDiagnostics();
      return;
    case 'created':
      net.room = m.code;
      net.resumeToken = m.resumeToken;
      $('roomStatus').textContent =
        'Room ' + net.room + ' created. Share the code and wait for your opponent…';
      $<HTMLInputElement>('roomCode').value = net.room;
      return;
    case 'joined':
      net.room = m.code;
      net.resumeToken = m.resumeToken;
      $('roomStatus').textContent = 'Joined ' + net.room + '. Starting…';
      return;
    case 'start':
    case 'rematch_start':
      net.roundId = m.roundId;
      net.online = true;
      net.guestFinished = false;
      start('online');
      $('hint').textContent =
        (m.type === 'start' ? 'Online duel' : 'Online rematch') + ' · You control the RED wizard';
      $('hp').textContent = '200';
      $('spell').textContent = 'ONLINE';
      return;
    case 'resumed':
      net.reconnecting = false;
      restartTimeline();
      $('hint').textContent = 'Reconnected · the duel continues';
      return;
    case 'peer_away':
      $('hint').textContent = 'Opponent lost connection · waiting for them to come back…';
      return;
    case 'peer_back':
      restartTimeline();
      $('hint').textContent = 'Opponent reconnected · the duel continues';
      return;
    case 'input_ack': {
      if (!net.online) return;
      const at = net.inputPending.get(m.inputId);
      if (at !== undefined) {
        net.lastAckMs = Math.round(performance.now() - at);
        net.inputPending.delete(m.inputId);
      }
      return;
    }
    case 'cast_ack': {
      if (!net.online || m.roundId !== net.roundId) return;
      const a = net.spellActions.get(m.castId);
      if (a) {
        net.spellAckMs = Math.round(performance.now() - a.at);
        net.spellActions.delete(m.castId);
      }
      return;
    }
    case 'state':
      if (net.online && game.active) applyState(m.state);
      return;
    case 'death_start':
    case 'finished': {
      if (!net.online || net.guestFinished) return;
      // Keep the render loop alive for the same death animation as offline play.
      game.ending = true;
      game.winner = !m.winner;
      net.guestFinished = true;
      game.endClock = 0;
      // `finished` carries no loser; fall back to the winner flag.
      const loser = m.type === 'death_start' ? m.loser : null;
      const fallen = loser === 'p' || (loser == null && !m.winner) ? game.p : game.e;
      game.death = { w: fallen, x: fallen.x, y: fallen.y, age: 0, mortal: false };
      spawnBurst(game, fallen.x, fallen.y - 20, fallen === game.p ? '#a78bfa' : '#fb7185', 65, 9);
      return;
    }
    case 'error':
      if (m.reason === 'outdated') leaveOnlinePlay(m.message);
      else if (net.reconnecting) leaveOnlinePlay('Disconnected from server. ' + m.message);
      else $('roomStatus').textContent = m.message;
      return;
    case 'peer_left':
      leaveOnlinePlay('Opponent disconnected. Create a new room to play again.');
      return;
  }
}

export function initLobby() {
  $('createRoom').onclick = async () => {
    try {
      await connect();
      send({ type: 'create' });
    } catch (e) {
      $('roomStatus').textContent = e.message;
    }
  };
  $('joinRoom').onclick = async () => {
    let code = $<HTMLInputElement>('roomCode').value.toUpperCase().trim();
    if (!/^[A-Z]{6}$/.test(code)) {
      $('roomStatus').textContent = 'Enter a six-letter room code';
      return;
    }
    try {
      await connect();
      send({ type: 'join', code });
    } catch (e) {
      $('roomStatus').textContent = e.message;
    }
  };
}
