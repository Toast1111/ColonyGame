/**
 * Work Priority Panel - RimWorld-style job assignment UI
 * 
 * Shows a grid of colonists × work types where each cell displays the priority (1-4 or disabled)
 * Click a cell to cycle through priorities
 */

import type { Colonist } from '../../types';
import { WORK_TYPE_ORDER, WORK_TYPE_INFO, cycleWorkPriority, type WorkType, type WorkPriority } from '../../systems/workPriority';
import { getModernHotbarHeight } from '../hud/modernHotbar';

// UI state
let isPanelOpen = false;
let panelScrollY = 0;

// Tooltip state
let tooltipWorkType: string | null = null;
let tooltipX = 0;
let tooltipY = 0;

// Dynamic layout calculated from canvas dimensions (NO hardcoded pixel values!)
interface PanelLayout {
  panelX: number;
  panelY: number;
  panelWidth: number;
  panelHeight: number;
  cellWidth: number;
  cellHeight: number;
  headerHeight: number;
  nameColumnWidth: number;
  padding: number;
  fontSize: number;
  headerFontSize: number;
  footerHeight: number;
}

/**
 * Calculate fully responsive panel layout based on canvas dimensions
 * Uses percentages and ratios, NOT fixed pixel values
 * Panel positioned in bottom-left corner above hotbar (like build menu)
 */
function calculatePanelLayout(canvas: HTMLCanvasElement, colonistCount: number, game: any): PanelLayout {
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const hotbarHeight = getModernHotbarHeight(canvas, game);
  
  // Panel is thinner - just enough for the table
  const panelWidth = canvasWidth * 0.70; // 70% of screen width (narrower)
  const panelHeight = canvasHeight * 0.35; // 35% of screen height (much thinner!)
  
  // Position in bottom-left, above hotbar with proper gap to prevent overlap
  const gap = canvasHeight * 0.02; // 2% gap above hotbar (larger to prevent overlap)
  const panelX = canvasWidth * 0.02; // 2% from left edge
  const panelY = canvasHeight - hotbarHeight - panelHeight - gap;
  
  // Calculate padding as 1.5% of panel width (tighter)
  const padding = panelWidth * 0.015;
  
  // Header is smaller - 10% of panel height
  const headerHeight = panelHeight * 0.10;
  
  // Footer is 5% of panel height
  const footerHeight = panelHeight * 0.05;
  
  // Name column is 15% of panel width
  const nameColumnWidth = panelWidth * 0.15;
  
  // Calculate available space for work type columns
  const availableWidth = panelWidth - nameColumnWidth - (padding * 2);
  const workTypeCount = WORK_TYPE_ORDER.length;
  
  // Cell width divides available space by number of work types
  const cellWidth = availableWidth / workTypeCount;
  
  // Calculate available height for rows
  const availableHeight = panelHeight - headerHeight - footerHeight - (padding * 2);
  const rowCount = colonistCount + 1; // +1 for header row
  
  // Cell height divides available space by number of rows
  const cellHeight = Math.max(availableHeight / rowCount, panelHeight * 0.04); // Min 4% of panel height
  
  // Font sizes scale with panel size
  const fontSize = Math.max(10, panelWidth * 0.011); // Slightly smaller
  const headerFontSize = Math.max(12, panelWidth * 0.014); // Slightly smaller
  
  return {
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    cellWidth,
    cellHeight,
    headerHeight,
    nameColumnWidth,
    padding,
    fontSize,
    headerFontSize,
    footerHeight
  };
}

/**
 * Toggle the work priority panel
 */
export function toggleWorkPriorityPanel(): void {
  isPanelOpen = !isPanelOpen;
  panelScrollY = 0; // Reset scroll when opening
  try { (window as any).game?.audioManager?.play(isPanelOpen ? 'ui.panel.open' : 'ui.panel.close'); } catch {}
  
  // Hide/show mobile controls (HTML buttons) to prevent z-index overlay
  const mobileControls = document.getElementById('mobileControls');
  if (mobileControls) {
    mobileControls.style.display = isPanelOpen ? 'none' : '';
  }
}

