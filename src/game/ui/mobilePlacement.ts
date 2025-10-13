/**
 * Mobile Placement UI Module
 * 
 * Handles the precise placement UI for touch devices, providing:
 * - Nudge controls (arrow buttons)
 * - Rotation controls
 * - Confirm/Cancel buttons
 * - Visual feedback for valid/invalid placement
 * 
 * This module provides a clean separation of concerns for mobile placement
 * interactions, ensuring proper state management and button handling.
 */

import { BUILD_TYPES, hasCost } from "../buildings";
import { canPlace as canPlacePlacement, confirmPending as confirmPendingPlacement, cancelPending as cancelPendingPlacement, nudgePending as nudgePendingPlacement, rotatePending as rotatePendingPlacement } from "../placement/placementSystem";
import { T } from "../constants";
import type { Game } from "../Game";

/**
 * Button rectangle for mobile placement UI
 */
interface PlacementButton {
  id: 'up' | 'down' | 'left' | 'right' | 'rotL' | 'rotR' | 'ok' | 'cancel';
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Render the mobile placement UI
 * Shows ghost preview, buttons for nudging/rotating, and confirm/cancel actions
 */
export function drawMobilePlacementUI(game: Game): void {
  const p = game.pendingPlacement;
  if (!p) return;

  const def = BUILD_TYPES[p.key];
  const ctx = game.ctx as CanvasRenderingContext2D;
  const w = def.size.w * T;
  const h = def.size.h * T;

  // Convert world to screen coordinates
  const toScreen = (wx: number, wy: number) => ({
    x: (wx - game.camera.x) * game.camera.zoom,
    y: (wy - game.camera.y) * game.camera.zoom
  });

  const scr = toScreen(p.x, p.y);
  let sw = w * game.camera.zoom;
  let sh = h * game.camera.zoom;

  // Apply rotation
  const rot = p.rot || 0;
  const rotated = (rot === 90 || rot === 270);
  if (rotated) {
    const tmp = sw;
    sw = sh;
    sh = tmp;
  }

  // Draw ghost preview
  ctx.save();
  
  // Check if placement is valid
  const bTmp = {
    ...def,
    x: p.x + 1,
    y: p.y + 1,
    w: def.size.w,
    h: def.size.h,
    rot: p.rot
  };
  
  if (rotated) {
    const tmp = bTmp.w;
    bTmp.w = bTmp.h;
    bTmp.h = tmp;
  }
  
  const can = canPlacePlacement(game, bTmp as any, bTmp.x, bTmp.y) && hasCost(game.RES, def.cost);
  
  // Ghost fill - use rgba for better performance
  ctx.fillStyle = can ? 'rgba(75, 159, 255, 0.6)' : 'rgba(255, 107, 107, 0.6)';
  ctx.fillRect(scr.x, scr.y, sw, sh);
  
  // Ghost border
  ctx.strokeStyle = '#4b9fff';
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(scr.x + 0.5, scr.y + 0.5, sw - 1, sh - 1);
  ctx.setLineDash([]);
  
  ctx.restore();

  // Draw control buttons
  const buttons = createPlacementButtons(game, scr.x, scr.y, sw, sh);
  game.placeUIRects = buttons as any[];
  
  drawPlacementButtons(game, buttons, can);
  
  // Draw instruction text
  drawInstructionText(game, scr.x, scr.y);
}

/**
 * Create placement button layout
 */
function createPlacementButtons(game: Game, ghostX: number, ghostY: number, ghostW: number, ghostH: number): PlacementButton[] {
  const pad = game.scale(10);
  const btn = game.scale(42);
  const maxW = game.canvas.width;
  
  // Position buttons to the right of the ghost, or left if too close to edge
  let cx = ghostX + ghostW + pad;
  let cy = ghostY;
  
  if (cx + btn * 3 > maxW - game.scale(6)) {
    cx = Math.max(game.scale(6), ghostX - pad - btn * 3);
  }
  
  const makeRect = (id: PlacementButton['id'], x: number, y: number): PlacementButton => ({
    id,
    x,
    y,
    w: btn,
    h: btn
  });
  
  return [
    // Nudge controls (directional pad layout)
    makeRect('up', cx + btn, cy),
    makeRect('left', cx, cy + btn),
    makeRect('right', cx + btn * 2, cy + btn),
    makeRect('down', cx + btn, cy + btn * 2),
    
    // Rotation controls
    makeRect('rotL', cx, cy + btn * 3 + game.scale(6)),
    makeRect('rotR', cx + btn * 2, cy + btn * 3 + game.scale(6)),
    
    // Action buttons
    makeRect('cancel', cx, cy + btn * 4 + game.scale(12)),
    makeRect('ok', cx + btn * 2, cy + btn * 4 + game.scale(12)),
  ];
}

/**
 * Draw placement control buttons
 */
function drawPlacementButtons(game: Game, buttons: PlacementButton[], canPlace: boolean): void {
  const ctx = game.ctx as CanvasRenderingContext2D;
  
  ctx.save();
  ctx.fillStyle = '#0f172aee';
  ctx.strokeStyle = '#1e293b';
  
  const drawBtn = (r: PlacementButton, label: string, disabled = false) => {
    ctx.save();
    
    // Button background
    if (disabled) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
    }
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    
    // Button label
    ctx.fillStyle = disabled ? 'rgba(219, 234, 254, 0.5)' : '#dbeafe';
    ctx.font = game.getScaledFont(18, '600');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + game.scale(2));
    
