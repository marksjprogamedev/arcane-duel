// The notice over the match while a player's connection is down: who, and how long the match waits
// for them ("Ember Mage disconnected · resuming in 7…"). One line per dropped player, each with its
// own countdown; a line goes when that player is back or their time is up.

import { $ } from '../dom';
import { game, net } from '../state';

const away = new Map<number, { name: string; until: number }>();
let timer: ReturnType<typeof setInterval> | null = null;

/** The lines to show at time `now`; players whose time is up are dropped from `list`. */
export function awayLines(list: Map<number, { name: string; until: number }>, now: number) {
  const lines: string[] = [];
  for (const [seat, entry] of list) {
    const left = Math.ceil((entry.until - now) / 1000);
    if (left <= 0) list.delete(seat);
    else lines.push(`${entry.name} disconnected · resuming in ${left}…`);
  }
  return lines;
}

function render() {
  const box = $('awayOverlay');
  // only while a match is on; once it is over the result screen is what matters
  const lines = game.active && net.online && !net.endAnnounced ? awayLines(away, Date.now()) : [];
  if (!away.size && timer) {
    clearInterval(timer);
    timer = null;
  }
  box.hidden = lines.length === 0;
  box.replaceChildren(
    ...lines.map((text) => {
      const line = document.createElement('div');
      line.className = 'away-overlay__line';
      line.textContent = text;
      return line;
    }),
  );
}

/** A player dropped: the match waits for them for `graceMs`. */
export function showAway(seat: number, name: string, graceMs: number) {
  away.set(seat, { name, until: Date.now() + graceMs });
  if (!timer) timer = setInterval(render, 200);
  render();
}

/** That player is back (or the match ended): their line goes. */
export function hideAway(seat: number) {
  away.delete(seat);
  render();
}

export function clearAway() {
  away.clear();
  render();
}
