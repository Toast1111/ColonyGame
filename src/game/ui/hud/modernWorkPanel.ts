/**
 * Modern Work Panel - Wrapper for work priority system
 * 
 * Positions the work priority panel in the bottom-left area above the hotbar
 * when the Work tab is active
 */

import { getModernHotbarHeight } from './modernHotbar';

/**
 * Calculate the position and size for the work priority panel
 * to fit in the bottom-left area above the hotbar
 */
export function getWorkPanelLayout(canvas: HTMLCanvasElement, game: any): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const hotbarHeight = getModernHotbarHeight(canvas, game);
  const panelHeight = canvas.height * 0.65; // Work panel takes 65% of screen height
  const panelWidth = canvas.width * 0.85; // 85% of screen width

  // Position: centered horizontally, positioned above hotbar with gap
  const gap = Math.max(canvas.height * 0.01, hotbarHeight * 0.12);
  const x = (canvas.width - panelWidth) / 2;
  const y = canvas.height - hotbarHeight - panelHeight - gap;
  
  return {
    x,
    y,
    width: panelWidth,
    height: panelHeight,
  };
}

/**
 * Draw background container for work panel
 * The actual work priority panel will be drawn on top of this
 */
export function drawWorkPanelContainer(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  game: any
): void {
  const layout = getWorkPanelLayout(canvas, game);
  
  // Semi-transparent dark background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
  ctx.fillRect(layout.x, layout.y, layout.width, layout.height);
  
  // Border
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(layout.x, layout.y, layout.width, layout.height);
}
