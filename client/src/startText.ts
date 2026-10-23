import type { Wizard } from '../../shared/types';
import { seatLabel } from './net/playerNames';

interface StartTextGame {
  mode: string;
  wizards: (Pick<Wizard, 'seat' | 'team' | 'style'> & { absent?: boolean })[];
}

/**
 * The two lines shown when a match starts: the header (`#styles`) and the hint, naming your own wizard.
 * Online they match what the snapshots write into the header afterwards (net/client.ts), and name
 * the players by `names` (from the server, by seat) where it has one.
 */
export function startText(game: StartTextGame, mySeat: number, names?: readonly string[]) {
  const mine = game.wizards[mySeat] ?? game.wizards[0];
  // empty seats (absent wizards) don't count
  const present = game.wizards.filter((w) => !w.absent);
  const foes = present.filter((w) => w.team !== mine.team);
  if (game.mode === 'online') {
    const label = (w: (typeof game.wizards)[number]) => seatLabel(names, w.seat, w.style.name);
    const name = label(mine);
    const size = present.filter((w) => w.team === mine.team).length;
    if (size > 1 || foes.length > 1) {
      const sides = size + ' vs ' + foes.length;
      return {
        header: '🟢 You ' + name + ' · 🔴 Enemy team',
        hint: 'Your wizard: ' + name + ' · Team match, ' + sides,
      };
    }
    return {
      header: '🟢 You ' + name + ' · 🔴 Rival ' + label(foes[0]),
      hint: 'Your wizard: ' + name + ' · Rival: ' + label(foes[0]),
    };
  }
  const name = mine.style.name;
  const duel = game.mode === 'duel';
  return {
    header: '🟢 ' + name + ' · 🔴 ' + (duel ? foes[0].style.name : 'Training Dummy'),
    hint:
      'Your wizard: ' + name + ' · ' + (duel ? 'Rival: ' + foes[0].style.name : 'Training mode'),
  };
}
