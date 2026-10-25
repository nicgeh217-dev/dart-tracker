import type { Game } from '../../game/types';
import { getData } from '../../store/store';
import { renderSummary } from '../components/summary';
import { el, formatDate } from '../dom';
import { MODE_LABELS } from '../labels';
import { navigate } from '../router';
import type { Screen } from '../router';

function gameTitle(game: Game): string {
  const { mode, x01 } = game.config;
  return mode === 'x01' && x01 ? `X01 ${x01.start}${x01.doubleOut ? ', Double-Out' : ''}` : MODE_LABELS[mode];
}

function playerList(game: Game): string {
  return game.config.playerIds.map((id) => game.playerNames[id]).join(', ');
}

function winnerLine(game: Game): string {
  return game.winnerId ? `Sieger: ${game.playerNames[game.winnerId]}` : 'Kein Sieger';
}

function detail(root: HTMLElement, id: string): void {
  const game = getData().history.find((g) => g.id === id);
  if (!game) {
    navigate('/history');
    return;
  }
  root.append(
    el('div', { class: 'screen-head' }, el('button', { class: 'back', onclick: () => navigate('/history') }, 'Zurück'), el('h1', {}, gameTitle(game))),
    el('p', { class: 'meta' }, formatDate(game.finishedAt ?? game.startedAt)),
    el('p', { class: 'detail-line' }, playerList(game)),
    el('p', { class: 'detail-line' }, winnerLine(game)),
    renderSummary(game),
  );
}

export const historyScreen: Screen = (root, params) => {
  if (params[0]) {
    detail(root, params[0]);
    return;
  }

  const { history } = getData();
  root.append(
    el('div', { class: 'screen-head' }, el('button', { class: 'back', onclick: () => navigate('/') }, 'Zurück'), el('h1', {}, 'Verlauf')),
  );

  if (history.length === 0) {
    root.append(el('p', { class: 'hint' }, 'Noch keine Spiele. Starte ein Spiel, dann erscheint es hier.'));
    return;
  }

  root.append(
    el(
      'ul',
      { class: 'list' },
      ...history.map((game) =>
        el(
          'li',
          {},
          el(
            'button',
            { class: 'history-item', onclick: () => navigate(`/history/${game.id}`) },
            el('strong', {}, gameTitle(game)),
            el('span', { class: 'meta' }, formatDate(game.finishedAt ?? game.startedAt)),
            el('span', {}, playerList(game)),
            el('span', { class: 'meta' }, winnerLine(game)),
          ),
        ),
      ),
    ),
  );
};
