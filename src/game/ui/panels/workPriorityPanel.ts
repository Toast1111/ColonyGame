/**
 * Work Priority Panel - RimWorld-style job assignment UI
 * 
 * This file now delegates to the React implementation.
 * See: src/react/ui/WorkPriorityPanel.tsx
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
