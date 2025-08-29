import type { Vec2 } from "../../../core/utils";
import type { ItemType } from "../items/floorItems";

export interface StockpileZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  allowedItems: Set<ItemType>; // What items can be stored here
  priority: number; // Higher priority zones get filled first
  settings: StockpileSettings;
}

export interface StockpileSettings {
  allowAll: boolean; // If true, ignore allowedItems filter
  maxStacks: number; // Maximum number of item stacks in this zone
  organized: boolean; // If true, try to organize items by type
}

export class StockpileManager {
  private zones: StockpileZone[] = [];
  private nextId = 1;

  createZone(x: number, y: number, width: number, height: number, name?: string): StockpileZone {
    const zone: StockpileZone = {
      id: `stockpile_${this.nextId++}`,
      name: name || `Stockpile ${this.nextId - 1}`,
      x,
      y,
      width,
      height,
      allowedItems: new Set(['wood', 'stone', 'food']), // Allow all by default
      priority: 1,
      settings: {
        allowAll: true,
        maxStacks: Math.floor((width * height) / (24 * 24)), // Rough estimate based on area
        organized: false
      }
    };

    this.zones.push(zone);
    return zone;
  }

  removeZone(zoneId: string): boolean {
    const index = this.zones.findIndex(zone => zone.id === zoneId);
    if (index !== -1) {
      this.zones.splice(index, 1);
      return true;
    }
    return false;
  }

  getZone(zoneId: string): StockpileZone | undefined {
    return this.zones.find(zone => zone.id === zoneId);
  }

  getAllZones(): StockpileZone[] {
    return [...this.zones];
  }

  // Check if a position is inside any stockpile zone
  getZoneAtPosition(position: Vec2): StockpileZone | null {
    for (const zone of this.zones) {
      if (this.isPositionInZone(position, zone)) {
        return zone;
      }
    }
    return null;
  }

  private isPositionInZone(position: Vec2, zone: StockpileZone): boolean {
    return position.x >= zone.x && 
           position.x <= zone.x + zone.width &&
           position.y >= zone.y && 
           position.y <= zone.y + zone.height;
  }

  // Find the best zone for storing a specific item type
  findBestZoneForItem(itemType: ItemType, excludeZones: Set<string> = new Set()): StockpileZone | null {
    let bestZone: StockpileZone | null = null;
    let bestPriority = -1;

    for (const zone of this.zones) {
      if (excludeZones.has(zone.id)) continue;
      
      // Check if this zone accepts this item type
      if (!zone.settings.allowAll && !zone.allowedItems.has(itemType)) continue;
      
      // Prioritize zones with higher priority
      if (zone.priority > bestPriority) {
        bestZone = zone;
        bestPriority = zone.priority;
      }
    }

    return bestZone;
  }

  // Find a good position within a zone to place an item
  findStoragePositionInZone(zone: StockpileZone, itemType: ItemType): Vec2 | null {
    // For now, use a simple grid-based approach
    const gridSize = 24; // 24 pixel grid
    const cols = Math.floor(zone.width / gridSize);
    const rows = Math.floor(zone.height / gridSize);

    // Try to find an empty spot
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = zone.x + col * gridSize + gridSize / 2;
        const y = zone.y + row * gridSize + gridSize / 2;
        
        // TODO: Check if this position is already occupied by items
        // For now, just return the first valid position
        return { x, y };
      }
    }

    return null;
  }

  // Update zone settings
  updateZoneSettings(zoneId: string, settings: Partial<StockpileSettings>): boolean {
    const zone = this.getZone(zoneId);
    if (!zone) return false;

    Object.assign(zone.settings, settings);
    return true;
  }

  // Update zone allowed items
  updateZoneAllowedItems(zoneId: string, allowedItems: ItemType[]): boolean {
    const zone = this.getZone(zoneId);
    if (!zone) return false;

    zone.allowedItems = new Set(allowedItems);
    zone.settings.allowAll = allowedItems.length === 0;
    return true;
  }

  // Get zones sorted by priority (for hauling decisions)
  getZonesByPriority(): StockpileZone[] {
    return [...this.zones].sort((a, b) => b.priority - a.priority);
  }
}
