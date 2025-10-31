/**
 * UIManager - Manages all UI state and interactions
 * 
 * Responsibilities:
 * - UI panel visibility (build menu, colonist panel, etc.)
 * - Selected building/colonist tracking
 * - UI hit regions for click detection
 * - Context menu state
 * - Placement UI state
 * - Long-press detection for mobile
 */

import type { Colonist, Building } from '../types';
import type { BUILD_TYPES } from '../buildings';
import type { ContextMenuDescriptor, ContextMenuItem } from '../ui/contextMenus/types';
import type { HotbarTab } from '../ui/hud/modernHotbar';
import { toggleWorkPriorityPanel, closeWorkPriorityPanel, isWorkPriorityPanelOpen } from '../ui/panels/workPriorityPanel';
import { AudioManager } from '../audio/AudioManager';

export class UIManager {
  // Modern hotbar system
  activeHotbarTab: HotbarTab | null = null; // Which tab is active (null = none)
  selectedBuildCategory: string | null = null; // Selected category in build menu
  
  // Building selection
  selectedBuild: keyof typeof BUILD_TYPES | null = null;
  hotbar: Array<keyof typeof BUILD_TYPES> = [
    'house',
    'farm',
    'turret',
    'wall',
    'stock',
    'tent',
    'warehouse',
    'well',
    'infirmary'
  ];
  
  // UI panel visibility
  showBuildMenu = false;
  
  // Erase mode toggle (for mobile controls)
  eraseMode = false;
  
  // Selection state
  selColonist: Colonist | null = null;
  follow = false; // Camera follow selected colonist
  
  // Pending placement state (for touch/precise placement)
  pendingPlacement: { 
    key: keyof typeof BUILD_TYPES; 
    x: number; 
    y: number; 
    rot?: 0 | 90 | 180 | 270 
  } | null = null;
  
  pendingDragging = false; // Is user dragging pending placement?
  
  // UI click regions (updated during draw)
  menuRects: Array<{ 
    key: keyof typeof BUILD_TYPES; 
    x: number; 
    y: number; 
    w: number; 
    h: number 
  }> = [];
  
  hotbarRects: Array<{ 
    index: number; 
    x: number; 
    y: number; 
    w: number; 
    h: number 
  }> = [];
  // Last hovered hotbar tab to gate hover SFX
  lastHoveredHotbarTab: HotbarTab | null = null;
  // Last hovered build menu elements to gate hover SFX
  lastHoveredBuildCategory: string | null = null;
  lastHoveredBuildingKey: keyof typeof BUILD_TYPES | null = null;
  
  placeUIRects: Array<{ 
    id: 'up' | 'down' | 'left' | 'right' | 'ok' | 'cancel' | 'rotL' | 'rotR'; 
    x: number; 
    y: number; 
    w: number; 
    h: number 
  }> = [];
  
  // Colonist panel state
  colonistPanelRect: { x: number; y: number; w: number; h: number } | null = null;
  colonistPanelCloseRect: { x: number; y: number; w: number; h: number } | null = null;
  colonistProfileTab: 'bio' | 'health' | 'gear' | 'social' | 'skills' | 'log' = 'bio';
  lastProfileTab: 'bio' | 'health' | 'gear' | 'social' | 'skills' | 'log' = 'bio'; // Remember last active tab
  colonistTabRects: Array<{ 
    tab: string; 
    x: number; 
    y: number; 
    w: number; 
    h: number 
  }> = [];
  
  // Context menu state
  contextMenu: (ContextMenuDescriptor<any> & { 
    visible: boolean; 
    x: number; 
    y: number; 
    openSubmenu?: string 
  }) | null = null;
  
  contextMenuRects: Array<{ 
    item: ContextMenuItem<any>; 
    x: number; 
    y: number; 
    w: number; 
    h: number; 
    isSubmenu?: boolean; 
    parentId?: string 
  }> = [];
  
  // Long-press detection (mobile context menus)
  longPressTimer: number | null = null;
  longPressStartPos: { x: number; y: number } | null = null;
  longPressStartTime: number | null = null;
  longPressTarget: Colonist | Building | null = null;
  longPressTargetType: 'colonist' | 'building' | null = null;
  
  // Drag state for building placement
  lastPaintCell: { gx: number; gy: number } | null = null;
  eraseDragStart: { x: number; y: number } | null = null;

  // Zone designator (e.g., stockpiles)
  zoneDragStart: { x: number; y: number } | null = null;
  
  /**
   * Select a building type for placement
   */
  selectBuilding(buildType: keyof typeof BUILD_TYPES | null): void {
    this.selectedBuild = buildType;
  }
  
  /**
   * Toggle build menu
   */
  toggleBuildMenu(): void {
    this.showBuildMenu = !this.showBuildMenu;
    try { void AudioManager.getInstance().play(this.showBuildMenu ? 'ui.panel.open' : 'ui.panel.close'); } catch {}
  }
  
  /**
   * Open build menu
   */
  openBuildMenu(): void {
    this.showBuildMenu = true;
    try { void AudioManager.getInstance().play('ui.panel.open'); } catch {}
  }
  
  /**
   * Close build menu
   */
  closeBuildMenu(): void {
    this.showBuildMenu = false;
    try { void AudioManager.getInstance().play('ui.panel.close'); } catch {}
  }
  
