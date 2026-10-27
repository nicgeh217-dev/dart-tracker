import { sideName } from '../../game/sides';
import { rematchConfig } from '../../game/start';
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

  const winner = game.winnerId ? sideName(game, game.winnerId) : null;
  const verb = game.config.teams ? 'gewinnen' : 'gewinnt';

  const rematch = () => {
    const config = rematchConfig(game.config);
    closeGame();
    startGame(config);
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
    el('h1', { class: winner ? 'result winner' : 'result' }, winner ? `${winner} ${verb}` : 'Spiel beendet'),
    renderSummary(game),
    el('div', { class: 'stack end-actions' }, ...buttons),
  );
};
