import { CRICKET_FIELDS } from '../../game/cricket';
import { playerProgress } from '../../game/progress';
import { sideName } from '../../game/sides';
import { DARTS_PER_TURN } from '../../game/turns';
import type { Game, GameState, SideState } from '../../game/types';
import { el } from '../dom';
import { formatDart } from '../labels';
import { createRing } from './ring';

const MARK_GLYPHS = ['', '/', '✕', '⊗'];
/** zuletzt angezeigter Stand je Spieler, damit nur geänderte Ziffern einrollen */
const lastShown = new Map<string, number>();

function marksRow(p: SideState, compact = false): HTMLElement {
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
function scoreElement(game: Game, p: SideState, extraClass = ''): HTMLElement {
  const key = `${game.id}:${p.sideId}`;
  const previous = lastShown.get(key);
  lastShown.set(key, p.score);
  const classes = ['num', 'score', extraClass];
  if (previous !== undefined && previous !== p.score) classes.push('roll');
  return el('span', { class: classes.filter(Boolean).join(' ') }, String(p.score));
}

export function renderScoreboard(root: HTMLElement, game: Game, state: GameState): void {
  const { sides, currentSideId } = state;
  const activeIndex = sides.findIndex((s) => s.sideId === currentSideId);
  const active = sides[activeIndex];
  // wer als Nächstes dran ist, steht vorn
  const others = [...sides.slice(activeIndex + 1), ...sides.slice(0, activeIndex)];
  const cricket = game.config.mode === 'cricket';
  const team = game.config.teams !== undefined;

  const strip = el('div', { class: 'strip', role: 'list' });
  strip.setAttribute('aria-label', 'Weitere Spieler');
  for (const p of others) {
    const card = el(
      'div',
      { class: 'mini', role: 'listitem' },
      el('span', { class: 'name' }, sideName(game, p.sideId)),
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
  const progress = playerProgress(game.config, state, active.sideId);
  const ring = el(
    'div',
    { class: 'ring' },
    createRing(`${game.id}:${active.sideId}`, progress),
    score,
  );
  const card = el(
    'section',
    { class: 'active-card' },
    el('span', { class: 'active-name' }, sideName(game, active.sideId)),
    team ? el('span', { class: 'meta thrower' }, `${game.playerNames[state.currentPlayerId]} wirft`) : '',
    ring,
  );
  card.setAttribute('aria-label', 'Aktueller Spieler');
  card.setAttribute('aria-current', 'true');
  if (cricket) card.append(marksRow(active));
  card.append(turnRow(state));
  root.append(card);
}
