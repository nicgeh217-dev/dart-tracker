import { playerStats } from '../../game/stats';
import { addPlayer, getData, removePlayer, renamePlayer } from '../../store/store';
import type { Player } from '../../store/store';
import { el, formatAverage, plural } from '../dom';
import { navigate } from '../router';
import type { Screen } from '../router';

const MAX_NAME_LENGTH = 20;

export const playersScreen: Screen = (root) => {
  let editingId: string | null = null;
  let addError = '';
  let pendingName = '';
  let editValue = '';
  let rowError: { id: string; message: string } | null = null;

  const statsText = (player: Player): string => {
    const s = playerStats(player.id, getData().history);
    return `${plural(s.games, 'Spiel', 'Spiele')}, ${plural(s.wins, 'Sieg', 'Siege')}, Ø ${formatAverage(s.avgPerRound)} pro Runde`;
  };

  const row = (player: Player): HTMLElement => {
    if (editingId === player.id) {
      const input = el('input', {
        type: 'text',
        value: editValue,
        maxLength: MAX_NAME_LENGTH,
        autocomplete: 'off',
        oninput: () => { editValue = input.value; },
      });
      input.setAttribute('aria-label', `Neuer Name für ${player.name}`);
      const save = () => {
        const result = renamePlayer(player.id, input.value);
        if (result.ok) return; // der Store löst das Neuzeichnen aus
        rowError = { id: player.id, message: result.error };
        draw();
      };
      const form = el(
        'form',
        { class: 'inline-form', onsubmit: (e: Event) => { e.preventDefault(); save(); } },
        input,
        el('button', { type: 'submit', class: 'primary' }, 'Speichern'),
        el('button', { type: 'button', onclick: () => { editingId = null; rowError = null; draw(); } }, 'Abbrechen'),
      );
      queueMicrotask(() => input.focus());
      return el('li', { class: 'row editing' }, form, errorLine(player.id));
    }
    return el(
      'li',
      { class: 'row' },
      el(
        'div',
        { class: 'who' },
        el('strong', {}, player.name),
        el('span', { class: 'meta' }, statsText(player)),
      ),
      el(
        'div',
        { class: 'actions' },
        el('button', { onclick: () => { editingId = player.id; editValue = player.name; rowError = null; draw(); } }, 'Umbenennen'),
        el(
          'button',
          {
            class: 'danger',
            onclick: () => {
              if (!confirm(`„${player.name}“ löschen? Der Verlauf bleibt erhalten.`)) return;
              const result = removePlayer(player.id);
              if (!result.ok) {
                rowError = { id: player.id, message: result.error };
                draw();
              }
            },
          },
          'Löschen',
        ),
      ),
      errorLine(player.id),
    );
  };

  const errorLine = (id: string): Node =>
    rowError?.id === id ? el('p', { class: 'error', role: 'alert' }, rowError.message) : document.createTextNode('');

  const draw = () => {
    const { players } = getData();
    const input = el('input', {
      type: 'text',
      value: pendingName,
      placeholder: 'Name',
      maxLength: MAX_NAME_LENGTH,
      autocomplete: 'off',
      oninput: () => { pendingName = input.value; },
    });
    input.setAttribute('aria-label', 'Name des neuen Spielers');
    const form = el(
      'form',
      {
        class: 'inline-form',
        onsubmit: (e: Event) => {
          e.preventDefault();
          const result = addPlayer(input.value);
          if (result.ok) return;
          addError = result.error;
          draw();
        },
      },
      input,
      el('button', { type: 'submit', class: 'primary' }, 'Spieler hinzufügen'),
    );

    const empty =
      players.length === 0
        ? el('p', { class: 'hint' }, 'Noch keine Spieler. Lege den ersten an, um ein Spiel zu starten.')
        : players.length === 1
          ? el('p', { class: 'hint' }, 'Für ein Spiel brauchst du mindestens zwei Spieler.')
          : '';

    root.replaceChildren(
      el('div', { class: 'screen-head' }, el('button', { class: 'back', onclick: () => navigate('/') }, 'Zurück'), el('h1', {}, 'Spieler')),
      form,
      addError ? el('p', { class: 'error', role: 'alert' }, addError) : '',
      empty,
      el('ul', { class: 'list' }, ...players.map(row)),
    );
  };

  draw();
};
