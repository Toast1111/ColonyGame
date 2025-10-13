/**
 * Modern Build Menu - Two-panel category-based building selection
 * 
 * Left panel: Building categories
 * Right panel: Buildings in selected category
 * 
 * Appears bottom-left above the hotbar when Build tab is active
 */

import { BUILD_TYPES, groupByCategory } from '../../buildings';
import type { BuildingDef } from '../../types';

export type BuildCategory = string;

export interface CategoryRect {
  category: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BuildingItemRect {
  buildingKey: keyof typeof BUILD_TYPES;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BuildMenuRects {
  categories: CategoryRect[];
  buildings: BuildingItemRect[];
}

/**
 * Draw the modern build menu
 */
export function drawModernBuildMenu(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  selectedCategory: string | null,
  game: any
): BuildMenuRects {
  // Calculate dimensions (percentage-based)
  const hotbarHeight = canvas.height * 0.06;
  const menuHeight = canvas.height * 0.50; // 50% of screen height
  const menuWidth = canvas.width * 0.35; // 35% of screen width
  const menuX = canvas.width * 0.02; // 2% from left edge
  const menuY = canvas.height - hotbarHeight - menuHeight - (canvas.height * 0.01); // 1% gap above hotbar

  const categoryPanelWidth = menuWidth * 0.35; // 35% of menu width for categories
  const buildingPanelWidth = menuWidth * 0.63; // 63% of menu width for buildings (2% gap in between)
  const panelGap = menuWidth * 0.02;

  // Group buildings by category
  const groups = groupByCategory(BUILD_TYPES);
  const categories = Object.keys(groups);

  // Draw main menu background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.96)'; // Dark, almost opaque
  ctx.fillRect(menuX, menuY, menuWidth, menuHeight);

  // Draw border
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(menuX, menuY, menuWidth, menuHeight);

  const rects: BuildMenuRects = {
    categories: [],
    buildings: [],
  };

  // === Draw Categories Panel ===
  const categoryPanelX = menuX;
  const categoryPanelY = menuY;

  // Panel background
  ctx.fillStyle = 'rgba(11, 18, 32, 0.7)';
  ctx.fillRect(categoryPanelX, categoryPanelY, categoryPanelWidth, menuHeight);

  // Panel border
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(categoryPanelX, categoryPanelY, categoryPanelWidth, menuHeight);

  // Header
  const headerHeight = menuHeight * 0.08;
  ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
  ctx.fillRect(categoryPanelX, categoryPanelY, categoryPanelWidth, headerHeight);

  ctx.font = `${Math.floor(menuHeight * 0.028)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(148, 163, 184, 1)';
  ctx.fillText('Categories', categoryPanelX + categoryPanelWidth / 2, categoryPanelY + headerHeight / 2);

  // Category items
  const categoryItemHeight = menuHeight * 0.08; // 8% of menu height per category
  const categoryPadding = menuHeight * 0.01;
  let categoryY = categoryPanelY + headerHeight + categoryPadding;

  const categoryFontSize = Math.floor(menuHeight * 0.025);

  for (const category of categories) {
    const rect: CategoryRect = {
      category,
      x: categoryPanelX,
      y: categoryY,
      w: categoryPanelWidth,
      h: categoryItemHeight,
    };
    rects.categories.push(rect);

    const isSelected = selectedCategory === category;

    // Background
    if (isSelected) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)'; // Blue highlight
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    }
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    // Border
    if (isSelected) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
    }
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    // Left accent for selected
    if (isSelected) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.fillRect(rect.x, rect.y, 4, rect.h);
    }

    // Text
    ctx.font = `${isSelected ? 'bold ' : ''}${categoryFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isSelected ? 'rgba(219, 234, 254, 1)' : 'rgba(159, 179, 200, 0.9)';
    ctx.fillText(category, rect.x + categoryPanelWidth * 0.08, rect.y + rect.h / 2);

    categoryY += categoryItemHeight + categoryPadding;
  }

  // === Draw Buildings Panel ===
  const buildingPanelX = menuX + categoryPanelWidth + panelGap;
  const buildingPanelY = menuY;

  // Panel background
  ctx.fillStyle = 'rgba(11, 18, 32, 0.5)';
  ctx.fillRect(buildingPanelX, buildingPanelY, buildingPanelWidth, menuHeight);

  // Panel border
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(buildingPanelX, buildingPanelY, buildingPanelWidth, menuHeight);

  // Header
  ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
  ctx.fillRect(buildingPanelX, buildingPanelY, buildingPanelWidth, headerHeight);

  ctx.font = `${Math.floor(menuHeight * 0.028)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(148, 163, 184, 1)';
  const headerText = selectedCategory ? selectedCategory : 'Select a category';
  ctx.fillText(headerText, buildingPanelX + buildingPanelWidth / 2, buildingPanelY + headerHeight / 2);

  // Building items (if category selected)
  if (selectedCategory && groups[selectedCategory]) {
    const buildings = groups[selectedCategory];
    const buildingItemHeight = menuHeight * 0.12; // 12% of menu height per building
    const buildingPadding = menuHeight * 0.01;
    let buildingY = buildingPanelY + headerHeight + buildingPadding;

    const buildingFontSize = Math.floor(menuHeight * 0.023);
    const buildingDescFontSize = Math.floor(menuHeight * 0.018);

    for (const [key, def] of buildings) {
      // Don't show if it would overflow
      if (buildingY + buildingItemHeight > buildingPanelY + menuHeight) {
        break;
      }

      const rect: BuildingItemRect = {
        buildingKey: key as keyof typeof BUILD_TYPES,
        x: buildingPanelX,
        y: buildingY,
        w: buildingPanelWidth,
        h: buildingItemHeight,
      };
      rects.buildings.push(rect);

      const isSelected = game.selectedBuild === key;

      // Check if hovering
      const mx = game.mouse.x * game.DPR;
      const my = game.mouse.y * game.DPR;
      const isHovered = mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h;

      // Background
      if (isSelected) {
        ctx.fillStyle = 'rgba(16, 32, 52, 0.9)'; // Dark blue
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(26, 31, 46, 0.8)'; // Lighter on hover
      } else {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      }
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

      // Border
      if (isSelected) {
        ctx.strokeStyle = 'rgba(75, 159, 255, 0.9)';
        ctx.lineWidth = 2;
      } else if (isHovered) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
        ctx.lineWidth = 1;
      }
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

      // Building name
      ctx.font = `${buildingFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(219, 234, 254, 1)';
      ctx.fillText(def.name, rect.x + buildingPanelWidth * 0.04, rect.y + buildingItemHeight * 0.15);

      // Cost
      const cost = game.costText(def.cost || {});
      ctx.font = `${buildingDescFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(159, 179, 200, 0.9)';
      ctx.fillText(cost, rect.x + buildingPanelWidth * 0.96, rect.y + buildingItemHeight * 0.15);

      // Description (truncated)
      if (def.description) {
        ctx.font = `${buildingDescFontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        
        const maxDescWidth = buildingPanelWidth * 0.92;
        let desc = def.description;
        while (ctx.measureText(desc).width > maxDescWidth && desc.length > 10) {
          desc = desc.substring(0, desc.length - 4) + '...';
        }
        
        ctx.fillText(desc, rect.x + buildingPanelWidth * 0.04, rect.y + buildingItemHeight * 0.55);
      }

      buildingY += buildingItemHeight + buildingPadding;
    }
  } else {
    // No category selected - show instruction
    ctx.font = `${Math.floor(menuHeight * 0.022)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.fillText(
      'Select a category to view buildings',
      buildingPanelX + buildingPanelWidth / 2,
      buildingPanelY + menuHeight / 2
    );
  }

  return rects;
}

/**
 * Handle click on build menu
 * Returns { type: 'category' | 'building', value: string } or null
 */
export function handleBuildMenuClick(
  mouseX: number,
  mouseY: number,
  rects: BuildMenuRects
): { type: 'category'; value: string } | { type: 'building'; value: keyof typeof BUILD_TYPES } | null {
  // Check category clicks
  for (const rect of rects.categories) {
    if (mouseX >= rect.x && mouseX <= rect.x + rect.w && mouseY >= rect.y && mouseY <= rect.y + rect.h) {
      return { type: 'category', value: rect.category };
    }
  }

  // Check building clicks
  for (const rect of rects.buildings) {
    if (mouseX >= rect.x && mouseX <= rect.x + rect.w && mouseY >= rect.y && mouseY <= rect.y + rect.h) {
      return { type: 'building', value: rect.buildingKey };
    }
  }

  return null;
}
