// WebSocket protocol between client and server. Single source of truth for both ends.
//
// The server is authoritative: it runs one simulation per room. Every player is a client that
// sends inputs and receive snapshots of the match.

import type { Account } from './accountApi';
import type { MapId } from './maps';
import type { Snapshot } from './sim/snapshot';
import type { DeathRule, MatchRules, Seat, SpellLoadout } from './types';

export type { Snapshot } from './sim/snapshot';

/**
 * Bumped whenever the messages change incompatibly. A client sends it in `hello` right after
 * connecting; an outdated client (e.g. a tab left open across a deploy) is told to refresh.
 */
export const PROTOCOL_VERSION = 25;

/**
 * A Workshop look as the client stores it (parts by slot, skin, robe colour): short strings and numbers
 * by short keys. The server only checks this shape and size (`validate.ts`); the client drops unknown
 * parts when it loads one (`loadAppearance`).
 */
export type WorkshopLook = Record<string, string | number>;

/** What an account keeps between devices; null for what it has never saved. */
export interface Profile {
  workshop: WorkshopLook | null;
  loadout: SpellLoadout | null;
}

/** Another account, as friends lists show it: `Merlin (@merlin)`. */
export interface Person {
  id: number;
  username: string;
  displayName: string;
}

/** Where a friend is: game closed, open on the menu, in a room's lobby, or in a match (playing or watching). */
export type Presence = 'offline' | 'online' | 'lobby' | 'match';

/** A friend, and where they are. */
export interface FriendEntry extends Person {
  presence: Presence;
}

/** How long an invite to a lobby stays open, and how soon the same friend can be invited again. */
export const INVITE_TTL_MS = 120_000;
export const INVITE_COOLDOWN_MS = 30_000;

/** The whole friends picture of one account; sent again whenever any part changes. */
export interface FriendsList {
  friends: FriendEntry[];
  /** Requests others sent us, waiting for an answer. */
  incoming: Person[];
  /** Requests we sent, waiting for their answer. */
  outgoing: Person[];
  /** Accounts we blocked: no requests or friendship between us. */
  blocked: Person[];
}

/** The most friends, and waiting outgoing requests, one account may have. */
export const MAX_FRIENDS = 100;
export const MAX_OUTGOING_REQUESTS = 20;

/** One watcher in the lobby. */
export interface LobbySpectator {
  name: string;
  /** No account: shown as a guest. */
  guest: boolean;
  host: boolean;
  /** Set on the entry that is the receiving client. */
  you: boolean;
}

/** What the room creator chooses in the lobby; kept for rematches, changed in the lobby. */
export interface LobbyOptions {
  mapId: MapId;
  /** Players per team: 1 is a duel, 2 a 2v2. The room has `2 * teamSize` seats. */
  teamSize: number;
  /** Team matches: whether spells hurt teammates. */
  friendlyFire: boolean;
  /** Team matches: a fallen wizard is out until the round ends, or comes back after a delay. */
  deathRule: DeathRule;
  /** Every wizard's health: a normal match, or a very high one for testing spells. */
  wizardHp: WizardHp;
}

/** The health choices a room can be set to. */
export const WIZARD_HP_CHOICES = [200, 1000] as const;
export type WizardHp = (typeof WIZARD_HP_CHOICES)[number];

export const DEFAULT_LOBBY_OPTIONS: LobbyOptions = {
  mapId: 'enchanted',
  teamSize: 1,
  friendlyFire: false,
  deathRule: 'elimination',
  wizardHp: 200,
};

/** The biggest team a room can be set to (a map may allow fewer). */
export const MAX_TEAM_SIZE = 4;

/**
 * The order seats fill as players join, alternating teams so a room stays balanced: the creator
 * (team 0, seat 0), then team 1's first seat, then team 0's second, and so on.
 */
export function joinOrder(teamSize: number): number[] {
  return Array.from({ length: teamSize }, (_, i) => [i, teamSize + i]).flat();
}

/** Where a lobby member sits: team 0 or 1, or watching. */
export type TeamChoice = 0 | 1 | 'spec';

/** Discrete player actions. Movement and aim are not actions: they travel in `move` commands. */
export type InputAction = 'key' | 'down' | 'up' | 'bomb' | 'trap' | 'clear';

export interface InputPayload {
  action: InputAction;
  roundId: number;
  inputId?: number;
  castId?: number;
  key?: string;
  down?: boolean;
  x?: number;
  y?: number;
}

// ---- client -> server ----

