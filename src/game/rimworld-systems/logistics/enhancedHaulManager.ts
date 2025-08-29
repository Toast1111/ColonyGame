import type { Vec2 } from "../../../core/utils";
import type { ItemType, FloorItem } from "../items/floorItems";
import type { StockpileZone } from "../stockpiles/stockpileZones";

// Based on RimWorld's WorkGiver system
export interface WorkGiver {
  id: string;
  workType: WorkType;
  priority: number; // Priority within work type (higher = more important)
  scanThings: boolean; // Should scan for things to work on
  scanCells: boolean; // Should scan for cells to work on  
  prioritized: boolean; // Use priority-first vs distance-first selection
  allowUnreachable: boolean; // Allow assigning unreachable jobs
  maxPathDanger: 'none' | 'low' | 'high' | 'extreme';
  emergencyOnly: boolean; // Only assign during emergency work
}

export type WorkType = 'hauling' | 'construction' | 'cleaning' | 'repair' | 'mining' | 'growing';

export interface ColonistWorkSettings {
  workPriorities: Map<WorkType, number>; // 0 = disabled, 1-4 = priority
  workTypesInOrder: WorkType[]; // Ordered by priority
  canDoWork: boolean;
  emergencyMode: boolean;
}

export interface HaulingJob {
  id: string;
  workType: WorkType;
  priority: number;
  targetItem?: FloorItem;
  targetPosition?: Vec2;
  destination?: Vec2;
  destinationZone?: StockpileZone;
  assignedColonist?: string;
  status: 'available' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  createdAt: number;
  workGiverId: string;
  playerForced?: boolean; // Player manually assigned this job
}

export interface ConstructionMaterialRequest {
  buildingId: string;
  position: Vec2;
  requiredMaterials: Map<ItemType, number>;
  deliveredMaterials: Map<ItemType, number>;
  priority: number;
  workType: WorkType;
}

// RimWorld-style work giver for hauling items to stockpiles
class HaulingWorkGiver implements WorkGiver {
  id = 'haul_to_stockpile';
  workType: WorkType = 'hauling';
  priority = 10;
  scanThings = true;
  scanCells = false;
  prioritized = false; // Distance-first for hauling efficiency
  allowUnreachable = false;
  maxPathDanger = 'low' as const;
  emergencyOnly = false;

  constructor(private logisticsManager: EnhancedLogisticsManager) {}

  canGiveJob(colonist: any, item: FloorItem): boolean {
    // Check if colonist can haul
    if (!colonist.workSettings?.canDoWork) return false;
    if ((colonist.workSettings.workPriorities.get('hauling') || 0) === 0) return false;

    // Check if item needs hauling
    return this.logisticsManager.itemNeedsHauling(item);
  }

  createJob(colonist: any, item: FloorItem): HaulingJob | null {
    const storage = this.logisticsManager.findBestStorageLocation(item.type);
    if (!storage) return null;

    return {
      id: `haul_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workType: 'hauling',
      priority: this.calculateJobPriority(item),
      targetItem: item,
      destination: storage.position,
      destinationZone: storage.zone,
      status: 'available',
      createdAt: Date.now(),
      workGiverId: this.id
    };
  }

  private calculateJobPriority(item: FloorItem): number {
    let priority = 5; // Base priority

    // Food should be stored quickly
    if (item.type === 'food') priority += 3;
    
    // Heavy items should be prioritized (less trips)
    if (item.weight > 10) priority += 2;

    // Items blocking paths get higher priority
    // TODO: Check if item is in a high-traffic area
    
    return priority;
  }
}

// Work giver for construction material delivery
class ConstructionHaulingWorkGiver implements WorkGiver {
  id = 'haul_to_construction';
  workType: WorkType = 'construction';
  priority = 15; // Higher than general hauling
  scanThings = true;
  scanCells = true; // Also scan construction sites
  prioritized = true; // Priority-first for critical materials
  allowUnreachable = false;
  maxPathDanger = 'low' as const;
  emergencyOnly = false;

  constructor(private logisticsManager: EnhancedLogisticsManager) {}

  canGiveJob(colonist: any, target: FloorItem | Vec2): boolean {
    if (!colonist.workSettings?.canDoWork) return false;
    if ((colonist.workSettings.workPriorities.get('construction') || 0) === 0) return false;

    if ('type' in target) {
      // It's an item - check if needed for construction
      return this.logisticsManager.isItemNeededForConstruction(target);
    } else {
      // It's a position - check if it's a construction site needing materials
      return this.logisticsManager.isConstructionSiteNeedingMaterials(target);
    }
  }

  createJob(colonist: any, target: FloorItem | Vec2): HaulingJob | null {
    if ('type' in target) {
      // Haul item to construction site
      const constructionSite = this.logisticsManager.findConstructionSiteNeedingItem(target.type);
      if (!constructionSite) return null;

      return {
        id: `construct_haul_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        workType: 'construction',
        priority: 20, // High priority for construction
        targetItem: target,
        destination: constructionSite,
        status: 'available',
        createdAt: Date.now(),
        workGiverId: this.id
      };
    } else {
      // Work at construction site (if materials are available)
      const job = this.logisticsManager.getConstructionJob(target);
      return job;
    }
  }
}

