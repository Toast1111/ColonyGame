import type { ContextMenuDescriptor, ContextMenuItem } from './contextMenus/types';

type AnyContextMenuDescriptor = ContextMenuDescriptor<any>;

interface ActiveContextMenu extends AnyContextMenuDescriptor {
  visible: boolean;
  x: number;
  y: number;
  openSubmenu?: string;
}

interface ContextMenuRect {
  item: ContextMenuItem;
  x: number;
  y: number;
  w: number;
  h: number;
  isSubmenu?: boolean;
  parentId?: string;
}

export function openContextMenu(game: any, descriptor: AnyContextMenuDescriptor) {
  if (!descriptor.items || descriptor.items.length === 0) {
    hideContextMenu(game);
    return;
  }

  const active: ActiveContextMenu = {
    ...descriptor,
    visible: true,
    x: descriptor.screenX,
    y: descriptor.screenY,
    openSubmenu: descriptor.openSubmenuId,
  };

  game.contextMenu = active;
  game.contextMenuRects = [] as ContextMenuRect[];
}

export function hideContextMenu(game: any) {
  game.contextMenu = null;
  game.contextMenuRects = [];
}

export function drawContextMenu(game: any) {
  const menu: ActiveContextMenu | null = game.contextMenu;
  if (!menu || !menu.visible) return;

  const ctx = game.ctx as CanvasRenderingContext2D;
  ctx.save();

  const itemHeight = game.scale(32);
  const menuWidth = game.scale(220);
  const padding = game.scale(8);
  const iconWidth = game.scale(24);

  const visibleItems = menu.items ?? [];
  const menuHeight = visibleItems.length * itemHeight + padding * 2;

  let menuX = menu.x;
  let menuY = menu.y;
  if (menuX + menuWidth > game.canvas.width) {
    menuX = game.canvas.width - menuWidth - game.scale(10);
  }
  if (menuY + menuHeight > game.canvas.height) {
    menuY = game.canvas.height - menuHeight - game.scale(10);
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(menuX + 3, menuY + 3, menuWidth, menuHeight);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(menuX, menuY, menuWidth, menuHeight);
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1;
  ctx.strokeRect(menuX + 0.5, menuY + 0.5, menuWidth - 1, menuHeight - 1);

  game.contextMenuRects = [];

  let currentY = menuY + padding;
  for (let i = 0; i < visibleItems.length; i++) {
    const item = visibleItems[i];
    const itemY = currentY + i * itemHeight;
    const rect: ContextMenuRect = { item, x: menuX, y: itemY, w: menuWidth, h: itemHeight };
    const enabled = item.enabled !== false;

    const isHovered = isPointInRect(
      game.mouse.x * game.DPR,
      game.mouse.y * game.DPR,
      rect
    );

    game.contextMenuRects.push(rect);

    if (isHovered && enabled) {
      ctx.fillStyle = '#374151';
      ctx.fillRect(menuX + 1, itemY, menuWidth - 2, itemHeight);
    }

    const isOpen = item.submenu && menu.openSubmenu === item.id;
    if (isOpen) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(menuX + 1, itemY, menuWidth - 2, itemHeight);
    }

    const icon = item.icon ?? '';

    ctx.fillStyle = enabled ? '#f1f5f9' : '#6b7280';
    ctx.font = game.getScaledFont(16, '400');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (icon) {
      ctx.fillText(icon, menuX + padding, itemY + itemHeight / 2);
    }

    ctx.fillStyle = enabled ? '#f1f5f9' : '#6b7280';
    ctx.font = game.getScaledFont(14, '400');
    ctx.fillText(item.label, menuX + padding + (icon ? iconWidth : 0), itemY + itemHeight / 2);

    if (item.submenu && item.submenu.length > 0) {
      ctx.fillStyle = enabled ? '#9ca3af' : '#4b5563';
      const arrow = isOpen ? '▼' : '▶';
      ctx.fillText(arrow, menuX + menuWidth - padding - game.scale(16), itemY + itemHeight / 2);
      if (isOpen) {
        drawSubmenu(game, item, menuX + menuWidth + game.scale(5), itemY);
      }
    }
  }

  ctx.restore();
}

function drawSubmenu(game: any, parentItem: ContextMenuItem, x: number, y: number) {
  const submenu = parentItem.submenu ?? [];
  if (submenu.length === 0) return;

  const ctx = game.ctx as CanvasRenderingContext2D;

  const itemHeight = game.scale(30);
  const submenuWidth = game.scale(200);
  const padding = game.scale(8);
  const iconWidth = game.scale(22);

  const submenuHeight = submenu.length * itemHeight + padding * 2;

  let submenuX = x;
  let submenuY = y;
  if (submenuX + submenuWidth > game.canvas.width) {
    submenuX = x - submenuWidth - game.scale(225);
  }
  if (submenuY + submenuHeight > game.canvas.height) {
    submenuY = game.canvas.height - submenuHeight - game.scale(10);
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(submenuX + 3, submenuY + 3, submenuWidth, submenuHeight);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(submenuX, submenuY, submenuWidth, submenuHeight);
  ctx.strokeStyle = '#374151';
  ctx.strokeRect(submenuX + 0.5, submenuY + 0.5, submenuWidth - 1, submenuHeight - 1);

  for (let i = 0; i < submenu.length; i++) {
    const item = submenu[i];
    const itemY = submenuY + padding + i * itemHeight;
    const enabled = item.enabled !== false;

    const rect: ContextMenuRect = {
      item,
      x: submenuX,
      y: itemY,
      w: submenuWidth,
      h: itemHeight,
      isSubmenu: true,
      parentId: parentItem.id,
    };

    const isHovered = isPointInRect(
      game.mouse.x * game.DPR,
      game.mouse.y * game.DPR,
      rect
    );

    game.contextMenuRects.push(rect);

    if (isHovered && enabled) {
      ctx.fillStyle = '#374151';
      ctx.fillRect(submenuX + 1, itemY, submenuWidth - 2, itemHeight);
    }

    const icon = item.icon ?? '';

    ctx.fillStyle = enabled ? '#f1f5f9' : '#6b7280';
    ctx.font = game.getScaledFont(14, '400');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (icon) {
      ctx.fillText(icon, submenuX + padding, itemY + itemHeight / 2);
    }

    ctx.fillStyle = enabled ? '#f1f5f9' : '#6b7280';
    ctx.font = game.getScaledFont(13, '400');
    ctx.fillText(item.label, submenuX + padding + (icon ? iconWidth : 0), itemY + itemHeight / 2);
  }
}

function isPointInRect(x: number, y: number, rect: { x: number; y: number; w: number; h: number }): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
