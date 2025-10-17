/**
 * UI Bootstrap - Initialize all DOM-based UI components
 * 
 * Creates and wires up all UI elements programmatically.
 * This is the main entry point for UI initialization.
 */

import { ErrorOverlay } from './dom/errorOverlay';
import { ToastManager } from './dom/toast';
import { HelpPanel } from './dom/helpPanel';
import { MobileControls, type MobileControlsCallbacks } from './dom/mobileControls';
import { Header, type HeaderCallbacks } from './dom/header';
import type { Game } from '../Game';

export interface UIComponents {
  errorOverlay: ErrorOverlay;
  toast: ToastManager;
  helpPanel: HelpPanel;
  mobileControls: MobileControls;
  header: Header;
  canvas: HTMLCanvasElement;
  wrap: HTMLDivElement;
  gameRef: { current: Game | null };
}

/**
 * Initialize all UI components
 * Creates the entire UI structure programmatically
 */
export function initializeUI(game: Game | null = null): UIComponents {
  // Create main wrapper
  const wrap = createWrapper();
  
  // Create error overlay (must be first for error handling)
  const errorOverlay = new ErrorOverlay();
  
  // Create canvas
  const canvas = createCanvas();
  
  // Use a game reference object that can be updated later
  const gameRef = { current: game };
  
  // Setup header callbacks
  const headerCallbacks: HeaderCallbacks = {
    onNewGame: () => {
      if (gameRef.current) {
        gameRef.current.newGame();
      }
    },
    onHelp: () => {
      helpPanel.toggle();
    },
    onBuildMenu: () => {
      if (gameRef.current) {
        gameRef.current.showBuildMenu = !gameRef.current.showBuildMenu;
      }
    },
    onToggleMobile: () => {
      if (gameRef.current) {
        const next = !gameRef.current.touchUIEnabled;
        gameRef.current.setTouchUIEnabled(next, true);
        gameRef.current.toast('Mobile mode: ' + (next ? 'ON' : 'OFF'));
      }
    }
  };
  
  // Create header
  const header = new Header(headerCallbacks);
  
  // Create help panel
  const helpPanel = new HelpPanel();
  
  // Setup mobile controls callbacks
  const mobileCallbacks: MobileControlsCallbacks = {
    onErase: () => {
      if (gameRef.current) {
        // Toggle erase mode
        gameRef.current.eraseMode = !gameRef.current.eraseMode;
        gameRef.current.toast(gameRef.current.eraseMode ? 'Erase mode ON' : 'Erase mode OFF');
      }
    },
    onPause: () => {
      if (gameRef.current) {
        gameRef.current.paused = !gameRef.current.paused;
        gameRef.current.toast(gameRef.current.paused ? 'Paused' : 'Resumed');
      }
    },
    onFastForward: () => {
      if (gameRef.current) {
        gameRef.current.fastForward = gameRef.current.fastForward === 1 ? 6 : 1;
        gameRef.current.toast(gameRef.current.fastForward > 1 ? 'Fast-forward ON' : 'Fast-forward OFF');
      }
    },
    onZoomIn: () => {
      if (gameRef.current) {
        gameRef.current.camera.zoom = Math.min(2.2, gameRef.current.camera.zoom * 1.1);
      }
    },
    onZoomOut: () => {
      if (gameRef.current) {
        gameRef.current.camera.zoom = Math.max(0.6, gameRef.current.camera.zoom / 1.1);
      }
    }
  };
  
  // Create mobile controls
  const mobileControls = new MobileControls(mobileCallbacks);
  mobileControls.hide();
  
  // Create toast manager
  const toast = new ToastManager();
  
  // Assemble the UI structure
  wrap.appendChild(header.getElement());
  wrap.appendChild(canvas);
  
  // Add wrapper to root
  const root = document.getElementById('root');
  if (root) {
    root.appendChild(wrap);
  } else {
    // Fallback: add directly to body
    document.body.appendChild(wrap);
  }
  
  // Create legend (static info overlay)
  createLegend();
  
  // Setup keyboard event handling to prevent button focus
  setupKeyboardBlurring();
  
  return {
    errorOverlay,
    toast,
    helpPanel,
    mobileControls,
    header,
    canvas,
    wrap,
    gameRef
  };
}

/**
 * Create main wrapper div
 */
function createWrapper(): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.id = 'wrap';
  return wrap;
}

/**
 * Create game canvas
 */
function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.id = 'game';
  canvas.width = 1280;
  canvas.height = 720;
  return canvas;
}

/**
 * Create legend div (bottom-left info display)
 */
function createLegend(): HTMLDivElement {
  const legend = document.createElement('div');
  legend.id = 'legend';
  document.body.appendChild(legend);
  return legend;
}

/**
 * Setup keyboard event handling to prevent button highlighting
 */
function setupKeyboardBlurring(): void {
  document.addEventListener('keydown', (e) => {
    const gameKeys = [' ', 'h', 'b', 'f', 'g', 'j', 'escape', 'w', 'a', 's', 'd', '+', '=', '-', '_', 'p', 'r', 't', 'k', 'm', '~'];
    const isNumberKey = /^[1-9]$/.test(e.key);
    
    if (gameKeys.includes(e.key.toLowerCase()) || isNumberKey) {
      // Remove focus from any focused element to prevent button highlighting
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).blur();
      }
    }
  });
}

/**
 * Update UI components with game reference (called after game is created)
 */
export function linkGameToUI(components: UIComponents, game: Game): void {
  // Update the game reference so all callbacks now have access to the game
  components.gameRef.current = game;
  
  // Store UI components in game for easy access
  (game as any).toastManager = components.toast;
  (game as any).helpPanel = components.helpPanel;
  (game as any).mobileControls = components.mobileControls;

  game.syncMobileControls();
  game.refreshTouchUIState();
}