export class EnhancedLogisticsManager {
  private jobs: HaulingJob[] = [];
  private constructionRequests: ConstructionMaterialRequest[] = [];
  private workGivers: WorkGiver[] = [];
  private nextJobId = 1;

  constructor(
    private floorItemManager: any,
    private stockpileManager: any
  ) {
    // Initialize work givers (like RimWorld's work giver system)
    this.workGivers = [
      new HaulingWorkGiver(this),
      new ConstructionHaulingWorkGiver(this)
    ];
  }

  // Main job assignment method (based on RimWorld's TryIssueJobPackage)
  tryAssignJob(colonist: any): HaulingJob | null {
    if (!colonist.workSettings?.canDoWork) return null;

    // Handle emergency/forced work first
    if (colonist.priorityWork?.isForced) {
      const forcedJob = this.tryAssignForcedJob(colonist);
      if (forcedJob) {
        forcedJob.playerForced = true;
        return forcedJob;
      }
      colonist.priorityWork = null;
    }

    // Get work givers in priority order
    const workGivers = this.getWorkGiversInOrder(colonist);
    
    let bestJob: HaulingJob | null = null;
    let bestTarget: FloorItem | Vec2 | null = null;
    let bestWorkGiver: WorkGiver | null = null;
    let currentPriority = -999;

    // Iterate through work givers by priority
    for (const workGiver of workGivers) {
      // If we found a job at higher priority, stop searching lower priorities
      if (workGiver.priority !== currentPriority && bestJob) {
        break;
      }

      if (!this.canColonistUseWorkGiver(colonist, workGiver)) {
        continue;
      }

      try {
        // Try non-scan jobs first (immediate jobs)
        const nonScanJob = this.tryNonScanJob(colonist, workGiver);
        if (nonScanJob) {
          return nonScanJob;
        }

        // Scan for potential targets
        if (workGiver.scanThings) {
          const target = this.findBestThingTarget(colonist, workGiver);
          if (target && this.isTargetBetter(target, bestTarget, workGiver, colonist)) {
            bestTarget = target;
            bestWorkGiver = workGiver;
          }
        }

        if (workGiver.scanCells) {
          const target = this.findBestCellTarget(colonist, workGiver);
          if (target && this.isTargetBetter(target, bestTarget, workGiver, colonist)) {
            bestTarget = target;
            bestWorkGiver = workGiver;
          }
        }

      } catch (error) {
        console.error(`Error in work giver ${workGiver.id}:`, error);
      }

      currentPriority = workGiver.priority;
    }

    // Create job from best target found
    if (bestTarget && bestWorkGiver) {
      if ('type' in bestTarget) {
        bestJob = (bestWorkGiver as any).createJob(colonist, bestTarget);
      } else {
        bestJob = (bestWorkGiver as any).createJob(colonist, bestTarget);
      }
    }

    if (bestJob) {
      this.jobs.push(bestJob);
      bestJob.status = 'assigned';
      bestJob.assignedColonist = colonist.id;
    }

    return bestJob;
  }

  private tryAssignForcedJob(colonist: any): HaulingJob | null {
    // Handle player-forced jobs (right-click commands)
    const forcedCell = colonist.priorityWork?.cell;
    if (!forcedCell) return null;

    // Find work giver that can handle this cell
    for (const workGiver of this.workGivers) {
      if (this.canColonistUseWorkGiver(colonist, workGiver)) {
        const job = (workGiver as any).createJob?.(colonist, forcedCell);
        if (job) return job;
      }
    }

    return null;
  }

