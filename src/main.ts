import '@fontsource/big-shoulders-display/700';
import '@fontsource/big-shoulders-display/800';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/600.css';
import './styles/tokens.css';
import './styles/base.css';
import { getData, initStore } from './store/store';
import { el } from './ui/dom';
import { registerRoutes, setGuard, startRouter } from './ui/router';
import { gameScreen } from './ui/screens/game';
import { newGameScreen } from './ui/screens/newGame';
import { playersScreen } from './ui/screens/players';
import { startScreen } from './ui/screens/start';

const app = document.getElementById('app');
if (!app) throw new Error('#app fehlt');

const { warning } = initStore();
const screenRoot = el('main', { class: 'screen' });
app.replaceChildren(...(warning ? [el('p', { class: 'banner', role: 'alert' }, warning)] : []), screenRoot);

registerRoutes({
  '/': startScreen,
  '/players': playersScreen,
  '/new': newGameScreen,
  '/game': gameScreen,
});

/** Läuft oder endet gerade ein Spiel, zeigen Start, Neues Spiel und Spielscreens den passenden Screen. */
setGuard((path) => {
  const game = getData().activeGame;
  const top = path.split('/')[1] ?? '';
  const running = game !== null && game.finishedAt === null;
  const finished = game !== null && game.finishedAt !== null;
  if (top === '' || top === 'new') return running ? '/game' : finished ? '/finished' : null;
  if (top === 'game') return running ? null : finished ? '/finished' : '/';
  if (top === 'finished') return finished ? null : running ? '/game' : '/';
  return null;
});

startRouter(screenRoot);
