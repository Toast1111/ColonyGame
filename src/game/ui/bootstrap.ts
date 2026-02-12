/**
 * UI Bootstrap - Initialize all DOM-based UI components
 * 
 * Creates and wires up all UI elements programmatically.
 * This is the main entry point for UI initialization.
 */

import { type MobileControlsHandle } from './dom/mobileControls';
import { createMobileControlsBridge } from '../../react';
import {
  createErrorOverlayBridge,
  createToastBridge,
  createHelpPanelBridge,
  createChangelogBridge,
  type ErrorOverlayHandle,
  type ToastHandle,
  type HelpPanelHandle,
  type ChangelogModalHandle
} from '../../react';
import type { Game } from '../Game';

export interface UIComponents {
  errorOverlay: ErrorOverlayHandle;
  toast: ToastHandle;
  helpPanel: HelpPanelHandle;
  mobileControls: MobileControlsHandle;
  changelogModal: ChangelogModalHandle;
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
  
  // Create error overlay bridge (must be first for error handling)
  const errorOverlay = createErrorOverlayBridge();
  
  // Create canvas
  const canvas = createCanvas();
  
  // Use a game reference object that can be updated later
  const gameRef = { current: game };
  
  // Create help panel bridge
  const helpPanel = createHelpPanelBridge();

  // Create changelog modal bridge
  const changelogModal = createChangelogBridge();
  
  // Create mobile controls
  const mobileControls = createMobileControlsBridge();
  mobileControls.hide();
  
  // Create toast bridge
  const toast = createToastBridge();
  
  // Assemble the UI structure
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
    changelogModal,
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
  (game as any).ui = components;

  game.syncMobileControls();
  game.refreshTouchUIState();
}
