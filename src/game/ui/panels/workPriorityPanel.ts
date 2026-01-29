/**
 * Work Priority Panel - RimWorld-style job assignment UI
 * 
 * DEPRECATED: This file now delegates to the React implementation.
 * The React component handles all rendering and interaction.
 */

import { toggleWorkPriorityPanel as reactToggle, setWorkPriorityVisible, getWorkPriorityState } from '../../../react/stores/workPriorityStore';

/**
 * Toggle the work priority panel
 */
export function toggleWorkPriorityPanel(): void {
  reactToggle();
  const isOpen = getWorkPriorityState().visible;
  
  try { 
    (window as any).game?.audioManager?.play(isOpen ? 'ui.panel.open' : 'ui.panel.close'); 
  } catch {}
  
  // Hide/show mobile controls
  const mobileControls = document.getElementById('mobileControls');
  if (mobileControls) {
    mobileControls.style.display = isOpen ? 'none' : '';
  }
}

/**
 * Check if panel is open
 */
export function isWorkPriorityPanelOpen(): boolean {
  return getWorkPriorityState().visible;
}

/**
 * Close the work priority panel
 */
export function closeWorkPriorityPanel(clearHotbarTab = true): void {
  setWorkPriorityVisible(false);
  
  try { (window as any).game?.audioManager?.play('ui.panel.close'); } catch {}
  
  if (clearHotbarTab) {
    const game = (window as any).game;
    if (game?.uiManager?.activeHotbarTab === 'work') {
      game.uiManager.setHotbarTab(null);
    }
  }
  
  // Restore mobile controls visibility
  const mobileControls = document.getElementById('mobileControls');
  if (mobileControls) {
    mobileControls.style.display = '';
  }
}

/**
 * DEPRECATED: Drawing now handled by React component
 */
export function drawWorkPriorityPanel(
  ctx?: CanvasRenderingContext2D,
  colonists?: any[],
  canvas?: HTMLCanvasElement,
  game?: any
): void {
  // No-op: React component handles rendering
}

/**
 * DEPRECATED: Clicking now handled by React component
 */
export function handleWorkPriorityPanelClick(
  mouseX?: number,
  mouseY?: number,
  colonists?: any[],
  canvas?: HTMLCanvasElement,
  game?: any
): boolean {
  // Return false to allow other handlers to process
  return false;
}

/**
 * DEPRECATED: Scrolling now handled by React component
 */
export function handleWorkPriorityPanelScroll(
  deltaY?: number,
  colonists?: any[],
  canvas?: HTMLCanvasElement,
  game?: any
): void {
  // No-op: React component handles scrolling
}

/**
 * DEPRECATED: Hover now handled by React component
 */
export function handleWorkPriorityPanelHover(
  mouseX?: number,
  mouseY?: number,
  colonists?: any[],
  canvas?: HTMLCanvasElement,
  game?: any
): void {
  // No-op: React component handles hover
}

/**
 * Check if mouse is hovering over the work priority panel
 */
export function isMouseOverWorkPanel(
  mouseX?: number,
  mouseY?: number,
  colonists?: any[],
  canvas?: HTMLCanvasElement,
  game?: any
): boolean {
  // Let the React component handle mouse events
  return getWorkPriorityState().visible;
}
