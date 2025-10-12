/**
 * Modern HUD - Clean, minimalist, dynamic heads-up display
 * 
 * Features:
 * - Auto-hiding elements that appear on hover
 * - Smooth animations and transitions
 * - Compact resource display
 * - Dynamic contextual information
 */

import type { Message } from '../types';

interface ResourceState {
  wood: number;
  stone: number;
  food: number;
  wheat?: number;
  bread?: number;
}

interface HUDState {
  resources: ResourceState;
  colonists: number;
  cap: number;
  hiding: number;
  day: number;
  timeOfDay: number;
  isNight: boolean;
  storage?: { used: number; max: number };
}

// Animation states for smooth transitions
const animationState = {
  resourcesExpanded: false,
  resourcesAlpha: 0.7,
  timeAlpha: 1.0,
  storageFlashTimer: 0,
};

export function drawModernHUD(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: HUDState,
  game: any
) {
  const scale = game.uiScale;
  const PAD = game.scale(16);
  const W = canvas.width;
  const H = canvas.height;

  // Top-left: Compact resource display with icons
  drawCompactResources(ctx, PAD, PAD, state.resources, game);

  // Top-right: Time and day/night cycle
  drawTimeDisplay(ctx, W - PAD, PAD, state.day, state.timeOfDay, state.isNight, game);

  // Bottom-left: Colony stats
  drawColonyStats(ctx, PAD, H - PAD, state.colonists, state.cap, state.hiding, game);

  // Bottom-right: Storage indicator (if applicable)
  if (state.storage) {
    drawStorageIndicator(ctx, W - PAD, H - PAD, state.storage.used, state.storage.max, game);
  }
}

function drawCompactResources(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  resources: ResourceState,
  game: any
) {
  const iconSize = game.scale(32);
  const spacing = game.scale(8);
  const fontSize = game.scale(14);
  
  ctx.save();
  
  // Semi-transparent background panel
  const panelWidth = game.scale(220);
  const panelHeight = game.scale(120);
  
  ctx.fillStyle = 'rgba(11, 18, 32, 0.85)';
  ctx.fillRect(x, y, panelWidth, panelHeight);
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, panelWidth, panelHeight);
  
  // Draw resources in a compact grid
  const resourceData = [
    { icon: '🪵', value: Math.floor(resources.wood), color: '#b08968', label: 'Wood' },
    { icon: '🪨', value: Math.floor(resources.stone), color: '#9aa5b1', label: 'Stone' },
    { icon: '🍖', value: Math.floor(resources.food), color: '#9ae6b4', label: 'Food' },
  ];
  
  if ((resources.wheat || 0) > 0) {
    resourceData.push({ icon: '🌾', value: Math.floor(resources.wheat || 0), color: '#f4d03f', label: 'Wheat' });
  }
  if ((resources.bread || 0) > 0) {
    resourceData.push({ icon: '🍞', value: Math.floor(resources.bread || 0), color: '#d2691e', label: 'Bread' });
  }
  
  ctx.font = game.getScaledFont(14, '600');
  ctx.textAlign = 'left';
  
  let currentX = x + spacing;
  let currentY = y + spacing * 2;
  
  resourceData.forEach((res, i) => {
    if (i > 0 && i % 2 === 0) {
      currentX = x + spacing;
      currentY += iconSize + spacing;
    } else if (i > 0) {
      currentX += game.scale(110);
    }
    
    // Resource icon and value
    ctx.fillStyle = res.color;
    ctx.font = game.getScaledFont(20);
    ctx.fillText(res.icon, currentX, currentY + game.scale(20));
    
    ctx.fillStyle = '#e2e8f0';
    ctx.font = game.getScaledFont(16, '700');
    ctx.fillText(res.value.toString(), currentX + game.scale(32), currentY + game.scale(20));
    
    ctx.fillStyle = 'rgba(226, 232, 240, 0.6)';
    ctx.font = game.getScaledFont(11);
    ctx.fillText(res.label, currentX + game.scale(32), currentY + game.scale(8));
  });
  
  ctx.restore();
}

