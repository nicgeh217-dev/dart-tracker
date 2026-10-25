import { freeLeader } from '../../game/free';
import { abortGame, finishGame, getData, getGameState, throwDart, undoDart } from '../../store/store';
import { createKeypad } from '../components/keypad';
import { renderScoreboard } from '../components/scoreboard';
import { el } from '../dom';
import { MODE_LABELS } from '../labels';
import { navigate } from '../router';
import type { Screen } from '../router';

export const gameScreen: Screen = (root) => {
  const game = getData().activeGame;
  const state = getGameState();
  if (!game || !state) {
    navigate('/');
    return;
  }

  const { mode, x01 } = game.config;
  const title =
    mode === 'x01' && x01 ? `X01 ${x01.start}${x01.doubleOut ? ', Double-Out' : ''}` : MODE_LABELS[mode];

  const actions = el('div', { class: 'game-actions' });
  if (mode === 'free') {
    actions.append(
      el(
        'button',
        { onclick: () => confirm('Spiel beenden? Es gewinnt, wer die meisten Punkte hat.') && finishGame(freeLeader(state)) },
        'Spiel beenden',
      ),
    );
  }
  actions.append(
    el(
      'button',
      {
        class: 'danger',
        onclick: () => {
          if (confirm('Spiel abbrechen? Der Spielstand geht verloren.')) {
            abortGame();
            navigate('/');
          }
        },
      },
      'Spiel abbrechen',
    ),
  );

  const turnStatus = el('p', { class: 'sr-only' }, `${game.playerNames[state.currentPlayerId]} ist dran.`);
  turnStatus.setAttribute('aria-live', 'polite');

  root.classList.add('game-screen');
  root.append(
    el('div', { class: 'game-head' }, el('h1', { class: 'game-title' }, title), el('span', { class: 'round' }, `Runde ${state.round}`)),
    turnStatus,
  );
  renderScoreboard(root, game, state);
  root.append(actions, createKeypad(throwDart, undoDart));
};
