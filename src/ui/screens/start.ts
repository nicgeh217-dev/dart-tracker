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
        { class: 'primary big', onclick: () => navigate(enoughPlayers ? '/new' : '/players') },
        'Neues Spiel',
      ),
      enoughPlayers
        ? ''
        : el('p', { class: 'hint' }, 'Für ein Spiel brauchst du mindestens zwei Spieler.'),
      el(
        'div',
        { class: 'grouped' },
        el('button', { class: 'row-link', onclick: () => navigate('/players') }, 'Spieler'),
        el('button', { class: 'row-link', onclick: () => navigate('/history') }, 'Verlauf'),
      ),
    ),
  );
};
