import { useMemo, useState, useSyncExternalStore } from 'react';
import { BUILD_TYPES, groupByCategory } from '../../game/buildings';
import { getHotbarState, subscribeHotbar } from '../stores/hotbarStore';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getMenuDimensions(canvasWidth: number, canvasHeight: number, hotbarHeight: number, isTouch: boolean) {
  const horizontalMargin = Math.max(canvasWidth * (isTouch ? 0.035 : 0.02), isTouch ? 24 : 18);
  const topClearance = Math.max(canvasHeight * 0.04, isTouch ? 36 : 28);
  const hotbarGap = Math.max(canvasHeight * (isTouch ? 0.018 : 0.012), hotbarHeight * (isTouch ? 0.2 : 0.14), isTouch ? 26 : 18);

  const availableWidth = Math.max(canvasWidth - horizontalMargin * 2, 300);
  const width = clamp(
    canvasWidth * (isTouch ? 0.88 : 0.34),
    Math.min(isTouch ? 520 : 340, availableWidth),
    Math.min(availableWidth, canvasWidth * (isTouch ? 0.94 : 0.42), isTouch ? 980 : 860)
  );

  const availableHeight = Math.max(canvasHeight - hotbarHeight - hotbarGap - topClearance, 240);
  const height = clamp(
    canvasHeight * (isTouch ? 0.58 : 0.46),
    Math.min(isTouch ? 420 : 300, availableHeight),
    Math.min(availableHeight, canvasHeight * (isTouch ? 0.68 : 0.56), isTouch ? 880 : 720)
  );

  const menuX = horizontalMargin;
  const menuY = Math.max(topClearance, canvasHeight - hotbarHeight - hotbarGap - height);

  const panelGap = clamp(width * (isTouch ? 0.022 : 0.018), isTouch ? 16 : 12, isTouch ? 30 : 28);

  const minBuildingWidth = isTouch ? 300 : 220;
  const minCategoryWidth = Math.min(isTouch ? 240 : 180, width * 0.5);
  const maxCategoryWidth = Math.max(minCategoryWidth, Math.min(width * 0.58, width - minBuildingWidth - panelGap));
  const maxBuildingWidth = width - minCategoryWidth - panelGap;
  const buildingPanelWidth = clamp(width * (isTouch ? 0.56 : 0.64), minBuildingWidth, maxBuildingWidth);
  const categoryPanelWidth = clamp(width - buildingPanelWidth - panelGap, minCategoryWidth, maxCategoryWidth);

  return {
    menuWidth: width,
    menuHeight: height,
    menuX,
    menuY,
    panelGap,
    categoryPanelWidth,
    buildingPanelWidth
  };
}

function getHotbarHeight(canvasHeight: number, isTouch: boolean): number {
  const minHeight = isTouch ? 110 : 68;
  const maxHeightCandidate = isTouch ? 160 : 96;
  const percentHeight = canvasHeight * (isTouch ? 0.095 : 0.06);
  const percentMax = canvasHeight * (isTouch ? 0.16 : 0.1);
  const upperBound = Math.max(maxHeightCandidate, percentMax, minHeight);
  const lowerBound = Math.min(minHeight, upperBound);
  return Math.min(Math.max(percentHeight, lowerBound), upperBound);
}