export type ClientMessage =
  /** First message on every connection. */
  /**
   * `clientId` is random per browser tab (kept across reloads): it lets a guest who left a running
   * match take their seat back by joining with the room code, instead of watching. A logged-in player
   * is recognised by their account instead (the session cookie on the WebSocket), from any tab or device.
   */
  | { type: 'hello'; protocolVersion: number; clientId?: string }
  | { type: 'ping'; stamp: number }
  | { type: 'create' }
  | { type: 'join'; code: string }
  /** Reconnect: take over our seat in a room with the token from `created`/`joined`. */
  | { type: 'resume'; code: string; token: string }
  | { type: 'leave' }
  /** The creator changes the options while in the lobby. */
  | { type: 'set_options'; options: LobbyOptions }
  /** Any player in the lobby moves themselves to a team, or to the spectators. */
  | { type: 'set_team'; team: TeamChoice }
  /** The creator starts the match (needs two players, at least one on each team). */
  | { type: 'start_match' }
  /** The spell variants this player picked in the spellbook; only taken in the lobby. */
  | { type: 'set_loadout'; loadout: SpellLoadout }
  /**
   * A logged-in player saved their Workshop look and/or spellbook loadout (ignored for guests). The
   * server stores it and sends `profile` to the account's other connections.
   */
  | { type: 'save_profile'; workshop?: WorkshopLook; loadout?: SpellLoadout }
  /**
   * Friends (logged-in players only). A request to someone who already asked us makes us friends at
   * once. `friend_remove` ends a friendship or withdraws our request; `block` also ends both.
   */
  | { type: 'friend_request'; username: string }
  | { type: 'friend_answer'; id: number; accept: boolean }
  | { type: 'friend_remove'; id: number }
  | { type: 'block'; id: number }
  | { type: 'unblock'; id: number }
  /** Invites an online friend to the lobby we are in (a lobby, not a running match). */
  | { type: 'invite'; id: number }
  /** After a match, any player sends everyone back to the lobby. */
  | { type: 'back_to_lobby' }
  | { type: 'rematch_ready' }
  | ({ type: 'input' } & InputPayload)
  | MoveCommand;

/**
 * Sent by the client every game tick (60 Hz): which movement keys are held and where the player
 * aims. `seq` counts up from 1 each round. The server always uses the newest command it has and
 * reports the newest `seq` it applied in each snapshot (`Snapshot.ack`), so the client can replay
 * the commands the server has not seen yet on top of the server's position (client prediction).
 */
export interface MoveCommand {
  type: 'move';
  roundId: number;
  seq: number;
  /** Held movement keys as bits, see moveKeysToBits. */
  keys: number;
  /** Aim position in arena coordinates. */
  x: number;
  y: number;
}

// ---- server -> client ----

/** Input as normalised by the server before it reaches the simulation. */
export interface SanitizedInput {
  type: 'input';
  action: string;
  roundId: number;
  castId: number | null;
  inputId: number | null;
  key: string;
  down: boolean;
  x: number;
  y: number;
}