  /**
   * Select a colonist
   */
  selectColonist(colonist: Colonist | null): void {
    this.selColonist = colonist;
    // Restore last active tab when selecting a colonist
    if (colonist) {
      this.colonistProfileTab = this.lastProfileTab;
    }
  }
  
  /**
   * Deselect colonist
   */
  deselectColonist(): void {
    this.selColonist = null;
    this.follow = false;
  }
  
  /**
   * Toggle camera follow on selected colonist
   */
  toggleFollow(): void {
    if (this.selColonist) {
      this.follow = !this.follow;
    }
  }
  
  /**
   * Set pending placement
   */
  setPendingPlacement(placement: { 
    key: keyof typeof BUILD_TYPES; 
    x: number; 
    y: number; 
    rot?: 0 | 90 | 180 | 270 
  } | null): void {
    this.pendingPlacement = placement;
    this.pendingDragging = false;
  }
  
  /**
   * Cancel pending placement
   */
  cancelPendingPlacement(): void {
    this.pendingPlacement = null;
    this.pendingDragging = false;
  }
  
  /**
   * Start long-press detection
   */
  startLongPress(x: number, y: number, target: Colonist | Building, type: 'colonist' | 'building'): void {
    this.longPressStartPos = { x, y };
    this.longPressStartTime = Date.now();
    this.longPressTarget = target;
    this.longPressTargetType = type;
    
    // Set a timer for long press (500ms)
    this.longPressTimer = window.setTimeout(() => {
      // Long press detected - will be handled by caller
    }, 500);
  }
  
  /**
   * Cancel long-press detection
   */
  cancelLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.longPressStartPos = null;
    this.longPressStartTime = null;
    this.longPressTarget = null;
    this.longPressTargetType = null;
  }
  
  /**
   * Check if long press is in progress
   */
  isLongPressing(): boolean {
    return this.longPressTimer !== null;
  }
  
  /**
   * Hide context menu
   */
  hideContextMenu(): void {
    // Play UI close SFX for context menu
    try { void AudioManager.getInstance().play('ui.panel.close'); } catch {}
    this.contextMenu = null;
    this.contextMenuRects = [];
  }
  
  /**
   * Show context menu
   */
  showContextMenu(menu: ContextMenuDescriptor<any>, x: number, y: number): void {
    // Play UI open SFX for context menu
    try { void AudioManager.getInstance().play('ui.panel.open'); } catch {}
    this.contextMenu = {
      ...menu,
      visible: true,
      x,
      y
    };
  }
  
  /**
   * Set active hotbar tab
   */
  setHotbarTab(tab: HotbarTab | null): void {
    const audio = AudioManager.getInstance();
    const wasTab = this.activeHotbarTab;
    // If clicking the same tab, toggle it off
    if (this.activeHotbarTab === tab) {
      this.activeHotbarTab = null;
      this.selectedBuildCategory = null;
      // Reset build menu hover state when closing
      this.lastHoveredBuildCategory = null;
      this.lastHoveredBuildingKey = null;
      
      // Close work priority panel if we're closing work tab
      if (tab === 'work') {
        closeWorkPriorityPanel();
      }
      
      // Close research panel if we're closing research tab
      if (tab === 'research') {
        const game = (window as any).game;
        if (game?.researchUI) {
          game.researchUI.hide();
        }
      }
  // UI audio: hotbar close (single-variant)
  void audio.play('ui.hotbar.close').catch(() => {});
    } else {
      this.activeHotbarTab = tab;
      // Reset category selection when changing tabs
      if (tab !== 'build') {
        this.selectedBuildCategory = null;
        // Also reset build menu hover track when leaving build tab
        this.lastHoveredBuildCategory = null;
        this.lastHoveredBuildingKey = null;
      }
      
      // Open work priority panel if we're opening work tab
      if (tab === 'work') {
        if (!isWorkPriorityPanelOpen()) {
          toggleWorkPriorityPanel();
        }
      }
      
      // Open research panel if we're opening research tab
      if (tab === 'research') {
        const game = (window as any).game;
        if (game?.researchUI) {
          game.researchUI.show();
        }
      }
  // UI audio: hotbar open (single-variant)
  void audio.play('ui.hotbar.open').catch(() => {});
    }
  }
  
  /**
   * Set selected build category
   */
  setSelectedBuildCategory(category: string | null): void {
    this.selectedBuildCategory = category;
  }
  
  /**
   * Reset all UI state
   */
  reset(): void {
    this.activeHotbarTab = null;
    this.selectedBuildCategory = null;
    this.selectedBuild = null;
    this.showBuildMenu = false;
    this.selColonist = null;
    this.follow = false;
    this.pendingPlacement = null;
    this.pendingDragging = false;
    this.menuRects = [];
    this.hotbarRects = [];
    this.placeUIRects = [];
    this.colonistPanelRect = null;
    this.colonistPanelCloseRect = null;
    this.colonistProfileTab = 'bio';
    this.colonistTabRects = [];
    this.contextMenu = null;
    this.contextMenuRects = [];
    this.cancelLongPress();
    this.lastPaintCell = null;
    this.eraseDragStart = null;
  }
}
