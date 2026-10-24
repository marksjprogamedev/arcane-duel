import { MatchRunner } from '../match';
import {
  DEFAULT_LOBBY_OPTIONS,
  joinOrder,
  type ClientMessage,
  type ServerMessage,
  type WorkshopLook,
} from '../../shared/protocol';
import { mapFor, maxTeamSize } from '../../shared/maps';
import { DEFAULT_RULES } from '../../shared/simState';
import type { MatchRules, Seat, SpellLoadout } from '../../shared/types';
import { joinRunningMatch, leaveMatch } from './reconnect';
import {
  CREATOR,
  accountTwin,
  closeRoom,
  config,
  ensureHost,
  isHost,
  isSpectator,
  newRoomCode,
  nextHost,
  setHost,
  newToken,
  numberPlayer,
  playerName,
  identityOf,
  rooms,
  seatOf,
  seated,
  send,
  sendDelayed,
  viewSeatOf,
  type Client,
  type Room,
} from './state';

/** What a spectator sees of a match: the same stream as the player they follow, minus that player's acks. */
const SPECTATED = new Set<ServerMessage['type']>(['state', 'death_start', 'finished']);

function createRunner(room: Room): MatchRunner {
  return new MatchRunner(
    (seat, msg) => {
      sendDelayed(room.players[seat], msg);
      if (SPECTATED.has(msg.type) && seat === viewSeatOf(room))
        for (const ws of room.spectators) sendDelayed(ws, msg);
    },
    (seat) => (room.players[seat]?.bufferedAmount ?? Infinity) < 16000,
  );
}

/** Every seat's spell choices, by seat; an open seat has none. */
export const loadoutsOf = (room: Room): SpellLoadout[] => room.players.map((p) => p?.loadout ?? {});

/** Every seat's Workshop look, by seat; null for an open seat or a player who never chose one. */
export const looksOf = (room: Room): (WorkshopLook | null)[] =>
  room.players.map((p) => p?.look ?? null);

/** Tells everyone in the room how the lobby looks now. */
export function sendLobby(room: Room) {
  ensureHost(room);
  const shared = {
    options: room.options,
    seats: room.players.map((p) => p !== null),
    loadouts: loadoutsOf(room),
    looks: looksOf(room),
    names: room.players.map((p) => (p ? playerName(p) : '')),
    guests: room.players.map((p) => !!p && !p.account),
    hostSeat: seatOf(room, room.host),
  };
  const spectatorsFor = (viewer: Client) =>
    room.spectators.map((ws) => ({
      name: playerName(ws),
      guest: !ws.account,
      host: isHost(room, ws),
      you: ws === viewer,
    }));
  for (const { ws, seat } of seated(room))
    send(ws, {
      type: 'lobby',
      ...shared,
      spectators: spectatorsFor(ws),
      youSeat: seat,
      youHost: isHost(room, ws),
      youToken: room.resumeTokens[seat],
    });
  for (const ws of room.spectators)
    send(ws, {
      type: 'lobby',
      ...shared,
      spectators: spectatorsFor(ws),
      youSeat: null,
      youHost: isHost(room, ws),
      youToken: null,
    });
}

/**
 * Changes the team size, re-seating the players in join order (their resume tokens go with them).
 * Returns false, changing nothing, if there are more players than the new room has seats.
 */
function resize(room: Room, teamSize: number): boolean {
  const members = seated(room).map((m) => ({ ...m, token: room.resumeTokens[m.seat] }));
  const count = teamSize * 2;
  if (members.length > count) return false;
  const order = joinOrder(teamSize);
  const players: (Client | null)[] = Array(count).fill(null);
  const tokens = Array.from({ length: count }, newToken);
  members.forEach((m, i) => {
    players[order[i]] = m.ws;
    tokens[order[i]] = m.token;
  });
  room.players = players;
  room.resumeTokens = tokens;
  return true;
}

/** Whether a match can start: two players or more, and someone on each team. */
function canStart(room: Room): boolean {
  const { teamSize } = room.options;
  const team = (t: number) => room.players.slice(t * teamSize, (t + 1) * teamSize).some(Boolean);
  return seated(room).length >= 2 && team(0) && team(1);
}

