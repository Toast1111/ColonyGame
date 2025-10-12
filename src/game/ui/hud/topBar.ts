/**
 * Top Bar HUD - Resource display, colonist count, day/time
 */

export interface TopBarData {
  res: { 
    wood: number; 
    stone: number; 
    food: number; 
    wheat?: number; 
    bread?: number;
  };
  colonists: number;
  cap: number;
  hiding: number;
  day: number;
  tDay: number; // Time of day (0-1)
  isNight: boolean;
  storage?: { 
    used: number; 
    max: number;
  };
}

/**
 * Draw the top resource/info bar
 */
export function drawTopBar(
  ctx: CanvasRenderingContext2D, 
  canvas: HTMLCanvasElement,
  data: TopBarData,
  game: any
) {
  const PAD = game.scale(game.isTouch ? 14 : 10);
  const BARH = game.scale(game.isTouch ? 56 : 44);
  const W = canvas.width;
  
  // Top bar background
  ctx.fillStyle = '#0b122088'; 
  ctx.fillRect(0, 0, W, BARH);
  ctx.strokeStyle = '#1e293b'; 
  ctx.lineWidth = 1; 
  ctx.strokeRect(0, .5, W, BARH);
  
  // Resource bars
  ctx.fillStyle = '#dbeafe'; 
  ctx.font = game.getScaledFont(game.isTouch ? 18 : 16, '600');
  let x = PAD;
  
  const dynamicSpace = Math.max(
    game.scale(game.isTouch ? 170 : 130), 
    Math.min(game.scale(game.isTouch ? 260 : 220), Math.round(canvas.width * 0.14))
  );
  
  // Core resources
  drawPill(ctx, x, game.scale(12), `Wood: ${Math.floor(data.res.wood)}`, '#b08968', game); 
  x += dynamicSpace;
  drawPill(ctx, x, game.scale(12), `Stone: ${Math.floor(data.res.stone)}`, '#9aa5b1', game); 
  x += dynamicSpace;
  drawPill(ctx, x, game.scale(12), `Food: ${Math.floor(data.res.food)}`, '#9ae6b4', game); 
  x += dynamicSpace;
  
  // Optional resources: wheat and bread
  if ((data.res.wheat || 0) > 0) {
    drawPill(ctx, x, game.scale(12), `Wheat: ${Math.floor(data.res.wheat || 0)}`, '#f4d03f', game); 
    x += dynamicSpace;
  }
  if ((data.res.bread || 0) > 0) {
    drawPill(ctx, x, game.scale(12), `Bread: ${Math.floor(data.res.bread || 0)}`, '#d2691e', game); 
    x += dynamicSpace;
  }
  
  // Storage capacity display
  if (data.storage) {
    const storagePercent = Math.floor(data.storage.used / data.storage.max * 100);
    const storageColor = storagePercent > 90 ? '#ef4444' : storagePercent > 70 ? '#eab308' : '#22c55e';
    drawPill(
      ctx, x, game.scale(12), 
      `Storage: ${Math.floor(data.storage.used)}/${data.storage.max} (${storagePercent}%)`, 
      storageColor, 
      game
    ); 
    x += Math.max(dynamicSpace, game.scale(game.isTouch ? 260 : 200));
  }
  
  // Colonist count
  const popText = `Colonists: ${data.colonists}/${data.cap}`; 
  drawPill(ctx, x, game.scale(12), popText, '#93c5fd', game); 
  x += Math.max(dynamicSpace, game.scale(game.isTouch ? 260 : 210));
  
  // Hiding count
  const hidText = `Hiding: ${data.hiding}`; 
  drawPill(ctx, x, game.scale(12), hidText, '#60a5fa', game); 
  x += Math.max(game.scale(game.isTouch ? 180 : 140), dynamicSpace * 0.9 | 0);
  
  // Format time as HH:MM
  const hour = Math.floor(data.tDay * 24);
  const minute = Math.floor((data.tDay * 24 - hour) * 60);
  const timeText = `Day ${data.day} — ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${data.isNight ? '🌙' : '☀️'}`;
  drawPill(ctx, x, game.scale(12), timeText, data.isNight ? '#ffd166' : '#6ee7ff', game);
}

/**
 * Draw a colored pill/badge with text
 */
function drawPill(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  text: string, 
  color: string, 
  game: any
) {
  const w = ctx.measureText(text).width + game.scale(game.isTouch ? 28 : 24); 
  const h = game.scale(game.isTouch ? 32 : 26);
  
  // Background
  ctx.fillStyle = '#0f172a'; 
  ctx.fillRect(x, y, w, h); 
  ctx.strokeStyle = '#1e293b'; 
  ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
  
  // Color indicator bar
  ctx.fillStyle = color; 
  ctx.fillRect(x + game.scale(3), y + game.scale(3), game.scale(game.isTouch ? 10 : 8), h - game.scale(6));
  
  // Text
  ctx.fillStyle = '#dbeafe'; 
  ctx.fillText(text, x + game.scale(game.isTouch ? 18 : 16), y + game.scale(game.isTouch ? 22 : 18));
}
