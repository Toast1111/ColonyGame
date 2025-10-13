/**
 * UI Rendering Utilities
 * 
 * Reusable rendering functions for UI elements and icons.
 * These functions draw UI components, badges, and icons that appear
 * on top of the game world or in UI panels.
 */

import { COLORS } from "../constants";

/**
 * Draw a tiny person icon for UI badges
 * Used in colonist counts, occupancy indicators, etc.
 */
export function drawPersonIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size = 10, color = COLORS.colonist) {
  ctx.save();
  ctx.translate(x, y);
  
  // Shadow/outline for readability
  const outline = '#0b0f14';
  
  // Head
  const hr = size * 0.32;
  const hy = -size * 0.3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, hy, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, hy, hr + 0.5, 0, Math.PI * 2);
  ctx.stroke();
  
  // Body (torso)
  const bw = size * 0.55;
  const bh = size * 0.55;
  const by = -size * 0.05;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-bw / 2, by - bh / 2);
  ctx.lineTo(bw / 2, by - bh / 2);
  ctx.lineTo(bw / 2, by + bh / 2);
  ctx.lineTo(-bw / 2, by + bh / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.stroke();
  
  // Legs
  const lw = size * 0.18;
  const lh = size * 0.5;
  const ly = by + bh / 2 + lh * 0.1;
  ctx.fillStyle = color;
  ctx.fillRect(-lw - 0.6, ly - lh, lw, lh);
  ctx.fillRect(0.6, ly - lh, lw, lh);
  ctx.strokeStyle = outline;
  ctx.strokeRect(-lw - 0.6, ly - lh, lw, lh);
  ctx.strokeRect(0.6, ly - lh, lw, lh);
  
  ctx.restore();
}

/**
 * Draw a small shield icon for defense/cover indicators
 * Used in combat UI, colonist status, etc.
 */
export function drawShieldIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size = 12, color = '#60a5fa') {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0b0f14';
  ctx.lineWidth = 1;
  
  // Shield path
  ctx.beginPath();
  const w = size;
  const h = size * 1.2;
  ctx.moveTo(0, -h * 0.5);
  ctx.lineTo(w * 0.35, -h * 0.25);
  ctx.lineTo(w * 0.35, h * 0.1);
  ctx.quadraticCurveTo(0, h * 0.55, -w * 0.35, h * 0.1);
  ctx.lineTo(-w * 0.35, -h * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();
}
