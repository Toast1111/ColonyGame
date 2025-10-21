import { FloorItemManager } from "../systems/floorItems";
import { StockpileManager } from "../systems/stockpileZones";
import { HaulManager, type HaulingJob } from "../systems/haulManager";
import { ItemRenderer } from "../rendering/itemRenderer";
import type { ItemType, FloorItem } from "../types/items";
import type { StockpileZone } from "../types/stockpiles";
import type { Vec2 } from "../../core/utils";

export interface ItemManagerConfig {
  canvas: HTMLCanvasElement;
  enableAutoHauling: boolean;
}

/**
 * Item Manager - Manages floor-based items, stockpile zones, and hauling
 * Provides visual floor item storage like RimWorld instead of abstract resource pools
 */
export class ItemManager {
  public floorItems: FloorItemManager;
  public stockpiles: StockpileManager;
  public hauling: HaulManager;
  public renderer: ItemRenderer;
  
  private autoHaulingEnabled: boolean;

  constructor(config: ItemManagerConfig) {
    this.autoHaulingEnabled = config.enableAutoHauling;

    // Initialize subsystems
    this.floorItems = new FloorItemManager();
    this.stockpiles = new StockpileManager();
    this.hauling = new HaulManager();
    this.renderer = new ItemRenderer(config.canvas);
  }

  // === ITEM MANAGEMENT ===

  /**
   * Drop items on the floor at a specific position
   * If position is in a stockpile zone, will use tile-based positioning
   */
  dropItems(itemType: ItemType, quantity: number, position: Vec2, metadata?: { [key: string]: any }): FloorItem {
    // Check if we're dropping in a stockpile zone
    const zone = this.stockpiles.getZoneAtPosition(position);
    
    // If in a zone that accepts this item, find the proper tile-based position
    let finalPosition = position;
    if (zone && (zone.settings.allowAll || zone.allowedItems.has(itemType))) {
      // Get all existing items for tile occupancy check
      const allItems = this.floorItems.getAllItems();
      const betterPosition = this.stockpiles.findStoragePositionInZone(zone, itemType, allItems);
      if (betterPosition) {
        finalPosition = betterPosition;
      }
    }
    
    const item = this.floorItems.createItem(itemType, quantity, finalPosition, metadata);
    
    // If item is outside stockpile or in wrong stockpile, create hauling job
    const itemZone = this.stockpiles.getZoneAtPosition(item.position);
    if (!itemZone || (!itemZone.settings.allowAll && !itemZone.allowedItems.has(itemType))) {
      if (this.autoHaulingEnabled) {
        this.createHaulingJobForItem(item);
      }
    }

    return item;
  }

  /**
   * Pick up items from the floor (returns what was actually picked up)
   */
  pickupItems(itemId: string, quantity: number): { taken: number; item: FloorItem | null } {
    return this.floorItems.takeFromItem(itemId, quantity);
  }

  /**
   * Remove all items at a position (for cleanup)
   */
  clearItemsAtPosition(position: Vec2, radius: number = 24): FloorItem[] {
    const itemsToRemove = this.floorItems.getItemsInArea(position, radius);
    const removed: FloorItem[] = [];

    for (const item of itemsToRemove) {
      const removedItem = this.floorItems.removeItem(item.id);
      if (removedItem) {
        removed.push(removedItem);
        // Cancel any hauling jobs for this item
        this.cancelHaulingJobsForItem(item.id);
      }
    }

    return removed;
  }

  // === STOCKPILE MANAGEMENT ===

  /**
   * Create a new stockpile zone
   */
  createStockpileZone(x: number, y: number, width: number, height: number, name?: string): StockpileZone {
    const zone = this.stockpiles.createZone(x, y, width, height, name);
    
    // If auto-hauling is enabled, create jobs for items that should be in this zone
    if (this.autoHaulingEnabled) {
      this.createHaulingJobsForNewZone(zone);
    }

    return zone;
  }

  /**
   * Remove a stockpile zone
   */
  removeStockpileZone(zoneId: string): boolean {
    return this.stockpiles.removeZone(zoneId);
  }

  /**
   * Update what items a stockpile accepts
   */
  updateStockpileItems(zoneId: string, allowedItems: ItemType[]): boolean {
    return this.stockpiles.updateZoneAllowedItems(zoneId, allowedItems);
  }

  // === CONSTRUCTION INTEGRATION ===

  /**
   * Request materials for construction
   */
  requestConstructionMaterials(buildingId: string, position: Vec2, materials: Map<ItemType, number>, priority: number = 1): void {
    this.hauling.createConstructionRequest(buildingId, position, materials, priority);
  }

  /**
   * Check if construction has all required materials
   */
  isConstructionReady(buildingId: string): boolean {
    return this.hauling.isConstructionReady(buildingId);
  }

  /**
   * Complete construction (cleanup material requests)
   */
  completeConstruction(buildingId: string): void {
    this.hauling.removeConstructionRequest(buildingId);
  }

