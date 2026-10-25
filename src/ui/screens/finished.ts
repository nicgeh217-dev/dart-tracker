import { closeGame, getData, startGame, undoDart } from '../../store/store';
import { renderSummary } from '../components/summary';
import { el } from '../dom';
import { MODE_LABELS } from '../labels';
import { navigate } from '../router';
import type { Screen } from '../router';

export const finishedScreen: Screen = (root) => {
  const game = getData().activeGame;
  if (!game || game.finishedAt === null) {
    navigate('/');
    return;
  }

  const winner = game.winnerId ? game.playerNames[game.winnerId] : null;

  const rematch = () => {
    const { config } = game;
    // der erste Spieler rückt ans Ende, damit die Startreihenfolge wechselt
    const playerIds = [...config.playerIds.slice(1), config.playerIds[0]];
    closeGame();
    startGame({ ...config, playerIds });
  };

  const buttons = [el('button', { class: 'primary', onclick: rematch }, 'Revanche')];
  if (game.config.mode !== 'free') {
    buttons.push(el('button', { onclick: undoDart }, 'Rückgängig'));
  }
  buttons.push(
    el(
      'button',
      {
        onclick: () => {
          closeGame();
          navigate('/');
        },
      },
      'Zur Startseite',
    ),
  );

  root.append(
    el('p', { class: 'meta' }, MODE_LABELS[game.config.mode]),
    el('h1', { class: winner ? 'result winner' : 'result' }, winner ? `${winner} gewinnt` : 'Spiel beendet'),
    renderSummary(game),
    el('div', { class: 'stack end-actions' }, ...buttons),
  );
};
