import type { ClientMessage, SanitizedInput } from '../../shared/protocol';
import type { Seat } from '../../shared/types';
import { CREATOR, connected, send, type Client, type Room } from './state';
import { loadoutsOf, matchRules, sendLobby } from './lobby';
import { freeAwaySeats, pausing } from './reconnect';

/** Fills in the optional fields of a (validated) input message for the simulation. */
function toSanitizedInput(m: Extract<ClientMessage, { type: 'input' }>): SanitizedInput {
  return {
    type: 'input',
    action: m.action,
    roundId: m.roundId,
    castId: m.castId ?? null,
    inputId: m.inputId ?? null,
    key: m.key ?? '',
    down: !!m.down,
    x: m.x ?? 0,
    y: m.y ?? 0,
  };
}

export function handleBackToLobby(ws: Client, room: Room) {
  // the lobby needs its creator (they choose the options and start the match)
  if (room.away.has(CREATOR)) {
    send(ws, {
      type: 'error',
      message: 'The room creator is disconnected. Wait for them to come back.',
    });
    return;
  }
  freeAwaySeats(room);
  room.runner?.stop();
  room.runner = null;
  room.phase = 'lobby';
  room.ready.clear();
  sendLobby(room);
}

export function handleRematchReady(ws: Client, room: Room) {
  room.ready.add(ws);
  // players who are away don't hold the rematch up
  if (connected(room).every((p) => room.ready.has(p.ws))) {
    room.ready.clear();
    room.roundId++;
    for (const p of connected(room))
      send(p.ws, {
        type: 'rematch_start',
        roundId: room.roundId,
        mapId: room.options.mapId,
        rules: matchRules(room),
        loadouts: loadoutsOf(room),
        seat: p.seat,
        countdownTicks: 0,
      });
    room.runner?.start(room.roundId, room.options.mapId, matchRules(room), loadoutsOf(room));
    if (pausing(room)) room.runner?.pause(); // someone is still inside their grace period
  }
}

export function handleInput(room: Room, seat: Seat, m: Extract<ClientMessage, { type: 'input' }>) {
  room.runner?.handleInput(seat, toSanitizedInput(m));
}

export function handleMove(room: Room, seat: Seat, m: Extract<ClientMessage, { type: 'move' }>) {
  room.runner?.handleMove(seat, m);
}