  // === HAULING SYSTEM ===

  /**
   * Get the next hauling job for a colonist
   */
  assignHaulingJob(colonistId: string, colonistPosition: Vec2): HaulingJob | null {
    return this.hauling.getNextHaulingJob(colonistId, colonistPosition);
  }

  /**
   * Mark a hauling job as completed
   */
  completeHaulingJob(jobId: string): boolean {
    return this.hauling.completeJob(jobId);
  }

  /**
   * Mark a hauling job as failed
   */
  failHaulingJob(jobId: string): boolean {
    return this.hauling.failJob(jobId);
  }

  // === RENDERING ===

  /**
   * Render all systems (call this in your main render loop)
   */
  render(cameraX: number = 0, cameraY: number = 0): void {
    // Render stockpile zones first (background)
    const zones = this.stockpiles.getAllZones();
    this.renderer.renderStockpileZones(zones, cameraX, cameraY);

    // Render floor items
    const itemStacks = this.floorItems.getVisualStacks();
    this.renderer.renderFloorItems(itemStacks, cameraX, cameraY);
  }

  /**
   * Render debug information (hauling paths, job assignments, etc.)
   */
  renderDebugInfo(cameraX: number = 0, cameraY: number = 0): void {
    const availableJobs = this.hauling.getAvailableJobs();
    if (!availableJobs.length) return;

    for (const job of availableJobs) {
      if (!job?.destination || !job?.targetItem) continue;
      this.renderer.renderHaulingPath(
        job.targetItem.position.x, 
        job.targetItem.position.y,
        job.destination.x,
        job.destination.y,
        cameraX,
        cameraY
      );
    }
  }

  // === UTILITY METHODS ===

  /**
   * Find the best storage location for an item
   * Takes into account existing items to find proper tile-based positions
   */
  findBestStorageLocation(itemType: ItemType): { zone: StockpileZone; position: Vec2 } | null {
    const bestZone = this.stockpiles.findBestZoneForItem(itemType);
    if (!bestZone) return null;

    // Get all existing items to check tile occupancy
    const allItems = this.floorItems.getAllItems();
    
    // Pass existing items to find a proper tile-based position
    const position = this.stockpiles.findStoragePositionInZone(bestZone, itemType, allItems);
    if (!position) return null;

    return { zone: bestZone, position };
  }

  /**
   * Get all items that need to be hauled
   */
  getItemsNeedingHauling(): FloorItem[] {
    const allItems = this.floorItems.getAllItems();
    const itemsNeedingHauling: FloorItem[] = [];

    for (const item of allItems) {
      const zone = this.stockpiles.getZoneAtPosition(item.position);
      
      // Item needs hauling if:
      // 1. It's not in any stockpile zone, OR
      // 2. It's in a zone that doesn't accept this item type
      if (!zone || (!zone.settings.allowAll && !zone.allowedItems.has(item.type))) {
        itemsNeedingHauling.push(item);
      }
    }

    return itemsNeedingHauling;
  }

  /**
   * Update system (call this in your game loop)
   */
  update(): void {
    // Clean up old completed jobs
    this.hauling.cleanupOldJobs();

    // Auto-generate hauling jobs for misplaced items
    if (this.autoHaulingEnabled) {
      this.generateAutoHaulingJobs();
    }
  }

  // === PRIVATE HELPER METHODS ===

  private createHaulingJobForItem(item: FloorItem): void {
    const bestStorage = this.findBestStorageLocation(item.type);
    if (bestStorage) {
      const job = this.hauling.createHaulingJob(item, bestStorage.zone);
      job.destination = bestStorage.position;
    }
  }

  private createHaulingJobsForNewZone(zone: StockpileZone): void {
    const allItems = this.floorItems.getAllItems();
    
    for (const item of allItems) {
      // If this item type should be in this zone but isn't
      if ((zone.settings.allowAll || zone.allowedItems.has(item.type))) {
        const currentZone = this.stockpiles.getZoneAtPosition(item.position);
        if (!currentZone) {
          this.createHaulingJobForItem(item);
        }
      }
    }
  }

  private cancelHaulingJobsForItem(itemId: string): void {
    const jobs = this.hauling.getAvailableJobs();
    for (const job of jobs) {
      if (job.targetItem.id === itemId) {
        this.hauling.cancelJob(job.id);
      }
    }
  }

  private generateAutoHaulingJobs(): void {
    const itemsNeedingHauling = this.getItemsNeedingHauling();
    const existingJobs = new Set(this.hauling.getAvailableJobs().map(job => job.targetItem.id));

    for (const item of itemsNeedingHauling) {
      // Only create job if one doesn't already exist for this item
      if (!existingJobs.has(item.id)) {
        this.createHaulingJobForItem(item);
      }
    }
  }

  // === CONFIGURATION ===

  setAutoHauling(enabled: boolean): void {
    this.autoHaulingEnabled = enabled;
  }
}
