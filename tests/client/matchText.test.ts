import { describe, expect, it } from 'vitest';
import { matchEndDetail, rematchWaitText, roomClosedText } from '../../client/src/ui/matchText';

const health = { hp: 41.2, max: 100 };

describe('matchText', () => {
  it('keeps the 1v1 wording', () => {
    expect(matchEndDetail(true, false, health)).toBe(
      'You defeated the rival! Remaining health: 42/100',
    );
    expect(matchEndDetail(false, false, health)).toBe('The rival wizard defeated you.');
    expect(rematchWaitText(false)).toBe('Waiting for the other player to accept the rematch…');
    expect(roomClosedText(false)).toBe('Opponent disconnected. Create a new room to play again.');
  });

  it('talks about teams in a team match', () => {
    expect(matchEndDetail(true, true, health)).toBe('Your team won!');
    expect(matchEndDetail(false, true, health)).toBe('Your team was defeated.');
    expect(rematchWaitText(true)).toBe('Waiting for the other players to accept the rematch…');
    expect(roomClosedText(true)).toBe('A player disconnected. Create a new room to play again.');
  });
});
