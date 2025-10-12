/**
 * Radial Build Menu - Modern circular build menu that appears at cursor
 * 
 * Features:
 * - Circular layout with categories as segments
 * - Smooth animations and transitions
 * - Hover effects and visual feedback
 * - Touch-friendly hit areas
 */

import { BUILD_TYPES, groupByCategory } from '../buildings';

interface RadialMenuState {
  visible: boolean;
  centerX: number;
  centerY: number;
  selectedCategory: string | null;
  selectedBuilding: string | null;
  animationProgress: number; // 0 to 1
  hoveredSegment: number | null;
  hoveredItem: number | null;
}

const state: RadialMenuState = {
  visible: false,
  centerX: 0,
  centerY: 0,
  selectedCategory: null,
  selectedBuilding: null,
  animationProgress: 0,
  hoveredSegment: null,
  hoveredItem: null,
};

const INNER_RADIUS = 80;
const OUTER_RADIUS = 180;
const ITEM_RADIUS = 280;
const ANIMATION_SPEED = 6; // units per frame

export function openRadialBuildMenu(x: number, y: number) {
  state.visible = true;
  state.centerX = x;
  state.centerY = y;
  state.selectedCategory = null;
  state.selectedBuilding = null;
  state.animationProgress = 0;
  state.hoveredSegment = null;
  state.hoveredItem = null;
}

export function closeRadialBuildMenu() {
  state.visible = false;
  state.selectedCategory = null;
  state.selectedBuilding = null;
}

export function isRadialMenuVisible(): boolean {
  return state.visible;
}

export function updateRadialMenuAnimation(deltaTime: number) {
  if (state.visible && state.animationProgress < 1) {
    state.animationProgress = Math.min(1, state.animationProgress + ANIMATION_SPEED * deltaTime);
  } else if (!state.visible && state.animationProgress > 0) {
    state.animationProgress = Math.max(0, state.animationProgress - ANIMATION_SPEED * deltaTime);
  }
}

export function drawRadialBuildMenu(game: any) {
  if (!state.visible && state.animationProgress === 0) return;

  const ctx = game.ctx as CanvasRenderingContext2D;
  const groups = groupByCategory(BUILD_TYPES);
  const categories = Object.keys(groups);
  
  ctx.save();
  
  // Apply animation scale
  const scale = easeOutBack(state.animationProgress);
  ctx.translate(state.centerX, state.centerY);
  ctx.scale(scale, scale);
  ctx.translate(-state.centerX, -state.centerY);
  
  // Apply fade
  ctx.globalAlpha = state.animationProgress;
  
  if (!state.selectedCategory) {
    // Draw category ring
    drawCategoryRing(ctx, game, categories, groups);
  } else {
    // Draw items for selected category
    drawItemRing(ctx, game, state.selectedCategory, groups[state.selectedCategory]);
  }
  
  // Draw center circle with instructions
  drawCenterCircle(ctx, game);
  
  ctx.restore();
}

