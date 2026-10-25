import type { ModeId } from '../../game/types';
import { getData, startGame } from '../../store/store';
import { el } from '../dom';
import { navigate } from '../router';
import type { Screen } from '../router';

const MODES: { id: ModeId; label: string }[] = [
  { id: 'x01', label: 'X01' },
  { id: 'cricket', label: 'Cricket' },
  { id: 'free', label: 'Frei' },
];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

function toggle(label: string, pressed: boolean, onclick: () => void): HTMLButtonElement {
  const button = el('button', { type: 'button', onclick }, label);
  button.setAttribute('aria-pressed', String(pressed));
  return button;
}

export const newGameScreen: Screen = (root) => {
  let mode: ModeId = 'x01';
  let start: 301 | 501 = 501;
  let doubleOut = false;
  let selected: string[] = [];

  const draw = () => {
    const { players } = getData();
    const ready = selected.length >= MIN_PLAYERS && selected.length <= MAX_PLAYERS;

    const modeGroup = el(
      'div',
      { class: 'seg', role: 'group' },
      ...MODES.map((m) => toggle(m.label, mode === m.id, () => { mode = m.id; draw(); })),
    );
    modeGroup.setAttribute('aria-label', 'Spielmodus');

    const x01Options =
      mode === 'x01'
        ? el(
            'div',
            { class: 'stack' },
            el(
              'div',
              { class: 'seg', role: 'group' },
              toggle('301', start === 301, () => { start = 301; draw(); }),
              toggle('501', start === 501, () => { start = 501; draw(); }),
            ),
            toggle(doubleOut ? 'Double-Out an' : 'Double-Out aus', doubleOut, () => { doubleOut = !doubleOut; draw(); }),
          )
        : '';

    const playerButtons = players.map((player) => {
      const position = selected.indexOf(player.id);
      const isSelected = position !== -1;
      const button = el(
        'button',
        {
          type: 'button',
          class: 'pick',
          disabled: !isSelected && selected.length >= MAX_PLAYERS,
          onclick: () => {
            selected = isSelected ? selected.filter((id) => id !== player.id) : [...selected, player.id];
            draw();
          },
        },
        el('span', { class: 'num order' }, isSelected ? String(position + 1) : ''),
        player.name,
      );
      button.setAttribute('aria-pressed', String(isSelected));
      return button;
    });

    root.replaceChildren(
      el('div', { class: 'screen-head' }, el('button', { class: 'back', onclick: () => navigate('/') }, 'Zurück'), el('h1', {}, 'Neues Spiel')),
      el('section', { class: 'stack group' }, el('h2', {}, 'Modus'), modeGroup, x01Options),
      el(
        'section',
        { class: 'stack group' },
        el('h2', {}, 'Spieler'),
        players.length === 0
          ? el('p', { class: 'hint' }, 'Noch keine Spieler. Lege zuerst Spieler an.')
          : el('p', { class: 'hint' }, 'Tippe die Spieler in der Reihenfolge an, in der sie werfen.'),
        ...playerButtons,
      ),
      el(
        'div',
        { class: 'stack group' },
        ready ? '' : el('p', { class: 'hint' }, 'Wähle 2 bis 8 Spieler.'),
        el(
          'button',
          {
            class: 'primary start',
            disabled: !ready,
            onclick: () => {
              startGame({
                mode,
                playerIds: selected,
                ...(mode === 'x01' ? { x01: { start, doubleOut } } : {}),
              });
              navigate('/game');
            },
          },
          'Spiel starten',
        ),
      ),
    );
  };

  draw();
};
