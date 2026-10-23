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
import {
  game,
  greenSide,
  isHidden,
  isTeamMatch,
  localInput,
  me,
  net,
  others,
  playerName,
  rival,
  watchers,
} from '../state';
import {
  accountLoaded,
  currentAccount,
  onAccount,
  ownSignOutExpected,
  setAccount,
} from '../account/state';
import { showToast } from '../ui/toast';
import { accountKey, sessionEndText } from './playerNames';
import type { MapId } from '../../../shared/maps';
import type { LobbyOptions } from '../../../shared/protocol';
import type { MatchRules, SpellLoadout } from '../../../shared/types';
import { roomClosedText } from '../ui/menus/matchText';
import { copyRoomCode, hideLobby, initLobbyView, showLobby } from '../ui/menus/lobby';
import { readLoadout, onLoadoutChange } from '../ui/menus/spellbook';
import { initProfileSync, receiveProfile } from '../account/profileWiring';
import { initFriends, receiveFriendError, receiveFriends } from '../account/friends';
import { closeFriends } from '../ui/menus/friends';
import {
  refreshLegend,
  updateCooldownPanels,
  updatePlayerInfo,
  updateSpellCooldowns,
} from '../ui/hud/hud';
import { serverClock, TICK_MS } from './clock';
import { clearSession, clientId, loadSession, saveSession } from './session';
import { clearAway, hideAway, showAway } from '../ui/hud/awayOverlay';
import { movePredictor } from './movePrediction';
import { fogAlpha, incomingAngle } from '../render/fogMath';

export function send(message: ClientMessage) {
  // a spectator never plays: no inputs, no movement
  if (net.spectating && (message.type === 'input' || message.type === 'move')) return;
  if (net.socket && net.socket.readyState === 1) net.socket.send(JSON.stringify(message));
}

export function spellAction(kind: string) {
  const id = ++net.spellActionSequence;
  net.spellActions.set(id, { kind, at: performance.now() });
  if (net.spellActions.size > 100) net.spellActions.delete(net.spellActions.keys().next().value);
  return id;
}

/** Time between snapshots (33 ms at 30 Hz). */
const SNAPSHOT_INTERVAL_MS = (1000 / SERVER_TICK_HZ) * SNAPSHOT_EVERY_TICKS;
/** Never closer than one interval plus a small margin, or a late snapshot would freeze the other wizards. */
const MIN_INTERPOLATION_DELAY_MS = SNAPSHOT_INTERVAL_MS + 20;
const MAX_INTERPOLATION_DELAY_MS = 150;

/**
 * How far behind the server's present the other wizards are drawn: one snapshot interval, so there is
 * always a newer snapshot to blend towards, plus a cushion that grows with measured jitter.
 */
export function interpolationDelayMs() {
  const wanted = SNAPSHOT_INTERVAL_MS + serverClock.jitterMs() * 0.6 + 10;
  return clamp(wanted, MIN_INTERPOLATION_DELAY_MS, MAX_INTERPOLATION_DELAY_MS);
}

/** Longest another wizard is extrapolated past the newest snapshot when packets are late. */
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
  const older = samples[0];
  const newer = samples[1];
  if (!newer) return { x: older.x, y: older.y };
  if (target > newer.st) {
    // snapshots are late: carry on at the last known velocity, but not for long
    const span = Math.max(1, newer.st - older.st);
    const ahead = Math.min(target - newer.st, MAX_EXTRAPOLATION_MS);
    return {
      x: newer.x + ((newer.x - older.x) / span) * ahead,
      y: newer.y + ((newer.y - older.y) / span) * ahead,
    };
  }
  const fraction = clamp((target - older.st) / Math.max(1, newer.st - older.st), 0, 1);
  return {
    x: older.x + (newer.x - older.x) * fraction,
    y: older.y + (newer.y - older.y) * fraction,
  };
}

export function sendInput(action, extras = {}) {
  const id = ++net.inputSequence;
  net.inputPending.set(id, performance.now());
  if (net.inputPending.size > 120) net.inputPending.delete(net.inputPending.keys().next().value);
  send({ type: 'input', action, inputId: id, roundId: net.roundId, ...extras });
  return id;
}

