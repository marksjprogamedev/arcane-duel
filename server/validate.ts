// Checks every message from a client before the server acts on it. Anything malformed is
// dropped here, so the room and match code only ever sees well-formed, clamped values.

import {
  MAX_MAP_COORD,
  MAX_TEAM_SIZE,
  WIZARD_HP_CHOICES,
  type WizardHp,
  type ClientMessage,
  type WorkshopLook,
  type InputAction,
} from '../shared/protocol';
import { isMapId } from '../shared/maps';
import { parseWardrobe, parseWorkshopLook } from '../shared/wardrobe';
import { ALL_MOVE_KEY_BITS } from '../shared/sim/movement';
import { sanitizeLoadout } from '../shared/sim/variants';

const INPUT_ACTIONS = new Set<InputAction>(['key', 'down', 'up', 'bomb', 'trap', 'clear']);

const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
const isShortString = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length <= max;
const clamp = (v: unknown, min: number, max: number) =>
  Number.isFinite(v) ? Math.max(min, Math.min(max, v as number)) : 0;
const optionalInt = (v: unknown) => (isInt(v) ? v : undefined);

/** Returns a clean copy of a client message, or null if it is not a valid message. */
export function validateClientMessage(raw: unknown): ClientMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  switch (m.type) {
    case 'hello':
      return isInt(m.protocolVersion)
        ? {
            type: 'hello',
            protocolVersion: m.protocolVersion,
            ...(isShortString(m.clientId, 64) ? { clientId: m.clientId } : {}),
          }
        : null;
    case 'ping':
      return Number.isFinite(m.stamp) ? { type: 'ping', stamp: m.stamp as number } : null;
    case 'create':
    case 'leave':
    case 'rematch_ready':
    case 'start_match':
    case 'back_to_lobby':
      return { type: m.type };
    case 'set_options': {
      const options = m.options as Record<string, unknown> | null;
      return options &&
        typeof options === 'object' &&
        isMapId(options.mapId) &&
        isInt(options.teamSize) &&
        options.teamSize >= 1 &&
        options.teamSize <= MAX_TEAM_SIZE &&
        typeof options.friendlyFire === 'boolean' &&
        (options.deathRule === 'elimination' || options.deathRule === 'respawn') &&
        (options.wizardHp === undefined || WIZARD_HP_CHOICES.includes(options.wizardHp as WizardHp))
        ? {
            type: 'set_options',
            options: {
              mapId: options.mapId,
              teamSize: options.teamSize,
              friendlyFire: options.friendlyFire,
              deathRule: options.deathRule,
              wizardHp: (options.wizardHp as WizardHp | undefined) ?? 200,
            },
          }
        : null;
    }
    case 'set_look': {
      const look = workshopLook(m.look);
      return look ? { type: 'set_look', look } : null;
    }
    case 'set_loadout':
      return { type: 'set_loadout', loadout: sanitizeLoadout(m.loadout) };
    case 'friend_request':
      return isShortString(m.username, 40)
        ? { type: 'friend_request', username: m.username }
        : null;
    case 'friend_answer':
      return isInt(m.id) && typeof m.accept === 'boolean'
        ? { type: 'friend_answer', id: m.id, accept: m.accept }
        : null;
    case 'invite':
    case 'friend_remove':
    case 'block':
    case 'unblock':
      return isInt(m.id) ? { type: m.type, id: m.id } : null;
    case 'save_profile': {
      const workshop = workshopLook(m.workshop);
      const slots = m.slots === undefined ? undefined : parseWardrobe(m.slots);
      const loadout = m.loadout === undefined ? undefined : sanitizeLoadout(m.loadout);
      if (workshop === null || slots === null) return null;
      if (workshop === undefined && slots === undefined && loadout === undefined) return null;
      return {
        type: 'save_profile',
        ...(workshop && { workshop }),
        ...(slots && { slots }),
        ...(loadout && { loadout }),
      };
    }
    case 'set_team':
      return m.team === 0 || m.team === 1 || m.team === 'spec'
        ? { type: 'set_team', team: m.team }
        : null;
    case 'join':
      return isShortString(m.code, 12) ? { type: 'join', code: m.code } : null;
    case 'resume':
      return isShortString(m.code, 12) && isShortString(m.token, 64)
        ? { type: 'resume', code: m.code, token: m.token }
        : null;
    case 'input':
      if (!INPUT_ACTIONS.has(m.action as InputAction) || !isInt(m.roundId)) return null;
      return {
        type: 'input',
        action: m.action as InputAction,
        roundId: m.roundId,
        inputId: optionalInt(m.inputId),
        castId: optionalInt(m.castId),
        key: isShortString(m.key, 20) ? m.key : '',
        down: m.down === true,
        x: clamp(m.x, 0, MAX_MAP_COORD),
        y: clamp(m.y, 0, MAX_MAP_COORD),
      };
    case 'move':
      if (!isInt(m.roundId) || !isInt(m.seq) || !isInt(m.keys)) return null;
      return {
        type: 'move',
        roundId: m.roundId,
        seq: m.seq,
        keys: m.keys & ALL_MOVE_KEY_BITS,
        x: clamp(m.x, 0, MAX_MAP_COORD),
        y: clamp(m.y, 0, MAX_MAP_COORD),
      };
    default:
      return null;
  }
}

/** A look in a message: undefined if absent, null if malformed (rules in shared/wardrobe.ts). */
function workshopLook(raw: unknown): WorkshopLook | undefined | null {
  return raw === undefined ? undefined : parseWorkshopLook(raw);
}

/**
 * Per-connection message budget (token bucket). A normal client sends ~65 messages per second
 * in a match (60 move commands, pings, actions). Messages beyond the budget are dropped; a
 * client that keeps flooding far past it is disconnected.
 */
export function createRateLimiter({ perSecond = 150, burst = 300 } = {}) {
  let tokens = burst;
  let last: number | null = null;
  return (now = Date.now()): 'ok' | 'drop' | 'disconnect' => {
    if (last !== null) tokens = Math.min(burst, tokens + ((now - last) / 1000) * perSecond);
    last = now;
    tokens -= 1;
    if (tokens >= 0) return 'ok';
    return tokens < -burst ? 'disconnect' : 'drop';
  };
}
