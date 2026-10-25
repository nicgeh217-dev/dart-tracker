import { CRICKET_FIELDS } from '../../game/cricket';
import { playerProgress } from '../../game/progress';
import { DARTS_PER_TURN } from '../../game/turns';
import type { Game, GameState, PlayerState } from '../../game/types';
import { el } from '../dom';
import { formatDart } from '../labels';
import { createRing } from './ring';

const MARK_GLYPHS = ['', '/', '✕', '⊗'];
/** zuletzt angezeigter Stand je Spieler, damit nur geänderte Ziffern einrollen */
const lastShown = new Map<string, number>();

function marksRow(p: PlayerState, compact = false): HTMLElement {
  const fieldName = (f: number) => (f === 25 ? 'Bull' : String(f));
  return el(
    'div',
    { class: compact ? 'marks compact' : 'marks' },
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
  return el('div', { class: 'turn' }, ...chips);
}

/** Setzt die Klasse „roll“, wenn sich der Stand seit der letzten Anzeige geändert hat. */
function scoreElement(game: Game, p: PlayerState, extraClass = ''): HTMLElement {
  const key = `${game.id}:${p.playerId}`;
  const previous = lastShown.get(key);
  lastShown.set(key, p.score);
  const classes = ['num', 'score', extraClass];
  if (previous !== undefined && previous !== p.score) classes.push('roll');
  return el('span', { class: classes.filter(Boolean).join(' ') }, String(p.score));
}

export function renderScoreboard(root: HTMLElement, game: Game, state: GameState): void {
  const { players, currentPlayerId } = state;
  const activeIndex = players.findIndex((p) => p.playerId === currentPlayerId);
  const active = players[activeIndex];
  // wer als Nächstes dran ist, steht vorn
  const others = [...players.slice(activeIndex + 1), ...players.slice(0, activeIndex)];
  const cricket = game.config.mode === 'cricket';

  const strip = el('div', { class: 'strip', role: 'list' });
  strip.setAttribute('aria-label', 'Weitere Spieler');
  for (const p of others) {
    const card = el(
      'div',
      { class: 'mini', role: 'listitem' },
      el('span', { class: 'name' }, game.playerNames[p.playerId]),
      scoreElement(game, p),
    );
    if (cricket) card.append(marksRow(p, true));
    strip.append(card);
  }
  if (others.length > 0) root.append(strip);

  const last = game.darts[game.darts.length - 1];
  if (state.bust && last) {
    root.append(
      el('p', { class: 'error', role: 'alert' }, `Bust. Die Runde von ${game.playerNames[last.playerId]} zählt nicht.`),
    );
  }

  const score = scoreElement(game, active, String(active.score).length >= 4 ? 'long' : '');
  const progress = playerProgress(game.config, state, active.playerId);
  const ring = el(
    'div',
    { class: 'ring' },
    createRing(`${game.id}:${active.playerId}`, progress),
    score,
  );
  const card = el(
    'section',
    { class: 'active-card' },
    el('span', { class: 'active-name' }, game.playerNames[active.playerId]),
    ring,
  );
  card.setAttribute('aria-label', 'Aktueller Spieler');
  card.setAttribute('aria-current', 'true');
  if (cricket) card.append(marksRow(active));
  card.append(turnRow(state));
  root.append(card);
}
