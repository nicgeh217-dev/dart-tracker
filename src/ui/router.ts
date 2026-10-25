import { subscribe } from '../store/store';

export type Screen = (root: HTMLElement, params: string[]) => void;
type Guard = (path: string) => string | null;

let routes: Record<string, Screen> = {};
let guard: Guard = () => null;
let root: HTMLElement | null = null;
let lastPath: string | null = null;

export function registerRoutes(next: Record<string, Screen>): void {
  routes = next;
}

/** Liefert einen Ersatzpfad, wenn der Pfad im aktuellen Zustand nicht gezeigt werden soll. */
export function setGuard(next: Guard): void {
  guard = next;
}

export function navigate(path: string): void {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (location.hash === target) render();
  else location.hash = target;
}

function currentPath(): string {
  const hash = location.hash.replace(/^#/, '');
  return hash === '' ? '/' : hash;
}

function render(): void {
  if (!root) return;
  const path = currentPath();
  const redirect = guard(path);
  if (redirect !== null && redirect !== path) {
    navigate(redirect);
    return;
  }
  const [, name = '', ...params] = path.split('/');
  const screen = routes[`/${name}`];
  if (!screen) {
    navigate('/');
    return;
  }
  const changed = path !== lastPath;
  lastPath = path;
  root.replaceChildren();
  root.className = 'screen';
  screen(root, params);
  if (changed) {
    window.scrollTo(0, 0);
    root.focus({ preventScroll: true });
  }
}

export function startRouter(target: HTMLElement): void {
  root = target;
  root.setAttribute('tabindex', '-1');
  window.addEventListener('hashchange', render);
  subscribe(render);
  render();
}