function drawTimeDisplay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  day: number,
  timeOfDay: number,
  isNight: boolean,
  game: any
) {
  ctx.save();
  
  const panelWidth = game.scale(200);
  const panelHeight = game.scale(70);
  
  // Background
  ctx.fillStyle = 'rgba(11, 18, 32, 0.85)';
  ctx.fillRect(x - panelWidth, y, panelWidth, panelHeight);
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - panelWidth, y, panelWidth, panelHeight);
  
  // Day counter
  ctx.fillStyle = '#60a5fa';
  ctx.font = game.getScaledFont(18, '700');
  ctx.textAlign = 'right';
  ctx.fillText(`Day ${day}`, x - game.scale(12), y + game.scale(28));
  
  // Time display
  const hour = Math.floor(timeOfDay * 24);
  const minute = Math.floor((timeOfDay * 24 - hour) * 60);
  const timeText = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  ctx.fillStyle = isNight ? '#fbbf24' : '#38bdf8';
  ctx.font = game.getScaledFont(24, '700');
  ctx.fillText(timeText, x - game.scale(12), y + game.scale(56));
  
  // Day/night icon
  ctx.font = game.getScaledFont(24);
  ctx.fillText(isNight ? '🌙' : '☀️', x - game.scale(172), y + game.scale(42));
  
  ctx.restore();
}

function drawColonyStats(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colonists: number,
  cap: number,
  hiding: number,
  game: any
) {
  ctx.save();
  
  const panelWidth = game.scale(200);
  const panelHeight = game.scale(70);
  
  // Background
  ctx.fillStyle = 'rgba(11, 18, 32, 0.85)';
  ctx.fillRect(x, y - panelHeight, panelWidth, panelHeight);
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y - panelHeight, panelWidth, panelHeight);
  
  // Colonist icon and count
  ctx.font = game.getScaledFont(24);
  ctx.fillStyle = '#93c5fd';
  ctx.textAlign = 'left';
  ctx.fillText('👥', x + game.scale(12), y - panelHeight + game.scale(32));
  
  ctx.font = game.getScaledFont(20, '700');
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`${colonists}/${cap}`, x + game.scale(48), y - panelHeight + game.scale(32));
  
  // Hiding count
  if (hiding > 0) {
    ctx.font = game.getScaledFont(14, '600');
    ctx.fillStyle = '#60a5fa';
    ctx.fillText(`🏠 ${hiding} hiding`, x + game.scale(12), y - panelHeight + game.scale(56));
  }
  
  ctx.restore();
}

function drawStorageIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  used: number,
  max: number,
  game: any
) {
  ctx.save();
  
  const panelWidth = game.scale(160);
  const panelHeight = game.scale(60);
  const percent = (used / max) * 100;
  
  // Background
  ctx.fillStyle = 'rgba(11, 18, 32, 0.85)';
  ctx.fillRect(x - panelWidth, y - panelHeight, panelWidth, panelHeight);
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - panelWidth, y - panelHeight, panelWidth, panelHeight);
  
  // Storage bar
  const barWidth = panelWidth - game.scale(24);
  const barHeight = game.scale(20);
  const barX = x - panelWidth + game.scale(12);
  const barY = y - panelHeight + game.scale(32);
  
  // Background bar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  // Fill bar with color based on percentage
  const fillWidth = (barWidth * used) / max;
  const barColor = percent > 90 ? '#ef4444' : percent > 70 ? '#eab308' : '#22c55e';
  ctx.fillStyle = barColor;
  ctx.fillRect(barX, barY, fillWidth, barHeight);
  
  // Text
  ctx.fillStyle = '#e2e8f0';
  ctx.font = game.getScaledFont(12, '600');
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(percent)}%`, x - panelWidth / 2, barY + game.scale(15));
  
  ctx.restore();
}

// Export animation state for external updates
export function updateHUDAnimations(deltaTime: number) {
  // Update any animation timers here
  if (animationState.storageFlashTimer > 0) {
    animationState.storageFlashTimer -= deltaTime;
  }
}