/** The rules a room's match is played by; seats nobody sits in stay empty. */
export const matchRules = (room: Room): MatchRules => ({
  ...DEFAULT_RULES,
  emptySeats: room.players.flatMap((p, seat) => (p ? [] : [seat])),
  teamSize: room.options.teamSize,
  friendlyFire: room.options.friendlyFire,
  deathRule: room.options.deathRule,
  wizardHp: room.options.wizardHp,
});

/**
 * A client who dropped out of the lobby. If they were the host, the next in the join queue takes over;
 * the room closes only when nobody is left.
 */
export function leaveLobby(room: Room, ws: Client) {
  const heir = isHost(room, ws) ? nextHost(room, ws) : undefined;
  if (isHost(room, ws) && !heir) {
    closeRoom(room, ws);
    return;
  }
  const seat = seatOf(room, ws);
  if (isSpectator(room, ws)) room.spectators = room.spectators.filter((w) => w !== ws);
  else if (seat !== null) {
    room.players[seat] = null;
    room.resumeTokens[seat] = newToken();
    room.ready.clear();
  }
  if (heir) setHost(room, heir);
  sendLobby(room);
}

/**
 * Anyone in the lobby moves themselves to a team or to the spectators. Their resume token goes with
 * them. A full team refuses with a message.
 */
export function handleSetTeam(
  ws: Client,
  room: Room,
  m: Extract<ClientMessage, { type: 'set_team' }>,
) {
  const seat = seatOf(room, ws);
  if (m.team === 'spec') {
    if (seat === null) return;
    room.players[seat] = null;
    room.resumeTokens[seat] = newToken();
    room.spectators.push(ws);
  } else {
    const team = m.team;
    const size = room.options.teamSize;
    const teamSeats = Array.from({ length: size }, (_, i) => team * size + i);
    if (seat !== null && teamSeats.includes(seat)) return;
    const free = teamSeats.find((s) => !room.players[s]);
    if (free === undefined) {
      send(ws, { type: 'error', message: `Team ${team + 1} is full.` });
      return;
    }
    if (seat === null) {
      room.spectators = room.spectators.filter((w) => w !== ws);
      room.resumeTokens[free] = newToken();
    } else {
      room.resumeTokens[free] = room.resumeTokens[seat];
      room.resumeTokens[seat] = newToken();
      room.players[seat] = null;
    }
    room.players[free] = ws;
  }
  room.ready.clear();
  sendLobby(room);
}

/**
 * The player chose to leave (or created/joined another room). In a lobby a guest frees the seat and
 * the creator closes the room; in a match see `leaveMatch`.
 */
export function leaveRoom(ws: Client) {
  const room = ws.room ? rooms.get(ws.room) : undefined;
  ws.room = null;
  if (!room) return;
  const seat = seatOf(room, ws);
  if (room.phase === 'lobby') leaveLobby(room, ws);
  else if (seat !== null) leaveMatch(room, seat);
  else room.spectators = room.spectators.filter((w) => w !== ws);
}

export function handleCreate(ws: Client) {
  leaveRoom(ws);
  const code = newRoomCode();
  const room: Room = {
    code,
    players: [ws, null],
    host: ws,
    hostIdentity: identityOf(ws),
    playerNos: new Map(),
    spectators: [],
    seatOwners: [],
    names: [],
    looks: [],
    nextPlayerNo: 1,
    resumeTokens: [newToken(), newToken()],
    away: new Map(),
    left: new Set(),
    emptyTimer: null,
    ready: new Set(),
    roundId: 0,
    phase: 'lobby',
    options: { ...DEFAULT_LOBBY_OPTIONS },
    runner: null,
  };
  numberPlayer(room, ws);
  rooms.set(code, room);
  ws.room = code;
  send(ws, { type: 'created', code, resumeToken: room.resumeTokens[CREATOR], seat: CREATOR });
  sendLobby(room);
}

