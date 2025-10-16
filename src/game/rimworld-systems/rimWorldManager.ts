import { FloorItemManager, type FloorItem, type ItemType } from "./items/floorItems";
import { StockpileManager, type StockpileZone } from "./stockpiles/stockpileZones";
import { LogisticsManager, type HaulingJob } from "./logistics/haulManager";
import { EnhancedLogisticsManager, type ColonistWorkSettings, type WorkType } from "./logistics/enhancedHaulManager";
import { RimWorldRenderer } from "./rendering/rimWorldRenderer";
import type { Vec2 } from "../../core/utils";

export interface RimWorldSystemConfig {
  canvas: HTMLCanvasElement;
  enableAutoHauling: boolean;
  defaultStockpileSize: number;
  useEnhancedLogistics: boolean; // Use RimWorld-style job assignment
}

/**
 * Main manager for the RimWorld-style item and stockpile system
 * Integrates floor items, stockpile zones, hauling jobs, and rendering
 */
export class RimWorldSystemManager {
  public floorItems: FloorItemManager;
  public stockpiles: StockpileManager;
  public logistics: LogisticsManager;
  public enhancedLogistics: EnhancedLogisticsManager;
  public renderer: RimWorldRenderer;
  
  private config: RimWorldSystemConfig;
  private autoHaulingEnabled: boolean;

  constructor(config: RimWorldSystemConfig) {
    this.config = config;
    this.autoHaulingEnabled = config.enableAutoHauling;

    // Initialize subsystems
    this.floorItems = new FloorItemManager();
    this.stockpiles = new StockpileManager();
    this.logistics = new LogisticsManager();
    this.enhancedLogistics = new EnhancedLogisticsManager(this.floorItems, this.stockpiles);
    this.renderer = new RimWorldRenderer(config.canvas);
  }

  // === ITEM MANAGEMENT ===

  /**
   * Drop items on the floor at a specific position
   */
  dropItems(itemType: ItemType, quantity: number, position: Vec2, metadata?: { [key: string]: any }): FloorItem {
    const item = this.floorItems.createItem(itemType, quantity, position, metadata);
    
    // Check if item is in a stockpile zone
    const zone = this.stockpiles.getZoneAtPosition(position);
    if (!zone || (!zone.settings.allowAll && !zone.allowedItems.has(itemType))) {
      // Item dropped outside stockpile or in wrong stockpile - create hauling job
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
    this.logistics.createConstructionRequest(buildingId, position, materials, priority);
  }

  /**
   * Check if construction has all required materials
   */
  isConstructionReady(buildingId: string): boolean {
    return this.logistics.isConstructionReady(buildingId);
  }

  /**
   * Complete construction (cleanup material requests)
   */
  completeConstruction(buildingId: string): void {
    this.logistics.removeConstructionRequest(buildingId);
  }

  // === HAULING SYSTEM ===

  /**
   * Get the next hauling job for a colonist (legacy method)
   */
  assignHaulingJob(colonistId: string, colonistPosition: Vec2): HaulingJob | null {
    return this.logistics.getNextHaulingJob(colonistId, colonistPosition);
  }

  /**
   * RimWorld-style job assignment (enhanced version)
   */
  assignWork(colonist: any): HaulingJob | null {
    if (this.config.useEnhancedLogistics) {
      const job = this.enhancedLogistics.tryAssignJob(colonist);
      // Convert enhanced job to legacy format if needed
      return job as any;
    } else {
      return this.logistics.getNextHaulingJob(colonist.id, colonist.position);
    }
  }

  /**
   * Configure colonist work settings
   */
  setColonistWorkSettings(colonist: any, settings: Partial<ColonistWorkSettings>): void {
    if (!colonist.workSettings) {
      colonist.workSettings = {
        workPriorities: new Map([
          ['hauling', 3],
          ['construction', 2],
          ['cleaning', 1],
          ['repair', 2],
          ['mining', 1],
          ['growing', 1]
        ]),
        workTypesInOrder: ['construction', 'hauling', 'repair', 'cleaning', 'mining', 'growing'],
        canDoWork: true,
        emergencyMode: false
      };
    }

    Object.assign(colonist.workSettings, settings);
  }

  /**
   * Set work priority for a specific work type
   */
  setWorkPriority(colonist: any, workType: WorkType, priority: number): void {
    if (!colonist.workSettings) {
      this.setColonistWorkSettings(colonist, {});
    }
    
    colonist.workSettings.workPriorities.set(workType, priority);
    
    // Update work types in order
    const entries: [WorkType, number][] = Array.from(colonist.workSettings.workPriorities.entries());
    const workTypes = entries
      .filter((entry: [WorkType, number]) => entry[1] > 0)
      .sort((a: [WorkType, number], b: [WorkType, number]) => b[1] - a[1])
      .map((entry: [WorkType, number]) => entry[0]);
    
    colonist.workSettings.workTypesInOrder = workTypes;
  }

  /**
   * Force assign a specific job (player right-click command)
   */
  forceAssignWork(colonist: any, position: Vec2, workType?: WorkType): void {
    colonist.priorityWork = {
      isForced: true,
      cell: position,
      workType: workType
    };
  }

  /**
   * Mark a hauling job as completed
   */
  completeHaulingJob(jobId: string): boolean {
    return this.logistics.completeJob(jobId);
  }

  /**
   * Mark a hauling job as failed
   */
  failHaulingJob(jobId: string): boolean {
    return this.logistics.failJob(jobId);
  }

  // === RENDERING ===

  /**
   * Render all RimWorld systems (call this in your main render loop)
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
    // TODO: Render hauling paths, job indicators, etc.
    // Prefer legacy logistics jobs for debug until enhanced is fully wired to renderer
    const availableJobs = this.logistics?.getAvailableJobs?.() || [];
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
   */
  findBestStorageLocation(itemType: ItemType): { zone: StockpileZone; position: Vec2 } | null {
    const bestZone = this.stockpiles.findBestZoneForItem(itemType);
    if (!bestZone) return null;

    const position = this.stockpiles.findStoragePositionInZone(bestZone, itemType);
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
    this.logistics.cleanupOldJobs();

    // Auto-generate hauling jobs for misplaced items
    if (this.autoHaulingEnabled) {
      this.generateAutoHaulingJobs();
    }
  }

  // === PRIVATE HELPER METHODS ===

  private createHaulingJobForItem(item: FloorItem): void {
    const bestStorage = this.findBestStorageLocation(item.type);
    if (bestStorage) {
      const job = this.logistics.createHaulingJob(item, bestStorage.zone);
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
    const jobs = this.logistics.getAvailableJobs();
    for (const job of jobs) {
      if (job.targetItem.id === itemId) {
        this.logistics.cancelJob(job.id);
      }
    }
  }

  private generateAutoHaulingJobs(): void {
    const itemsNeedingHauling = this.getItemsNeedingHauling();
    const existingJobs = new Set(this.logistics.getAvailableJobs().map(job => job.targetItem.id));

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

  getConfig(): RimWorldSystemConfig {
    return { ...this.config };
  }
}