export function applyState(state) {
  if (!state || !state.you || state.roundId !== net.roundId) return;
  // the player a spectator follows can change (they dropped): follow the snapshots' own view
  if (net.spectating && state.you.seat !== net.seat) {
    net.seat = state.you.seat;
    restartTimeline();
  }
  if (Number.isSafeInteger(state.seq)) {
    if (state.seq <= net.receivedSnapshotSeq) return;
    net.receivedSnapshotSeq = state.seq;
  }
  const now = performance.now();
  const serverMs = state.t * TICK_MS;
  // the game clock stands still during the countdown, so it can't be matched to ours yet
  if (state.countdown > 0) serverClock.reset();
  else serverClock.observe(serverMs, now);
  net.countdown = state.countdown;
  net.snapshotServerMs = serverMs;
  // Another wizard is missing from the snapshot while out of sight. Forget their position history, so
  // when they come back they appear where they are instead of sliding in from where they were.
  // Wizards out of sight are missing from the snapshot. Forget their position history, so when they
  // come back they appear where they are instead of sliding in from where they were.
  const seen = new Set<number>([state.you.seat]);
  net.hiddenSeats.clear();
  for (const other of state.others) {
    seen.add(other.seat);
    const samples = net.samples.get(other.seat) ?? [];
    net.samples.set(other.seat, samples);
    if (!samples.length || serverMs > samples[samples.length - 1].st)
      samples.push({ x: other.x, y: other.y, st: serverMs });
    if (samples.length > 20) samples.shift();
  }
  for (const w of game.wizards)
    if (!seen.has(w.seat)) {
      net.hiddenSeats.add(w.seat);
      net.samples.delete(w.seat);
    }
  // our wizard: start from the server's position and replay the moves it has not seen yet
  movePredictor.reconcile(state.you, state.ack);
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
    const remote = Number(state['you'][field]) || 0;
    if (remote > 0 && !isContinuousSpell(spell))
      net.spellCooldowns[spell] = Math.max(net.spellCooldowns[spell] || 0, remote);
  }
  net.lastNetAt = performance.now();
  const hpBefore = me()?.hp;
  const enemyShotsBefore = game.shots.filter((shot) => shot.owner !== me());
  const unpack = (w) => ({ ...w, style: styles[w.style] || styles[0] });
  // update everyone we were told about; the ones out of sight keep where they were last seen
  game.wizards[state.you.seat] = unpack(state.you);
  for (const other of state.others) game.wizards[other.seat] = unpack(other);
  const mine = me();
  // an enemy within sight of anyone on our team counts as seen (the snapshot also carries a margin beyond it)
  for (const other of state.others)
    if (other.team !== mine.team && watchers().some((w) => canSee(game.map, w, other)))
      net.seenSeats.add(other.seat);
  const wizardAt = (seat: number) => game.wizards[seat];
  game.shots = state.shots.map((shot) => ({ ...shot, owner: wizardAt(shot.owner) }));
  game.bombs = state.bombs.map((bomb) => ({ ...bomb, owner: wizardAt(bomb.owner) }));
  game.zones = state.zones.map((zone) => ({ ...zone, owner: wizardAt(zone.owner) }));
  game.traps = state.traps.map((trap) => ({ ...trap, owner: wizardAt(trap.owner) }));
  game.bubbles = state.bubbles.map((bubble) => ({ ...bubble, owner: wizardAt(bubble.owner) }));
  // Hit by something we could not see (fog of war): point at where the shot came from.
  if (game.map.vision !== null && hpBefore !== undefined && mine.hp < hpBefore - 0.5) {
    const angle = incomingAngle(mine, enemyShotsBefore);
    const unseen = others().every(
      (w) =>
        isHidden(w) ||
        fogAlpha(Math.hypot(w.x - mine.x, w.y - mine.y), game.map.vision as number) > 0.5,
    );
    if (angle !== null && unseen) net.hitHint = { angle, t: state.t };
  }
  for (const ev of state.fx) spawnFx(game, ev);
  game.t = state.t;
  if (!net.endAnnounced) game.ending = !!state.ending;
  game.death = state.death ? { ...state.death, wizard: wizardAt(state.death.wizard) } : game.death;
  const foe = rival();
  net.score = state.score;
  let extra = '';
  if (net.rules.teamSize > 1) {
    const standing = others().filter((w) => !greenSide(w) && !w.fallen).length;
    extra = `ENEMIES STANDING ${standing}`;
    $('styles').textContent = net.spectating
      ? '🟢 Followed team · 🔴 Other team'
      : '🟢 Your team · 🔴 Enemy team';
  } else {
    $('styles').textContent =
      (net.spectating ? '🟢 ' : '🟢 You ') + playerName(mine) + ' · 🔴 Rival ' + playerName(foe);
  }
  updatePlayerInfo(mine, extra);
  updateSpellCooldowns();
  updateCooldownPanels(mine);
}

