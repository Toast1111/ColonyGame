import type { ContextMenuDescriptor } from './contextMenus/types';
import type { Building, Colonist } from '../types';
import { getContextMenuState, hideContextMenuState, showContextMenu } from '../../react';

export function openContextMenu(game: any, descriptor: ContextMenuDescriptor<any>) {
  if (!descriptor.items || descriptor.items.length === 0) {
    hideContextMenu(game);
    return;
  }

  const rect = game?.canvas?.getBoundingClientRect?.();
  const x = rect ? rect.left + descriptor.screenX : descriptor.screenX;
  const y = rect ? rect.top + descriptor.screenY : descriptor.screenY;

  showContextMenu({
    x,
    y,
    items: descriptor.items,
    target: descriptor.target,
    onSelect: descriptor.onSelect,
    openSubmenuId: descriptor.openSubmenuId
  });

  try { (window as any).game?.audioManager?.play('ui.panel.open'); } catch {}
}

export function hideContextMenu(_game?: any) {
  hideContextMenuState();
  try { (window as any).game?.audioManager?.play('ui.panel.close'); } catch {}
}

export function isContextMenuOpen(): boolean {
  return getContextMenuState().visible;
}

/**
 * Draws the long press progress indicator for context menu activation
 * This was moved here from Game.ts where it didn't belong and wasn't working properly
 */
export function drawLongPressProgress(game: any): void {
  if (!game.longPressStartTime || !game.longPressTarget || !game.longPressStartPos) return;
  
  const ctx = game.ctx;
  const currentTime = performance.now();
  const elapsed = currentTime - game.longPressStartTime;
  const progress = Math.min(elapsed / 500, 1); // 500ms total duration
  
  if (progress >= 1) return; // Don't draw when complete
  
  // Convert world position to screen position
  const target = game.longPressTarget;
  const isBuildingTarget = game.longPressTargetType === 'building';
  const worldPos = isBuildingTarget && target
    ? game.centerOf(target as Building)
    : { x: (target as Colonist).x, y: (target as Colonist).y };

  const screenX = (worldPos.x - game.camera.x) * game.camera.zoom;
  const screenY = (worldPos.y - game.camera.y) * game.camera.zoom;
  
  ctx.save();
  
  // Draw progress circle
  const radius = game.scale(20);
  const centerX = screenX;
  const centerY = screenY;
  
  // Background circle
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = game.scale(3);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Progress arc
  ctx.strokeStyle = '#60a5fa'; // Blue color
  ctx.lineWidth = game.scale(3);
  ctx.lineCap = 'round';
  ctx.beginPath();
  const startAngle = -Math.PI / 2; // Start at top
  const endAngle = startAngle + (progress * Math.PI * 2);
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.stroke();
  
  // Inner pulse effect
  if (progress > 0.3) {
    const pulseAlpha = Math.sin((elapsed / 100) * Math.PI) * 0.3 + 0.1;
    ctx.fillStyle = `rgba(96, 165, 250, ${pulseAlpha})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Context menu icon hint
  if (progress > 0.5) {
    ctx.fillStyle = '#ffffff';
    ctx.font = game.getScaledFont(12, '600');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚙️', centerX, centerY);
  }
  
  ctx.restore();
}
