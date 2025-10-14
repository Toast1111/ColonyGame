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
  const PAD = game.scale(game.isTouch ? 16 : 12);
  const BARH = game.scale(game.isTouch ? 60 : 46);
  const W = canvas.width;

  const gradient = ctx.createLinearGradient(0, 0, 0, BARH);
  gradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
  gradient.addColorStop(1, 'rgba(11, 18, 31, 0.82)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, BARH);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, BARH - 1);

  ctx.save();
  ctx.font = game.getScaledFont(game.isTouch ? 18 : 15, '600');
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const pillHeight = getPillHeight(game);
  const baseY = (BARH - pillHeight) / 2;
  const gap = game.scale(game.isTouch ? 12 : 10);
  const resourceWidth = game.scale(game.isTouch ? 150 : 128);
  const storageWidth = game.scale(game.isTouch ? 190 : 168);
  const populationWidth = game.scale(game.isTouch ? 210 : 182);
  const timeWidth = game.scale(game.isTouch ? 220 : 190);

  const leftItems: PillRenderOptions[] = [];

  leftItems.push({ text: `Wood ${formatValue(data.res.wood)}`, color: '#d97706', minWidth: resourceWidth });
  leftItems.push({ text: `Stone ${formatValue(data.res.stone)}`, color: '#9aa5b1', minWidth: resourceWidth });
  leftItems.push({ text: `Food ${formatValue(data.res.food)}`, color: '#4ade80', minWidth: resourceWidth });

  if ((data.res.wheat || 0) > 0) {
    leftItems.push({ text: `Wheat ${formatValue(data.res.wheat || 0)}`, color: '#facc15', minWidth: resourceWidth });
  }
  if ((data.res.bread || 0) > 0) {
    leftItems.push({ text: `Bread ${formatValue(data.res.bread || 0)}`, color: '#ea580c', minWidth: resourceWidth });
  }

  if (data.storage) {
    const storagePercent = Math.round((data.storage.used / data.storage.max) * 100);
    const storageColor = storagePercent > 92 ? '#f87171' : storagePercent > 75 ? '#facc15' : '#34d399';
    leftItems.push({
      text: `Storage ${formatValue(data.storage.used)}/${formatValue(data.storage.max)} (${storagePercent}%)`,
      color: storageColor,
      minWidth: storageWidth
    });
  }

  const hour = Math.floor(data.tDay * 24);
  const minute = Math.floor((data.tDay * 24 - hour) * 60);
  const clock = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const timeText = `Day ${data.day} · ${clock}`;

  const rightItems: PillRenderOptions[] = [
    {
      text: `Crew ${data.colonists}/${data.cap}${data.hiding ? ` · Hidden ${data.hiding}` : ''}`,
      color: '#60a5fa',
      minWidth: populationWidth
    },
    {
      text: timeText,
      color: data.isNight ? '#fcd34d' : '#67e8f9',
      minWidth: timeWidth
    }
  ];

  const rightBlockWidth = measureBlockWidth(ctx, rightItems, gap, game);
  const guardX = W - PAD - rightBlockWidth - gap;

  let x = PAD;
  for (const item of leftItems) {
    const width = measurePillWidth(ctx, item, game);
    if (x + width > guardX) {
      break;
    }
    drawPill(ctx, x, baseY, item, game);
    x += width + gap;
  }

  let rightX = W - PAD;
  for (let i = 0; i < rightItems.length; i++) {
    const item = rightItems[i];
    const width = measurePillWidth(ctx, item, game);
    rightX -= width;
    drawPill(ctx, rightX, baseY, item, game);
    rightX -= gap;
  }

  ctx.restore();
}

interface PillRenderOptions {
  text: string;
  color: string;
  minWidth?: number;
}

function getPillHeight(game: any): number {
  return game.scale(game.isTouch ? 36 : 28);
}

function measurePillWidth(
  ctx: CanvasRenderingContext2D,
  options: PillRenderOptions,
  game: any
): number {
  const padX = game.scale(game.isTouch ? 16 : 14);
  const colorBarWidth = game.scale(game.isTouch ? 10 : 8);
  const barGap = game.scale(game.isTouch ? 8 : 6);
  const baseWidth = ctx.measureText(options.text).width + padX * 2 + colorBarWidth + barGap;
  return Math.max(options.minWidth ?? 0, Math.ceil(baseWidth));
}

function measureBlockWidth(
  ctx: CanvasRenderingContext2D,
  items: PillRenderOptions[],
  gap: number,
  game: any
): number {
  if (items.length === 0) return 0;
  let total = 0;
  for (const item of items) {
    total += measurePillWidth(ctx, item, game);
  }
  total += gap * (items.length - 1);
  return total;
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: PillRenderOptions,
  game: any
): number {
  const padX = game.scale(game.isTouch ? 16 : 14);
  const colorBarWidth = game.scale(game.isTouch ? 10 : 8);
  const barGap = game.scale(game.isTouch ? 8 : 6);
  const height = getPillHeight(game);
  const width = measurePillWidth(ctx, options, game);
  const rectX = x;
  const rectY = y;

  const radius = Math.min(height / 2, game.scale(game.isTouch ? 12 : 10));
  drawRoundedRect(ctx, rectX, rectY, width, height, radius);
  ctx.fillStyle = '#0f172acc';
  ctx.fill();
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = options.color;
  ctx.fillRect(rectX + padX - game.scale(6), rectY + game.scale(6), colorBarWidth, height - game.scale(12));

  ctx.fillStyle = '#e2e8f0';
  const textX = rectX + padX + colorBarWidth + barGap;
  const textY = rectY + height / 2;
  ctx.fillText(options.text, textX, textY);

  return width;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function formatValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  }
  if (abs >= 10_000) {
    return `${Math.floor(value / 1_000)}k`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return `${Math.floor(value)}`;
}
