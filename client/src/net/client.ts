import { CLIENT_RECONNECT_GIVE_UP_MS, styles } from '../../../shared/constants';
import { isContinuousSpell } from '../../../shared/charge';
import { spawnBurst, spawnFx } from '../fx/cosmetics';
import { clamp } from '../../../shared/math';
import { canSee } from '../../../shared/sim/vision';
import {
  PROTOCOL_VERSION,
  SERVER_TICK_HZ,
  SNAPSHOT_EVERY_TICKS,
  type ClientMessage,
  type ServerMessage,
} from '../../../shared/protocol';
import { $ } from '../dom';
import { start, stopMatchView } from '../flow';
import { stopBattleMusic } from '../audio/battleMusic';
import { game, greenSide, isHidden, localInput, me, net, others, rival, watchers } from '../state';
import type { MapId } from '../../../shared/maps';
import type { LobbyOptions } from '../../../shared/protocol';
import type { MatchRules, SpellLoadout } from '../../../shared/types';
import { copyRoomCode, hideLobby, initLobbyView, showLobby } from '../ui/lobby';
import { readLoadout, onLoadoutChange } from '../ui/spellbook';
import {
  refreshLegend,
  updateCooldownPanels,
  updatePlayerInfo,
  updateSpellCooldowns,
} from '../ui/hud';
import { serverClock, TICK_MS } from './clock';
import { clearSession, loadSession, saveSession } from './session';
import { clearAway, hideAway, showAway } from '../ui/awayOverlay';
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
  // the game clock stands still during the countdown, so it can't be matched to ours yet
  if (s.countdown > 0) serverClock.reset();
  else serverClock.observe(serverMs, now);
  net.countdown = s.countdown;
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
  // an enemy within sight of anyone on our team counts as seen (the snapshot also carries a margin beyond it)
  for (const o of s.others)
    if (o.team !== mine.team && watchers().some((w) => canSee(game.map, w, o)))
      net.seenSeats.add(o.seat);
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
  net.score = s.score;
  let extra = '';
  if (net.rules.teamSize > 1) {
    const standing = others().filter((w) => !greenSide(w) && !w.fallen).length;
    extra = `ENEMIES STANDING ${standing}`;
    $('styles').textContent = '🟢 Your team · 🔴 Enemy team';
  } else {
    $('styles').textContent = '🟢 You ' + mine.style.name + ' · 🔴 Rival ' + foe.style.name;
  }
  updatePlayerInfo(mine, extra);
  updateSpellCooldowns();
  updateCooldownPanels(mine);
}

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
  stopBattleMusic();
  game.active = false;
  net.online = false;
  net.room = null;
  net.resumeToken = null;
  net.reconnecting = false;
  net.isHost = false;
  clearSession();
  clearAway();
  hideLobby();
  $('menu').style.display = 'flex';
  $('roomStatus').textContent = status;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gets our seat back: the connection dropped mid-match, or the page was reloaded. Keeps trying
 * (the server may be unreachable for a while) until the server answers: `resumed` ends it, a refusal
 * sends us to the menu. Gives up and goes to the menu after CLIENT_RECONNECT_GIVE_UP_MS.
 */
async function reconnect() {
  net.reconnecting = true;
  const giveUpAt = performance.now() + CLIENT_RECONNECT_GIVE_UP_MS;
  while (net.reconnecting && performance.now() < giveUpAt) {
    try {
      await connect();
      send({ type: 'resume', code: net.room!, token: net.resumeToken! });
      // wait for the answer ('resumed' or an error clears net.reconnecting), or for the socket to drop again
      while (net.reconnecting && net.socket?.readyState === 1 && performance.now() < giveUpAt)
        await sleep(250);
    } catch {
      // not reachable yet
    }
    if (net.reconnecting) await sleep(RECONNECT_RETRY_MS);
  }
  if (net.reconnecting) leaveOnlinePlay('Disconnected from server.');
}

