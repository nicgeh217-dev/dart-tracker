import type { Field, Multiplier } from '../../game/types';
import { isValidDart } from '../../game/types';
import { el } from '../dom';

const MULTIPLIERS: { label: string; value: Multiplier; key: string }[] = [
  { label: 'Single', value: 1, key: 'single' },
  { label: 'Double', value: 2, key: 'double' },
  { label: 'Triple', value: 3, key: 'triple' },
];

export function createKeypad(
  onDart: (field: Field, multiplier: Multiplier) => void,
  onUndo: () => void,
): HTMLElement {
  let multiplier: Multiplier = 1;
  const root = el('div', { class: 'keypad' });

  const press = (field: Field) => {
    const used = multiplier;
    multiplier = 1;
    draw();
    onDart(field, used);
  };

  const fieldButton = (label: string, field: Field, extraClass = ''): HTMLButtonElement =>
    el(
      'button',
      {
        type: 'button',
        class: `field ${extraClass}`.trim(),
        disabled: !isValidDart(field, multiplier),
        onclick: () => press(field),
      },
      label,
    );

  function draw() {
    root.dataset.multiplier = MULTIPLIERS.find((m) => m.value === multiplier)!.key;
    const switcher = el('div', { class: 'seg multiplier', role: 'group' });
    switcher.setAttribute('aria-label', 'Multiplikator');
    for (const m of MULTIPLIERS) {
      const button = el(
        'button',
        { type: 'button', onclick: () => { multiplier = m.value; draw(); } },
        m.label,
      );
      button.setAttribute('aria-pressed', String(multiplier === m.value));
      switcher.append(button);
    }

    const numbers = el('div', { class: 'numbers' });
    for (let n = 1; n <= 20; n++) numbers.append(fieldButton(String(n), n as Field));

    const special = el(
      'div',
      { class: 'special' },
      fieldButton('Bull', 25, 'wide'),
      fieldButton('Miss', 0, 'wide'),
      el('button', { type: 'button', class: 'undo', onclick: onUndo }, 'Rückgängig'),
    );

    root.replaceChildren(switcher, numbers, special);
  }

  draw();
  return root;
}
