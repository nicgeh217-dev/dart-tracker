import { getData } from '../../store/store';
import { el } from '../dom';
import { navigate } from '../router';
import type { Screen } from '../router';

export const startScreen: Screen = (root) => {
  const enoughPlayers = getData().players.length >= 2;
  root.append(
    el('h1', { class: 'title' }, 'Dart-Tracker'),
    el(
      'div',
      { class: 'stack menu' },
      el(
        'button',
        { class: 'primary', onclick: () => navigate(enoughPlayers ? '/new' : '/players') },
        'Neues Spiel',
      ),
      enoughPlayers
        ? ''
        : el('p', { class: 'hint' }, 'Für ein Spiel brauchst du mindestens zwei Spieler.'),
      el('button', { onclick: () => navigate('/players') }, 'Spieler'),
      el('button', { onclick: () => navigate('/history') }, 'Verlauf'),
    ),
  );
};