/** Called once on page load: a tab that was in a room (a reload) takes its seat back. */
export function resumeSavedSession() {
  const saved = loadSession();
  if (!saved) return;
  net.room = saved.code;
  net.resumeToken = saved.token;
  $('hint').textContent = 'Rejoining your match…';
  void reconnect();
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

/** Shows the online match the server describes (a start, a rematch, or us coming back to it). */
function beginMatch(m: {
  roundId: number;
  seat: number;
  mapId: MapId;
  rules: MatchRules;
  loadouts: SpellLoadout[];
  countdownTicks: number;
}) {
  net.roundId = m.roundId;
  net.seat = m.seat;
  net.online = true;
  net.guestFinished = false;
  net.rules = m.rules;
  net.score = [0, 0];
  net.countdown = m.countdownTicks;
  start('online', m.mapId, m.rules, m.loadouts);
  $('hp').textContent = m.rules.wizardHp + '/' + m.rules.wizardHp;
  refreshLegend();
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
      saveSession({ code: m.code, token: m.resumeToken });
      return;
    case 'joined':
      net.seat = m.seat;
      net.room = m.code;
      net.resumeToken = m.resumeToken;
      net.isHost = false;
      saveSession({ code: m.code, token: m.resumeToken });
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
          seats: m.seats,
          loadouts: m.loadouts,
          youSeat: m.youSeat,
        });
      net.lobbyOptions = m.options;
      syncLoadout(m.loadouts[m.youSeat]);
      return;
    case 'start':
    case 'rematch_start':
      beginMatch(m);
      $('hint').textContent =
        (m.type === 'start' ? 'Online ' : 'Online rematch · ') +
        (m.rules.teamSize > 1 ? `${m.rules.teamSize}v${m.rules.teamSize}` : 'duel') +
        ' · Your team is GREEN';
      return;
    case 'resumed':
      net.seat = m.seat;
      net.reconnecting = false;
      // a reloaded page has no match on screen yet (and a rematch may have started while we were away)
      if (!(game.active && net.online && net.roundId === m.roundId))
        beginMatch({ ...m, countdownTicks: 0 });
      else restartTimeline();
      $('hint').textContent = 'Reconnected · back in the match';
      return;
    case 'peer_away':
      showAway(m.seat, m.name, m.graceMs);
      $('hint').textContent = `${m.name} lost connection · they can rejoin until the match ends`;
      return;
    case 'peer_back':
      hideAway(m.seat);
      restartTimeline();
      $('hint').textContent = `${game.wizards[m.seat]?.style?.name ?? 'A player'} is back`;
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
      else if (net.reconnecting) {
        // the server refused our seat (the match is over, or the room is gone)
        leaveOnlinePlay(m.message);
        $('hint').textContent = m.message;
      } else {
        $('roomStatus').textContent = m.message;
        $('lobbyStatus').textContent = m.message;
      }
      return;
    case 'peer_left':
      leaveOnlinePlay('Opponent disconnected. Create a new room to play again.');
      return;
  }
}

/** Tells the server our spellbook picks if it doesn't have them (a new room, or we just changed them). */
function syncLoadout(server: SpellLoadout | undefined) {
  const mine = readLoadout();
  if (JSON.stringify(mine) !== JSON.stringify(server ?? {}))
    send({ type: 'set_loadout', loadout: mine });
}

export function initLobby() {
  initLobbyView();
  // a change in the spellbook while in a room goes to the server, which tells the whole lobby
  onLoadoutChange(() => {
    if (net.room && !net.online) send({ type: 'set_loadout', loadout: readLoadout() });
  });
  $('lobbySpellbook').onclick = () => ($('spellbook').style.display = 'flex');
  $('copyCode').onclick = copyRoomCode;
  // any option the creator changes goes to the server, which sends the lobby back to everyone
  const setOptions = (change: Partial<LobbyOptions>) => {
    net.lobbyOptions = { ...net.lobbyOptions, ...change }; // so a quick second change builds on this one
    send({ type: 'set_options', options: net.lobbyOptions });
  };
  $<HTMLSelectElement>('lobbyMap').onchange = (ev) =>
    setOptions({ mapId: (ev.target as HTMLSelectElement).value as MapId });
  $<HTMLSelectElement>('lobbyTeamSize').onchange = (ev) =>
    setOptions({ teamSize: Number((ev.target as HTMLSelectElement).value) });
  $<HTMLInputElement>('lobbyFriendly').onchange = (ev) =>
    setOptions({ friendlyFire: (ev.target as HTMLInputElement).checked });
  $<HTMLSelectElement>('lobbyHealth').onchange = (ev) =>
    setOptions({
      wizardHp: Number((ev.target as HTMLSelectElement).value) as LobbyOptions['wizardHp'],
    });
  $<HTMLSelectElement>('lobbyDeath').onchange = (ev) =>
    setOptions({ deathRule: (ev.target as HTMLSelectElement).value as LobbyOptions['deathRule'] });
  $('lobbySeats').onclick = (ev) => {
    const button = (ev.target as HTMLElement).closest('button[data-from]') as HTMLElement | null;
    if (button)
      send({ type: 'move_seat', from: Number(button.dataset.from), to: Number(button.dataset.to) });
  };
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
