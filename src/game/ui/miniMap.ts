/**
 * Mini-map - Tactical overview of the colony
 * 
 * Features:
 * - Real-time colony overview
 * - Shows colonists, buildings, enemies
 * - Fog of war effect
 * - Click to navigate
 */

import { WORLD, T } from '../constants';
import type { Colonist, Building, Enemy } from '../types';

interface MiniMapState {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

const state: MiniMapState = {
  visible: true,
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  scale: 1,
};

export function toggleMiniMap() {
  state.visible = !state.visible;
}

export function isMiniMapVisible(): boolean {
  return state.visible;
}

export function drawMiniMap(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  colonists: Colonist[],
  buildings: Building[],
  enemies: Enemy[],
  camera: any,
  game: any
) {
  if (!state.visible) return;
  
  // Position in bottom-right corner
  const padding = game.scale(20);
  const mapWidth = game.scale(state.width);
  const mapHeight = game.scale(state.height);
  
  state.x = canvas.width - mapWidth - padding;
  state.y = canvas.height - mapHeight - padding - game.scale(80); // Above bottom HUD
  state.width = mapWidth;
  state.height = mapHeight;
  
  // Calculate scale to fit world
  const scaleX = mapWidth / WORLD.w;
  const scaleY = mapHeight / WORLD.h;
  state.scale = Math.min(scaleX, scaleY);
  
  ctx.save();
  
  // Draw background
  ctx.fillStyle = 'rgba(11, 18, 32, 0.9)';
  ctx.fillRect(state.x, state.y, mapWidth, mapHeight);
  
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(state.x, state.y, mapWidth, mapHeight);
  
  // Draw world bounds
  ctx.fillStyle = 'rgba(34, 40, 49, 0.8)';
  ctx.fillRect(
    state.x + 5,
    state.y + 5,
    WORLD.w * state.scale,
    WORLD.h * state.scale
  );
  
  // Draw grid
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
  ctx.lineWidth = 0.5;
  
  for (let x = 0; x <= WORLD.w; x += T * 5) {
    const screenX = state.x + 5 + x * state.scale;
    ctx.beginPath();
    ctx.moveTo(screenX, state.y + 5);
    ctx.lineTo(screenX, state.y + 5 + WORLD.h * state.scale);
    ctx.stroke();
  }
  
  for (let y = 0; y <= WORLD.h; y += T * 5) {
    const screenY = state.y + 5 + y * state.scale;
    ctx.beginPath();
    ctx.moveTo(state.x + 5, screenY);
    ctx.lineTo(state.x + 5 + WORLD.w * state.scale, screenY);
    ctx.stroke();
  }
  
  // Draw buildings
  buildings.forEach(building => {
    const bx = state.x + 5 + building.x * state.scale;
    const by = state.y + 5 + building.y * state.scale;
    const bw = (building.w || T) * state.scale;
    const bh = (building.h || T) * state.scale;
    
    // Color based on building type
    let color = '#64748b';
    if (building.kind === 'hq') color = '#3b82f6';
    else if (building.kind === 'house') color = '#10b981';
    else if (building.kind === 'turret') color = '#ef4444';
    else if (building.kind === 'wall') color = '#6b7280';
    
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, bw, bh);
  });
  
  // Draw enemies
  enemies.forEach(enemy => {
    const ex = state.x + 5 + enemy.x * state.scale;
    const ey = state.y + 5 + enemy.y * state.scale;
    
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(ex, ey, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw colonists
  colonists.forEach(colonist => {
    const cx = state.x + 5 + colonist.x * state.scale;
    const cy = state.y + 5 + colonist.y * state.scale;
    
    // Different colors based on state
    let color = '#60a5fa';
    if (colonist.isDrafted) color = '#22c55e';
    else if (colonist.hp < 50) color = '#f59e0b';
    else if (colonist.state === 'downed') color = '#ef4444';
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Draw camera viewport
  const viewX = state.x + 5 + camera.x * state.scale;
  const viewY = state.y + 5 + camera.y * state.scale;
  const viewW = (canvas.width / camera.zoom) * state.scale;
  const viewH = (canvas.height / camera.zoom) * state.scale;
  
  ctx.strokeStyle = 'rgba(96, 165, 250, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(viewX, viewY, viewW, viewH);
  
  // Draw title
  ctx.fillStyle = '#cbd5e1';
  ctx.font = game.getScaledFont(11, '600');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('MAP', state.x + game.scale(8), state.y + game.scale(8));
  
  // Draw legend
  drawLegend(ctx, game);
  
  ctx.restore();
}

function drawLegend(ctx: CanvasRenderingContext2D, game: any) {
  const legendX = state.x + game.scale(8);
  let legendY = state.y + state.height - game.scale(60);
  
  const items = [
    { color: '#60a5fa', label: 'Colonist' },
    { color: '#22c55e', label: 'Drafted' },
    { color: '#dc2626', label: 'Enemy' },
  ];
  
  ctx.font = game.getScaledFont(9);
  ctx.textAlign = 'left';
  
  items.forEach(item => {
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legendX, legendY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(item.label, legendX + game.scale(10), legendY + game.scale(1));
    
    legendY += game.scale(14);
  });
}

export function handleMiniMapClick(x: number, y: number, camera: any, game: any): boolean {
  if (!state.visible) return false;
  
  // Check if click is within minimap
  if (x >= state.x && x <= state.x + state.width &&
      y >= state.y && y <= state.y + state.height) {
    
    // Convert click to world coordinates
    const worldX = (x - state.x - 5) / state.scale;
    const worldY = (y - state.y - 5) / state.scale;
    
    // Move camera to clicked position
    camera.x = worldX - (game.canvas.width / camera.zoom / 2);
    camera.y = worldY - (game.canvas.height / camera.zoom / 2);
    
    // Clamp to world bounds
    camera.x = Math.max(0, Math.min(camera.x, WORLD.w - game.canvas.width / camera.zoom));
    camera.y = Math.max(0, Math.min(camera.y, WORLD.h - game.canvas.height / camera.zoom));
    
    return true;
  }
  
  return false;
}
