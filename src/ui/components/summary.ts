import { CRICKET_FIELDS } from '../../game/cricket';
import { getMode } from '../../game/modes';
import type { Game, PlayerState } from '../../game/types';
import { el, formatAverage } from '../dom';

function average(p: PlayerState): string {
  return p.turnsPlayed === 0 ? '–' : formatAverage(p.pointsScored / p.turnsPlayed);
}

function closedFields(p: PlayerState): number {
  return CRICKET_FIELDS.filter((f) => (p.marks[f] ?? 0) >= 3).length;
}

/** Tabelle mit Rundenstatistik je Spieler, passend zum Spielmodus. */
export function renderSummary(game: Game): HTMLElement {
  const state = getMode(game.config.mode).computeState(game.config, game.darts);
  const cricket = game.config.mode === 'cricket';
  const headers = cricket ? ['Spieler', 'Geschlossen', 'Punkte'] : ['Spieler', 'Runden', 'Punkte', 'Ø pro Runde'];

  const rows = state.players.map((p) => {
    const isWinner = game.winnerId === p.playerId;
    const name = el('th', { scope: 'row' }, game.playerNames[p.playerId]);
    if (isWinner) name.append(el('span', { class: 'badge' }, 'Sieger'));
    const cells = cricket
      ? [`${closedFields(p)} von ${CRICKET_FIELDS.length}`, String(p.score)]
      : [String(p.turnsPlayed), String(p.pointsScored), average(p)];
    return el(
      'tr',
      { class: isWinner ? 'winner-row' : '' },
      name,
      ...cells.map((c) => el('td', { class: 'num' }, c)),
    );
  });

  return el(
    'table',
    { class: 'summary' },
    el('thead', {}, el('tr', {}, ...headers.map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, ...rows),
  );
}
