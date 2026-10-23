import {
  closeRoom,
  config,
  connected,
  isHost,
  newToken,
  rooms,
  seatOf,
  send,
  type Client,
  type Room,
} from './state';
import { leaveLobby, leaveRoom, loadoutsOf, matchRules } from './lobby';
import type { Seat } from '../../shared/types';

/** Whether a drop is still pausing the match (some away seat is inside its grace period). */
export const pausing = (room: Room) => [...room.away.values()].some((a) => a.timer !== null);

/** Closes the room after a while if every player in it is away, so abandoned rooms don't pile up. */
function watchEmpty(room: Room) {
  if (connected(room).length > 0) {
    if (room.emptyTimer) clearTimeout(room.emptyTimer);
    room.emptyTimer = null;
  } else if (!room.emptyTimer) {
    room.emptyTimer = setTimeout(() => closeRoom(room, null), config.emptyRoomMs);
  }
}

/** One away seat's grace period ran out: the wizard stays, and the match goes on once nobody is left pausing it. */
function graceOver(room: Room, seat: Seat) {
  const away = room.away.get(seat);
  if (!away) return;
  away.timer = null;
  room.runner?.setAway(seat, true);
  if (!pausing(room)) room.runner?.resume();
}

/**
 * A player's connection closed. In the lobby a guest just drops out and the creator's leaving closes
 * the room. During a match the seat is kept (the dead socket stays in it) and the match pauses for
 * everyone for the grace period; after that play carries on without them. The room is never closed
 * because of a drop; it closes only if nobody at all is connected for a while.
 */
export function handleDisconnect(ws: Client) {
  const room = ws.room ? rooms.get(ws.room) : undefined;
  if (!room) return;
  const seat = seatOf(room, ws);
  if (room.phase === 'lobby') {
    // no match to rejoin: a guest just drops out, the host's leaving closes the room
    leaveLobby(room, ws);
    return;
  }
  if (seat === null) {
    room.spectators = room.spectators.filter((w) => w !== ws);
    return;
  }
  if (room.away.has(seat)) return;
  room.runner?.pause();
  const graceMs = config.reconnectGraceMs;
  room.away.set(seat, {
    deadline: Date.now() + graceMs,
    timer: setTimeout(() => graceOver(room, seat), graceMs),
  });
  const name = room.runner?.nameOf(seat) ?? '';
  for (const p of connected(room)) send(p.ws, { type: 'peer_away', seat, name, graceMs });
  watchEmpty(room);
}

/**
 * A player left the match on purpose. Like a drop that is already past its grace period, but with
 * no pause and no way back: the wizard stays, away, the resume token is rotated and the others are
 * told. The room closes when nobody is connected (at once if no dropped player could still return).
 */
export function leaveMatch(room: Room, seat: Seat) {
  if (room.left.has(seat)) return;
  const wasDropped = room.away.get(seat);
  if (wasDropped?.timer) clearTimeout(wasDropped.timer);
  room.left.add(seat);
  room.away.set(seat, { deadline: Date.now(), timer: null });
  room.resumeTokens[seat] = newToken();
  const old = room.players[seat];
  if (old) room.ready.delete(old);
  room.runner?.setAway(seat, true);
  if (!pausing(room)) room.runner?.resume();
  const name = room.runner?.nameOf(seat) ?? '';
  for (const p of connected(room)) send(p.ws, { type: 'peer_left_match', seat, name });
  const couldReturn = [...room.away.keys()].some((s) => !room.left.has(s));
  if (connected(room).length === 0 && !couldReturn) closeRoom(room, null);
  else watchEmpty(room);
}

/**
 * Going back to the lobby: the away players' seats are freed (there is no resume in the lobby) and
 * their resume tokens stop working.
 */
export function freeAwaySeats(room: Room) {
  for (const [seat, { timer }] of room.away) {
    if (timer) clearTimeout(timer);
    const old = room.players[seat];
    if (old) {
      room.ready.delete(old);
      if (old.room === room.code) old.room = null; // not a leaver who has joined another room
    }
    room.players[seat] = null;
    room.resumeTokens[seat] = newToken();
  }
  room.away.clear();
  room.left.clear();
  if (room.emptyTimer) clearTimeout(room.emptyTimer);
  room.emptyTimer = null;
}

/**
 * A new connection takes over a player's seat with the room code and their resume token, inside the
 * grace period (which it ends for that seat) or any time later until the match ends.
 */
export function resume(ws: Client, code: string, token: string) {
  const room = rooms.get(code);
  const seatIndex = room ? room.resumeTokens.indexOf(token) : -1;
  const seat = seatIndex < 0 ? null : seatIndex;
  if (!room || seat === null || room.phase !== 'match' || !room.players[seat]) {
    send(ws, { type: 'error', message: 'Could not rejoin the match.' });
    return;
  }
  // a socket sitting in some other room leaves it first (not our own room: that would close it)
  if (ws.room !== code) leaveRoom(ws);
  const old = room.players[seat];
  room.players[seat] = ws;
  ws.loadout = old?.loadout;
  ws.room = code;
  if (old && old !== ws) {
    if (room.host === old) room.host = ws;
    ws.playerNo = old.playerNo;
    room.ready.delete(old);
    old.room = null;
    old.terminate(); // a connection the server still believed alive
  }
  const wasAway = room.away.get(seat);
  if (wasAway?.timer) clearTimeout(wasAway.timer);
  room.away.delete(seat);
  room.runner?.setAway(seat, false);
  send(ws, {
    type: 'resumed',
    code,
    roundId: room.roundId,
    seat,
    mapId: room.options.mapId,
    rules: matchRules(room),
    loadouts: loadoutsOf(room),
  });
  // a match that ended while we were away: show the result
  const outcome = room.runner?.outcomeFor(seat) ?? null;
  if (outcome !== null) send(ws, { type: 'finished', winner: outcome });
  // someone else still inside their grace period: this player gets to see the countdown too
  for (const [other, away] of room.away)
    if (away.timer)
      send(ws, {
        type: 'peer_away',
        seat: other,
        name: room.runner?.nameOf(other) ?? '',
        graceMs: Math.max(0, away.deadline - Date.now()),
      });
  for (const p of connected(room)) if (p.seat !== seat) send(p.ws, { type: 'peer_back', seat });
  if (!pausing(room)) room.runner?.resume();
  watchEmpty(room);
}