  private getWorkGiversInOrder(colonist: any): WorkGiver[] {
    const isEmergency = colonist.workSettings?.emergencyMode || false;
    
    return this.workGivers
      .filter(wg => !wg.emergencyOnly || isEmergency)
      .sort((a, b) => {
        // Sort by work type priority first, then by work giver priority
        const aPriority = colonist.workSettings?.workPriorities.get(a.workType) || 0;
        const bPriority = colonist.workSettings?.workPriorities.get(b.workType) || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return b.priority - a.priority; // Higher work giver priority first
      });
  }

  private canColonistUseWorkGiver(colonist: any, workGiver: WorkGiver): boolean {
    // Check if colonist can do this work type
    const workPriority = colonist.workSettings?.workPriorities.get(workGiver.workType) || 0;
    if (workPriority === 0) return false;

    // Check if colonist has required capabilities
    // TODO: Add capability checking (e.g., can't haul if incapacitated)

    return true;
  }

  private tryNonScanJob(colonist: any, workGiver: WorkGiver): HaulingJob | null {
    // Some jobs don't require scanning (e.g., ongoing jobs, immediate tasks)
    // For now, return null - but this could handle things like "continue current job"
    return null;
  }

  private findBestThingTarget(colonist: any, workGiver: WorkGiver): FloorItem | null {
    const allItems = this.floorItemManager.getAllItems();
    const validItems = allItems.filter((item: FloorItem) => 
      (workGiver as any).canGiveJob?.(colonist, item)
    );

    if (validItems.length === 0) return null;

    if (workGiver.prioritized) {
      // Priority-first selection
      return this.findHighestPriorityItem(validItems, colonist, workGiver);
    } else {
      // Distance-first selection
      return this.findClosestItem(validItems, colonist, workGiver);
    }
  }

  private findBestCellTarget(colonist: any, workGiver: WorkGiver): Vec2 | null {
    // Scan potential work cells (construction sites, etc.)
    const constructionSites = this.constructionRequests.map(req => req.position);
    const validCells = constructionSites.filter((pos: Vec2) => 
      (workGiver as any).canGiveJob?.(colonist, pos)
    );

    if (validCells.length === 0) return null;

    if (workGiver.prioritized) {
      return this.findHighestPriorityCell(validCells, colonist, workGiver);
    } else {
      return this.findClosestCell(validCells, colonist);
    }
  }

  private findHighestPriorityItem(items: FloorItem[], colonist: any, workGiver: WorkGiver): FloorItem | null {
    let bestItem: FloorItem | null = null;
    let bestPriority = -Infinity;
    let bestDistance = Infinity;

    for (const item of items) {
      if (!workGiver.allowUnreachable && !this.canReach(colonist.position, item.position)) {
        continue;
      }

      const priority = (workGiver as any).calculateJobPriority?.(item) || 0;
      const distance = this.getDistance(colonist.position, item.position);

      if (priority > bestPriority || (priority === bestPriority && distance < bestDistance)) {
        bestItem = item;
        bestPriority = priority;
        bestDistance = distance;
      }
    }

    return bestItem;
  }

  private findClosestItem(items: FloorItem[], colonist: any, workGiver: WorkGiver): FloorItem | null {
    let bestItem: FloorItem | null = null;
    let bestDistance = Infinity;

    for (const item of items) {
      if (!workGiver.allowUnreachable && !this.canReach(colonist.position, item.position)) {
        continue;
      }

      const distance = this.getDistance(colonist.position, item.position);
      if (distance < bestDistance) {
        bestItem = item;
        bestDistance = distance;
      }
    }

    return bestItem;
  }

  private findHighestPriorityCell(cells: Vec2[], colonist: any, workGiver: WorkGiver): Vec2 | null {
    // For construction, higher priority = more urgent building
    let bestCell: Vec2 | null = null;
    let bestPriority = -Infinity;

    for (const cell of cells) {
      if (!workGiver.allowUnreachable && !this.canReach(colonist.position, cell)) {
        continue;
      }

      const request = this.constructionRequests.find(req => 
        req.position.x === cell.x && req.position.y === cell.y
      );
      
      if (request && request.priority > bestPriority) {
        bestCell = cell;
        bestPriority = request.priority;
      }
    }

    return bestCell;
  }

  private findClosestCell(cells: Vec2[], colonist: any): Vec2 | null {
    let bestCell: Vec2 | null = null;
    let bestDistance = Infinity;

    for (const cell of cells) {
      const distance = this.getDistance(colonist.position, cell);
      if (distance < bestDistance) {
        bestCell = cell;
        bestDistance = distance;
      }
    }

    return bestCell;
  }

