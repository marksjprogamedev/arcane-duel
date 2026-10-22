import type { ClientMessage, SanitizedInput } from '../../shared/protocol';
import type { Seat } from '../../shared/types';
import { seated, send, type Client, type Room } from './state';
import { loadoutsOf, matchRules, sendLobby } from './lobby';

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

export function handleBackToLobby(room: Room) {
  if (room.away.size > 0) return; // a player is reconnecting; the match is paused, not over
  room.runner?.stop();
  room.runner = null;
  room.phase = 'lobby';
  room.ready.clear();
  sendLobby(room);
}

export function handleRematchReady(ws: Client, room: Room) {
  room.ready.add(ws);
  if (seated(room).every((p) => room.ready.has(p.ws))) {
    room.ready.clear();
    room.roundId++;
    for (const p of seated(room))
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
  }
}

export function handleInput(room: Room, seat: Seat, m: Extract<ClientMessage, { type: 'input' }>) {
  room.runner?.handleInput(seat, toSanitizedInput(m));
}

export function handleMove(room: Room, seat: Seat, m: Extract<ClientMessage, { type: 'move' }>) {
  room.runner?.handleMove(seat, m);
}
