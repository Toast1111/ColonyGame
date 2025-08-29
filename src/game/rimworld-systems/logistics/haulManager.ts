import type { Vec2 } from "../../../core/utils";
import type { ItemType, FloorItem } from "../items/floorItems";
import type { StockpileZone } from "../stockpiles/stockpileZones";

export interface HaulingJob {
  id: string;
  type: 'haul_to_stockpile' | 'deliver_to_construction' | 'cleanup_items';
  priority: number;
  targetItem: FloorItem;
  destination?: Vec2; // Where to take the item
  destinationZone?: StockpileZone; // Which stockpile zone to use
  assignedColonist?: string; // Colonist ID who took this job
  status: 'available' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  createdAt: number;
}

export interface ConstructionMaterialRequest {
  buildingId: string;
  position: Vec2;
  requiredMaterials: Map<ItemType, number>; // item type -> quantity needed
  deliveredMaterials: Map<ItemType, number>; // item type -> quantity delivered
  priority: number;
}

export class LogisticsManager {
  private haulingJobs: HaulingJob[] = [];
  private constructionRequests: ConstructionMaterialRequest[] = [];
  private nextJobId = 1;

  // Create a hauling job for moving items to stockpiles
  createHaulingJob(item: FloorItem, destinationZone?: StockpileZone): HaulingJob {
    const job: HaulingJob = {
      id: `haul_${this.nextJobId++}`,
      type: 'haul_to_stockpile',
      priority: this.calculateHaulingPriority(item),
      targetItem: item,
      destinationZone,
      status: 'available',
      createdAt: Date.now()
    };

    this.haulingJobs.push(job);
    return job;
  }

  // Create construction material delivery jobs
  createConstructionRequest(buildingId: string, position: Vec2, materials: Map<ItemType, number>, priority: number = 1): ConstructionMaterialRequest {
    const request: ConstructionMaterialRequest = {
      buildingId,
      position,
      requiredMaterials: new Map(materials),
      deliveredMaterials: new Map(),
      priority
    };

    this.constructionRequests.push(request);
    
    // Create individual hauling jobs for each material type needed
    for (const [itemType, quantity] of materials) {
      this.createMaterialDeliveryJobs(request, itemType, quantity);
    }

    return request;
  }

  private createMaterialDeliveryJobs(request: ConstructionMaterialRequest, itemType: ItemType, quantity: number): void {
    // This will be filled in when we integrate with the item manager
    // For now, just track that we need these materials
  }

  private calculateHaulingPriority(item: FloorItem): number {
    // Higher priority for more valuable items or items blocking paths
    let priority = 1;
    
    // Food should be stored quickly to prevent spoilage
    if (item.type === 'food') priority += 2;
    
    // Construction materials should be stored if not immediately needed
    if (item.type === 'wood' || item.type === 'stone') priority += 1;
    
    // Items in high-traffic areas should be cleared quickly
    // TODO: Check if item is blocking a path
    
    return priority;
  }

  // Get the next available hauling job for a colonist
  getNextHaulingJob(colonistId: string, colonistPosition: Vec2): HaulingJob | null {
    // Find the closest available hauling job
    let bestJob: HaulingJob | null = null;
    let bestDistance = Infinity;

    for (const job of this.haulingJobs) {
      if (job.status !== 'available') continue;
      
      const distance = this.calculateDistance(colonistPosition, job.targetItem.position);
      const priorityScore = job.priority * 100 - distance; // Priority matters more than distance
      
      if (priorityScore > bestDistance) {
        bestJob = job;
        bestDistance = priorityScore;
      }
    }

    if (bestJob) {
      bestJob.status = 'assigned';
      bestJob.assignedColonist = colonistId;
    }

    return bestJob;
  }

  private calculateDistance(pos1: Vec2, pos2: Vec2): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Mark a job as completed
  completeJob(jobId: string): boolean {
    const job = this.haulingJobs.find(j => j.id === jobId);
    if (!job) return false;

    job.status = 'completed';
    return true;
  }

  // Mark a job as failed (colonist couldn't complete it)
  failJob(jobId: string): boolean {
    const job = this.haulingJobs.find(j => j.id === jobId);
    if (!job) return false;

    job.status = 'failed';
    job.assignedColonist = undefined;
    
    // Optionally retry the job later
    setTimeout(() => {
      if (job.status === 'failed') {
        job.status = 'available';
      }
    }, 5000); // Retry after 5 seconds

    return true;
  }

  // Cancel a job (remove it entirely)
  cancelJob(jobId: string): boolean {
    const index = this.haulingJobs.findIndex(j => j.id === jobId);
    if (index !== -1) {
      this.haulingJobs.splice(index, 1);
      return true;
    }
    return false;
  }

  // Get all jobs assigned to a specific colonist
  getJobsForColonist(colonistId: string): HaulingJob[] {
    return this.haulingJobs.filter(job => job.assignedColonist === colonistId);
  }

  // Get all available jobs
  getAvailableJobs(): HaulingJob[] {
    return this.haulingJobs.filter(job => job.status === 'available');
  }

  // Construction material management
  getMaterialRequests(): ConstructionMaterialRequest[] {
    return [...this.constructionRequests];
  }

  // Check if a construction site has all required materials
  isConstructionReady(buildingId: string): boolean {
    const request = this.constructionRequests.find(r => r.buildingId === buildingId);
    if (!request) return false;

    for (const [itemType, required] of request.requiredMaterials) {
      const delivered = request.deliveredMaterials.get(itemType) || 0;
      if (delivered < required) return false;
    }

    return true;
  }

  // Mark materials as delivered to a construction site
  deliverMaterialToConstruction(buildingId: string, itemType: ItemType, quantity: number): boolean {
    const request = this.constructionRequests.find(r => r.buildingId === buildingId);
    if (!request) return false;

    const currentDelivered = request.deliveredMaterials.get(itemType) || 0;
    const required = request.requiredMaterials.get(itemType) || 0;
    
    const toDeliver = Math.min(quantity, required - currentDelivered);
    request.deliveredMaterials.set(itemType, currentDelivered + toDeliver);

    return toDeliver > 0;
  }

  // Clean up completed construction requests
  removeConstructionRequest(buildingId: string): boolean {
    const index = this.constructionRequests.findIndex(r => r.buildingId === buildingId);
    if (index !== -1) {
      this.constructionRequests.splice(index, 1);
      
      // Also remove any related hauling jobs
      this.haulingJobs = this.haulingJobs.filter(job => 
        job.type !== 'deliver_to_construction' || 
        !job.targetItem || 
        job.targetItem.metadata?.buildingId !== buildingId
      );
      
      return true;
    }
    return false;
  }

  // Clean up old completed/failed jobs
  cleanupOldJobs(maxAge: number = 60000): void { // Default 1 minute
    const now = Date.now();
    this.haulingJobs = this.haulingJobs.filter(job => {
      const age = now - job.createdAt;
      return age < maxAge || (job.status !== 'completed' && job.status !== 'failed');
    });
  }
}
