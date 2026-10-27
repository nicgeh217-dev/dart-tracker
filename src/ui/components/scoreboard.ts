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
/** zuletzt angezeigte Marks je Spiel, Seite und Feld, damit neu geschlossene Felder eingestempelt werden */
const lastMarks = new Map<string, number>();

/** Ziel der Effekte: der Ring des Werfers, oder seine Mini-Karte, wenn seine Aufnahme den Wurf beendet hat. */
export function effectTarget(root: ParentNode, throwerSideId: string, currentSideId: string): Element | null {
  if (throwerSideId === currentSideId) return root.querySelector('.ring');
  return Array.from(root.querySelectorAll('.mini')).find((m) => (m as HTMLElement).dataset.side === throwerSideId) ?? null;
}

export interface BoardOptions {
  /** genau ein Dart kam dazu */
  animate?: boolean;
  /** die Seite am Wurf hat gewechselt */
  slide?: boolean;
}

function marksRow(gameId: string, p: SideState, compact: boolean, animate: boolean): HTMLElement {
  const fieldName = (f: number) => (f === 25 ? 'Bull' : String(f));
  return el(
    'div',
    { class: compact ? 'marks compact' : 'marks' },
    ...CRICKET_FIELDS.map((f) => {
      const n = p.marks[f] ?? 0;
      const key = `${gameId}:${p.sideId}:${f}`;
      const previous = lastMarks.get(key);
      lastMarks.set(key, n);
      const stamp = animate && previous !== undefined && n > previous;
      const cell = el(
        'span',
        { class: `mark m${n}`, role: 'img' },
        el('span', { class: 'mark-field' }, f === 25 ? 'B' : String(f)),
        el('span', { class: stamp ? 'mark-glyph stamp' : 'mark-glyph' }, MARK_GLYPHS[n]),
      );
      cell.setAttribute('aria-label', `${fieldName(f)}: ${n} von 3 Treffern`);
      return cell;
    }),
  );
}

function turnRow(state: GameState, animate: boolean): HTMLElement {
  const chips = Array.from({ length: DARTS_PER_TURN }, (_, i) => {
    const d = state.turnDarts[i];
    const popped = animate && i === state.turnDarts.length - 1;
    return el('span', { class: d ? (popped ? 'chip pop' : 'chip') : 'chip empty' }, d ? formatDart(d) : '');
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

export function renderScoreboard(root: HTMLElement, game: Game, state: GameState, options: BoardOptions = {}): void {
  const animate = options.animate ?? false;
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
    card.dataset.side = p.sideId;
    if (cricket) card.append(marksRow(game.id, p, true, animate));
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
    { class: options.slide ? 'active-card slide-in' : 'active-card' },
    el('span', { class: 'active-name' }, sideName(game, active.sideId)),
    team ? el('span', { class: 'meta thrower' }, `${game.playerNames[state.currentPlayerId]} wirft`) : '',
    ring,
  );
  card.setAttribute('aria-label', 'Aktueller Spieler');
  card.setAttribute('aria-current', 'true');
  if (cricket) card.append(marksRow(game.id, active, false, animate));
  card.append(turnRow(state, animate));
  root.append(card);
}
