import { Game } from "./game/Game";
import { BUILD_TYPES } from "./game/buildings";
import { ImageAssets } from "./assets/images";
import { initializeUI, linkGameToUI } from "./game/ui/bootstrap";
import "./react/main";

// Initialize game and load assets
async function initGame() {
  // Initialize all UI components first
  const ui = initializeUI();
  const loadingOverlay = createLoadingOverlay();
  const updateLoading = createLoadingUpdater(loadingOverlay);
  
  const canvas = ui.canvas;
  if (!canvas) {
    const msg = 'Fatal: Canvas element could not be created.';
    ui.errorOverlay.show(msg);
    throw new Error(msg);
  }
  
  // Load image assets
  try {
    await ImageAssets.getInstance().loadAssets(updateLoading);
    console.log('Assets loaded successfully');
    console.log('House image loaded:', !!ImageAssets.getInstance().getImage('house'));
  } catch (error) {
    console.warn('Some assets failed to load:', error);
    ui.errorOverlay.show('Warning: some assets failed to load. See console for details.');
  } finally {
    loadingOverlay.root.remove();
  }

  // Create game instance
  const game = new Game(canvas);
  
  // Link game to UI components
  linkGameToUI(ui, game);

  // Make game and assets available globally for debugging
  (Object.assign(window as any, { 
    game, 
    BUILD_TYPES, 
    imageAssets: ImageAssets.getInstance(),
    uiComponents: ui
  }));

  console.log('Game initialized successfully');
}

type LoadingOverlayElements = {
  root: HTMLDivElement;
  status: HTMLDivElement;
  barFill: HTMLDivElement;
  detail: HTMLDivElement;
};

function createLoadingOverlay(): LoadingOverlayElements {
  const root = document.createElement('div');
  root.id = 'loadingOverlay';
  root.className = 'loading-overlay';

  const card = document.createElement('div');
  card.className = 'loading-card';

  const title = document.createElement('div');
  title.className = 'loading-title';
  title.textContent = 'Loading Colony';

  const status = document.createElement('div');
  status.className = 'loading-status';
  status.textContent = 'Preparing assets…';

  const bar = document.createElement('div');
  bar.className = 'loading-bar';
  const barFill = document.createElement('div');
  barFill.className = 'loading-bar-fill';
  bar.appendChild(barFill);

  const detail = document.createElement('div');
  detail.className = 'loading-detail';
  detail.textContent = '0 / 0';

  card.appendChild(title);
  card.appendChild(status);
  card.appendChild(bar);
  card.appendChild(detail);
  root.appendChild(card);

  document.body.appendChild(root);

  return { root, status, barFill, detail };
}

function createLoadingUpdater(overlay: LoadingOverlayElements) {
  return (info: { loaded: number; total: number; name: string; status: 'loaded' | 'failed' }) => {
    const pct = info.total > 0 ? Math.round((info.loaded / info.total) * 100) : 0;
    overlay.barFill.style.width = `${pct}%`;
    const label = formatAssetLabel(info.name);
    overlay.status.textContent = `${info.status === 'loaded' ? 'Loading' : 'Skipping'} ${label}`;
    overlay.detail.textContent = `${info.loaded} / ${info.total}`;
  };
}

function formatAssetLabel(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

// Start the game
try {
  const p = initGame();
  // Also surface rejected promise explicitly (in addition to unhandledrejection)
  if (p && typeof (p as any).catch === 'function') {
    (p as Promise<void>).catch((e) => {
      const show = (window as any).__showErrorOverlay as undefined | ((m: string) => void);
      const msg = (e && (e.stack || e.message)) ? (e.stack || e.message) : String(e);
      show?.(`[init] ${msg}`);
      console.error(e);
    });
  }
} catch (e: any) {
  const show = (window as any).__showErrorOverlay as undefined | ((m: string) => void);
  const msg = (e && (e.stack || e.message)) ? (e.stack || e.message) : String(e);
  show?.(`[init-sync] ${msg}`);
  console.error(e);
}
