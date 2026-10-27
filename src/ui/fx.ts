import type { ThrowEvent } from '../game/events';
import type { ModeId } from '../game/types';

const FLY_MS = 550;
const BANNER_MS = 900;
const CONFETTI_MS = 1600;
const RING_CLASS_MS = 450;
const CONFETTI_COLORS = ['#E0453A', '#34A268', '#EDE6D3'];
const RING_CLASSES = ['shake', 'flash-bad', 'glow-green', 'glow-red', 'glow-cream'];

export function motionAllowed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let origin: DOMRect | null = null;

/** Merkt, wo die zuletzt gedrückte Taste liegt, damit die Punkte von dort losfliegen. */
export function rememberOrigin(element: Element): void {
  origin = element.getBoundingClientRect();
}

export function takeOrigin(): DOMRect | null {
  const rect = origin;
  origin = null;
  return rect;
}

export function haptic(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* nicht unterstützt */
  }
}

function layer(): HTMLElement {
  let node = document.querySelector<HTMLElement>('.fx-layer');
  if (!node) {
    node = document.createElement('div');
    node.className = 'fx-layer';
    node.setAttribute('aria-hidden', 'true');
    document.body.append(node);
  }
  return node;
}

export function clearFx(): void {
  document.querySelector('.fx-layer')?.replaceChildren();
}

const center = (r: DOMRect | null): { x: number; y: number } =>
  r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

export function flyText(text: string, from: DOMRect | null, to: Element, tone: 'default' | 'bad' = 'default'): void {
  const start = center(from);
  const end = center(to.getBoundingClientRect());
  const node = document.createElement('span');
  node.className = tone === 'bad' ? 'fx-float bad' : 'fx-float';
  node.textContent = text;
  node.style.left = `${start.x}px`;
  node.style.top = `${start.y}px`;
  layer().append(node);
  const remove = () => node.remove();
  if (typeof node.animate === 'function') {
    const animation = node.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${end.x - start.x}px), calc(-50% + ${end.y - start.y}px)) scale(0.8)`, opacity: 0 },
      ],
      { duration: FLY_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' },
    );
    animation.onfinish = remove;
  }
  setTimeout(remove, FLY_MS + 50);
}

export function banner(text: string): void {
  const node = document.createElement('div');
  node.className = 'fx-banner';
  node.textContent = text;
  layer().append(node);
  setTimeout(() => node.remove(), BANNER_MS);
}

export function confetti(): void {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-confetti';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  layer().append(canvas);
  setTimeout(() => canvas.remove(), CONFETTI_MS);
  const g = canvas.getContext('2d');
  if (!g || typeof requestAnimationFrame !== 'function') return;

  const pieces = Array.from({ length: 60 }, (_, i) => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 80,
    y: canvas.height * 0.4,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 12 - 4,
    size: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));
  const started = performance.now();
  const frame = (now: number) => {
    const t = now - started;
    if (t > CONFETTI_MS || !canvas.isConnected) return;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.globalAlpha = Math.min(1, (CONFETTI_MS - t) / 400);
    for (const p of pieces) {
      p.vy += 0.35;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += 0.12;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.color;
      g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      g.restore();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function ringClass(ring: Element | null, ...names: string[]): void {
  if (!ring) return;
  ring.classList.remove(...RING_CLASSES);
  void (ring as HTMLElement).offsetWidth; // Animation neu starten
  ring.classList.add(...names);
  setTimeout(() => ring.classList.remove(...names), RING_CLASS_MS);
}

export interface EffectContext {
  mode: ModeId;
  ring: Element | null;
  origin: DOMRect | null;
}

function hapticFor(events: ThrowEvent[]): void {
  const has = (k: ThrowEvent['kind']) => events.some((e) => e.kind === k);
  if (has('win') || has('oneEighty')) haptic([20, 40, 20]);
  else if (has('bust')) haptic(40);
  else if (has('triple')) haptic(15);
}

/** Spielt die Effekte eines Darts ab. Räumt vorher die Effekte des letzten Darts weg. */
export function playEffects(events: ThrowEvent[], ctx: EffectContext): void {
  clearFx();
  hapticFor(events);
  if (!motionAllowed()) return;

  const has = (k: ThrowEvent['kind']) => events.some((e) => e.kind === k);
  const { ring, origin: from } = ctx;
  for (const e of events) {
    if (e.kind === 'points' && ring) flyText(`+${e.value}`, from, ring);
    else if (e.kind === 'bust') {
      if (ring) flyText('Bust', from, ring, 'bad');
      ringClass(ring, 'shake', 'flash-bad');
    } else if (e.kind === 'triple') ringClass(ring, 'glow-green');
    else if (e.kind === 'double') ringClass(ring, 'glow-red');
    else if (e.kind === 'bull') ringClass(ring, 'glow-cream');
  }
  if (has('win')) {
    banner(ctx.mode === 'x01' ? 'Checkout!' : 'Sieg!');
    confetti();
  } else if (has('oneEighty')) {
    banner('180!');
    confetti();
  }
}