    ctx.restore();
    ctx.fillStyle = '#0f172aee';
  };
  
  for (const r of buttons) {
    if (r.id === 'up') drawBtn(r, '↑');
    else if (r.id === 'down') drawBtn(r, '↓');
    else if (r.id === 'left') drawBtn(r, '←');
    else if (r.id === 'right') drawBtn(r, '→');
    else if (r.id === 'rotL') drawBtn(r, '⟲');
    else if (r.id === 'rotR') drawBtn(r, '⟳');
    else if (r.id === 'ok') drawBtn(r, '✓', !canPlace);
    else if (r.id === 'cancel') drawBtn(r, '✕');
  }
  
  ctx.restore();
}

/**
 * Draw instruction text
 */
function drawInstructionText(game: Game, ghostX: number, ghostY: number): void {
  const ctx = game.ctx as CanvasRenderingContext2D;
  
  ctx.save();
  ctx.fillStyle = '#dbeafe';
  ctx.font = game.getScaledFont(14, '500');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    'Drag to move • Tap ✓ to place',
    Math.max(game.scale(6), ghostX),
    Math.max(game.scale(6), ghostY - game.scale(26))
  );
  ctx.restore();
}

/**
 * Handle click/tap on mobile placement UI
 * Returns true if click was handled, false otherwise
 */
export function handleMobilePlacementClick(game: Game, screenX: number, screenY: number): boolean {
  if (!game.pendingPlacement) return false;
  if (!game.placeUIRects || game.placeUIRects.length === 0) return false;
  
  // Check button hits
  for (const r of game.placeUIRects) {
    if (screenX >= r.x && screenX <= r.x + r.w && screenY >= r.y && screenY <= r.y + r.h) {
      handleButtonClick(game, r.id);
      return true;
    }
  }
  
  return false;
}

/**
 * Handle button click
 */
function handleButtonClick(game: Game, buttonId: string): void {
  switch (buttonId) {
    case 'up':
      nudgePendingPlacement(game, 0, -1);
      break;
    case 'down':
      nudgePendingPlacement(game, 0, 1);
      break;
    case 'left':
      nudgePendingPlacement(game, -1, 0);
      break;
    case 'right':
      nudgePendingPlacement(game, 1, 0);
      break;
    case 'rotL':
      rotatePendingPlacement(game, -90);
      break;
    case 'rotR':
      rotatePendingPlacement(game, 90);
      break;
    case 'ok':
      confirmPendingPlacement(game);
      cleanupPlacementUI(game);
      break;
    case 'cancel':
      cancelPendingPlacement(game);
      cleanupPlacementUI(game);
      break;
  }
}

/**
 * Clean up placement UI state
 * Called after confirming or canceling placement
 */
function cleanupPlacementUI(game: Game): void {
  game.placeUIRects = [];
  game.pendingPlacement = null;
  
  // Also clean up UIManager state if present
  if (game.uiManager) {
    game.uiManager.cancelPendingPlacement();
  }
}

/**
 * Check if click/tap is on the ghost building itself
 * Returns true if the point is within the ghost bounds
 */
export function isClickOnGhost(game: Game, screenX: number, screenY: number): boolean {
  const p = game.pendingPlacement;
  if (!p) return false;
  
  const def = BUILD_TYPES[p.key];
  const toScreen = (wx: number, wy: number) => ({
    x: (wx - game.camera.x) * game.camera.zoom,
    y: (wy - game.camera.y) * game.camera.zoom
  });
  
  const g = toScreen(p.x, p.y);
  const gw = def.size.w * T * game.camera.zoom;
  const gh = def.size.h * T * game.camera.zoom;
  
  return screenX >= g.x && screenX <= g.x + gw && screenY >= g.y && screenY <= g.y + gh;
}
