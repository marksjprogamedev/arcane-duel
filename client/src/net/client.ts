import { COOLDOWN_TICKS, names, styles } from '../../../shared/constants';
import { isContinuousSpell } from '../../../shared/charge';
import { spawnBurst, spawnFx } from '../../../shared/fx/cosmetics';
import { clamp } from '../../../shared/math';
import {
  PROTOCOL_VERSION,
  SERVER_TICK_HZ,
  SNAPSHOT_EVERY_TICKS,
  type ClientMessage,
  type ServerMessage,
} from '../../../shared/protocol';
import { $ } from '../dom';
import { start, stopMatchView } from '../flow';
import { game, greenSide, isHidden, localInput, me, net, others, rival } from '../state';
import type { MapId } from '../../../shared/maps';
import { copyRoomCode, hideLobby, initLobbyView, showLobby } from '../ui/lobby';
import { serverClock, TICK_MS } from './clock';
import { movePredictor } from './movePrediction';
import { fogAlpha, incomingAngle } from '../render/fogMath';

export function send(v: ClientMessage) {
  if (net.socket && net.socket.readyState === 1) net.socket.send(JSON.stringify(v));
}

export function spellAction(kind: string) {
  const id = ++net.spellActionSequence;
  net.spellActions.set(id, { kind, at: performance.now() });
  if (net.spellActions.size > 100) net.spellActions.delete(net.spellActions.keys().next().value);
  return id;
}

/** Time between snapshots (33 ms at 30 Hz). */
const SNAPSHOT_INTERVAL_MS = (1000 / SERVER_TICK_HZ) * SNAPSHOT_EVERY_TICKS;
/** Never closer than one interval plus a small margin, or a late snapshot would freeze the opponent. */
const MIN_INTERPOLATION_DELAY_MS = SNAPSHOT_INTERVAL_MS + 20;
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
 * Where to draw another wizard: on the server's timeline, INTERPOLATION_DELAY_MS in the past,
 * blended between the two surrounding snapshots. Late packets don't disturb it (see ServerClock).
 */
