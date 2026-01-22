/**
 * Control Panel - Canvas-based game controls
 * 
 * Displays speed controls (1x/2x/3x), pause, zoom, and delete buttons.
 * Delete button is only shown on mobile/touch devices.
 * Replaces the old HTML-based mobile controls.
 */

import type { Game } from '../../Game';
import { playUiClickPrimary } from '../../audio/helpers/uiAudio';

export interface ControlPanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
  action: 'pause' | 'speed' | 'zoom-in' | 'zoom-out' | 'delete';
  speedMode?: number; // For speed button: 1, 2, or 3
}

/**
 * Draw the control panel on the right side of the screen
 * Returns rectangles for click detection
 */
export function drawControlPanel(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  game: Game
): ControlPanelRect[] {
  const rects: ControlPanelRect[] = [];
  const dpr = window.devicePixelRatio || 1;
  const isTouchDevice = game.isTouch;
  
  // Panel dimensions
  const buttonSize = isTouchDevice ? 52 : 44;
  const gap = 8;
  const padding = 12;
  const rightEdge = canvas.width - padding;
  const bottomEdge = canvas.height - (isTouchDevice ? 120 : 100);
  
  let yPos = bottomEdge;
  
  ctx.save();
  
  // Style configuration
  const bgColor = '#0f1621';
  const borderColor = '#1b2736';
  const hoverColor = '#1a2332';
  const activeColor = '#2b3d59';
  const textColor = '#e2e8f0';
  const accentColor = '#60a5fa';
  
  // Helper to draw a button
  const drawButton = (
    x: number,
    y: number,
    label: string,
    isActive: boolean,
    action: ControlPanelRect['action'],
    speedMode?: number
  ): ControlPanelRect => {
    const rect: ControlPanelRect = { x, y, w: buttonSize, h: buttonSize, action, speedMode };
    
    // Background
    ctx.fillStyle = isActive ? hoverColor : bgColor;
    ctx.fillRect(x, y, buttonSize, buttonSize);
    
    // Border
    ctx.strokeStyle = isActive ? activeColor : borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, buttonSize, buttonSize);
    
    // Label text
    ctx.fillStyle = isActive ? accentColor : textColor;
    ctx.font = `${Math.floor(buttonSize * 0.4)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + buttonSize / 2, y + buttonSize / 2);
    
    return rect;
  };
  
  // --- Delete Button (Mobile/Touch only) ---
  if (isTouchDevice) {
    const deleteX = rightEdge - buttonSize;
    rects.push(drawButton(
      deleteX,
      yPos,
      '🗑️',
      game.selectedBuild === 'erase',
      'delete'
    ));
    yPos -= buttonSize + gap;
  }
  
  // --- Pause Button ---
  const pauseX = rightEdge - buttonSize;
  const pauseLabel = game.paused ? '▶️' : '⏸️';
  rects.push(drawButton(
    pauseX,
    yPos,
    pauseLabel,
    game.paused,
    'pause'
  ));
  yPos -= buttonSize + gap;
  
  // --- Speed Control (Cycle: 1x → 2x → 3x → 1x) ---
  const speedX = rightEdge - buttonSize;
  const currentSpeed = game.fastForward;
  let speedLabel = '1x';
  if (currentSpeed >= 3) speedLabel = '3x';
  else if (currentSpeed >= 2) speedLabel = '2x';
  
  rects.push(drawButton(
    speedX,
    yPos,
    speedLabel,
    currentSpeed > 1,
    'speed',
    currentSpeed
  ));
  yPos -= buttonSize + gap;
  
  // --- Zoom Controls (side by side) ---
  const zoomOutX = rightEdge - buttonSize * 2 - gap;
  const zoomInX = rightEdge - buttonSize;
  
  rects.push(drawButton(
    zoomOutX,
    yPos,
    '－',
    false,
    'zoom-out'
  ));
  
  rects.push(drawButton(
    zoomInX,
    yPos,
    '＋',
    false,
    'zoom-in'
  ));
  
  ctx.restore();
  
  return rects;
}

/**
 * Handle click on control panel
 * Returns true if click was handled
 */
export function handleControlPanelClick(
  mouseX: number,
  mouseY: number,
  rects: ControlPanelRect[],
  game: Game
): boolean {
  for (const rect of rects) {
    if (
      mouseX >= rect.x &&
      mouseX <= rect.x + rect.w &&
      mouseY >= rect.y &&
      mouseY <= rect.y + rect.h
    ) {
      // Play click sound
      playUiClickPrimary(game);
      
      switch (rect.action) {
        case 'pause':
          game.paused = !game.paused;
          game.toast(game.paused ? 'Paused' : 'Resumed');
          break;
          
        case 'speed':
          // Cycle through speeds: 1 → 2 → 3 → 1
          if (game.fastForward === 1) {
            game.fastForward = 2;
            game.toast('Speed: 2x');
          } else if (game.fastForward === 2) {
            game.fastForward = 3;
            game.toast('Speed: 3x');
          } else {
            game.fastForward = 1;
            game.toast('Speed: 1x');
          }
          break;
          
        case 'zoom-in':
          game.camera.zoom = Math.min(2.2, game.camera.zoom * 1.1);
          break;
          
        case 'zoom-out':
          game.camera.zoom = Math.max(0.6, game.camera.zoom / 1.1);
          break;
          
        case 'delete':
          // Toggle erase mode (mobile only)
          if (game.selectedBuild === 'erase') {
            game.selectedBuild = null;
            game.toast('Erase mode OFF');
          } else {
            game.selectedBuild = 'erase';
            game.toast('Erase mode ON');
          }
          break;
      }
      
      return true;
    }
  }
  
  return false;
}
