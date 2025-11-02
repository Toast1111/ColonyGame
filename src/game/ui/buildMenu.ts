import { BUILD_TYPES, groupByCategory } from "../buildings";

// Draw the Build Menu panel
export function drawBuildMenu(game: any) {
  const ctx = game.ctx as CanvasRenderingContext2D;
  const cw = game.canvas.width; 
  const ch = game.canvas.height;

  const isTouch = game.isTouch;
  const W = Math.min(game.scale(isTouch ? 980 : 860), cw - game.scale(isTouch ? 28 : 40));
  const H = Math.min(game.scale(isTouch ? 720 : 620), ch - game.scale(isTouch ? 60 : 80));
  const X = (cw - W) / 2; 
  const Y = (ch - H) / 2;

  ctx.save();
  ctx.fillStyle = '#0b1628dd'; 
  ctx.fillRect(X, Y, W, H);
  ctx.strokeStyle = '#1e293b'; 
  ctx.strokeRect(X + .5, Y + .5, W - 1, H - 1);

  ctx.fillStyle = '#dbeafe'; 
  ctx.font = game.getScaledFont(isTouch ? 22 : 18, '600'); 
  ctx.fillText('Build Menu (B to close)', X + game.scale(14), Y + game.scale(24));

  const groups = groupByCategory(BUILD_TYPES, game);
  const cats = Object.keys(groups);
  const padding = game.scale(isTouch ? 36 : 28);
  const colW = Math.floor((W - padding) / Math.max(1, cats.length));

  game.menuRects = [];
  let hoveredItem: { key: keyof typeof BUILD_TYPES; desc: string } | null = null;

  for (let i = 0; i < cats.length; i++) {
    const cx = X + game.scale(12) + i * colW; 
    let cy = Y + game.scale(50);
    const cat = cats[i];

    ctx.fillStyle = '#93c5fd'; 
    ctx.font = game.getScaledFont(isTouch ? 18 : 15, '600');
    ctx.fillText(cat, cx, cy);
    cy += game.scale(isTouch ? 12 : 8);

    const items = groups[cat];
    for (const [key, d] of items) {
      cy += game.scale(isTouch ? 12 : 8);
      const rowH = game.scale(isTouch ? 78 : 58);
      const rw = colW - game.scale(18); 
      const rx = cx; 
      const ry = cy;

      const mx = game.mouse.x * game.DPR;
      const my = game.mouse.y * game.DPR;
      const isHoveredRow = mx >= rx && mx <= rx + rw && my >= ry && my <= ry + rowH;

      ctx.fillStyle = (game.selectedBuild === key) ? '#102034' : (isHoveredRow ? '#1a1f2e' : '#0f172a');
      ctx.fillRect(rx, ry, rw, rowH);
      ctx.strokeStyle = (game.selectedBuild === key) ? '#4b9fff' : (isHoveredRow ? '#3b82f6' : '#1e293b');
      ctx.strokeRect(rx + .5, ry + .5, rw - 1, rowH - 1);

      // Name
      ctx.fillStyle = '#dbeafe'; 
      ctx.font = game.getScaledFont(isTouch ? 18 : 15, '600');
      ctx.fillText(d.name, rx + game.scale(10), ry + game.scale(isTouch ? 22 : 18));

      // Cost
      const cost = game.costText(d.cost || {});
      ctx.fillStyle = '#9fb3c8'; 
      ctx.font = game.getScaledFont(isTouch ? 14 : 12);
      const costWidth = Math.min(game.scale(isTouch ? 120 : 100), ctx.measureText(cost).width + game.scale(4));
      ctx.fillText(cost, rx + rw - costWidth, ry + game.scale(isTouch ? 22 : 18));

      // Description (truncate)
      if (d.description) {
        ctx.fillStyle = '#94a3b8'; 
        ctx.font = game.getScaledFont(isTouch ? 14 : 12);
        const maxDescWidth = rw - game.scale(18);
        let desc = d.description;
        while (ctx.measureText(desc).width > maxDescWidth && desc.length > 10) {
          desc = desc.substring(0, desc.length - 4) + '...';
        }
        ctx.fillText(desc, rx + game.scale(10), ry + game.scale(isTouch ? 46 : 36));
      }

      if (isHoveredRow && d.description) {
        hoveredItem = { key: key as keyof typeof BUILD_TYPES, desc: d.description };
      }

      game.menuRects.push({ key: key as keyof typeof BUILD_TYPES, x: rx, y: ry, w: rw, h: rowH });
      cy += rowH;
      if (cy > Y + H - game.scale(isTouch ? 90 : 70)) break;
    }
  }

  // Tooltip
  if (hoveredItem) {
    const tooltipPadding = game.scale(isTouch ? 16 : 14);
    const tooltipMaxWidth = game.scale(isTouch ? 420 : 360);
    ctx.font = game.getScaledFont(isTouch ? 16 : 14);
    const lines = wrapText(game, hoveredItem.desc, tooltipMaxWidth - tooltipPadding * 2);
    const lineHeight = game.scale(isTouch ? 20 : 18);
    const tooltipHeight = lines.length * lineHeight + tooltipPadding * 2;
    const mx = game.mouse.x * game.DPR;
    const my = game.mouse.y * game.DPR;
    let tooltipX = mx + game.scale(20);
    let tooltipY = my - tooltipHeight - game.scale(10);
    if (tooltipX + tooltipMaxWidth > cw) tooltipX = mx - tooltipMaxWidth - game.scale(20);
    if (tooltipY < 0) tooltipY = my + game.scale(20);
    ctx.fillStyle = '#0f1419f0';
    ctx.fillRect(tooltipX, tooltipY, tooltipMaxWidth, tooltipHeight);
    ctx.strokeStyle = '#374151';
    ctx.strokeRect(tooltipX + .5, tooltipY + .5, tooltipMaxWidth - 1, tooltipHeight - 1);
    ctx.fillStyle = '#e5e7eb';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], tooltipX + tooltipPadding, tooltipY + tooltipPadding + (i + 1) * lineHeight - game.scale(4));
    }
  }

  // Instructions
  ctx.fillStyle = '#9fb3c8'; 
  ctx.font = game.getScaledFont(isTouch ? 16 : 14);
  const instructionText = 'Click an item to select • Hover for details • Press B to close';
  const textWidth = ctx.measureText(instructionText).width;
  ctx.fillText(instructionText, (cw - textWidth) / 2, Y + H + game.scale(isTouch ? 30 : 24));

  ctx.restore();
}

export function handleBuildMenuClick(game: any) {
  const mx = game.mouse.x * game.DPR; const my = game.mouse.y * game.DPR;
  for (const r of game.menuRects) {
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      game.selectedBuild = r.key; game.showBuildMenu = false; game.toast('Selected: ' + BUILD_TYPES[r.key].name); return;
    }
  }
  game.showBuildMenu = false;
}

function wrapText(game: any, text: string, maxWidth: number): string[] {
  const ctx = game.ctx as CanvasRenderingContext2D;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (ctx.measureText(testLine).width <= maxWidth) currentLine = testLine;
    else { if (currentLine) lines.push(currentLine); currentLine = word; }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
