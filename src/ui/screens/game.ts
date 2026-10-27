import { describeThrow } from '../../game/events';
import { freeLeader } from '../../game/free';
import { getMode } from '../../game/modes';
import { sideName, sidesOf } from '../../game/sides';
import { abortGame, finishGame, getData, getGameState, throwDart, undoDart } from '../../store/store';
import { createKeypad } from '../components/keypad';
import { renderScoreboard } from '../components/scoreboard';
import { consumeDraw, showDrawOverlay } from '../draw';
import { playEffects, takeOrigin } from '../fx';
import { el } from '../dom';
import { MODE_LABELS } from '../labels';
import { navigate } from '../router';
import type { Screen } from '../router';

/** zuletzt gezeigte Dart-Anzahl und Seite je Spiel: Effekte laufen nur, wenn genau ein Dart dazukam */
const lastCount = new Map<string, number>();
const lastSide = new Map<string, string>();

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
  const previousCount = lastCount.get(game.id);
  const previousSide = lastSide.get(game.id);
  const added = previousCount !== undefined && game.darts.length === previousCount + 1;
  lastCount.set(game.id, game.darts.length);
  lastSide.set(game.id, state.currentSideId);
  const slide = added && previousSide !== undefined && previousSide !== state.currentSideId;
  renderScoreboard(root, game, state, { animate: added, slide });
  root.append(actions, createKeypad(throwDart, undoDart));

  const origin = takeOrigin();
  if (added) {
    const lastDart = game.darts[game.darts.length - 1];
    const before = getMode(mode).computeState(game.config, game.darts.slice(0, -1));
    playEffects(describeThrow(game.config, before, lastDart, state), { mode, ring: root.querySelector('.ring'), origin });
  }

  if (game.darts.length === 0 && consumeDraw()) {
    const names = sidesOf(game.config).map((s) => sideName(game, s.id));
    showDrawOverlay(names, game.config.teams ? 'beginnen' : 'beginnt', () => {});
  }
};
