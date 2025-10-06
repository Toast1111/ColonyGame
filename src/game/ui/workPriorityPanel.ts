/**
 * Work Priority Panel - RimWorld-style job assignment UI
 * 
 * Shows a grid of colonists × work types where each cell displays the priority (1-4 or disabled)
 * Click a cell to cycle through priorities
 */

import type { Colonist } from '../types';
import { WORK_TYPE_ORDER, WORK_TYPE_INFO, cycleWorkPriority, type WorkType, type WorkPriority } from '../systems/workPriority';

// UI state
let isPanelOpen = false;
let panelScrollY = 0;

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
 */
function calculatePanelLayout(canvasWidth: number, canvasHeight: number, colonistCount: number): PanelLayout {
  // Panel takes up 90% of screen width and 85% of height (responsive)
  const panelWidth = canvasWidth * 0.9;
  const panelHeight = canvasHeight * 0.85;
  
  // Center the panel
  const panelX = (canvasWidth - panelWidth) / 2;
  const panelY = (canvasHeight - panelHeight) / 2;
  
  // Calculate padding as 2% of panel width
  const padding = panelWidth * 0.02;
  
  // Header is 8% of panel height
  const headerHeight = panelHeight * 0.08;
  
  // Footer is 6% of panel height
  const footerHeight = panelHeight * 0.06;
  
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
  const fontSize = Math.max(10, panelWidth * 0.012); // 1.2% of panel width
  const headerFontSize = Math.max(12, panelWidth * 0.015); // 1.5% of panel width
  
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
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!isPanelOpen) return;
  
  const aliveColonists = colonists.filter(c => c.alive);
  
  // Calculate responsive layout (NO hardcoded pixels!)
  const layout = calculatePanelLayout(canvasWidth, canvasHeight, aliveColonists.length);
  const { panelX, panelY, panelWidth, panelHeight, cellWidth, cellHeight, 
          headerHeight, nameColumnWidth, padding, fontSize, headerFontSize, footerHeight } = layout;
  
  // Semi-transparent backdrop
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Panel background with gradient
  const gradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelHeight);
  gradient.addColorStop(0, '#2a2a2a');
  gradient.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = gradient;
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  
  // Panel border with glow effect
  ctx.shadowColor = 'rgba(100, 150, 200, 0.5)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#4a6fa5';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
  ctx.shadowBlur = 0;
  
  // Title bar background
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(panelX, panelY, panelWidth, headerHeight);
  
  // Title (scaled font)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(headerFontSize * 1.3)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Work Priorities', panelX + panelWidth / 2, panelY + headerHeight * 0.6);
  
  // Close button (scaled with panel)
  const closeSize = headerHeight * 0.6;
  const closeX = panelX + panelWidth - closeSize - padding;
  const closeY = panelY + (headerHeight - closeSize) / 2;
  
  // Close button background
  ctx.fillStyle = '#d32f2f';
  ctx.beginPath();
  ctx.roundRect(closeX, closeY, closeSize, closeSize, closeSize * 0.15);
  ctx.fill();
  
  // Close button border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Close button X
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, closeSize * 0.08);
  ctx.beginPath();
  ctx.moveTo(closeX + closeSize * 0.25, closeY + closeSize * 0.25);
  ctx.lineTo(closeX + closeSize * 0.75, closeY + closeSize * 0.75);
  ctx.moveTo(closeX + closeSize * 0.75, closeY + closeSize * 0.25);
  ctx.lineTo(closeX + closeSize * 0.25, closeY + closeSize * 0.75);
  ctx.stroke();
  
  // Table area
  const tableX = panelX + padding;
  const tableY = panelY + headerHeight + padding;
  const tableWidth = panelWidth - padding * 2;
  const tableHeight = panelHeight - headerHeight - padding * 2 - footerHeight;
  
  // Save context for clipping
  ctx.save();
  ctx.beginPath();
  ctx.rect(tableX, tableY, tableWidth, tableHeight);
  ctx.clip();
  
  // Column headers (work types)
  let headerX = tableX + nameColumnWidth;
  ctx.font = `${Math.round(fontSize * 0.9)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  
  // Header row background
  ctx.fillStyle = '#2a4a6a';
  ctx.fillRect(tableX, tableY - panelScrollY, tableWidth, cellHeight);
  
  // "Name" header
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(headerFontSize)}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('Colonist', tableX + padding * 0.5, tableY - panelScrollY + cellHeight * 0.65);
  
  ctx.font = `${Math.round(fontSize * 0.85)}px Arial, sans-serif`;
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
    
    // Header text (adapt rotation based on cell width)
    ctx.save();
    ctx.fillStyle = '#e0e0e0';
    
    if (cellWidth >= panelWidth * 0.04) {
      // Angled text for wider cells
      ctx.translate(headerX + cellWidth / 2, tableY - panelScrollY + cellHeight - cellHeight * 0.1);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'right';
      ctx.fillText(info.label, 0, 0);
    } else {
      // Vertical text for narrower cells
      ctx.translate(headerX + cellWidth / 2, tableY - panelScrollY + cellHeight - cellHeight * 0.1);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'left';
      const shortLabel = info.label.length > 8 ? info.label.substring(0, 8) : info.label;
      ctx.fillText(shortLabel, 0, 0);
    }
    ctx.restore();
    
    headerX += cellWidth;
  }
  
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
  ctx.fillText('Press P to close • Scroll with mouse wheel', 
               panelX + panelWidth / 2, footerY + footerHeight * 0.75);
}

/**
 * Handle click on the work priority panel
 * Returns true if click was handled
 */
export function handleWorkPriorityPanelClick(
  mouseX: number, 
  mouseY: number,
  colonists: Colonist[],
  canvasWidth: number,
  canvasHeight: number
): boolean {
  if (!isPanelOpen) return false;
  
  const aliveColonists = colonists.filter(c => c.alive);
  
  // CRITICAL: Calculate same layout as draw function (NO hardcoded pixels!)
  const layout = calculatePanelLayout(canvasWidth, canvasHeight, aliveColonists.length);
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
 * Handle mouse wheel for scrolling (future enhancement)
 */
export function handleWorkPriorityPanelScroll(deltaY: number): void {
  if (!isPanelOpen) return;
  
  panelScrollY += deltaY * 0.5;
  panelScrollY = Math.max(0, panelScrollY);
}