export function interpolatedPosition(seat: number, localNow: number) {
  const samples = net.samples.get(seat);
  const serverNow = serverClock.serverNow(localNow);
  if (!samples?.length || serverNow === null) return null;
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
  if (!s || !s.you || s.roundId !== net.roundId) return;
  if (Number.isSafeInteger(s.seq)) {
    if (s.seq <= net.receivedSnapshotSeq) return;
    net.receivedSnapshotSeq = s.seq;
  }
  const now = performance.now();
  const serverMs = s.t * TICK_MS;
  serverClock.observe(serverMs, now);
  net.snapshotServerMs = serverMs;
  // The opponent is missing from the snapshot while out of sight. Forget their position history, so
  // when they come back they appear where they are instead of sliding in from where they were.
  // Wizards out of sight are missing from the snapshot. Forget their position history, so when they
  // come back they appear where they are instead of sliding in from where they were.
  const seen = new Set<number>([s.you.seat]);
  net.hiddenSeats.clear();
  for (const o of s.others) {
    seen.add(o.seat);
    const samples = net.samples.get(o.seat) ?? [];
    net.samples.set(o.seat, samples);
    if (!samples.length || serverMs > samples[samples.length - 1].st)
      samples.push({ x: o.x, y: o.y, st: serverMs });
    if (samples.length > 20) samples.shift();
  }
  for (const w of game.wizards)
    if (!seen.has(w.seat)) {
      net.hiddenSeats.add(w.seat);
      net.samples.delete(w.seat);
    }
  // our wizard: start from the server's position and replay the moves it has not seen yet
  movePredictor.reconcile(s.you, s.ack);
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
    BUBBLE: 'bubbleCD',
    TRAP: 'trapCD',
  })) {
    const remote = Number(s['you'][field]) || 0;
    if (remote > 0 && !isContinuousSpell(spell))
      net.guestCooldowns[spell] = Math.max(net.guestCooldowns[spell] || 0, remote);
  }
  net.lastNetAt = performance.now();
  const hpBefore = me()?.hp;
  const enemyShotsBefore = game.shots.filter((v) => v.owner !== me());
  const unpack = (w) => ({ ...w, style: styles[w.style] || styles[0] });
  // update everyone we were told about; the ones out of sight keep where they were last seen
  game.wizards[s.you.seat] = unpack(s.you);
  for (const o of s.others) game.wizards[o.seat] = unpack(o);
  const mine = me();
  const wizardAt = (seat: number) => game.wizards[seat];
  game.shots = s.shots.map((v) => ({ ...v, owner: wizardAt(v.owner) }));
  game.bombs = s.bombs.map((v) => ({ ...v, owner: wizardAt(v.owner) }));
  game.zones = s.zones.map((v) => ({ ...v, owner: wizardAt(v.owner) }));
  game.traps = s.traps.map((v) => ({ ...v, owner: wizardAt(v.owner) }));
  game.bubbles = s.bubbles.map((v) => ({ ...v, owner: wizardAt(v.owner) }));
  // Hit by something we could not see (fog of war): point at where the shot came from.
  if (game.map.vision !== null && hpBefore !== undefined && mine.hp < hpBefore - 0.5) {
    const angle = incomingAngle(mine, enemyShotsBefore);
    const unseen = others().every(
      (w) =>
        isHidden(w) ||
        fogAlpha(Math.hypot(w.x - mine.x, w.y - mine.y), game.map.vision as number) > 0.5,
    );
    if (angle !== null && unseen) net.hitHint = { angle, t: s.t };
  }
  for (const ev of s.fx) spawnFx(game, ev);
  game.t = s.t;
  if (!net.guestFinished) game.ending = !!s.ending;
  game.death = s.death ? { ...s.death, w: wizardAt(s.death.w) } : game.death;
  const foe = rival();
  $('hp').textContent = String(Math.ceil(Math.max(0, mine.hp)));
  $('enemy').textContent = isHidden(foe)
    ? 'RIVAL out of sight'
    : 'RIVAL ' + Math.ceil(Math.max(0, foe.hp)) + '/200';
  $('styles').textContent = '🟢 Rival ' + foe.style.name + ' · 🔴 You ' + mine.style.name;
  $('shield').textContent = mine.shield
    ? mine.shield.type === 4
      ? 'HEALING'
      : names[mine.shield.type]
    : 'NONE';
  for (let k of ['earth', 'sword', 'force'])
    $(k).textContent = mine[k + 'CD'] > 0 ? (mine[k + 'CD'] / 60).toFixed(1) + 's' : 'READY';
  for (let a of [
    { key: 'heal', v: mine.healCD, max: COOLDOWN_TICKS.HEAL },
    { key: 'bubble', v: mine.bubbleCD, max: COOLDOWN_TICKS.BUBBLE },
    { key: 'trap', v: mine.trapCD, max: COOLDOWN_TICKS.TRAP },
    { key: 'magma', v: mine.magmaCD, max: COOLDOWN_TICKS.MAGMA },
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
  net.isHost = false;
  hideLobby();
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
  net.samples.clear();
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
      net.seat = m.seat;
      net.room = m.code;
      net.resumeToken = m.resumeToken;
      net.isHost = true;
      return;
    case 'joined':
      net.seat = m.seat;
      net.room = m.code;
      net.resumeToken = m.resumeToken;
      net.isHost = false;
      return;
    case 'lobby':
      // also how we get back here from a finished match
      stopMatchView();
      net.online = false;
      net.guestFiring = false;
      localInput().keys = {};
      if (net.room)
        showLobby({
          code: net.room,
          host: net.isHost,
          options: m.options,
          filled: m.seats.filter(Boolean).length,
          total: m.seats.length,
        });
      net.lobbyOptions = m.options;
      return;
    case 'start':
    case 'rematch_start':
      net.roundId = m.roundId;
      net.seat = m.seat;
      net.online = true;
      net.guestFinished = false;
      start('online', m.mapId, m.teamSize);
      $('hint').textContent =
        (m.type === 'start' ? 'Online duel' : 'Online rematch') + ' · You control the RED wizard';
      $('hp').textContent = '200';
      $('spell').textContent = 'ONLINE';
      return;
    case 'resumed':
      net.seat = m.seat;
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
      game.winner = m.winner;
      net.guestFinished = true;
      game.endClock = 0;
      // `finished` carries no loser; it follows `death_start`, so only matters if that was missed
      const fallen = m.type === 'death_start' ? game.wizards[m.loser] : m.winner ? rival() : me();
      game.death = { w: fallen, x: fallen.x, y: fallen.y, age: 0, mortal: false };
      spawnBurst(game, fallen.x, fallen.y - 20, greenSide(fallen) ? '#a78bfa' : '#fb7185', 65, 9);
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
  initLobbyView();
  $('copyCode').onclick = copyRoomCode;
  $<HTMLSelectElement>('lobbyMap').onchange = (ev) =>
    send({
      type: 'set_options',
      options: { ...net.lobbyOptions, mapId: (ev.target as HTMLSelectElement).value as MapId },
    });
  $('startMatch').onclick = () => send({ type: 'start_match' });
  $('toLobby').onclick = () => send({ type: 'back_to_lobby' });
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
