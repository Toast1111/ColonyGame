/**
 * Hotbar HUD - Bottom building selection ribbon (1-9 keys)
 */

export interface HotbarItem {
  key: string;
  name: string;
  cost: string;
  selected: boolean;
}

export interface HotbarRect {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Draw the bottom hotbar with building shortcuts
 */
export function drawHotbar(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  items: HotbarItem[],
  game: any
): HotbarRect[] {
  const PAD = game.scale(game.isTouch ? 14 : 10);
  const hbY = canvas.height - game.scale(game.isTouch ? 86 : 64); 
  const hbItemW = Math.max(
    game.scale(game.isTouch ? 170 : 140), 
    Math.min(game.scale(game.isTouch ? 260 : 220), (canvas.width - PAD * 2) / items.length)
  );
  let x = PAD;
  
  // Hotbar background
  ctx.fillStyle = '#0b122088'; 
  ctx.fillRect(0, hbY, canvas.width, game.scale(game.isTouch ? 86 : 64));
  ctx.strokeStyle = '#1e293b'; 
  ctx.strokeRect(0, hbY + .5, canvas.width, game.scale(game.isTouch ? 86 : 64));
  ctx.font = game.getScaledFont(game.isTouch ? 17 : 15);
  
  const rects: HotbarRect[] = [];
  
  // Draw each hotbar slot
  for (let i = 0; i < items.length; i++) {
    const h = items[i];
    const rx = x + game.scale(2);
    const ry = hbY + game.scale(game.isTouch ? 14 : 10);
    const rw = hbItemW - game.scale(6);
    const rh = game.scale(game.isTouch ? 60 : 44);
    
    drawHotbarSlot(ctx, rx, ry, rw, rh, `${i + 1}. ${h.name}`, h.cost, h.selected, game);
    
    // Record rect for click/tap detection
    rects[i] = { index: i, x: rx, y: ry, w: rw, h: rh };
    
    x += hbItemW;
  }
  
  return rects;
}

/**
 * Draw a single hotbar slot
 */
function drawHotbarSlot(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  w: number, 
  h: number, 
  label: string, 
  cost: string, 
  selected: boolean, 
  game: any
) {
  // Background (highlight if selected)
  ctx.fillStyle = selected ? '#102034' : '#0f172a'; 
  ctx.fillRect(x, y, w, h);
  
  // Border (blue if selected)
  ctx.strokeStyle = selected ? '#4b9fff' : '#1e293b'; 
  ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  
  // Building name with number key
  ctx.fillStyle = '#dbeafe'; 
  ctx.fillText(label, x + game.scale(10), y + game.scale(game.isTouch ? 36 : 28));
  
  // Cost display
  ctx.fillStyle = '#9fb3c8'; 
  ctx.fillText(cost, x + w - game.scale(game.isTouch ? 66 : 56), y + game.scale(game.isTouch ? 36 : 28));
}
