import { PROTOCOL_VERSION, type ClientMessage } from '../../shared/protocol';
import { CREATOR, rooms, seatOf, send, type Client } from './state';
import {
  handleCreate,
  handleJoin,
  handleMoveSeat,
  handleSetLoadout,
  handleSetOptions,
  handleStartMatch,
  leaveRoom,
} from './lobby';
import { resume } from './reconnect';
import { handleBackToLobby, handleInput, handleMove, handleRematchReady } from './matchMessages';

export { configureRooms, roomStats, type Client } from './state';
export { handleDisconnect } from './reconnect';

function sendOutdated(ws: Client) {
  send(ws, {
    type: 'error',
    reason: 'outdated',
    message: 'The game has been updated. Please refresh the page.',
  });
}

/** Handles one validated message (see validateClientMessage). */
export function handleMessage(ws: Client, m: ClientMessage) {
  if (m.type === 'hello') {
    ws.helloOk = m.protocolVersion === PROTOCOL_VERSION;
    if (!ws.helloOk) sendOutdated(ws);
    return;
  }
  if (m.type === 'ping') {
    send(ws, { type: 'pong', stamp: m.stamp });
    return;
  }
  // an older client never says hello (or says it with an old version)
  if (!ws.helloOk) {
    sendOutdated(ws);
    return;
  }
  switch (m.type) {
    case 'create':
      handleCreate(ws);
      return;
    case 'join':
      handleJoin(ws, m);
      return;
    case 'resume':
      resume(ws, m.code.toUpperCase(), m.token);
      return;
    case 'leave':
      leaveRoom(ws);
      return;
  }

  const room = ws.room ? rooms.get(ws.room) : undefined;
  const seat = room ? seatOf(room, ws) : null;
  if (!room || seat === null) return;

  // Anyone in the lobby picks their own spells; they are locked once the match starts.
  if (m.type === 'set_loadout') {
    if (room.phase !== 'lobby') return;
    handleSetLoadout(ws, room, m);
    return;
  }

  // The lobby: the creator picks the options and starts the match.
  if (m.type === 'set_options' || m.type === 'move_seat' || m.type === 'start_match') {
    if (seat !== CREATOR || room.phase !== 'lobby') return;
    if (m.type === 'set_options') handleSetOptions(room, m);
    else if (m.type === 'move_seat') handleMoveSeat(room, m);
    else handleStartMatch(ws, room);
    return;
  }

  // Everything below requires a running match.
  if (room.phase !== 'match') return;

  switch (m.type) {
    case 'back_to_lobby':
      handleBackToLobby(room);
      return;
    case 'rematch_ready':
      handleRematchReady(ws, room);
      return;
    case 'input':
      handleInput(room, seat, m);
      return;
    case 'move':
      handleMove(room, seat, m);
      return;
  }
}
