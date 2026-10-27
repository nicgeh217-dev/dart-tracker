import { buildTeamOrder } from '../../game/sides';
import type { ModeId } from '../../game/types';
import { getData, startGame } from '../../store/store';
import { armDraw } from '../draw';
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
const TEAM_PLAYERS = 4;

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
  let teams = false;
  let randomStart = false;

  const draw = () => {
    const { players } = getData();
    const maxPlayers = teams ? TEAM_PLAYERS : MAX_PLAYERS;
    const ready = teams
      ? selected.length === TEAM_PLAYERS
      : selected.length >= MIN_PLAYERS && selected.length <= MAX_PLAYERS;

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
          disabled: !isSelected && selected.length >= maxPlayers,
          onclick: () => {
            selected = isSelected ? selected.filter((id) => id !== player.id) : [...selected, player.id];
            draw();
          },
        },
        el('span', { class: 'num order' }, isSelected ? String(position + 1) : ''),
        el('span', { class: 'pick-name' }, player.name),
        teams && isSelected ? el('span', { class: 'meta team-tag' }, position < 2 ? 'Team 1' : 'Team 2') : '',
      );
      button.setAttribute('aria-pressed', String(isSelected));
      return button;
    });

    const teamToggle = toggle('Teams (2 gegen 2)', teams, () => {
      teams = !teams;
      if (teams) selected = selected.slice(0, TEAM_PLAYERS);
      draw();
    });
    const randomToggle = toggle('Zufälliger Start', teams || randomStart, () => { randomStart = !randomStart; draw(); });
    randomToggle.disabled = teams;

    root.replaceChildren(
      el('div', { class: 'screen-head' }, el('button', { class: 'back', onclick: () => navigate('/') }, 'Zurück'), el('h1', {}, 'Neues Spiel')),
      el('section', { class: 'stack group' }, el('h2', {}, 'Modus'), modeGroup, x01Options),
      el('section', { class: 'stack group' }, el('h2', {}, 'Optionen'), teamToggle, randomToggle),
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
        ready ? '' : el('p', { class: 'hint' }, teams ? 'Wähle 4 Spieler für 2 gegen 2.' : 'Wähle 2 bis 8 Spieler.'),
        el(
          'button',
          {
            class: 'primary start',
            disabled: !ready,
            onclick: () => {
              const pairs: [string[], string[]] = [selected.slice(0, 2), selected.slice(2, 4)];
              const draws = teams || randomStart;
              startGame(
                {
                  mode,
                  playerIds: teams ? buildTeamOrder(pairs) : selected,
                  ...(teams ? { teams: pairs } : {}),
                  ...(mode === 'x01' ? { x01: { start, doubleOut } } : {}),
                },
                { randomStart: draws },
              );
              if (draws) armDraw();
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