export function BuildMenu() {
  const state = useSyncExternalStore(subscribeHotbar, getHotbarState, getHotbarState);
  const game = (window as any).game;
  const isOpen = state.activeTab === 'build';
  const [tooltip, setTooltip] = useState<null | { x: number; y: number; name: string; description?: string; cost?: string }>(null);

  const groups = useMemo(() => groupByCategory(BUILD_TYPES, game), [game]);
  const categories = useMemo(() => Object.keys(groups), [groups]);
  const selectedCategory = state.selectedBuildCategory && groups[state.selectedBuildCategory]
    ? state.selectedBuildCategory
    : categories[0] || null;

  if (!isOpen) {
    return null;
  }

  const hotbarHeight = getHotbarHeight(state.canvasHeight || window.innerHeight, state.isTouch);
  const { menuHeight, menuWidth, menuX, menuY, panelGap, categoryPanelWidth, buildingPanelWidth } =
    getMenuDimensions(state.canvasWidth || window.innerWidth, state.canvasHeight || window.innerHeight, hotbarHeight, state.isTouch);

  const headerHeight = Math.max(menuHeight * 0.08, state.isTouch ? 46 : 34);
  const categoryItemHeight = Math.max(menuHeight * 0.08, state.isTouch ? 56 : 42);
  const categoryPadding = Math.max(menuHeight * 0.01, state.isTouch ? 8 : 6);
  const buildingItemHeight = Math.max(menuHeight * 0.14, state.isTouch ? 92 : 72);
  const buildingPadding = Math.max(menuHeight * 0.01, state.isTouch ? 10 : 6);

  const handleCategoryClick = (category: string) => {
    game?.uiManager?.setSelectedBuildCategory(category);
    try { (window as any).game?.audioManager?.play('ui.click.primary'); } catch {}
  };

  const handleBuildingClick = (key: string) => {
    if (!game) return;
    game.selectedBuild = key;
    game.uiManager?.setHotbarTab(null);
    try { (window as any).game?.audioManager?.play('ui.click.primary'); } catch {}
    const def = (BUILD_TYPES as any)[key];
    if (def?.name) {
      game.toast?.('Selected: ' + def.name);
    }
  };

  const buildings = selectedCategory && groups[selectedCategory] ? groups[selectedCategory] : [];

  const tt = tooltip;

  return (
    <>
      <div
        className="build-menu"
        style={{ width: `${menuWidth}px`, height: `${menuHeight}px`, left: `${menuX}px`, top: `${menuY}px` }}
      >
      <div className="build-menu-panel" style={{ width: `${categoryPanelWidth}px` }}>
        <div className="build-menu-header">Categories</div>
        <div className="build-menu-list" style={{ paddingTop: `${categoryPadding}px` }}>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`build-menu-item${selectedCategory === category ? ' selected' : ''}`}
              style={{ height: `${categoryItemHeight}px` }}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="build-menu-panel" style={{ width: `${buildingPanelWidth}px`, marginLeft: `${panelGap}px` }}>
        <div className="build-menu-header">{selectedCategory ?? 'Select a category'}</div>
        <div className="build-menu-list" style={{ paddingTop: `${buildingPadding}px` }}>
          {buildings.length === 0 && (
            <div className="build-menu-empty">Select a category to view buildings</div>
          )}
          {buildings.map(([key, def]: any) => (
            <button
              key={key}
              type="button"
              className={`build-menu-item build-menu-building${state.selectedBuild === key ? ' selected' : ''}`}
              style={{ minHeight: `${buildingItemHeight}px` }}
              onClick={() => handleBuildingClick(key)}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                setTooltip({
                  x: rect.right + 12,
                  y: rect.top,
                  name: def.name,
                  description: def.description,
                  cost: game?.costText?.(def.cost || {})
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <div className="build-menu-building-name">{def.name}</div>
              <div className="build-menu-building-cost">{game?.costText?.(def.cost || {})}</div>
              {def.description && (
                <div className="build-menu-building-desc">{def.description}</div>
              )}
            </button>
          ))}
        </div>
      </div>
      </div>
      {tt && (
        <div className="build-menu-tooltip" style={{ left: `${tt.x}px`, top: `${tt.y}px` }}>
          <div className="build-menu-tooltip-title">{tt.name}</div>
          {tt.cost && <div className="build-menu-tooltip-cost">{tt.cost}</div>}
          {tt.description && <div className="build-menu-tooltip-desc">{tt.description}</div>}
        </div>
      )}
    </>
  );
}
