// The lobby overlay: the room code, the creator's options, who sits where, and the Start button.
// Pure DOM; the buttons are wired to the network in net/client.ts.

import { MAPS as MAP_DEFS, maxTeamSize } from '../../../../shared/maps';
import type { LobbyOptions } from '../../../../shared/protocol';
import { variantName } from '../../../../shared/sim/variants';
import type { Seat, SpellLoadout, SpellName } from '../../../../shared/types';
import { $ } from '../../dom';
import { mapPickerHtml } from '../../render/arena/maps';

export interface LobbyView {
  code: string;
  /** True for the room creator, who picks the options, moves players and starts the match. */
  host: boolean;
  options: LobbyOptions;
  /** Which seats are taken, by seat (teams are the first and second half). */
  seats: boolean[];
  /** Each seat's spellbook picks, by seat. */
  loadouts: SpellLoadout[];
  youSeat: Seat;
}

/** Fills the map pickers (lobby and menu) from the client's map list; call once at startup. */
export function initLobbyView() {
  $<HTMLSelectElement>('lobbyMap').innerHTML = mapPickerHtml();
  $<HTMLSelectElement>('arenaMap').innerHTML = mapPickerHtml();
}

const seatLabel = (seat: Seat, youSeat: Seat) =>
  (seat === 0 ? 'Host' : `Player ${seat + 1}`) + (seat === youSeat ? ' (you)' : '');

/** A seat's non-default spells as text, e.g. "Pyrodisk, Water Bullet"; empty for the originals. */
function picksText(loadout: SpellLoadout | undefined): string {
  const loadoutMap = loadout ?? {};
  return (Object.keys(loadoutMap) as SpellName[])
    .map((spell) => variantName(spell, loadoutMap))
    .join(', ');
}

/** The two team columns, with a button for the host to move a player across. */
function seatsHtml(view: LobbyView): string {
  const size = view.seats.length / 2;
  return [0, 1]
    .map((team) => {
      const rows = Array.from({ length: size }, (_, i) => {
        const seat = team * size + i;
        if (!view.seats[seat]) return `<div class="seat open"><span>Open seat</span></div>`;
        // move to the first open seat on the other team, or swap with its last player
        const other = Array.from({ length: size }, (_, j) => (1 - team) * size + j);
        const to = other.find((s) => !view.seats[s]) ?? other[other.length - 1];
        const move =
          view.host && seat !== 0
            ? `<button class="ui-btn ui-btn--icon" data-from="${seat}" data-to="${to}" title="Move to the other team">⇄</button>`
            : '';
        const picks = picksText(view.loadouts[seat]);
        return `<div class="seat"><span>${seatLabel(seat, view.youSeat)}<small class="picks">${picks || 'Original spells'}</small></span>${move}</div>`;
      }).join('');
      return `<div class="team ui-panel"><h3 class="ui-ribbon ui-ribbon--${team ? 'b' : 'a'}">TEAM ${team + 1}</h3>${rows}</div>`;
    })
    .join('');
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
  $('lobbySeats').innerHTML = seatsHtml(view);
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
  refresh.disabled = !view.host || filled > 1;
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

/**
 * Copies text to the clipboard. The Clipboard API only exists on secure pages, and the game is
 * served over plain HTTP, so fall back to selecting the code field and a copy command.
 */
export async function copyRoomCode() {
  const field = $<HTMLInputElement>('lobbyCode');
  let ok = false;
  try {
    await navigator.clipboard.writeText(field.value);
    ok = true;
  } catch {
    field.select();
    ok = document.execCommand('copy');
  }
  const button = $('copyCode');
  button.textContent = ok ? 'COPIED ✓' : 'PRESS CTRL+C';
  setTimeout(() => (button.textContent = 'COPY'), 1500);
}
