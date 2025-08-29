import type { FloorItem, ItemStack } from "../items/floorItems";
import type { StockpileZone } from "../stockpiles/stockpileZones";

export class RimWorldRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  // Render stockpile zones
  renderStockpileZones(zones: StockpileZone[], cameraX: number = 0, cameraY: number = 0): void {
    this.ctx.save();
    
    for (const zone of zones) {
      // Translate for camera
      const screenX = zone.x - cameraX;
      const screenY = zone.y - cameraY;

      // Skip if zone is off-screen
      if (screenX + zone.width < 0 || screenX > this.canvas.width || 
          screenY + zone.height < 0 || screenY > this.canvas.height) {
        continue;
      }

      // Draw zone background
      this.ctx.fillStyle = 'rgba(100, 200, 100, 0.1)'; // Light green tint
      this.ctx.fillRect(screenX, screenY, zone.width, zone.height);

      // Draw zone border
      this.ctx.strokeStyle = 'rgba(100, 200, 100, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(screenX, screenY, zone.width, zone.height);

      // Draw zone label
      if (zone.width > 60 && zone.height > 30) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(zone.name, screenX + zone.width / 2, screenY + 15);
        
        // Show priority if not default
        if (zone.priority !== 1) {
          this.ctx.fillText(`Priority: ${zone.priority}`, screenX + zone.width / 2, screenY + 30);
        }
      }
    }

    this.ctx.restore();
  }

  // Render floor items as visual stacks
  renderFloorItems(stacks: ItemStack[], cameraX: number = 0, cameraY: number = 0): void {
    this.ctx.save();

    for (const stack of stacks) {
      const screenX = stack.centerX - cameraX;
      const screenY = stack.centerY - cameraY;

      // Skip if off-screen
      if (screenX < -32 || screenX > this.canvas.width + 32 || 
          screenY < -32 || screenY > this.canvas.height + 32) {
        continue;
      }

      // Get the primary item type for this stack
      const primaryItem = stack.items[0];
      if (!primaryItem) continue;

      // Draw item representation
      this.drawItemStack(screenX, screenY, primaryItem.type, stack.totalQuantity, stack.items.length > 1);
    }

    this.ctx.restore();
  }

  private drawItemStack(x: number, y: number, type: string, quantity: number, isMultiStack: boolean): void {
    const size = 16;
    const halfSize = size / 2;

    // Get color based on item type
    const color = this.getItemColor(type);
    
    // Draw main item
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x - halfSize, y - halfSize, size, size);
    
    // Draw border
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - halfSize, y - halfSize, size, size);

    // If it's a multi-stack (multiple separate piles), draw additional indicators
    if (isMultiStack) {
      // Draw shadow stacks
      this.ctx.fillStyle = this.darkenColor(color, 0.7);
      this.ctx.fillRect(x - halfSize + 2, y - halfSize + 2, size, size);
      this.ctx.fillRect(x - halfSize + 4, y - halfSize + 4, size, size);
    }

    // Draw quantity text
    if (quantity > 1) {
      this.ctx.fillStyle = 'white';
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 2;
      this.ctx.font = 'bold 10px Arial';
      this.ctx.textAlign = 'center';
      
      const text = quantity > 999 ? '999+' : quantity.toString();
      
      // Draw text outline
      this.ctx.strokeText(text, x, y + halfSize + 12);
      // Draw text
      this.ctx.fillText(text, x, y + halfSize + 12);
    }

    // Draw item type indicator
    this.drawItemTypeIcon(x, y, type, size);
  }

  private drawItemTypeIcon(x: number, y: number, type: string, size: number): void {
    const iconSize = Math.floor(size * 0.6);
    const offset = Math.floor(iconSize / 2);

    this.ctx.fillStyle = 'white';
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 1;
    this.ctx.font = `bold ${iconSize}px Arial`;
    this.ctx.textAlign = 'center';

    let icon = '?';
    switch (type) {
      case 'wood': icon = '🪵'; break;
      case 'stone': icon = '🪨'; break;
      case 'food': icon = '🍖'; break;
      case 'metal': icon = '⚙️'; break;
      case 'cloth': icon = '🧵'; break;
      case 'medicine': icon = '💊'; break;
    }

    // If emojis don't work, use text alternatives
    if (icon.length > 1) {
      switch (type) {
        case 'wood': icon = 'W'; break;
        case 'stone': icon = 'S'; break;
        case 'food': icon = 'F'; break;
        case 'metal': icon = 'M'; break;
        case 'cloth': icon = 'C'; break;
        case 'medicine': icon = '+'; break;
      }
    }

    this.ctx.strokeText(icon, x, y);
    this.ctx.fillText(icon, x, y);
  }

  private getItemColor(type: string): string {
    switch (type) {
      case 'wood': return '#8B4513'; // Brown
      case 'stone': return '#696969'; // Dark gray
      case 'food': return '#D2691E'; // Chocolate
      case 'metal': return '#C0C0C0'; // Silver
      case 'cloth': return '#DDA0DD'; // Plum
      case 'medicine': return '#FF69B4'; // Hot pink
      default: return '#808080'; // Gray
    }
  }

  private darkenColor(color: string, factor: number): string {
    // Simple color darkening - convert hex to RGB, darken, convert back
    if (color.startsWith('#')) {
      const r = parseInt(color.substring(1, 3), 16);
      const g = parseInt(color.substring(3, 5), 16);
      const b = parseInt(color.substring(5, 7), 16);
      
      const newR = Math.floor(r * factor);
      const newG = Math.floor(g * factor);
      const newB = Math.floor(b * factor);
      
      return `rgb(${newR}, ${newG}, ${newB})`;
    }
    return color;
  }

  // Render hauling paths (for debugging)
  renderHaulingPath(fromX: number, fromY: number, toX: number, toY: number, cameraX: number = 0, cameraY: number = 0): void {
    const screenFromX = fromX - cameraX;
    const screenFromY = fromY - cameraY;
    const screenToX = toX - cameraX;
    const screenToY = toY - cameraY;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    
    this.ctx.beginPath();
    this.ctx.moveTo(screenFromX, screenFromY);
    this.ctx.lineTo(screenToX, screenToY);
    this.ctx.stroke();
    
    // Draw arrow at destination
    const angle = Math.atan2(screenToY - screenFromY, screenToX - screenFromX);
    const arrowLength = 10;
    
    this.ctx.setLineDash([]);
    this.ctx.beginPath();
    this.ctx.moveTo(screenToX, screenToY);
    this.ctx.lineTo(
      screenToX - arrowLength * Math.cos(angle - Math.PI / 6),
      screenToY - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(screenToX, screenToY);
    this.ctx.lineTo(
      screenToX - arrowLength * Math.cos(angle + Math.PI / 6),
      screenToY - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();

    this.ctx.restore();
  }

  // Highlight a specific item (for selection or targeting)
  highlightItem(item: FloorItem, cameraX: number = 0, cameraY: number = 0): void {
    const screenX = item.position.x - cameraX;
    const screenY = item.position.y - cameraY;

    this.ctx.save();
    this.ctx.strokeStyle = 'yellow';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([3, 3]);
    
    const size = 20;
    this.ctx.strokeRect(screenX - size/2, screenY - size/2, size, size);
    
    this.ctx.restore();
  }
}
