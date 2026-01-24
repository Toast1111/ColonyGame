import { useSyncExternalStore } from 'react';
import type { HotbarTab } from '../../game/ui/hud/modernHotbar';
import { getHotbarState, subscribeHotbar } from '../stores/hotbarStore';

const TABS: Array<{ id: HotbarTab; label: string; enabled: boolean }> = [
  { id: 'build', label: 'Build', enabled: true },
  { id: 'work', label: 'Work', enabled: true },
  { id: 'schedule', label: 'Schedule', enabled: false },
  { id: 'research', label: 'Research', enabled: true },
  { id: 'animals', label: 'Animals', enabled: false },
  { id: 'quests', label: 'Quests', enabled: false }
];

function getHotbarHeight(canvasHeight: number, isTouch: boolean): number {
  const minHeight = isTouch ? 110 : 68;
  const maxHeightCandidate = isTouch ? 160 : 96;
  const percentHeight = canvasHeight * (isTouch ? 0.095 : 0.06);
  const percentMax = canvasHeight * (isTouch ? 0.16 : 0.1);
  const upperBound = Math.max(maxHeightCandidate, percentMax, minHeight);
  const lowerBound = Math.min(minHeight, upperBound);
  return Math.min(Math.max(percentHeight, lowerBound), upperBound);
}

export function Hotbar() {
  const state = useSyncExternalStore(subscribeHotbar, getHotbarState, getHotbarState);
  const height = getHotbarHeight(state.canvasHeight || window.innerHeight, state.isTouch);

  const onTabClick = (tab: HotbarTab, enabled: boolean) => {
    if (!enabled) return;
    const game = (window as any).game;
    if (!game?.uiManager) return;
    game.uiManager.setHotbarTab(game.uiManager.activeHotbarTab === tab ? null : tab);
  };

  const onTabHover = (tab: HotbarTab, enabled: boolean) => {
    if (!enabled) return;
    try { (window as any).game?.audioManager?.play('ui.hotbar.hover'); } catch {}
  };

  return (
    <div className="hotbar" style={{ height: `${height}px` }}>
      {TABS.map((tab) => {
        const isActive = state.activeTab === tab.id;
        const className = `hotbar-tab${isActive ? ' active' : ''}${tab.enabled ? '' : ' disabled'}`;
        return (
          <button
            key={tab.id}
            className={className}
            type="button"
            onClick={() => onTabClick(tab.id, tab.enabled)}
            onMouseEnter={() => onTabHover(tab.id, tab.enabled)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