const RECONNECT_RETRY_MS = 1000;
const PING_INTERVAL_MS = 2000;
let pingTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Which account the open connection belongs to (`accountKey`: the id, or null for a guest). The server
 * reads the session cookie only when the WebSocket opens, so a connection keeps its identity for life.
 * `socketAccount` is what the server said in `welcome`; `openedAs` what we believed when opening it
 * (undefined before start-up has asked the server).
 */
let socketAccount: number | null | undefined;
let openedAs: number | null | undefined;

function serverUrl() {
  if (location.protocol === 'file:') return 'ws://localhost:3036/ws';
  return (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/ws';
}

export function connect() {
  if (net.socket && net.socket.readyState === 1) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(serverUrl());
    net.socket = socket;
    socketAccount = undefined;
    openedAs = accountLoaded() ? accountKey(currentAccount()) : undefined;
    socket.onopen = () => {
      send({ type: 'hello', protocolVersion: PROTOCOL_VERSION, clientId: clientId() });
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
      if (net.socket !== socket) return; // an older connection we already replaced
      let message: ServerMessage;
      try {
        message = JSON.parse(ev.data);
      } catch {
        return;
      }
      handleServerMessage(message);
    };
  });
}

/**
 * Drops the connection and opens a new one, so the server binds who we are now (after logging in or
 * out). The old one's close is ignored (it is no longer `net.socket`): no reconnect or resume.
 */
function reopenConnection() {
  const old = net.socket as WebSocket | null;
  if (!old) return;
  net.socket = null;
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
  old.close();
  connect().catch(() => {
    // not reachable now: the next create / join connects again
  });
}

/**
 * Opens a new connection when the account changed since this one was opened. Only outside a room: the
 * account screens are on the main menu, and a seat must not be dropped by it.
 */
function matchSocketToAccount() {
  const socket = net.socket as WebSocket | null;
  if (!socket || socket.readyState !== WebSocket.OPEN || net.room || net.reconnecting) return;
  const bound = socketAccount !== undefined ? socketAccount : openedAs;
  if (bound === undefined) return; // not known yet: the welcome will tell
  if (bound !== accountKey(currentAccount())) reopenConnection();
}

