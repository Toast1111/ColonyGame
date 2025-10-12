/**
 * UI Utilities - Shared UI helper functions
 */

/**
 * Draw a tooltip at the specified position
 */
export function drawTooltip(
  ctx: CanvasRenderingContext2D,
  text: string | string[],
  x: number,
  y: number,
  options: {
    maxWidth?: number;
    padding?: number;
    fontSize?: number;
    bgColor?: string;
    textColor?: string;
    borderColor?: string;
  } = {}
): void {
  const {
    maxWidth = 300,
    padding = 12,
    fontSize = 14,
    bgColor = '#0f1419f0',
    textColor = '#e5e7eb',
    borderColor = '#374151'
  } = options;

  const lines = Array.isArray(text) ? text : [text];
  const lineHeight = fontSize + 6;
  const tooltipHeight = lines.length * lineHeight + padding * 2;

  // Position tooltip to avoid going off screen
  const canvas = ctx.canvas;
  let tooltipX = x + 20;
  let tooltipY = y - tooltipHeight - 10;
  
  if (tooltipX + maxWidth > canvas.width) {
    tooltipX = x - maxWidth - 20;
  }
  if (tooltipY < 0) {
    tooltipY = y + 20;
  }

  // Draw background
  ctx.fillStyle = bgColor;
  ctx.fillRect(tooltipX, tooltipY, maxWidth, tooltipHeight);
  
  // Draw border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(tooltipX + 0.5, tooltipY + 0.5, maxWidth - 1, tooltipHeight - 1);
  
  // Draw text
  ctx.fillStyle = textColor;
  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], tooltipX + padding, tooltipY + padding + i * lineHeight);
  }
}

/**
 * Check if a point is inside a circle
 */
export function isPointInCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Check if a point is inside a rectangle
 */
export function isPointInRect(
  px: number,
  py: number,
  rect: { x: number; y: number; w: number; h: number }
): boolean {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}
