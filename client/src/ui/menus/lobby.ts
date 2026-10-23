// The lobby overlay: the room code, the creator's options, who sits where, and the Start button.
// Pure DOM; the buttons are wired to the network in net/client.ts.

import { MAPS as MAP_DEFS, maxTeamSize } from '../../../../shared/maps';
import type { LobbyOptions, LobbySpectator } from '../../../../shared/protocol';
import { variantName } from '../../../../shared/sim/variants';
import type { Seat, SpellLoadout, SpellName } from '../../../../shared/types';
import { $ } from '../../dom';
import { mapPickerHtml } from '../../render/arena/maps';
import { copyText } from '../clipboard';
import { lobbyName } from '../../net/playerNames';

export interface LobbyView {
  code: string;
  /** True for the room creator, who picks the options, moves players and starts the match. */
  host: boolean;
  options: LobbyOptions;
  /** Which seats are taken, by seat (teams are the first and second half). */
  seats: boolean[];
  /** Each seat's spellbook picks, by seat. */
  loadouts: SpellLoadout[];
  /** Each seat's player name (display name, or "Player 3" for a guest); empty for an open seat. */
  names: string[];
  /** By seat: the player has no account (shown as "(guest)"). */
  guests?: boolean[];
  hostSeat: Seat | null;
  spectators: LobbySpectator[];
  /** Null while we are spectating. */
  youSeat: Seat | null;
}

/** Fills the map pickers (lobby and menu) from the client's map list; call once at startup. */
export function initLobbyView() {
  $<HTMLSelectElement>('lobbyMap').innerHTML = mapPickerHtml();
  $<HTMLSelectElement>('arenaMap').innerHTML = mapPickerHtml();
}

const HOST_STAR = '<span class="lobby-star" title="Host" aria-label="Host">★</span>';

/** A seat's non-default spells as text, e.g. "Pyrodisk, Water Bullet"; empty for the originals. */
function picksText(loadout: SpellLoadout | undefined): string {
  const loadoutMap = loadout ?? {};
  return (Object.keys(loadoutMap) as SpellName[])
    .map((spell) => variantName(spell, loadoutMap))
    .join(', ');
}

/**
 * "Player 3 (guest) ★ (you)". The name itself is a player's own text: it goes in an empty
 * `.lobby-name` span here, filled with textContent by fillNames (never as HTML).
 */
const whoHtml = (host: boolean, you: boolean) =>
  `<span class="lobby-name"></span>${host ? ' ' + HOST_STAR : ''}${you ? ' (you)' : ''}`;

/** The names for the `.lobby-name` spans of seatsHtml, in the order they appear. */
function namesInOrder(view: LobbyView): string[] {
  const players = view.seats.flatMap((taken, seat) =>
    taken ? [lobbyName(view.names[seat] ?? '', view.guests?.[seat])] : [],
  );
  return [...players, ...view.spectators.map((w) => lobbyName(w.name, w.guest))];
}

/** The one button under a team: join it, switch to it, or why you cannot. */
function teamButton(view: LobbyView, team: number, full: boolean): string {
  const size = view.seats.length / 2;
  const mine = view.youSeat !== null && Math.floor(view.youSeat / size) === team;
  const [label, disabled] = mine
    ? ['✓ Your team', true]
    : full
      ? ['Team full', true]
      : [view.youSeat === null ? `Join Team ${team + 1}` : `Switch to Team ${team + 1}`, false];
  return `<button class="ui-btn ui-btn--secondary${disabled ? '' : ' is-green'}" data-team="${team}"${disabled ? ' disabled' : ''}>${label}</button>`;
}

/** The two team panels and the spectators panel; every join / switch is one button each. */
function seatsHtml(view: LobbyView): string {
  const size = view.seats.length / 2;
  const teams = [0, 1].map((team) => {
    const seats = Array.from({ length: size }, (_, i) => team * size + i);
    const rows = seats
      .map((seat) => {
        if (!view.seats[seat]) return `<div class="seat open"><span>Open seat</span></div>`;
        const picks = picksText(view.loadouts[seat]);
        const who = whoHtml(seat === view.hostSeat, seat === view.youSeat);
        return `<div class="seat"><span>${who}<small class="picks">${picks || 'Original spells'}</small></span></div>`;
      })
      .join('');
    const full = seats.every((seat) => view.seats[seat]);
    return `<div class="team ui-panel"><h3 class="ui-ribbon ui-ribbon--${team ? 'b' : 'a'}">TEAM ${team + 1}</h3>${rows}${teamButton(view, team, full)}</div>`;
  });
  const watching = view.youSeat === null;
  const watchers = view.spectators.length
    ? view.spectators
        .map((w) => `<div class="seat"><span>${whoHtml(w.host, w.you)}</span></div>`)
        .join('')
    : `<div class="seat open"><span>Nobody is spectating</span></div>`;
  const spectate = `<button class="ui-btn ui-btn--secondary${watching ? '' : ' is-beige'}" data-team="spec"${watching ? ' disabled' : ''}>${watching ? '👁 You are spectating' : '👁 Spectate'}</button>`;
  return `${teams.join('')}<div class="team ui-panel lobby-spectators"><h3 class="ui-ribbon ui-ribbon--spec">SPECTATORS</h3>${watchers}${spectate}</div>`;
}

