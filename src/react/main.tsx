import { createRoot } from 'react-dom/client';
import { GameOverOverlay } from './index';

const rootId = 'react-root';
let container = document.getElementById(rootId);

if (!container) {
  container = document.createElement('div');
  container.id = rootId;
  document.body.appendChild(container);
}

createRoot(container).render(<GameOverOverlay />);
