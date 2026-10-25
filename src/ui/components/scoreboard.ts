import { CRICKET_FIELDS } from '../../game/cricket';
import type { Game, GameState, PlayerState } from '../../game/types';
import { DARTS_PER_TURN } from '../../game/turns';
import { el } from '../dom';
import { formatDart } from '../labels';

const MARK_GLYPHS = ['', '/', '✕', '⊗'];
/** zuletzt angezeigter Stand je Spieler, damit nur geänderte Ziffern den Kreide-Wisch spielen */
const lastShown = new Map<string, number>();

function marksRow(p: PlayerState): HTMLElement {
  const fieldName = (f: number) => (f === 25 ? 'Bull' : String(f));
  return el(
    'div',
    { class: 'marks' },
    ...CRICKET_FIELDS.map((f) => {
      const n = p.marks[f] ?? 0;
      const cell = el(
        'span',
        { class: `mark m${n}`, role: 'img' },
        el('span', { class: 'mark-field' }, f === 25 ? 'B' : String(f)),
        el('span', { class: 'mark-glyph' }, MARK_GLYPHS[n]),
      );
      cell.setAttribute('aria-label', `${fieldName(f)}: ${n} von 3 Treffern`);
      return cell;
    }),
  );
}

function turnRow(state: GameState): HTMLElement {
  const chips = Array.from({ length: DARTS_PER_TURN }, (_, i) => {
    const d = state.turnDarts[i];
    return el('span', { class: d ? 'chip' : 'chip empty' }, d ? formatDart(d) : '');
  });
  return el('div', { class: 'turn' }, el('span', { class: 'meta' }, `Runde ${state.round}`), ...chips);
}

export function renderScoreboard(root: HTMLElement, game: Game, state: GameState): void {
  const board = el('section', { class: 'scoreboard' });
  board.setAttribute('aria-label', 'Spielstand');

  const last = game.darts[game.darts.length - 1];
  if (state.bust && last) {
    board.append(
      el('p', { class: 'error', role: 'alert' }, `Bust. Die Runde von ${game.playerNames[last.playerId]} zählt nicht.`),
    );
  }

  for (const p of state.players) {
    const active = p.playerId === state.currentPlayerId;
    const key = `${game.id}:${p.playerId}`;
    const previous = lastShown.get(key);
    lastShown.set(key, p.score);
    const changed = previous !== undefined && previous !== p.score;

    const row = el(
      'div',
      { class: active ? 'player active' : 'player' },
      el(
        'div',
        { class: 'player-head' },
        el('span', { class: 'name' }, game.playerNames[p.playerId]),
        el('span', { class: changed ? 'num score wipe' : 'num score' }, String(p.score)),
      ),
    );
    if (active) row.setAttribute('aria-current', 'true');
    if (game.config.mode === 'cricket') row.append(marksRow(p));
    if (active) row.append(turnRow(state));
    board.append(row);
  }

  root.append(board);
}
