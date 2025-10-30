/**
 * Modern Build Menu - Two-panel category-based building selection
 * 
 * Left panel: Building categories
 * Right panel: Buildings in selected category
 * 
 * Appears bottom-left above the hotbar when Build tab is active
 */

import { BUILD_TYPES, groupByCategory } from '../../buildings';
import { getModernHotbarHeight } from './modernHotbar';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getScaled(game: any, desktop: number, touchOverride?: number): number {
  const isTouch = !!game?.isTouch;
  const raw = isTouch && touchOverride !== undefined ? touchOverride : desktop;
  const scaleFn = typeof game?.scale === 'function' ? game.scale.bind(game) : null;
  return scaleFn ? scaleFn(raw) : raw;
}

function getMenuDimensions(
  canvas: HTMLCanvasElement,
  game: any,
  hotbarHeight: number
): {
  menuWidth: number;
  menuHeight: number;
  menuX: number;
  menuY: number;
  panelGap: number;
  categoryPanelWidth: number;
  buildingPanelWidth: number;
} {
  const isTouch = !!game?.isTouch;

  const horizontalMargin = Math.max(
    canvas.width * (isTouch ? 0.035 : 0.02),
    getScaled(game, 18, 24)
  );
  const topClearance = Math.max(canvas.height * 0.04, getScaled(game, 28, 36));
  const hotbarGap = Math.max(
    canvas.height * (isTouch ? 0.018 : 0.012),
    hotbarHeight * (isTouch ? 0.2 : 0.14),
    getScaled(game, 18, 26)
  );

  const availableWidth = Math.max(canvas.width - horizontalMargin * 2, getScaled(game, 300));
  const width = clamp(
    canvas.width * (isTouch ? 0.88 : 0.34),
    Math.min(getScaled(game, 340, 520), availableWidth),
    Math.min(
      availableWidth,
      canvas.width * (isTouch ? 0.94 : 0.42),
      getScaled(game, 860, 980)
    )
  );

  const availableHeight = Math.max(
    canvas.height - hotbarHeight - hotbarGap - topClearance,
    getScaled(game, 240)
  );
  const height = clamp(
    canvas.height * (isTouch ? 0.58 : 0.46),
    Math.min(getScaled(game, 300, 420), availableHeight),
    Math.min(
      availableHeight,
      canvas.height * (isTouch ? 0.68 : 0.56),
      getScaled(game, 720, 880)
    )
  );

  const menuX = horizontalMargin;
  const menuY = Math.max(
    topClearance,
    canvas.height - hotbarHeight - hotbarGap - height
  );

  const panelGap = clamp(
    width * (isTouch ? 0.022 : 0.018),
    getScaled(game, 12, 16),
    getScaled(game, 28, 30)
  );

  const minBuildingWidth = getScaled(game, 220, 300);
  const minCategoryWidth = Math.min(getScaled(game, 180, 240), width * 0.5);
  const maxCategoryWidth = Math.max(
    minCategoryWidth,
    Math.min(width * 0.58, width - minBuildingWidth - panelGap)
  );
  // Compute buildingPanelWidth first, clamped so category panel can always be at least its minimum
  const maxBuildingWidth = width - minCategoryWidth - panelGap;
  const buildingPanelWidth = clamp(width * (isTouch ? 0.56 : 0.64), minBuildingWidth, maxBuildingWidth);
  const categoryPanelWidth = clamp(width - buildingPanelWidth - panelGap, minCategoryWidth, maxCategoryWidth);

  return {
    menuWidth: width,
    menuHeight: height,
    menuX,
    menuY,
    panelGap,
    categoryPanelWidth,
    buildingPanelWidth,
  };
}

export type BuildCategory = string;

