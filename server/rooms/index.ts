import { PROTOCOL_VERSION, type ClientMessage } from '../../shared/protocol';
import { isFriendMessage } from '../friends';
import { inviteFriend, sendToAccount } from './accounts';
import { config, isHost, isSpectator, rooms, seatOf, send, type Client } from './state';
import {
  handleCreate,
  handleJoin,
  handleSetLoadout,
  handleSetOptions,
  handleSetTeam,
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
    ws.clientId = m.clientId;
    if (!ws.helloOk) sendOutdated(ws);
    else {
      send(ws, { type: 'welcome', account: ws.account ?? null });
      if (ws.account && config.profiles)
        send(ws, { type: 'profile', profile: config.profiles.load(ws.account.id) });
      if (ws.account && config.friends)
        send(ws, { type: 'friends', list: config.friends.listFor(ws.account.id) });
    }
    return;
  }
  if (m.type === 'invite') {
    if (!ws.helloOk || !ws.account) return;
    const error = inviteFriend(ws, m.id);
    if (error) send(ws, { type: 'friend_error', message: error });
    return;
  }
  if (isFriendMessage(m)) {
    if (!ws.helloOk || !ws.account || !config.friends) return;
    const error = config.friends.receive(ws.account.id, m);
    if (error) send(ws, { type: 'friend_error', message: error });
    return;
  }
  if (m.type === 'save_profile') {
    if (!ws.helloOk || !ws.account || !config.profiles) return;
    config.profiles.save(ws.account.id, m);
    sendToAccount(
      ws.account.id,
      { type: 'profile', profile: config.profiles.load(ws.account.id) },
      ws,
    );
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
  if (!room || (seat === null && !isSpectator(room, ws))) return;

  // The lobby: anyone picks their team (or to watch); the host picks the options and starts the match.
  if (m.type === 'set_team') {
    if (room.phase === 'lobby') handleSetTeam(ws, room, m);
    return;
  }
  if (m.type === 'set_options' || m.type === 'start_match') {
    if (!isHost(room, ws) || room.phase !== 'lobby') return;
    if (m.type === 'set_options') handleSetOptions(room, m);
    else handleStartMatch(ws, room);
    return;
  }
  // a spectator can send everyone back to the lobby once the match is over, and does nothing else
  if (seat === null) {
    if (m.type === 'back_to_lobby' && room.phase === 'match') handleBackToLobby(ws, room);
    return;
  }

  // Anyone in the lobby picks their own spells; they are locked once the match starts.
  if (m.type === 'set_loadout') {
    if (room.phase !== 'lobby') return;
    handleSetLoadout(ws, room, m);
    return;
  }

  // Everything below requires a running match.
  if (room.phase !== 'match') return;

  switch (m.type) {
    case 'back_to_lobby':
      handleBackToLobby(ws, room);
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
