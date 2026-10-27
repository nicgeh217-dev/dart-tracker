import { motionAllowed } from './fx';

/** Ob beim nächsten Rendern des Spielscreens die Auslosung „Wer beginnt?“ gezeigt wird. Nur im Speicher, nie gespeichert. */
let armed = false;

export function armDraw(): void {
  armed = true;
}

/** Liefert das Flag einmalig und setzt es zurück. */
export function consumeDraw(): boolean {
  const was = armed;
  armed = false;
  return was;
}

const STEPS = 16;
const FIRST_DELAY = 50;
const LAST_DELAY = 170;
const HIGHLIGHT_MS = 700;
const REDUCED_MS = 1200;

/** Reihenfolge der Namen, die das Glücksrad zeigt. Endet beim Gewinner, nie derselbe Index zweimal hintereinander. */
export function drawSequence(count: number, winnerIndex: number, steps = STEPS): number[] {
  const seq = new Array<number>(steps);
  seq[steps - 1] = winnerIndex;
  for (let i = steps - 2; i >= 0; i--) seq[i] = (seq[i + 1] - 1 + count) % count;
  return seq;
}

/** Vollbild-Overlay „Wer beginnt?“. `names[0]` ist immer der Gewinner der Auslosung. */
export function showDrawOverlay(names: string[], verb: 'beginnt' | 'beginnen', onDone: () => void): HTMLElement {
  const title = document.createElement('p');
  title.className = 'draw-title';
  title.textContent = 'Wer beginnt?';
  const name = document.createElement('p');
  name.className = 'draw-name';
  const overlay = document.createElement('div');
  overlay.className = 'draw-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Wer beginnt?');
  overlay.append(title, name);
  document.body.append(overlay);

  const timers: number[] = [];
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    overlay.remove();
    onDone();
  };
  const showWinner = (holdMs: number) => {
    title.textContent = '';
    name.textContent = `${names[0]} ${verb}`;
    overlay.classList.add('won');
    timers.push(window.setTimeout(finish, holdMs));
  };
  overlay.addEventListener('click', finish);

  if (!motionAllowed() || names.length < 2) {
    showWinner(REDUCED_MS);
    return overlay;
  }

  const seq = drawSequence(names.length, 0);
  let elapsed = 0;
  seq.forEach((index, k) => {
    elapsed += FIRST_DELAY + ((LAST_DELAY - FIRST_DELAY) * k) / (seq.length - 1);
    const last = k === seq.length - 1;
    timers.push(
      window.setTimeout(() => {
        if (last) showWinner(HIGHLIGHT_MS);
        else name.textContent = names[index];
      }, elapsed),
    );
  });
  return overlay;
}
