import { CRICKET_FIELDS } from '../../game/cricket';
import { getMode } from '../../game/modes';
import { sideName, sidesOf } from '../../game/sides';
import type { Game, PlayerState } from '../../game/types';
import { el, formatAverage } from '../dom';

function average(p: PlayerState): string {
  return p.turnsPlayed === 0 ? '–' : formatAverage(p.pointsScored / p.turnsPlayed);
}

function closedFields(marks: Record<number, number>): number {
  return CRICKET_FIELDS.filter((f) => (marks[f] ?? 0) >= 3).length;
}

const badge = () => el('span', { class: 'badge' }, 'Sieger');

/** Tabelle mit Rundenstatistik je Spieler (bei Teams je Team), passend zum Spielmodus. */
export function renderSummary(game: Game): HTMLElement {
  const state = getMode(game.config.mode).computeState(game.config, game.darts);
  const cricket = game.config.mode === 'cricket';
  const team = game.config.teams !== undefined;
  const headers = cricket
    ? [team ? 'Team' : 'Spieler', 'Geschlossen', 'Punkte']
    : ['Spieler', 'Runden', 'Punkte', 'Ø pro Runde'];

  const playerRow = (p: PlayerState, isWinner: boolean, indent = false): HTMLElement => {
    const name = el('th', { scope: 'row', class: indent ? 'member' : '' }, game.playerNames[p.playerId]);
    if (isWinner) name.append(badge());
    const cells = cricket
      ? [`${closedFields(p.marks)} von ${CRICKET_FIELDS.length}`, String(p.score)]
      : [String(p.turnsPlayed), String(p.pointsScored), average(p)];
    return el('tr', { class: isWinner ? 'winner-row' : '' }, name, ...cells.map((c) => el('td', { class: 'num' }, c)));
  };

  const rows: HTMLElement[] = [];
  if (team) {
    for (const side of sidesOf(game.config)) {
      const isWinner = game.winnerId === side.id;
      const title = el('th', { scope: 'row' }, sideName(game, side.id));
      if (isWinner) title.append(badge());
      if (cricket) {
        const s = state.sides.find((x) => x.sideId === side.id)!;
        rows.push(
          el(
            'tr',
            { class: isWinner ? 'winner-row' : '' },
            title,
            el('td', { class: 'num' }, `${closedFields(s.marks)} von ${CRICKET_FIELDS.length}`),
            el('td', { class: 'num' }, String(s.score)),
          ),
        );
      } else {
        title.colSpan = headers.length;
        rows.push(el('tr', { class: isWinner ? 'winner-row team-row' : 'team-row' }, title));
        for (const id of side.playerIds) {
          rows.push(playerRow(state.players.find((p) => p.playerId === id)!, false, true));
        }
      }
    }
  } else {
    for (const p of state.players) rows.push(playerRow(p, game.winnerId === p.playerId));
  }

  return el(
    'table',
    { class: 'summary' },
    el('thead', {}, el('tr', {}, ...headers.map((h) => el('th', { scope: 'col' }, h)))),
    el('tbody', {}, ...rows),
  );
}