export type ServerMessage =
  | { type: 'pong'; stamp: number }
  /**
   * Answer to a good `hello`: who this connection is (from the session cookie sent with the WebSocket),
   * or null for a guest. The identity is fixed for the connection's life: after logging in or out the
   * client opens a new one.
   */
  | { type: 'welcome'; account: Account | null }
  /**
   * The account's saved look and loadout: right after `welcome` (logged in only), and whenever another
   * of the account's connections saves. Null parts were never saved: the client then uploads its own.
   */
  | { type: 'profile'; profile: Profile }
  /** The account's friends, requests and blocks: after `profile`, and again on every change. */
  | { type: 'friends'; list: FriendsList }
  /**
   * A friend invites us to their lobby: show it with Join (which joins `code` like typing it) until
   * `expiresAt` (ms since epoch, server clock). `invite_sent` confirms our own invite went out.
   */
  | { type: 'invited'; from: Person; code: string; expiresAt: number }
  | { type: 'invite_sent'; to: Person }
  /** A friends action did not happen (unknown username, limit reached, ...): a message to show. */
  | { type: 'friend_error'; message: string }
  /**
   * This account's session ended elsewhere (logged out, password changed, account deleted). The server has
   * taken this connection out of its room; the client goes back to the menu as a guest.
   */
  | { type: 'signed_out'; reason: 'logout' | 'password' | 'deleted' }
  /**
   * The same account joined this room from another tab or device, which took over this connection's
   * place. Still logged in; the client goes back to the menu.
   */
  | { type: 'replaced' }
  /** `resumeToken` lets this player reconnect to the room if their connection drops. */
  | { type: 'created'; code: string; resumeToken: string; seat: Seat }
  /** `seat` is null when the room was full and we are watching (no resume token then). */
  | { type: 'joined'; code: string; resumeToken: string; seat: Seat | null }
  /**
   * We are back in our seat after reconnecting (also after a page reload, which starts from nothing,
   * so it carries what `start` does); the match continues.
   */
  | {
      type: 'resumed';
      code: string;
      roundId: number;
      seat: Seat;
      mapId: MapId;
      rules: MatchRules;
      loadouts: SpellLoadout[];
      /** Each seat's player name, as in `start`. */
      names: string[];
    }
  /**
   * You are in the lobby: the current options, which seats are taken, and which one is yours.
   * Sent on every change, and again when a match ends and the players go back to the lobby.
   */
  | {
      type: 'lobby';
      options: LobbyOptions;
      seats: boolean[];
      /** Every seat's spell choices, by seat (empty for an open seat). */
      loadouts: SpellLoadout[];
      /** Each seat's player name: the display name of a logged-in player, else "Player 3"; empty for an open seat. */
      names: string[];
      /** By seat: whether that player has no account (the lobby marks guests). */
      guests: boolean[];
      /** The seat of the room's host, or null while the host is spectating. */
      hostSeat: Seat | null;
      /** Everyone watching instead of playing. */
      spectators: LobbySpectator[];
      /** Our seat, or null while we are spectating. */
      youSeat: Seat | null;
      /** Whether we are the host: the one who picks the options and starts the match. */
      youHost: boolean;
      /** The resume token for our current seat (it changes when we move); null while spectating. */
      youToken: string | null;
    }
  /**
   * A player's connection dropped (`name` is the player's name, as in `start`). The match is paused for everyone
   * for up to `graceMs` while they can come back, then carries on without them (their wizard has
   * `away: true` in snapshots). Also sent to a player who resumes while others are still away.
   */
  | { type: 'peer_away'; seat: Seat; name: string; graceMs: number }
  /**
   * A player left the match on purpose (`name` is the player's name). No pause: their wizard stays
   * where it stood with `away: true` in snapshots, and they cannot rejoin.
   */
  | { type: 'peer_left_match'; seat: Seat; name: string }
  /** That player reconnected (inside the grace period or after it). */
  | { type: 'peer_back'; seat: Seat }
  /**
   * A match begins on this arena (`mapId` is the creator's choice; a rematch keeps it) once
   * `countdownTicks` have passed (only the lobby start waits; a rematch starts at once); snapshots
   * count the rest down.
   */
  | {
      type: 'start';
      roundId: number;
      mapId: MapId;
      rules: MatchRules;
      loadouts: SpellLoadout[];
      /** Each seat's player name (display name or "Player 3") when the match started; empty for an open seat. */
      names: string[];
      seat: Seat;
      countdownTicks: number;
      /** Set for a lobby spectator: `seat` is the player whose view they watch (read-only). */
      spectating?: boolean;
    }
  | {
      type: 'rematch_start';
      roundId: number;
      mapId: MapId;
      rules: MatchRules;
      loadouts: SpellLoadout[];
      names: string[];
      seat: Seat;
      countdownTicks: number;
      spectating?: boolean;
    }
  /** `reason: 'outdated'` means the client is older than the server and should reload. */
  | { type: 'error'; message: string; reason?: 'outdated' }
  | { type: 'peer_left' }
  | { type: 'input_ack'; inputId: number; accepted: boolean }
  | { type: 'cast_ack'; roundId: number; castId: number; accepted: boolean }
  /** A wizard died and the round is ending; `winner` is true when the receiving player's team won. */
  | { type: 'death_start'; loser: Seat; winner: boolean }
  | { type: 'state'; state: Snapshot }
  | { type: 'finished'; winner: boolean };

/**
 * The largest map coordinate the server accepts in a message. This only rejects nonsense; the
 * simulation then clamps to the match's actual map (`inputEventFromWire`).
 */
export const MAX_MAP_COORD = 8192;
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
/** Game ticks per second the server simulates. */
export const SERVER_TICK_HZ = 60;
/**
 * The server sends a snapshot every this many ticks (60 / 2 = 30 Hz). Other players are drawn at
 * least one snapshot interval in the past, so a higher rate means seeing them sooner.
 */
export const SNAPSHOT_EVERY_TICKS = 2;
/** Largest message the server accepts from a client. Clients only send small inputs. */
export const MAX_MESSAGE_BYTES = 4096;