export interface CategoryRect {
  category: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BuildingItemRect {
  buildingKey: keyof typeof BUILD_TYPES | string; // Allow both building keys and zone keys
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
  // Save canvas state to prevent text alignment leaks
  ctx.save();
  
  const hotbarHeight = getModernHotbarHeight(canvas, game);
  const {
    menuHeight,
    menuWidth,
    menuX,
    menuY,
    panelGap,
    categoryPanelWidth,
    buildingPanelWidth,
  } = getMenuDimensions(canvas, game, hotbarHeight);

  const toPx = (desktop: number, touchOverride?: number) => getScaled(game, desktop, touchOverride);

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
  const headerHeight = Math.max(
    menuHeight * 0.08,
    toPx(34, 46)
  );
  ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
  ctx.fillRect(categoryPanelX, categoryPanelY, categoryPanelWidth, headerHeight);

  const headerFontSize = Math.max(
    menuHeight * 0.028,
    toPx(14, 18)
  );
  ctx.font = `${Math.floor(headerFontSize)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(148, 163, 184, 1)';
  ctx.fillText('Categories', categoryPanelX + categoryPanelWidth / 2, categoryPanelY + headerHeight / 2);

  // Category items
  const categoryItemHeight = Math.max(
    menuHeight * 0.08,
    toPx(42, 56)
  );
  const categoryPadding = Math.max(
    menuHeight * 0.01,
    toPx(6, 8)
  );
  let categoryY = categoryPanelY + headerHeight + categoryPadding;

  const categoryFontSize = Math.max(
    menuHeight * 0.025,
    toPx(13, 17)
  );

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
    ctx.font = `${isSelected ? 'bold ' : ''}${Math.floor(categoryFontSize)}px system-ui, -apple-system, sans-serif`;
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

  ctx.font = `${Math.floor(headerFontSize)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(148, 163, 184, 1)';
  const headerText = selectedCategory ? selectedCategory : 'Select a category';
  ctx.fillText(headerText, buildingPanelX + buildingPanelWidth / 2, buildingPanelY + headerHeight / 2);

  // Building items (if category selected)
  if (selectedCategory && groups[selectedCategory]) {
    const buildings = groups[selectedCategory];
    const buildingItemHeight = Math.max(
      menuHeight * 0.12,
      toPx(58, 78)
    );
    const buildingPadding = Math.max(
      menuHeight * 0.01,
      toPx(6, 10)
    );
    let buildingY = buildingPanelY + headerHeight + buildingPadding;

    const buildingFontSize = Math.max(
      menuHeight * 0.023,
      toPx(14, 18)
    );
    const buildingDescFontSize = Math.max(
      menuHeight * 0.018,
      toPx(12, 15)
    );

    for (const [key, def] of buildings) {
      // Don't show if it would overflow
      if (buildingY + buildingItemHeight > buildingPanelY + menuHeight) {
        break;
      }

      const rect: BuildingItemRect = {
        buildingKey: key, // No more unsafe casting - key can be building or zone
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
      ctx.font = `${Math.floor(buildingFontSize)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(219, 234, 254, 1)';
      ctx.fillText(def.name, rect.x + buildingPanelWidth * 0.04, rect.y + buildingItemHeight * 0.15);

      // Cost
      const cost = game.costText(def.cost || {});
      ctx.font = `${Math.floor(buildingDescFontSize)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(159, 179, 200, 0.9)';
      ctx.fillText(cost, rect.x + buildingPanelWidth * 0.96, rect.y + buildingItemHeight * 0.15);

      // Description (truncated)
      if (def.description) {
        ctx.font = `${Math.floor(buildingDescFontSize)}px system-ui, -apple-system, sans-serif`;
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
    const emptyFontSize = Math.max(
      menuHeight * 0.022,
      toPx(13, 17)
    );
    ctx.font = `${Math.floor(emptyFontSize)}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.fillText(
      'Select a category to view buildings',
      buildingPanelX + buildingPanelWidth / 2,
      buildingPanelY + menuHeight / 2
    );
  }

  // Restore canvas state to prevent text alignment leaks
  ctx.restore();
  
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
): { type: 'category'; value: string } | { type: 'building'; value: string } | null {
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