/**
 * Check if panel is open
 */
export function isWorkPriorityPanelOpen(): boolean {
  return isPanelOpen;
}

/**
 * Close the work priority panel
 */
export function closeWorkPriorityPanel(): void {
  isPanelOpen = false;
  try { (window as any).game?.audioManager?.play('ui.panel.close'); } catch {}
  
  // Restore mobile controls visibility
  const mobileControls = document.getElementById('mobileControls');
  if (mobileControls) {
    mobileControls.style.display = '';
  }
}

/**
 * Get priority color
 */
function getPriorityColor(priority: WorkPriority): string {
  switch (priority) {
    case 1: return '#4CAF50'; // Green - highest priority
    case 2: return '#8BC34A'; // Light green
    case 3: return '#FFC107'; // Amber
    case 4: return '#FF9800'; // Orange - lowest priority
    case 0: return '#424242'; // Dark gray - disabled
    default: return '#666666';
  }
}

/**
 * Get priority text
 */
function getPriorityText(priority: WorkPriority): string {
  if (priority === 0) return '—';
  return priority.toString();
}

/**
 * Draw the work priority panel
 */
export function drawWorkPriorityPanel(
  ctx: CanvasRenderingContext2D,
  colonists: Colonist[],
  canvas: HTMLCanvasElement,
  game: any
): void {
  if (!isPanelOpen) return;

  // Save canvas state to ensure clean rendering on top of everything
  ctx.save();

  const aliveColonists = colonists.filter(c => c.alive);

  // Calculate responsive layout (NO hardcoded pixels!)
  const layout = calculatePanelLayout(canvas, aliveColonists.length, game);
  const { panelX, panelY, panelWidth, panelHeight, cellWidth, cellHeight, 
          headerHeight, nameColumnWidth, padding, fontSize, headerFontSize, footerHeight } = layout;
  
  // Panel background (no fullscreen backdrop - matches build menu style)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.96)'; // Dark, almost opaque
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  
  // Panel border
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
  
  // Title bar background
  ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
  ctx.fillRect(panelX, panelY, panelWidth, headerHeight);
  
  // Title (scaled font) - using modern styling
  ctx.fillStyle = 'rgba(148, 163, 184, 1)';
  ctx.font = `${Math.round(headerHeight * 0.35)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Work Priorities', panelX + panelWidth / 2, panelY + headerHeight / 2);
  
  // Help text removed - keeping it simple like build menu
  
  // Close button removed - can close by clicking tab or ESC
  
  // Table area
  const tableX = panelX + padding;
  const tableY = panelY + headerHeight + padding;
  const tableWidth = panelWidth - padding * 2;
  const tableHeight = panelHeight - headerHeight - padding * 2 - footerHeight;
  
  // Draw column headers BEFORE clipping (so rotated text isn't cut off)
  let headerX = tableX + nameColumnWidth;
  
  // Header row background
  ctx.fillStyle = '#2a4a6a';
  ctx.fillRect(tableX, tableY - panelScrollY, tableWidth, cellHeight);
  
  // "Name" header
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(headerFontSize)}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('Colonist', tableX + padding * 0.5, tableY - panelScrollY + cellHeight * 0.65);
  
  // Work type column headers - use simple abbreviations with tooltips
  ctx.font = `bold ${Math.round(fontSize)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  
  for (const workType of WORK_TYPE_ORDER) {
    const info = WORK_TYPE_INFO[workType];
    
    // Header background
    ctx.fillStyle = '#2a4a6a';
    ctx.fillRect(headerX, tableY - panelScrollY, cellWidth, cellHeight);
    
    // Header border
    ctx.strokeStyle = '#1a2a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(headerX, tableY - panelScrollY, cellWidth, cellHeight);
    
    // Simple abbreviated text (no rotation needed!)
    ctx.fillStyle = '#e0e0e0';
    ctx.font = `bold ${Math.round(fontSize * 0.95)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    
    // Use first 3-4 letters as abbreviation
    const abbrev = info.label.substring(0, Math.min(4, Math.max(3, Math.floor(cellWidth / (fontSize * 0.6)))));
    ctx.fillText(abbrev, headerX + cellWidth / 2, tableY - panelScrollY + cellHeight * 0.65);
    
    headerX += cellWidth;
  }
  
  // NOW apply clipping for the data rows only (excludes headers)
  ctx.save();
  ctx.beginPath();
  ctx.rect(tableX, tableY + cellHeight - panelScrollY, tableWidth, tableHeight - cellHeight);
  ctx.clip();
  
  // Draw colonists and their priorities
  let rowY = tableY + cellHeight - panelScrollY;
  
  for (const colonist of aliveColonists) {
    // Row background (alternating colors)
    const rowIndex = aliveColonists.indexOf(colonist);
    ctx.fillStyle = rowIndex % 2 === 0 ? '#252525' : '#2a2a2a';
    ctx.fillRect(tableX, rowY, tableWidth, cellHeight);
    
    // Colonist name cell background
    ctx.fillStyle = '#353535';
    ctx.fillRect(tableX, rowY, nameColumnWidth, cellHeight);
    
    // Border
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(tableX, rowY, nameColumnWidth, cellHeight);
    
    // Colonist name
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(fontSize)}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    const name = colonist.profile?.name || 'Unknown';
    // Truncate name to fit
    const maxNameChars = Math.floor(nameColumnWidth / (fontSize * 0.6));
    const truncatedName = name.length > maxNameChars ? name.substring(0, maxNameChars - 2) + '..' : name;
    ctx.fillText(truncatedName, tableX + padding * 0.5, rowY + cellHeight * 0.65);
    
    // Health indicator (small dot) - scaled
    const healthPercent = colonist.hp / 100;
    const healthColor = healthPercent > 0.66 ? '#4caf50' : healthPercent > 0.33 ? '#ffc107' : '#f44336';
    const dotRadius = Math.max(3, cellHeight * 0.15);
    ctx.fillStyle = healthColor;
    ctx.beginPath();
    ctx.arc(tableX + nameColumnWidth - dotRadius * 2, rowY + cellHeight / 2, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Priority cells
    let cellX = tableX + nameColumnWidth;
    
    for (const workType of WORK_TYPE_ORDER) {
      const priorities = (colonist as any).workPriorities as Record<WorkType, WorkPriority> | undefined;
      const priority = priorities?.[workType] ?? 3;
      
      // Cell background
      ctx.fillStyle = getPriorityColor(priority);
      ctx.fillRect(cellX, rowY, cellWidth, cellHeight);
      
      // Cell border
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(cellX, rowY, cellWidth, cellHeight);
      
      // Priority text (scaled)
      ctx.fillStyle = priority === 0 ? '#666' : '#fff';
      ctx.font = `bold ${Math.round(fontSize * 1.1)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(getPriorityText(priority), cellX + cellWidth / 2, rowY + cellHeight * 0.65);
      
      cellX += cellWidth;
    }
    
    rowY += cellHeight;
  }
  
  ctx.restore();
  
  // Scroll indicator if content overflows
  const maxScrollY = Math.max(0, (aliveColonists.length + 1) * cellHeight - tableHeight);
  if (maxScrollY > 0) {
    // Scrollbar track
    const scrollbarWidth = Math.max(6, panelWidth * 0.008);
    const scrollbarX = panelX + panelWidth - padding - scrollbarWidth;
    const scrollbarY = tableY;
    const scrollbarHeight = tableHeight;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);
    
    // Scrollbar thumb
    const thumbHeight = Math.max(30, (tableHeight / ((aliveColonists.length + 1) * cellHeight)) * scrollbarHeight);
    const thumbY = scrollbarY + (panelScrollY / maxScrollY) * (scrollbarHeight - thumbHeight);
    
    ctx.fillStyle = 'rgba(100, 150, 200, 0.6)';
    ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
  }
  
  // Instructions footer
  const footerY = panelY + panelHeight - footerHeight;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(panelX, footerY, panelWidth, footerHeight);
  
  ctx.fillStyle = '#aaa';
  ctx.font = `${Math.round(fontSize * 0.9)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Click a cell to cycle priority: 1 (highest) → 2 → 3 → 4 (lowest) → disabled → 1', 
               panelX + panelWidth / 2, footerY + footerHeight * 0.35);
  ctx.fillText('Press P to close • Scroll with mouse wheel • Hover over column headers for full names', 
               panelX + panelWidth / 2, footerY + footerHeight * 0.75);
  
  // Draw tooltip if hovering over a column header
  if (tooltipWorkType) {
    const info = WORK_TYPE_INFO[tooltipWorkType as WorkType];
    if (info) {
    
    // Measure tooltip text
    ctx.font = `${Math.round(fontSize * 1.1)}px Arial, sans-serif`;
    const tooltipText = info.label;
    const textWidth = ctx.measureText(tooltipText).width;
    const tooltipPadding = padding * 1.5;
    const tooltipWidth = textWidth + tooltipPadding * 2;
    const tooltipHeight = cellHeight * 1.2;
    
    // Position tooltip near cursor, but keep it on screen
    let ttX = tooltipX + 10;
    let ttY = tooltipY - tooltipHeight - 5;
    
    // Keep tooltip within panel bounds
    if (ttX + tooltipWidth > panelX + panelWidth) {
      ttX = tooltipX - tooltipWidth - 10;
    }
    if (ttY < panelY) {
      ttY = tooltipY + 20;
    }
    
    // Tooltip background
    ctx.fillStyle = 'rgba(40, 40, 40, 0.95)';
    ctx.strokeStyle = '#4a6fa5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(ttX, ttY, tooltipWidth, tooltipHeight, 5);
    ctx.fill();
    ctx.stroke();
    
    // Tooltip text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(fontSize * 1.1)}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(tooltipText, ttX + tooltipPadding, ttY + tooltipHeight * 0.65);
    }
  }
  
  // Restore canvas state
  ctx.restore();
}

/**
 * Handle click on the work priority panel
 * Returns true if click was handled
 */
export function handleWorkPriorityPanelClick(
  mouseX: number,
  mouseY: number,
  colonists: Colonist[],
  canvas: HTMLCanvasElement,
  game: any
): boolean {
  if (!isPanelOpen) return false;

  const aliveColonists = colonists.filter(c => c.alive);

  // CRITICAL: Calculate same layout as draw function (NO hardcoded pixels!)
  const layout = calculatePanelLayout(canvas, aliveColonists.length, game);
  const { panelX, panelY, panelWidth, panelHeight, cellWidth, cellHeight, 
          headerHeight, nameColumnWidth, padding, footerHeight } = layout;
  
  // Check close button
  const closeSize = headerHeight * 0.6;
  const closeX = panelX + panelWidth - closeSize - padding;
  const closeY = panelY + (headerHeight - closeSize) / 2;
  
  if (mouseX >= closeX && mouseX <= closeX + closeSize && 
      mouseY >= closeY && mouseY <= closeY + closeSize) {
    closeWorkPriorityPanel();
    return true;
  }
  
  // Check if click is within panel
  if (mouseX < panelX || mouseX > panelX + panelWidth ||
      mouseY < panelY || mouseY > panelY + panelHeight) {
    // Click outside panel - close it
    closeWorkPriorityPanel();
    return true; // Click was handled (closed the panel)
  }
  
  // Table area
  const tableX = panelX + padding;
  const tableY = panelY + headerHeight + padding;
  const tableHeight = panelHeight - headerHeight - padding * 2 - footerHeight;
  
  // Calculate which cell was clicked
  const relativeX = mouseX - tableX - nameColumnWidth;
  const relativeY = mouseY - tableY - cellHeight + panelScrollY;
  
  if (relativeX < 0 || relativeY < 0) return true; // Clicked on header/name area
  
  const colIndex = Math.floor(relativeX / cellWidth);
  const rowIndex = Math.floor(relativeY / cellHeight);
  
  // Validate indices
  if (colIndex < 0 || colIndex >= WORK_TYPE_ORDER.length) return true;
  if (rowIndex < 0 || rowIndex >= aliveColonists.length) return true;
  
  // Get colonist and work type
  const colonist = aliveColonists[rowIndex];
  const workType = WORK_TYPE_ORDER[colIndex];
  
  if (colonist && workType) {
    cycleWorkPriority(colonist, workType);
    const newPriority = (colonist as any).workPriorities?.[workType] ?? 3;
    console.log(`${colonist.profile?.name || 'Colonist'} ${workType} priority → ${newPriority}`);
  }
  
  return true;
}

/**
 * Handle mouse wheel for scrolling
 */
export function handleWorkPriorityPanelScroll(
  deltaY: number,
  colonists: Colonist[],
  canvas: HTMLCanvasElement,
  game: any
): void {
  if (!isPanelOpen) return;

  const aliveColonists = colonists.filter(c => c.alive);
  const layout = calculatePanelLayout(canvas, aliveColonists.length, game);
  const { cellHeight, panelHeight, headerHeight, padding, footerHeight } = layout;
  
  const tableHeight = panelHeight - headerHeight - padding * 2 - footerHeight;
  const maxScrollY = Math.max(0, (aliveColonists.length + 1) * cellHeight - tableHeight);
  
  // Only scroll if there's actually content to scroll
  if (maxScrollY > 0) {
    panelScrollY += deltaY * 0.5;
    panelScrollY = Math.max(0, Math.min(maxScrollY, panelScrollY));
  }
}

/**
 * Handle mouse hover for tooltips
 * Call this from mousemove to update tooltip state
 */
export function handleWorkPriorityPanelHover(
  mouseX: number,
  mouseY: number,
  colonists: Colonist[],
  canvas: HTMLCanvasElement,
  game: any
): void {
  if (!isPanelOpen) {
    tooltipWorkType = null;
    return;
  }

  const aliveColonists = colonists.filter(c => c.alive);
  const layout = calculatePanelLayout(canvas, aliveColonists.length, game);
  const { panelX, panelY, cellWidth, headerHeight, nameColumnWidth, padding } = layout;
  
  const tableX = panelX + padding;
  const tableY = panelY + headerHeight + padding;
  
  // Check if hovering over header row (work type columns only, not name column)
  if (mouseY >= tableY - panelScrollY && mouseY <= tableY - panelScrollY + layout.cellHeight) {
    const relativeX = mouseX - tableX - nameColumnWidth;
    
    if (relativeX >= 0) {
      const colIndex = Math.floor(relativeX / cellWidth);
      
      if (colIndex >= 0 && colIndex < WORK_TYPE_ORDER.length) {
        tooltipWorkType = WORK_TYPE_ORDER[colIndex];
        tooltipX = mouseX;
        tooltipY = mouseY;
        return;
      }
    }
  }
  
  // Not hovering over a header
  tooltipWorkType = null;
}

/**
 * Check if mouse is hovering over the work priority panel
 */
export function isMouseOverWorkPanel(
  mouseX: number,
  mouseY: number,
  colonists: Colonist[],
  canvas: HTMLCanvasElement,
  game: any
): boolean {
  if (!isPanelOpen) return false;

  const aliveColonists = colonists.filter(c => c.alive);
  const layout = calculatePanelLayout(canvas, aliveColonists.length, game);
  const { panelX, panelY, panelWidth, panelHeight } = layout;
  
  return mouseX >= panelX && 
         mouseX <= panelX + panelWidth && 
         mouseY >= panelY && 
         mouseY <= panelY + panelHeight;
}
