import { closeRoom, config, CREATOR, rooms, seatOf, seated, send, type Client } from './state';
import { leaveRoom, vacate } from './lobby';

/**
 * A player's connection closed. During a match their seat is kept for a while so they can
 * reconnect (the match pauses meanwhile); otherwise the room is closed.
 */
export function handleDisconnect(ws: Client) {
  const room = ws.room ? rooms.get(ws.room) : undefined;
  const seat = room ? seatOf(room, ws) : null;
  if (!room || seat === null) return;
  if (room.phase === 'lobby') {
    // no match to rejoin: a guest just drops out, the creator's leaving closes the room
    if (seat !== CREATOR) vacate(room, seat);
    else closeRoom(room, ws);
    return;
  }
  room.runner?.pause();
  for (const p of seated(room)) if (p.seat !== seat) send(p.ws, { type: 'peer_away' });
  room.away.set(
    seat,
    setTimeout(() => closeRoom(room, null), config.reconnectGraceMs),
  );
}

/** A new connection takes over a player's seat with the room code and their resume token. */
export function resume(ws: Client, code: string, token: string) {
  const room = rooms.get(code);
  const seatIndex = room ? room.resumeTokens.indexOf(token) : -1;
  const seat = seatIndex < 0 ? null : seatIndex;
  if (!room || seat === null || room.phase !== 'match') {
    send(ws, { type: 'error', message: 'Could not rejoin the match.' });
    return;
  }
  leaveRoom(ws);
  const old = room.players[seat];
  room.players[seat] = ws;
  ws.loadout = old?.loadout;
  ws.room = code;
  if (old && old !== ws) {
    room.ready.delete(old);
    old.room = null;
    old.terminate(); // a connection the server still believed alive
  }
  clearTimeout(room.away.get(seat));
  room.away.delete(seat);
  send(ws, { type: 'resumed', code, roundId: room.roundId, seat });
  for (const p of seated(room)) if (p.seat !== seat) send(p.ws, { type: 'peer_back' });
  if (room.away.size === 0) room.runner?.resume();
}
