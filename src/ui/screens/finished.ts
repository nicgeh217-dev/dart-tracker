import { sideName } from '../../game/sides';
import { rematchConfig } from '../../game/start';
import { closeGame, getData, startGame, undoDart } from '../../store/store';
import { playEffects } from '../fx';
import { renderSummary } from '../components/summary';
import { el } from '../dom';
import { MODE_LABELS } from '../labels';
import { navigate } from '../router';
import type { Screen } from '../router';

/** Spiele, deren Sieg schon gefeiert wurde (Spiel-ID und Endzeit) */
const celebrated = new Set<string>();
const CELEBRATE_WITHIN_MS = 5000;

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

  // nur direkt nach dem Gewinn-Dart feiern, nicht nach Neuladen oder erneutem Öffnen
  const key = `${game.id}:${game.finishedAt}`;
  if (winner && !celebrated.has(key) && Date.now() - game.finishedAt < CELEBRATE_WITHIN_MS) {
    celebrated.add(key);
    playEffects([{ kind: 'win' }], { mode: game.config.mode, ring: null, origin: null });
  }

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
