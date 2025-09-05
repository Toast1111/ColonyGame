export function showContextMenu(game: any, colonist: any, screenX: number, screenY: number) {
  const isIdle = !colonist.task || colonist.task === 'idle';
  const isInjured = colonist.hp < 50;
  const isHungry = (colonist.hunger || 0) > 60;
  const isTired = (colonist.fatigue || 0) > 60;
  game.contextMenu = {
    visible: true, x: screenX, y: screenY, target: colonist, openSubmenu: undefined,
    items: [
      { id: 'prioritize', label: 'Prioritize', icon: '⚡', enabled: true, submenu: [
        { id: 'prioritize_work', label: 'Work Tasks', icon: '🔨', enabled: true },
        { id: 'prioritize_build', label: 'Construction', icon: '🏗️', enabled: true },
        { id: 'prioritize_haul', label: 'Hauling', icon: '📦', enabled: true },
        { id: 'prioritize_research', label: 'Research', icon: '🔬', enabled: true },
      ]},
      { id: 'force', label: 'Force', icon: '❗', enabled: true, submenu: [
        { id: 'force_rest', label: 'Rest Now', icon: '😴', enabled: isTired },
        { id: 'force_eat', label: 'Eat Now', icon: '🍽️', enabled: isHungry },
        { id: 'force_work', label: 'Work', icon: '⚒️', enabled: isIdle },
        { id: 'force_guard', label: 'Guard Area', icon: '🛡️', enabled: true },
      ]},
      { id: 'goto', label: 'Go To', icon: '🎯', enabled: true, submenu: [
        { id: 'goto_hq', label: 'HQ', icon: '🏠', enabled: true },
        { id: 'goto_safety', label: 'Safe Room', icon: '🛡️', enabled: true },
        { id: 'goto_bed', label: 'Nearest Bed', icon: '🛏️', enabled: true },
        { id: 'goto_food', label: 'Food Storage', icon: '🥘', enabled: true },
      ]},
      { id: 'medical', label: 'Medical', icon: '🏥', enabled: isInjured, submenu: [
        { id: 'medical_treat', label: 'Treat Wounds', icon: '🩹', enabled: isInjured },
        { id: 'medical_rest', label: 'Bed Rest', icon: '🛌', enabled: isInjured },
        { id: 'medical_surgery', label: 'Surgery', icon: '⚕️', enabled: false },
      ]},
      { id: 'cancel', label: 'Cancel Current Task', icon: '❌', enabled: !!colonist.target },
      { id: 'follow', label: game.follow && game.selColonist === colonist ? 'Stop Following' : 'Follow', icon: '👁️', enabled: true },
    ]
  };
}

export function hideContextMenu(game: any) {
  game.contextMenu = null; game.contextMenuRects = [];
}