function drawCategoryRing(
  ctx: CanvasRenderingContext2D,
  game: any,
  categories: string[],
  groups: Record<string, Array<[string, any]>>
) {
  const angleStep = (Math.PI * 2) / categories.length;
  
  categories.forEach((category, i) => {
    const startAngle = i * angleStep - Math.PI / 2;
    const endAngle = startAngle + angleStep;
    const midAngle = startAngle + angleStep / 2;
    
    // Check if hovered
    const isHovered = state.hoveredSegment === i;
    
    // Draw segment
    ctx.beginPath();
    ctx.moveTo(state.centerX, state.centerY);
    ctx.arc(state.centerX, state.centerY, OUTER_RADIUS * game.uiScale, startAngle, endAngle);
    ctx.closePath();
    
    // Fill with gradient
    const gradient = ctx.createRadialGradient(
      state.centerX, state.centerY, INNER_RADIUS * game.uiScale,
      state.centerX, state.centerY, OUTER_RADIUS * game.uiScale
    );
    
    if (isHovered) {
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
      gradient.addColorStop(1, 'rgba(37, 99, 235, 0.8)');
    } else {
      gradient.addColorStop(0, 'rgba(30, 41, 59, 0.8)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
    }
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = isHovered ? 'rgba(96, 165, 250, 0.8)' : 'rgba(71, 85, 105, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw category label
    const labelRadius = (INNER_RADIUS + OUTER_RADIUS) / 2 * game.uiScale;
    const labelX = state.centerX + Math.cos(midAngle) * labelRadius;
    const labelY = state.centerY + Math.sin(midAngle) * labelRadius;
    
    ctx.save();
    ctx.translate(labelX, labelY);
    ctx.rotate(midAngle + Math.PI / 2);
    ctx.fillStyle = isHovered ? '#e2e8f0' : '#cbd5e1';
    ctx.font = game.getScaledFont(14, '600');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(category, 0, 0);
    ctx.restore();
    
    // Draw item count
    const count = groups[category].length;
    ctx.fillStyle = isHovered ? '#60a5fa' : '#64748b';
    ctx.font = game.getScaledFont(11);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${count} items`, labelX, labelY + game.scale(16));
  });
}

function drawItemRing(
  ctx: CanvasRenderingContext2D,
  game: any,
  category: string,
  items: Array<[string, any]>
) {
  const angleStep = (Math.PI * 2) / items.length;
  
  items.forEach(([key, data], i) => {
    const angle = i * angleStep - Math.PI / 2;
    const itemX = state.centerX + Math.cos(angle) * ITEM_RADIUS * game.uiScale;
    const itemY = state.centerY + Math.sin(angle) * ITEM_RADIUS * game.uiScale;
    
    // Check if hovered
    const isHovered = state.hoveredItem === i;
    const size = game.scale(isHovered ? 70 : 60);
    
    // Draw item background
    ctx.fillStyle = isHovered ? 'rgba(59, 130, 246, 0.9)' : 'rgba(30, 41, 59, 0.9)';
    ctx.fillRect(itemX - size / 2, itemY - size / 2, size, size);
    
    ctx.strokeStyle = isHovered ? '#60a5fa' : '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(itemX - size / 2, itemY - size / 2, size, size);
    
    // Draw building icon/emoji if available
    ctx.fillStyle = '#e2e8f0';
    ctx.font = game.getScaledFont(24);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icon = getBuildingIcon(key);
    ctx.fillText(icon, itemX, itemY - game.scale(8));
    
    // Draw building name
    ctx.font = game.getScaledFont(11, '600');
    ctx.fillStyle = isHovered ? '#f1f5f9' : '#cbd5e1';
    ctx.fillText(data.name, itemX, itemY + game.scale(20));
    
    // Draw cost if not affordable
    if (!game.hasCost || !game.hasCost(data.cost)) {
      ctx.fillStyle = '#ef4444';
      ctx.font = game.getScaledFont(10);
      ctx.fillText('✗', itemX + size / 2 - game.scale(8), itemY - size / 2 + game.scale(8));
    }
  });
  
  // Draw back button
  drawBackButton(ctx, game);
}

function drawCenterCircle(ctx: CanvasRenderingContext2D, game: any) {
  const radius = INNER_RADIUS * game.uiScale;
  
  // Draw circle
  ctx.beginPath();
  ctx.arc(state.centerX, state.centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Draw instructions
  ctx.fillStyle = '#cbd5e1';
  ctx.font = game.getScaledFont(12);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (!state.selectedCategory) {
    ctx.fillText('Click category', state.centerX, state.centerY - game.scale(8));
    ctx.fillText('to view items', state.centerX, state.centerY + game.scale(8));
  } else {
    ctx.fillText('Click item', state.centerX, state.centerY - game.scale(8));
    ctx.fillText('to build', state.centerX, state.centerY + game.scale(8));
  }
}

function drawBackButton(ctx: CanvasRenderingContext2D, game: any) {
  const buttonX = state.centerX;
  const buttonY = state.centerY - ITEM_RADIUS * game.uiScale - game.scale(40);
  const buttonWidth = game.scale(100);
  const buttonHeight = game.scale(32);
  
  ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
  ctx.fillRect(buttonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight);
  
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(buttonX - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight);
  
  ctx.fillStyle = '#e2e8f0';
  ctx.font = game.getScaledFont(14, '600');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← Back', buttonX, buttonY);
}

function getBuildingIcon(key: string): string {
  const icons: Record<string, string> = {
    'house': '🏠',
    'farm': '🌾',
    'storage': '📦',
    'wall': '🧱',
    'turret': '🔫',
    'mine': '⛏️',
    'quarry': '🪨',
    'path': '🛤️',
    'door': '🚪',
    'bed': '🛏️',
    'kitchen': '🍳',
    'workshop': '🔨',
    'research': '🔬',
  };
  
  return icons[key] || '🏗️';
}

// Easing function for smooth animation
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Handle mouse/touch input
export function handleRadialMenuClick(x: number, y: number, game: any): boolean {
  if (!state.visible) return false;
  
  const dx = x - state.centerX;
  const dy = y - state.centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) + Math.PI / 2;
  const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;
  
  const groups = groupByCategory(BUILD_TYPES);
  const categories = Object.keys(groups);
  
  if (!state.selectedCategory) {
    // Category selection
    const outerRadius = OUTER_RADIUS * game.uiScale;
    const innerRadius = INNER_RADIUS * game.uiScale;
    
    if (distance >= innerRadius && distance <= outerRadius) {
      const angleStep = (Math.PI * 2) / categories.length;
      const segmentIndex = Math.floor(normalizedAngle / angleStep);
      
      if (segmentIndex >= 0 && segmentIndex < categories.length) {
        state.selectedCategory = categories[segmentIndex];
        return true;
      }
    }
  } else {
    // Item selection
    const items = groups[state.selectedCategory];
    const angleStep = (Math.PI * 2) / items.length;
    
    items.forEach(([key, data], i) => {
      const itemAngle = i * angleStep - Math.PI / 2;
      const itemX = state.centerX + Math.cos(itemAngle) * ITEM_RADIUS * game.uiScale;
      const itemY = state.centerY + Math.sin(itemAngle) * ITEM_RADIUS * game.uiScale;
      const size = game.scale(60);
      
      if (x >= itemX - size / 2 && x <= itemX + size / 2 &&
          y >= itemY - size / 2 && y <= itemY + size / 2) {
        // Building selected!
        game.selectedBuild = key;
        closeRadialBuildMenu();
      }
    });
    
    // Check back button
    const buttonY = state.centerY - ITEM_RADIUS * game.uiScale - game.scale(40);
    const buttonWidth = game.scale(100);
    const buttonHeight = game.scale(32);
    
    if (x >= state.centerX - buttonWidth / 2 && x <= state.centerX + buttonWidth / 2 &&
        y >= buttonY - buttonHeight / 2 && y <= buttonY + buttonHeight / 2) {
      state.selectedCategory = null;
      return true;
    }
  }
  
  return false;
}

export function updateRadialMenuHover(x: number, y: number, game: any) {
  if (!state.visible) return;
  
  const dx = x - state.centerX;
  const dy = y - state.centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) + Math.PI / 2;
  const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;
  
  const groups = groupByCategory(BUILD_TYPES);
  const categories = Object.keys(groups);
  
  if (!state.selectedCategory) {
    const outerRadius = OUTER_RADIUS * game.uiScale;
    const innerRadius = INNER_RADIUS * game.uiScale;
    
    if (distance >= innerRadius && distance <= outerRadius) {
      const angleStep = (Math.PI * 2) / categories.length;
      state.hoveredSegment = Math.floor(normalizedAngle / angleStep);
    } else {
      state.hoveredSegment = null;
    }
  } else {
    state.hoveredItem = null;
    const items = groups[state.selectedCategory];
    const angleStep = (Math.PI * 2) / items.length;
    
    items.forEach(([key, data], i) => {
      const itemAngle = i * angleStep - Math.PI / 2;
      const itemX = state.centerX + Math.cos(itemAngle) * ITEM_RADIUS * game.uiScale;
      const itemY = state.centerY + Math.sin(itemAngle) * ITEM_RADIUS * game.uiScale;
      const size = game.scale(60);
      
      if (x >= itemX - size / 2 && x <= itemX + size / 2 &&
          y >= itemY - size / 2 && y <= itemY + size / 2) {
        state.hoveredItem = i;
      }
    });
  }
}
