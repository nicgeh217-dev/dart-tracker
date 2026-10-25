import type { Field, Multiplier } from '../../game/types';
import { isValidDart } from '../../game/types';
import { el } from '../dom';

const MULTIPLIERS: { label: string; value: Multiplier; key: string }[] = [
  { label: 'Single', value: 1, key: 'single' },
  { label: 'Double', value: 2, key: 'double' },
  { label: 'Triple', value: 3, key: 'triple' },
];

const HAPTIC_MS = 8;

export function createKeypad(
  onDart: (field: Field, multiplier: Multiplier) => void,
  onUndo: () => void,
): HTMLElement {
  let multiplier: Multiplier = 1;
  const root = el('div', { class: 'keypad' });
  const fieldButtons: { button: HTMLButtonElement; field: Field }[] = [];

  const multiplierButtons = MULTIPLIERS.map((m) =>
    el('button', { type: 'button', onclick: () => { multiplier = m.value; update(); } }, m.label),
  );
  const switcher = el('div', { class: 'seg multiplier', role: 'group' }, ...multiplierButtons);
  switcher.setAttribute('aria-label', 'Multiplikator');

  const fieldButton = (label: string, field: Field, extraClass = ''): HTMLButtonElement => {
    const button = el('button', { type: 'button', class: `field ${extraClass}`.trim(), onclick: () => press(field) }, label);
    fieldButtons.push({ button, field });
    return button;
  };

  const numbers = el('div', { class: 'numbers' });
  for (let n = 1; n <= 20; n++) numbers.append(fieldButton(String(n), n as Field));

  const special = el(
    'div',
    { class: 'special' },
    fieldButton('Bull', 25, 'wide'),
    fieldButton('Miss', 0, 'wide'),
    el('button', { type: 'button', class: 'undo', onclick: onUndo }, 'Rückgängig'),
  );

  root.append(switcher, numbers, special);

  function update() {
    const index = MULTIPLIERS.findIndex((m) => m.value === multiplier);
    root.dataset.multiplier = MULTIPLIERS[index].key;
    switcher.style.setProperty('--i', String(index));
    multiplierButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    for (const { button, field } of fieldButtons) button.disabled = !isValidDart(field, multiplier);
  }

  function press(field: Field) {
    const used = multiplier;
    multiplier = 1;
    update();
    navigator.vibrate?.(HAPTIC_MS);
    onDart(field, used);
  }

  update();
  return root;
}