export function drawContextMenu(game: any) {
  if (!game.contextMenu || !game.contextMenu.visible) return;
  const ctx = game.ctx as CanvasRenderingContext2D;
  const menu = game.contextMenu;
  ctx.save();
  const itemHeight = game.scale(32);
  const menuWidth = game.scale(220);
  const padding = game.scale(8);
  const iconWidth = game.scale(24);
  const visibleItems = menu.items;
  const menuHeight = visibleItems.length * itemHeight + padding * 2;
  let menuX = menu.x, menuY = menu.y;
  if (menuX + menuWidth > game.canvas.width) menuX = game.canvas.width - menuWidth - game.scale(10);
  if (menuY + menuHeight > game.canvas.height) menuY = game.canvas.height - menuHeight - game.scale(10);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fillRect(menuX + 3, menuY + 3, menuWidth, menuHeight);
  ctx.fillStyle = '#1e293b'; ctx.fillRect(menuX, menuY, menuWidth, menuHeight);
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.strokeRect(menuX + 0.5, menuY + 0.5, menuWidth - 1, menuHeight - 1);
  game.contextMenuRects = [];
  let currentY = menuY + padding;
  for (let i = 0; i < visibleItems.length; i++) {
    const item = visibleItems[i];
    const itemY = currentY + i * itemHeight;
    const isHovered = isPointInRect(game.mouse.x * game.DPR, game.mouse.y * game.DPR, { x: menuX, y: itemY, w: menuWidth, h: itemHeight });
    game.contextMenuRects.push({ id: item.id, x: menuX, y: itemY, w: menuWidth, h: itemHeight });
    if (isHovered && item.enabled) { ctx.fillStyle = '#374151'; ctx.fillRect(menuX + 1, itemY, menuWidth - 2, itemHeight); }
    if (item.submenu && menu.openSubmenu === item.id) { ctx.fillStyle = '#475569'; ctx.fillRect(menuX + 1, itemY, menuWidth - 2, itemHeight); }
    ctx.fillStyle = item.enabled ? '#f1f5f9' : '#6b7280';
    ctx.font = game.getScaledFont(16, '400'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(item.icon, menuX + padding, itemY + itemHeight / 2);
    ctx.fillStyle = item.enabled ? '#f1f5f9' : '#6b7280'; ctx.font = game.getScaledFont(14, '400');
    ctx.fillText(item.label, menuX + padding + iconWidth, itemY + itemHeight / 2);
    if (item.submenu) {
      ctx.fillStyle = item.enabled ? '#9ca3af' : '#4b5563';
      const arrow = menu.openSubmenu === item.id ? '▼' : '▶';
      ctx.fillText(arrow, menuX + menuWidth - padding - game.scale(16), itemY + itemHeight / 2);
      if (menu.openSubmenu === item.id) drawSubmenu(game, item, menuX + menuWidth + game.scale(5), itemY);
    }
  }
  ctx.restore();
}

function drawSubmenu(game: any, parentItem: any, x: number, y: number) {
  const ctx = game.ctx as CanvasRenderingContext2D;
  const submenu = parentItem.submenu; if (!submenu || submenu.length === 0) return;
  const itemHeight = game.scale(30); const submenuWidth = game.scale(200); const padding = game.scale(8); const iconWidth = game.scale(22);
  const submenuHeight = submenu.length * itemHeight + padding * 2;
  let submenuX = x, submenuY = y;
  if (submenuX + submenuWidth > game.canvas.width) submenuX = x - submenuWidth - game.scale(225);
  if (submenuY + submenuHeight > game.canvas.height) submenuY = game.canvas.height - submenuHeight - game.scale(10);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fillRect(submenuX + 3, submenuY + 3, submenuWidth, submenuHeight);
  ctx.fillStyle = '#1e293b'; ctx.fillRect(submenuX, submenuY, submenuWidth, submenuHeight);
  ctx.strokeStyle = '#374151'; ctx.strokeRect(submenuX + 0.5, submenuY + 0.5, submenuWidth - 1, submenuHeight - 1);
  for (let i = 0; i < submenu.length; i++) {
    const item = submenu[i]; const itemY = submenuY + padding + i * itemHeight;
    const isHovered = isPointInRect(game.mouse.x * game.DPR, game.mouse.y * game.DPR, { x: submenuX, y: itemY, w: submenuWidth, h: itemHeight });
    game.contextMenuRects.push({ id: item.id, x: submenuX, y: itemY, w: submenuWidth, h: itemHeight, isSubmenu: true, parentId: parentItem.id });
    if (isHovered && item.enabled) { ctx.fillStyle = '#374151'; ctx.fillRect(submenuX + 1, itemY, submenuWidth - 2, itemHeight); }
    ctx.fillStyle = item.enabled ? '#f1f5f9' : '#6b7280'; ctx.font = game.getScaledFont(14, '400'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(item.icon, submenuX + padding, itemY + itemHeight / 2);
    ctx.fillStyle = item.enabled ? '#f1f5f9' : '#6b7280'; ctx.font = game.getScaledFont(13, '400');
    ctx.fillText(item.label, submenuX + padding + iconWidth, itemY + itemHeight / 2);
  }
}

function isPointInRect(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
