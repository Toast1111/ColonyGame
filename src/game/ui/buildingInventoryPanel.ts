/**
 * Building Inventory Panel UI
 * 
 * Displays the contents of a building's inventory when clicked
 * Shows item icons, quantities, and inventory capacity
 */

import type { Building } from '../types';
import { 
  getResourceDisplayName, 
  getResourceIcon, 
  getTotalInventoryCount,
  getInventoryUsagePercent 
} from '../systems/buildingInventory';

// UI state
let selectedBuilding: Building | null = null;
let isPanelOpen = false;

/**
 * Open the building inventory panel for a specific building
 */
export function openBuildingInventoryPanel(building: Building): void {
  if (!building.inventory) return;
  
  selectedBuilding = building;
  isPanelOpen = true;
}

/**
 * Close the building inventory panel
 */
export function closeBuildingInventoryPanel(): void {
  selectedBuilding = null;
  isPanelOpen = false;
}

/**
 * Check if panel is open
 */
export function isBuildingInventoryPanelOpen(): boolean {
  return isPanelOpen;
}

/**
 * Get the currently selected building
 */
export function getSelectedBuilding(): Building | null {
  return selectedBuilding;
}

/**
 * Draw the building inventory panel
 */
export function drawBuildingInventoryPanel(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!isPanelOpen || !selectedBuilding || !selectedBuilding.inventory) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const inventory = selectedBuilding.inventory;
  const building = selectedBuilding;

  // Panel dimensions (responsive)
  const panelWidth = Math.min(500, canvasWidth * 0.85);
  const panelHeight = Math.min(600, canvasHeight * 0.75);
  const panelX = (canvasWidth - panelWidth) / 2;
  const panelY = (canvasHeight - panelHeight) / 2;
  const padding = 16;

  // Semi-transparent backdrop
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Panel background
  ctx.fillStyle = '#1a2332';
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

  // Panel border
  ctx.strokeStyle = '#3b4a5a';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  // Header
  const headerHeight = 60;
  ctx.fillStyle = '#2d3e50';
  ctx.fillRect(panelX, panelY, panelWidth, headerHeight);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'left';
  const buildingName = building.name || 'Building';
  ctx.fillText(`${buildingName} Inventory`, panelX + padding, panelY + 38);

  // Close button
  const closeSize = 40;
  const closeX = panelX + panelWidth - closeSize - padding;
  const closeY = panelY + (headerHeight - closeSize) / 2;

  ctx.fillStyle = '#d32f2f';
  ctx.beginPath();
  ctx.roundRect(closeX, closeY, closeSize, closeSize, 6);
  ctx.fill();

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(closeX + 12, closeY + 12);
  ctx.lineTo(closeX + closeSize - 12, closeY + closeSize - 12);
  ctx.moveTo(closeX + closeSize - 12, closeY + 12);
  ctx.lineTo(closeX + 12, closeY + closeSize - 12);
  ctx.stroke();

  // Inventory info bar
  const infoBarY = panelY + headerHeight + padding;
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial, sans-serif';
  ctx.textAlign = 'left';
  
  const slotsUsed = inventory.items.length;
  const slotsTotal = inventory.capacity;
  const totalItems = getTotalInventoryCount(building);
  
  ctx.fillText(`Slots: ${slotsUsed}/${slotsTotal}`, panelX + padding, infoBarY);
  ctx.fillText(`Total Items: ${totalItems}`, panelX + panelWidth - 150, infoBarY);

  // Items list
  const itemsY = infoBarY + 30;
  const itemHeight = 60;
  const itemsAreaHeight = panelHeight - headerHeight - 120;

  // Draw items
  if (inventory.items.length === 0) {
    // Empty inventory message
    ctx.fillStyle = '#888888';
    ctx.font = 'italic 18px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No items stored', panelX + panelWidth / 2, itemsY + 100);
  } else {
    let currentY = itemsY;

    for (const item of inventory.items) {
      if (currentY + itemHeight > panelY + panelHeight - 80) break; // Don't overflow

      // Item row background
      ctx.fillStyle = '#2a3a4a';
      ctx.fillRect(panelX + padding, currentY, panelWidth - padding * 2, itemHeight - 8);

      // Item row border
      ctx.strokeStyle = '#3b4a5a';
      ctx.lineWidth = 1;
      ctx.strokeRect(panelX + padding, currentY, panelWidth - padding * 2, itemHeight - 8);

      // Item icon (emoji)
      const icon = getResourceIcon(item.type);
      ctx.font = '32px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(icon, panelX + padding * 2, currentY + 40);

      // Item name
      const itemName = getResourceDisplayName(item.type);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText(itemName, panelX + padding * 4 + 32, currentY + 25);

      // Item quantity
      ctx.fillStyle = '#90caf9';
      ctx.font = '16px Arial, sans-serif';
      const maxStack = item.maxStack || 100;
      ctx.fillText(`Quantity: ${item.quantity}/${maxStack}`, panelX + padding * 4 + 32, currentY + 45);

      // Quantity bar
      const barX = panelX + panelWidth - 120;
      const barY = currentY + 20;
      const barWidth = 80;
      const barHeight = 20;

      // Bar background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Bar fill
      const fillPercent = item.quantity / maxStack;
      const fillWidth = barWidth * fillPercent;
      
      let barColor = '#4caf50'; // Green
      if (fillPercent > 0.9) barColor = '#ff9800'; // Orange when nearly full
      if (fillPercent >= 1.0) barColor = '#f44336'; // Red when full

      ctx.fillStyle = barColor;
      ctx.fillRect(barX, barY, fillWidth, barHeight);

      // Bar border
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);

      currentY += itemHeight;
    }
  }

  // Footer with instructions
  const footerY = panelY + panelHeight - 50;
  ctx.fillStyle = '#2d3e50';
  ctx.fillRect(panelX, footerY, panelWidth, 50);

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '14px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Click outside or press X to close', panelX + panelWidth / 2, footerY + 30);

  ctx.restore();
}

/**
 * Handle click on the building inventory panel
 * Returns true if click was handled
 */
export function handleBuildingInventoryPanelClick(
  mouseX: number,
  mouseY: number,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  if (!isPanelOpen || !selectedBuilding) return false;

  const panelWidth = Math.min(500, canvasWidth * 0.85);
  const panelHeight = Math.min(600, canvasHeight * 0.75);
  const panelX = (canvasWidth - panelWidth) / 2;
  const panelY = (canvasHeight - panelHeight) / 2;
  const padding = 16;

  // Check close button
  const headerHeight = 60;
  const closeSize = 40;
  const closeX = panelX + panelWidth - closeSize - padding;
  const closeY = panelY + (headerHeight - closeSize) / 2;

  if (
    mouseX >= closeX &&
    mouseX <= closeX + closeSize &&
    mouseY >= closeY &&
    mouseY <= closeY + closeSize
  ) {
    closeBuildingInventoryPanel();
    return true;
  }

  // Check if click is inside panel
  const insidePanel =
    mouseX >= panelX &&
    mouseX <= panelX + panelWidth &&
    mouseY >= panelY &&
    mouseY <= panelY + panelHeight;

  if (!insidePanel) {
    // Click outside panel - close it
    closeBuildingInventoryPanel();
    return true;
  }

  // Click inside panel but not on close button - consume the click
  return true;
}
