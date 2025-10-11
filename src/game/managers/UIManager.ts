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

export class UIManager {
  // Building selection
  selectedBuild: keyof typeof BUILD_TYPES | null = 'house';
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
  }
  
  /**
   * Open build menu
   */
  openBuildMenu(): void {
    this.showBuildMenu = true;
  }
  
  /**
   * Close build menu
   */
  closeBuildMenu(): void {
    this.showBuildMenu = false;
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
    this.contextMenu = null;
    this.contextMenuRects = [];
  }
  
  /**
   * Show context menu
   */
  showContextMenu(menu: ContextMenuDescriptor<any>, x: number, y: number): void {
    this.contextMenu = {
      ...menu,
      visible: true,
      x,
      y
    };
  }
  
  /**
   * Reset all UI state
   */
  reset(): void {
    this.selectedBuild = 'house';
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
