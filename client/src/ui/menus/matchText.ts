/** On-screen match texts. A 1v1 keeps the duel wording; a team match talks about teams. */

/** The line under VICTORY / DEFEAT. `health` is only told in a 1v1 win. */
export function matchEndDetail(won: boolean, team: boolean, health: { hp: number; max: number }) {
  if (team) return won ? 'Your team won!' : 'Your team was defeated.';
  return won
    ? 'You defeated the rival! Remaining health: ' +
        Math.ceil(Math.max(0, health.hp)) +
        '/' +
        health.max
    : 'The rival wizard defeated you.';
}

export function rematchWaitText(team: boolean) {
  return team
    ? 'Waiting for the other players to accept the rematch…'
    : 'Waiting for the other player to accept the rematch…';
}

/** Shown on the menu when the room closes because someone left it. */
export function roomClosedText(team: boolean) {
  return team
    ? 'A player disconnected. Create a new room to play again.'
    : 'Opponent disconnected. Create a new room to play again.';
}
