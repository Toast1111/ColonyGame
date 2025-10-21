import type { Vec2 } from "../../core/utils";
import type { ItemType } from "../types/items";
import type { StockpileZone, StockpileSettings } from "../types/stockpiles";
import { T } from "../constants";

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
      // When allowAll is true, allowedItems is ignored; start empty for clarity
      allowedItems: new Set<ItemType>(),
      priority: 1,
      settings: {
        // Allow all item types by default; specific filters can be applied later
        allowAll: true,
        // One potential stack per tile by default
        maxStacks: Math.max(1, Math.floor((width * height) / (T * T))),
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

  /**
   * Find a good position within a zone to place an item
   * Returns the center of an available tile, or null if zone is full
   * @param zone - The stockpile zone to search
   * @param itemType - The type of item to store
   * @param existingItems - Array of floor items to check for occupancy (optional, for external use)
   */
  findStoragePositionInZone(
    zone: StockpileZone, 
    itemType: ItemType, 
    existingItems?: Array<{ position: Vec2; type: ItemType; quantity: number; stackLimit: number }>
  ): Vec2 | null {
    const gridSize = T;
    const cols = Math.floor(zone.width / gridSize);
    const rows = Math.floor(zone.height / gridSize);

    // Build a map of occupied tiles (tile key -> items in that tile)
    const tileOccupancy = new Map<string, Array<{ type: ItemType; quantity: number; stackLimit: number }>>();
    
    if (existingItems) {
      for (const item of existingItems) {
        // Calculate which tile this item is in
        const tileCol = Math.floor((item.position.x - zone.x) / gridSize);
        const tileRow = Math.floor((item.position.y - zone.y) / gridSize);
        
        // Skip items outside zone bounds
        if (tileCol < 0 || tileCol >= cols || tileRow < 0 || tileRow >= rows) continue;
        
        const tileKey = `${tileCol},${tileRow}`;
        if (!tileOccupancy.has(tileKey)) {
          tileOccupancy.set(tileKey, []);
        }
        tileOccupancy.get(tileKey)!.push({
          type: item.type,
          quantity: item.quantity,
          stackLimit: item.stackLimit
        });
      }
    }

    // Strategy 1: Find a tile with matching item type that's not at stack limit
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileKey = `${col},${row}`;
        const items = tileOccupancy.get(tileKey);
        
        if (items) {
          // Check if there's a matching item type that can accept more
          for (const item of items) {
            if (item.type === itemType && item.quantity < item.stackLimit) {
              // Found a tile with stackable item of same type
              const x = zone.x + col * gridSize + gridSize / 2;
              const y = zone.y + row * gridSize + gridSize / 2;
              return { x, y };
            }
          }
        }
      }
    }

    // Strategy 2: Find a completely empty tile
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileKey = `${col},${row}`;
        if (!tileOccupancy.has(tileKey)) {
          // Empty tile found!
          const x = zone.x + col * gridSize + gridSize / 2;
          const y = zone.y + row * gridSize + gridSize / 2;
          return { x, y };
        }
      }
    }

    // Strategy 3: Find a tile that's not completely full (different item types)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileKey = `${col},${row}`;
        const items = tileOccupancy.get(tileKey);
        
        if (items && items.length < 3) { // Allow up to 3 different stacks per tile
          const x = zone.x + col * gridSize + gridSize / 2;
          const y = zone.y + row * gridSize + gridSize / 2;
          return { x, y };
        }
      }
    }

    // Zone is completely full
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
