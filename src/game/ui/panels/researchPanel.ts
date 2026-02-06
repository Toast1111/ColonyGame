/**
 * Research Panel - React-backed research tree modal
 */

import { toggleResearchPanel as reactToggle, setResearchPanelVisible, getResearchPanelState } from '../../../react/stores/researchStore';

export function toggleResearchPanel(): void {
  reactToggle();
  const isOpen = getResearchPanelState().visible;

  try {
    (window as any).game?.audioManager?.play(isOpen ? 'ui.panel.open' : 'ui.panel.close');
  } catch {}

  const mobileControls = document.getElementById('mobileControls');
  if (mobileControls) {
    mobileControls.style.display = isOpen ? 'none' : '';
  }
}

export function isResearchPanelOpen(): boolean {
  return getResearchPanelState().visible;
}

export function closeResearchPanel(clearHotbarTab = true): void {
  setResearchPanelVisible(false);

  try {
    (window as any).game?.audioManager?.play('ui.panel.close');
  } catch {}

  if (clearHotbarTab) {
    const game = (window as any).game;
    if (game?.uiManager?.activeHotbarTab === 'research') {
      game.uiManager.setHotbarTab(null);
    }
  }

  const mobileControls = document.getElementById('mobileControls');
  if (mobileControls) {
    mobileControls.style.display = '';
  }
}

export function openResearchPanel(clearHotbarTab = false): void {
  setResearchPanelVisible(true);

  try {
    (window as any).game?.audioManager?.play('ui.panel.open');
  } catch {}

  if (clearHotbarTab) {
    const game = (window as any).game;
    if (game?.uiManager?.activeHotbarTab === 'research') {
      game.uiManager.setHotbarTab(null);
    }
  }

  const mobileControls = document.getElementById('mobileControls');
  if (mobileControls) {
    mobileControls.style.display = 'none';
  }
}