/** Shows the lobby (hiding the menu) as this view describes. */
export function showLobby(view: LobbyView) {
  $('menu').style.display = 'none';
  $('lobby').classList.remove('lobby-awaiting-room');
  $('lobby').style.display = 'flex';
  const joinStatus = document.getElementById('lobbyJoinStatus');
  if (joinStatus) joinStatus.textContent = '';
  $<HTMLInputElement>('lobbyCode').value = view.code;
  const teamSize = view.options.teamSize;
  const map = $<HTMLSelectElement>('lobbyMap');
  map.value = view.options.mapId;
  map.disabled = !view.host;
  // a map is only offered if it takes teams this big
  for (const option of Array.from(map.options))
    option.disabled = maxTeamSize(MAP_DEFS[option.value as keyof typeof MAP_DEFS]) < teamSize;
  $('lobbyMapNote').textContent = view.host
    ? 'You choose the map and the rules. They are kept for rematches.'
    : 'The host chooses the map and the rules.';
  const size = $<HTMLSelectElement>('lobbyTeamSize');
  size.value = String(teamSize);
  size.disabled = !view.host;
  $('lobbyRules').style.display = teamSize > 1 ? 'flex' : 'none';
  const friendly = $<HTMLInputElement>('lobbyFriendly');
  friendly.checked = view.options.friendlyFire;
  friendly.disabled = !view.host;
  const health = $<HTMLSelectElement>('lobbyHealth');
  health.value = String(view.options.wizardHp);
  health.disabled = !view.host;
  const death = $<HTMLSelectElement>('lobbyDeath');
  death.value = view.options.deathRule;
  death.disabled = !view.host;
  const seats = $('lobbySeats');
  seats.innerHTML = seatsHtml(view);
  const names = namesInOrder(view);
  seats.querySelectorAll('.lobby-name').forEach((el, i) => (el.textContent = names[i] ?? ''));
  const filled = view.seats.filter(Boolean).length;
  const full = filled === view.seats.length;
  // the host may start with open seats, if there are two players and someone on each team
  const onTeam = (team: number) =>
    view.seats.slice(team * teamSize, (team + 1) * teamSize).some(Boolean);
  const canStart = filled >= 2 && onTeam(0) && onTeam(1);
  const start = $<HTMLButtonElement>('startMatch');
  start.style.display = view.host ? '' : 'none';
  start.disabled = !canStart;
  // a new code opens a new room and drops the old one, so only while nobody else is in it
  const refresh = $<HTMLButtonElement>('lobbyCreateAction');
  refresh.disabled = !view.host || filled + view.spectators.length > 1;
  refresh.title = refresh.disabled
    ? 'Only the host can change the code, before anyone joins'
    : 'New room code';
  $('lobbyStatus').textContent = !canStart
    ? teamSize === 1
      ? 'Share the code and wait for your opponent…'
      : `Share the code and wait for players (${filled}/${view.seats.length}). Each team needs one.`
    : !view.host
      ? 'Connected. Waiting for the host to start…'
      : full
        ? teamSize === 1
          ? 'Your opponent is here. Press START when you are ready.'
          : 'Everyone is here. Press START when you are ready.'
        : `${filled}/${view.seats.length} players here. Press START to play with uneven teams, or wait for more.`;
}

export function hideLobby() {
  $('lobby').style.display = 'none';
}

/** Copies the room code (ui/clipboard.ts has the fallback for plain HTTP pages). */
export async function copyRoomCode() {
  const field = $<HTMLInputElement>('lobbyCode');
  const ok = await copyText(field.value, field);
  const button = $('copyCode');
  button.textContent = ok ? 'COPIED ✓' : 'PRESS CTRL+C';
  setTimeout(() => (button.textContent = 'COPY'), 1500);
}