  private isTargetBetter(target: FloorItem | Vec2, currentBest: FloorItem | Vec2 | null, workGiver: WorkGiver, colonist: any): boolean {
    if (!currentBest) return true;

    if (workGiver.prioritized) {
      // Compare priorities
      const targetPriority = this.getTargetPriority(target, workGiver);
      const currentPriority = this.getTargetPriority(currentBest, workGiver);
      
      if (targetPriority !== currentPriority) {
        return targetPriority > currentPriority;
      }
    }

    // Compare distances
    const targetDistance = this.getDistance(colonist.position, this.getTargetPosition(target));
    const currentDistance = this.getDistance(colonist.position, this.getTargetPosition(currentBest));
    
    return targetDistance < currentDistance;
  }

  private getTargetPriority(target: FloorItem | Vec2, workGiver: WorkGiver): number {
    if ('type' in target) {
      return (workGiver as any).calculateJobPriority?.(target) || 0;
    } else {
      const request = this.constructionRequests.find(req => 
        req.position.x === target.x && req.position.y === target.y
      );
      return request?.priority || 0;
    }
  }

  private getTargetPosition(target: FloorItem | Vec2): Vec2 {
    return 'type' in target ? target.position : target;
  }

  private canReach(from: Vec2, to: Vec2): boolean {
    // TODO: Implement proper pathfinding check
    // For now, just check if distance is reasonable
    return this.getDistance(from, to) < 1000;
  }

  private getDistance(pos1: Vec2, pos2: Vec2): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Helper methods for work givers
  itemNeedsHauling(item: FloorItem): boolean {
    const zone = this.stockpileManager.getZoneAtPosition(item.position);
    return !zone || (!zone.settings.allowAll && !zone.allowedItems.has(item.type));
  }

  findBestStorageLocation(itemType: ItemType): { zone: StockpileZone; position: Vec2 } | null {
    const bestZone = this.stockpileManager.findBestZoneForItem(itemType);
    if (!bestZone) return null;

    const position = this.stockpileManager.findStoragePositionInZone(bestZone, itemType);
    if (!position) return null;

    return { zone: bestZone, position };
  }

  isItemNeededForConstruction(item: FloorItem): boolean {
    return this.constructionRequests.some(req => {
      const needed = req.requiredMaterials.get(item.type) || 0;
      const delivered = req.deliveredMaterials.get(item.type) || 0;
      return delivered < needed;
    });
  }

  isConstructionSiteNeedingMaterials(position: Vec2): boolean {
    const request = this.constructionRequests.find(req => 
      req.position.x === position.x && req.position.y === position.y
    );
    
    if (!request) return false;

    // Check if any materials are still needed
    for (const [itemType, needed] of request.requiredMaterials) {
      const delivered = request.deliveredMaterials.get(itemType) || 0;
      if (delivered < needed) return true;
    }

    return false;
  }

  findConstructionSiteNeedingItem(itemType: ItemType): Vec2 | null {
    for (const request of this.constructionRequests) {
      const needed = request.requiredMaterials.get(itemType) || 0;
      const delivered = request.deliveredMaterials.get(itemType) || 0;
      
      if (delivered < needed) {
        return request.position;
      }
    }
    
    return null;
  }

  getConstructionJob(position: Vec2): HaulingJob | null {
    // TODO: Create construction work job (actual building, not hauling)
    return null;
  }

  // Legacy methods for compatibility
  createConstructionRequest(buildingId: string, position: Vec2, materials: Map<ItemType, number>, priority: number = 1): void {
    const request: ConstructionMaterialRequest = {
      buildingId,
      position,
      requiredMaterials: new Map(materials),
      deliveredMaterials: new Map(),
      priority,
      workType: 'construction'
    };

    this.constructionRequests.push(request);
  }

  completeJob(jobId: string): boolean {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return false;

    job.status = 'completed';
    return true;
  }

  failJob(jobId: string): boolean {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return false;

    job.status = 'failed';
    job.assignedColonist = undefined;
    return true;
  }

  getAvailableJobs(): HaulingJob[] {
    return this.jobs.filter(job => job.status === 'available');
  }

  cleanupOldJobs(maxAge: number = 60000): void {
    const now = Date.now();
    this.jobs = this.jobs.filter(job => {
      const age = now - job.createdAt;
      return age < maxAge || (job.status !== 'completed' && job.status !== 'failed');
    });
  }
}
