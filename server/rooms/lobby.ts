import { MatchRunner } from '../match';
import { DEFAULT_LOBBY_OPTIONS, joinOrder, type ClientMessage } from '../../shared/protocol';
import { mapFor, maxTeamSize } from '../../shared/maps';
import { DEFAULT_RULES } from '../../shared/simState';
import type { MatchRules, Seat, SpellLoadout } from '../../shared/types';
import {
  CREATOR,
  closeRoom,
  config,
  newRoomCode,
  newToken,
  rooms,
  seatOf,
  seated,
  send,
  sendDelayed,
  type Client,
  type Room,
} from './state';

function createRunner(room: Room): MatchRunner {
  return new MatchRunner(
    (seat, msg) => sendDelayed(room.players[seat], msg),
    (seat) => (room.players[seat]?.bufferedAmount ?? Infinity) < 16000,
  );
}

/** Every seat's spell choices, by seat; an open seat has none. */
export const loadoutsOf = (room: Room): SpellLoadout[] => room.players.map((p) => p?.loadout ?? {});

/** Tells everyone in the room how the lobby looks now. */
export function sendLobby(room: Room) {
  const seats = room.players.map((p) => p !== null);
  const loadouts = loadoutsOf(room);
  for (const { ws, seat } of seated(room))
    send(ws, { type: 'lobby', options: room.options, seats, loadouts, youSeat: seat });
}

/** A joining player leaves the lobby; the room stays open. */
export function vacate(room: Room, seat: Seat) {
  room.players[seat] = null;
  room.ready.clear();
  sendLobby(room);
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
 * The creator moves the player in seat `from` to seat `to`, swapping with whoever sits there (their
 * resume tokens go with them). The creator's own seat 0 stays put.
 */
function moveSeat(room: Room, from: Seat, to: Seat) {
  const count = room.players.length;
  if (from === to || from === CREATOR || to === CREATOR || from >= count || to >= count) return;
  if (!room.players[from]) return;
  [room.players[from], room.players[to]] = [room.players[to], room.players[from]];
  [room.resumeTokens[from], room.resumeTokens[to]] = [
    room.resumeTokens[to],
    room.resumeTokens[from],
  ];
  room.ready.clear();
  sendLobby(room);
}

/** The player chose to leave (or created/joined another room). The room is closed. */
export function leaveRoom(ws: Client) {
  const room = ws.room ? rooms.get(ws.room) : undefined;
  ws.room = null;
  if (!room) return;
  const seat = seatOf(room, ws);
  if (seat !== null && seat !== CREATOR && room.phase === 'lobby') vacate(room, seat);
  else if (seat !== null) closeRoom(room, ws);
}

export function handleCreate(ws: Client) {
  leaveRoom(ws);
  const code = newRoomCode();
  const room: Room = {
    code,
    players: [ws, null],
    resumeTokens: [newToken(), newToken()],
    away: new Map(),
    ready: new Set(),
    roundId: 0,
    phase: 'lobby',
    options: { ...DEFAULT_LOBBY_OPTIONS },
    runner: null,
  };
  rooms.set(code, room);
  ws.room = code;
  send(ws, { type: 'created', code, resumeToken: room.resumeTokens[CREATOR], seat: CREATOR });
  sendLobby(room);
}

export function handleJoin(ws: Client, m: Extract<ClientMessage, { type: 'join' }>) {
  const code = m.code.toUpperCase();
  const room = rooms.get(code);
  const free = room ? (joinOrder(room.options.teamSize).find((s) => !room.players[s]) ?? -1) : -1;
  if (!room || free < 0 || room.players.includes(ws)) {
    send(ws, { type: 'error', message: 'Room not found or already full.' });
    return;
  }
  leaveRoom(ws);
  room.players[free] = ws;
  room.resumeTokens[free] = newToken(); // a guest who left must not be able to come back with the old one
  ws.room = code;
  send(ws, { type: 'joined', code, resumeToken: room.resumeTokens[free], seat: free });
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

export function handleSetOptions(room: Room, m: Extract<ClientMessage, { type: 'set_options' }>) {
  // a map only takes teams up to its size; the room keeps its team size if players would not fit
  const teamSize = Math.min(m.options.teamSize, maxTeamSize(mapFor(m.options.mapId)));
  if (teamSize === room.options.teamSize || resize(room, teamSize))
    room.options = { ...m.options, teamSize };
  sendLobby(room);
}

export function handleMoveSeat(room: Room, m: Extract<ClientMessage, { type: 'move_seat' }>) {
  moveSeat(room, m.from, m.to);
}

export function handleStartMatch(ws: Client, room: Room) {
  if (canStart(room)) {
    if (room.options.teamSize > 1 && !config.teamMatches) {
      send(ws, { type: 'error', message: 'Team matches cannot be started yet.' });
      return;
    }
    room.phase = 'match';
    room.roundId++;
    for (const p of seated(room))
      send(p.ws, {
        type: 'start',
        roundId: room.roundId,
        mapId: room.options.mapId,
        rules: matchRules(room),
        loadouts: loadoutsOf(room),
        seat: p.seat,
        countdownTicks: config.startCountdownTicks,
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