/** Back to the menu: the room is gone (we or another player left, or we could not reconnect). */
function leaveOnlinePlay(status: string) {
  stopBattleMusic();
  closeFriends();
  game.active = false;
  net.online = false;
  net.spectating = false;
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
 * After a gap in snapshots (we or another player reconnected, the match was paused) the server
 * clock estimate and the others' position history are stale: start them afresh.
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
function beginMatch(match: {
  roundId: number;
  seat: number;
  mapId: MapId;
  rules: MatchRules;
  loadouts: SpellLoadout[];
  countdownTicks: number;
  spectating?: boolean;
  names?: string[];
}) {
  closeFriends();
  net.spectating = !!match.spectating;
  net.roundId = match.roundId;
  net.seat = match.seat;
  net.online = true;
  net.endAnnounced = false;
  net.rules = match.rules;
  net.score = [0, 0];
  net.countdown = match.countdownTicks;
  net.names = match.names ?? [];
  start('online', match.mapId, match.rules, match.loadouts);
  $('hp').textContent = match.rules.wizardHp + '/' + match.rules.wizardHp;
  refreshLegend();
}

/** `signed_out` / `replaced`: the server took us out of the room; back to the menu with a toast. */
function endRoomSession(message: ServerMessage & { type: 'signed_out' | 'replaced' }) {
  // our own logout or deletion (from the menu, so not in a room): the account screen says so already
  if (message.type === 'signed_out' && ownSignOutExpected() && !game.active && !net.room) {
    setAccount(null);
    matchSocketToAccount();
    return;
  }
  if (game.active || net.room) stopMatchView();
  leaveOnlinePlay('');
  showToast(sessionEndText(message) ?? '', 5000);
  if (message.type === 'signed_out') {
    // the connection still carries the old session: as a guest from here, on a new one
    setAccount(null);
    matchSocketToAccount();
  }
}

/**
 * `welcome`: who the server says this connection is. Normally what we think already; if not, the
 * server is right (the session ended or began meanwhile), unless we changed account after this
 * connection opened: then it is the connection that is stale.
 */
function welcome(message: ServerMessage & { type: 'welcome' }) {
  const server = accountKey(message.account);
  socketAccount = server;
  const mine = accountKey(currentAccount());
  if (server === mine && accountLoaded()) return;
  if (openedAs !== undefined && openedAs !== mine) matchSocketToAccount();
  else setAccount(message.account);
}

function handleServerMessage(message: ServerMessage) {
  switch (message.type) {
    case 'welcome':
      welcome(message);
      return;
    case 'signed_out':
    case 'replaced':
      endRoomSession(message);
      return;
    case 'profile':
      // only for the account this tab is logged in as (a connection kept through a log-out is not)
      if (socketAccount != null && socketAccount === accountKey(currentAccount()))
        receiveProfile(message.profile);
      return;
    case 'friends':
      if (socketAccount != null && socketAccount === accountKey(currentAccount()))
        receiveFriends(message.list);
      return;
    case 'friend_error':
      if (socketAccount != null && socketAccount === accountKey(currentAccount()))
        receiveFriendError(message.message);
      return;
    case 'pong':
      net.netRTT = net.netRTT * 0.75 + Math.max(1, Date.now() - message.stamp) * 0.25;
      showNetDiagnostics();
      return;
    case 'created':
      net.seat = message.seat;
      net.room = message.code;
      net.resumeToken = message.resumeToken;
      net.isHost = true;
      saveSession({ code: message.code, token: message.resumeToken });
      return;
    case 'joined':
      net.room = message.code;
      net.isHost = false;
      // a full room puts us among the spectators: no seat, so no way to resume a match
      if (message.seat !== null) {
        net.seat = message.seat;
        net.resumeToken = message.resumeToken;
        saveSession({ code: message.code, token: message.resumeToken });
      }
      return;
    case 'lobby':
      // also how we get back here from a finished match
      stopMatchView();
      net.online = false;
      net.spectating = false;
      net.holdingAttack = false;
      localInput().keys = {};
      net.isHost = message.youHost;
      if (message.youSeat !== null) net.seat = message.youSeat;
      // moving to another seat keeps our token, but a spectator who takes a seat gets a new one
      if (message.youToken && message.youToken !== net.resumeToken && net.room) {
        net.resumeToken = message.youToken;
        saveSession({ code: net.room, token: message.youToken });
      }
      if (net.room) showLobby({ code: net.room, host: message.youHost, ...message });
      net.lobbyOptions = message.options;
      if (message.youSeat !== null) syncLoadout(message.loadouts[message.youSeat]);
      return;
    case 'start':
    case 'rematch_start':
      beginMatch(message);
      $('hint').textContent =
        (message.type === 'start' ? 'Online ' : 'Online rematch · ') +
        (message.rules.teamSize > 1
          ? `${message.rules.teamSize}v${message.rules.teamSize}`
          : 'duel') +
        (message.spectating
          ? ' · Spectating · the team you follow is GREEN'
          : ' · Your team is GREEN');
      return;
    case 'resumed':
      net.seat = message.seat;
      net.reconnecting = false;
      // a reloaded page has no match on screen yet (and a rematch may have started while we were away)
      if (!(game.active && net.online && net.roundId === message.roundId))
        beginMatch({ ...message, countdownTicks: 0 });
      else restartTimeline();
      $('hint').textContent = 'Reconnected · back in the match';
      return;
    case 'peer_away':
      showAway(message.seat, message.name, message.graceMs);
      $('hint').textContent =
        `${message.name} lost connection · they can rejoin until the match ends`;
      return;
    case 'peer_left_match':
      hideAway(message.seat);
      $('hint').textContent = `${message.name} left the match`;
      return;
    case 'peer_back': {
      hideAway(message.seat);
      restartTimeline();
      const back = game.wizards[message.seat];
      $('hint').textContent = `${back?.style ? playerName(back) : 'A player'} is back`;
      return;
    }
    case 'input_ack': {
      if (!net.online) return;
      const at = net.inputPending.get(message.inputId);
      if (at !== undefined) {
        net.lastAckMs = Math.round(performance.now() - at);
        net.inputPending.delete(message.inputId);
      }
      return;
    }
    case 'cast_ack': {
      if (!net.online || message.roundId !== net.roundId) return;
      const action = net.spellActions.get(message.castId);
      if (action) {
        net.spellAckMs = Math.round(performance.now() - action.at);
        net.spellActions.delete(message.castId);
      }
      return;
    }
    case 'state':
      if (net.online && game.active) applyState(message.state);
      return;
    case 'death_start':
    case 'finished': {
      if (!net.online || net.endAnnounced) return;
      // Keep the render loop alive for the same death animation as offline play.
      game.ending = true;
      game.team0Won = message.winner;
      net.endAnnounced = true;
      game.endClock = 0;
      // `finished` carries no loser; it follows `death_start`, so only matters if that was missed
      const fallen =
        message.type === 'death_start'
          ? game.wizards[message.loser]
          : message.winner
            ? rival()
            : me();
      game.death = { wizard: fallen, x: fallen.x, y: fallen.y, age: 0, mortal: false };
      spawnBurst(game, fallen.x, fallen.y - 20, greenSide(fallen) ? '#a78bfa' : '#fb7185', 65, 9);
      return;
    }
    case 'error': {
      // read before the `reason` test: without strict null checks its false branch narrows to never
      const text = message.message;
      if (message.reason === 'outdated') leaveOnlinePlay(text);
      else if (net.reconnecting) {
        // the server refused our seat (the match is over, or the room is gone)
        leaveOnlinePlay(text);
        $('hint').textContent = text;
      } else {
        $('roomStatus').textContent = text;
        $('lobbyStatus').textContent = text;
      }
      return;
    }
    case 'peer_left':
      leaveOnlinePlay(roomClosedText(isTeamMatch()));
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
  // logging in or out on the account screens: the connection must carry the new identity
  onAccount(() => matchSocketToAccount());
  // the Workshop look and spellbook loadout follow the account (account/profileSync.ts), and the
  // friends list comes on the same account-bound connection (account/friends.ts)
  const accountSocket = {
    send,
    canSend: () =>
      net.socket?.readyState === 1 &&
      socketAccount != null &&
      socketAccount === accountKey(currentAccount()),
    // opens one at the menu if there is none; a room's connection (and its reconnecting) is left alone
    connect: () => {
      if (net.room || net.reconnecting || (net.socket && net.socket.readyState <= 1)) return;
      connect().catch(() => {
        // not reachable now: the next save or room tries again
      });
    },
  };
  initProfileSync(accountSocket);
  initFriends(accountSocket);
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
    const button = (ev.target as HTMLElement).closest('button[data-team]') as HTMLElement | null;
    const team = button?.dataset.team;
    if (team) send({ type: 'set_team', team: team === 'spec' ? 'spec' : (Number(team) as 0 | 1) });
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
