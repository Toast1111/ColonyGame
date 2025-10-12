/**
 * Messages HUD - Toast notifications
 */

import type { Message } from '../../types';

/**
 * Draw toast messages
 */
export function drawMessages(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  messages: Message[],
  game: any
) {
  const PAD = game.scale(game.isTouch ? 14 : 10);
  const BARH = game.scale(game.isTouch ? 56 : 44);
  const W = canvas.width;
  
  // Messages - responsive positioning below top bar
  let my = BARH + game.scale(game.isTouch ? 12 : 8);
  const msgWidth = Math.min(game.scale(game.isTouch ? 520 : 420), canvas.width - PAD * 2);
  
  // Draw messages from bottom to top (newest at bottom)
  for (let i = messages.length - 1; i >= 0; i--) { 
    const m = messages[i]; 
    drawMessage(ctx, W - msgWidth - PAD, my, m.text, msgWidth, game); 
    my += game.scale(game.isTouch ? 34 : 26); 
  }
}

/**
 * Draw a single toast message
 */
function drawMessage(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  text: string, 
  width: number, 
  game: any
) {
  const h = game.scale(game.isTouch ? 30 : 24);
  
  // Background
  ctx.fillStyle = '#0f172aee'; 
  ctx.fillRect(x, y, width, h);
  ctx.strokeStyle = '#1e293b'; 
  ctx.strokeRect(x + .5, y + .5, width - 1, h - 1);
  
  // Text
  ctx.fillStyle = '#dbeafe'; 
  ctx.fillText(text, x + game.scale(10), y + game.scale(game.isTouch ? 20 : 16));
}