export function handleJoin(ws: Client, m: Extract<ClientMessage, { type: 'join' }>) {
  const code = m.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    send(ws, { type: 'error', message: 'Room not found.' });
    return;
  }
  // a player who left a running match still has their (away) seat, and may come back to it
  const seat = seatOf(room, ws);
  if ((seat !== null && !room.away.has(seat)) || isSpectator(room, ws)) {
    send(ws, { type: 'error', message: 'You are already in that room.' });
    return;
  }
  // a running match: take back the seat you left, or else watch
  if (room.phase === 'match') {
    joinRunningMatch(ws, room);
    return;
  }
  // the same account is already here from another tab or device: this connection takes its place
  const twin = accountTwin(room, ws);
  if (twin) {
    replaceInLobby(room, twin, ws);
    return;
  }
  leaveRoom(ws);
  numberPlayer(room, ws);
  ws.room = code;
  const free = joinOrder(room.options.teamSize).find((s) => !room.players[s]);
  if (free === undefined) {
    // a full room: they watch, and can take a seat when one opens
    room.spectators.push(ws);
    send(ws, { type: 'joined', code, resumeToken: '', seat: null });
  } else {
    room.players[free] = ws;
    room.resumeTokens[free] = newToken(); // a guest who left must not be able to come back with the old one
    send(ws, { type: 'joined', code, resumeToken: room.resumeTokens[free], seat: free });
  }
  ensureHost(room, ws);
  sendLobby(room);
}

/** `ws` takes `twin`'s place in the lobby (seat, number, spells, host role); `twin` is told and leaves. */
function replaceInLobby(room: Room, twin: Client, ws: Client) {
  leaveRoom(ws);
  const seat = seatOf(room, twin);
  ws.room = room.code;
  ws.playerNo = twin.playerNo;
  ws.loadout = twin.loadout;
  ws.look = twin.look;
  if (seat !== null) {
    room.players[seat] = ws;
    room.resumeTokens[seat] = newToken();
  } else room.spectators = room.spectators.map((w) => (w === twin ? ws : w));
  if (room.host === twin) setHost(room, ws);
  room.ready.delete(twin);
  twin.room = null;
  send(twin, { type: 'replaced' });
  send(ws, {
    type: 'joined',
    code: room.code,
    resumeToken: seat === null ? '' : room.resumeTokens[seat],
    seat,
  });
  sendLobby(room);
}

/** Anyone in the lobby picks their own spells; they are locked once the match starts. */
export function handleSetLoadout(
  ws: Client,
  room: Room,
  m: Extract<ClientMessage, { type: 'set_loadout' }>,
) {
  ws.loadout = m.loadout;
  sendLobby(room);
}

/** Anyone in the lobby picks how their wizard looks; it is locked once the match starts. */
export function handleSetLook(
  ws: Client,
  room: Room,
  m: Extract<ClientMessage, { type: 'set_look' }>,
) {
  ws.look = m.look;
  sendLobby(room);
}

export function handleSetOptions(room: Room, m: Extract<ClientMessage, { type: 'set_options' }>) {
  // a map only takes teams up to its size; the room keeps its team size if players would not fit
  const teamSize = Math.min(m.options.teamSize, maxTeamSize(mapFor(m.options.mapId)));
  if (teamSize === room.options.teamSize || resize(room, teamSize))
    room.options = { ...m.options, teamSize };
  sendLobby(room);
}

export function handleStartMatch(ws: Client, room: Room) {
  if (canStart(room)) {
    if (room.options.teamSize > 1 && !config.teamMatches) {
      send(ws, { type: 'error', message: 'Team matches cannot be started yet.' });
      return;
    }
    room.phase = 'match';
    room.roundId++;
    room.seatOwners = room.players.map((p) => (p ? identityOf(p) : undefined));
    room.names = room.players.map((p) => (p ? playerName(p) : ''));
    room.looks = looksOf(room);
    for (const p of seated(room))
      send(p.ws, {
        type: 'start',
        roundId: room.roundId,
        mapId: room.options.mapId,
        rules: matchRules(room),
        loadouts: loadoutsOf(room),
        looks: room.looks,
        names: room.names,
        seat: p.seat,
        countdownTicks: config.startCountdownTicks,
      });
    for (const ws of room.spectators)
      send(ws, {
        type: 'start',
        roundId: room.roundId,
        mapId: room.options.mapId,
        rules: matchRules(room),
        loadouts: loadoutsOf(room),
        looks: room.looks,
        names: room.names,
        seat: viewSeatOf(room),
        countdownTicks: config.startCountdownTicks,
        spectating: true,
      });
    room.runner = createRunner(room);
    room.runner.start(
      room.roundId,
      room.options.mapId,
      matchRules(room),
      loadoutsOf(room),
      config.startCountdownTicks,
    );
  }
}
