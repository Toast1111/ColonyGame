import { Game } from "./game/Game";
import { BUILD_TYPES } from "./game/buildings";
import { ImageAssets } from "./assets/images";
import { initializeUI, linkGameToUI } from "./game/ui/bootstrap";

// Initialize game and load assets
async function initGame() {
  // Initialize all UI components first
  const ui = initializeUI();
  
  const canvas = ui.canvas;
  if (!canvas) {
    const msg = 'Fatal: Canvas element could not be created.';
    ui.errorOverlay.show(msg);
    throw new Error(msg);
  }
  
  // Show loading message
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#dbeafe';
    ctx.font = '24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Loading assets...', canvas.width / 2, canvas.height / 2);
  }

  // Load image assets
  try {
    await ImageAssets.getInstance().loadAssets();
    console.log('Assets loaded successfully');
    console.log('House image loaded:', !!ImageAssets.getInstance().getImage('house'));
  } catch (error) {
    console.warn('Some assets failed to load:', error);
    ui.errorOverlay.show('Warning: some assets failed to load. See console for details.');
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
