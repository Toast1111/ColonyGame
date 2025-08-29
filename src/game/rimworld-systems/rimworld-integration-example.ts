// RimWorld-Style Job Assignment Integration Example
// This shows how to integrate the enhanced job system based on actual RimWorld code

import { RimWorldSystemManager, type ColonistWorkSettings, type WorkType } from './index';

// Example integration for Game.ts using RimWorld-style job assignment
export class EnhancedGame {
  public rimWorld: RimWorldSystemManager;

  constructor(canvas: HTMLCanvasElement) {
    // Initialize with enhanced logistics enabled
    this.rimWorld = new RimWorldSystemManager({
      canvas: canvas,
      enableAutoHauling: true,
      defaultStockpileSize: 64,
      useEnhancedLogistics: true // Enable RimWorld-style job assignment
    });

    this.setupInitialStockpiles();
  }

  private setupInitialStockpiles(): void {
    // Create specialized storage areas like RimWorld
    const generalStorage = this.rimWorld.createStockpileZone(200, 200, 128, 128, "General Storage");
    generalStorage.priority = 1; // Low priority - fallback storage

    const foodStorage = this.rimWorld.createStockpileZone(350, 200, 96, 96, "Food Storage");
    this.rimWorld.updateStockpileItems(foodStorage.id, ['food']);
    foodStorage.priority = 3; // High priority for food

    const materialsStorage = this.rimWorld.createStockpileZone(200, 350, 128, 96, "Materials");
    this.rimWorld.updateStockpileItems(materialsStorage.id, ['wood', 'stone', 'metal']);
    materialsStorage.priority = 2; // Medium priority for construction materials
  }

  // Enhanced colonist spawning with work settings
  spawnColonist(x: number, y: number): any {
    const colonist = {
      id: `colonist_${Date.now()}`,
      position: { x, y },
      state: 'idle',
      targetPosition: null,
      currentJob: null,
      inventory: [],
      inventoryWeight: 0,
      maxInventoryWeight: 40,
      // RimWorld-style work settings
      workSettings: null as ColonistWorkSettings | null,
      priorityWork: null // For player-forced jobs
    };

    // Set up default work priorities (like RimWorld's work tab)
    this.rimWorld.setColonistWorkSettings(colonist, {
      workPriorities: new Map([
        ['construction', 2], // High priority
        ['hauling', 3],      // Medium priority  
        ['cleaning', 1],     // Low priority
        ['repair', 2],       // High priority
        ['mining', 0],       // Disabled
        ['growing', 1]       // Low priority
      ]),
      canDoWork: true,
      emergencyMode: false
    });

    return colonist;
  }

  // Enhanced colonist FSM with RimWorld-style job assignment
  updateColonistFSM(colonist: any, gameTime: number): void {
    switch (colonist.state) {
      case 'idle':
        // Try to assign work using RimWorld-style job system
        const job = this.rimWorld.assignWork(colonist);
        if (job) {
          console.log(`Assigned ${(job as any).workType || job.type || 'hauling'} job to ${colonist.id}: ${job.id}`);
          colonist.currentJob = job;
          colonist.state = this.getStateForJobType((job as any).workType || job.type || 'hauling');
          colonist.targetPosition = this.getInitialTargetForJob(job);
        }
        break;

      case 'hauling':
        this.handleHaulingState(colonist);
        break;

      case 'hauling_delivery':
        this.handleHaulingDeliveryState(colonist);
        break;

      case 'construction':
        this.handleConstructionState(colonist);
        break;

      // ... other states
    }
  }

  private getStateForJobType(workType: WorkType): string {
    switch (workType) {
      case 'hauling': return 'hauling';
      case 'construction': return 'construction';
      case 'cleaning': return 'cleaning';
      case 'repair': return 'repair';
      default: return 'working';
    }
  }

  private getInitialTargetForJob(job: any): any {
    if (job.targetItem) {
      return job.targetItem.position;
    }
    if (job.targetPosition) {
      return job.targetPosition;
    }
    return null;
  }

  private handleHaulingState(colonist: any): void {
    const job = colonist.currentJob;
    if (!job || !job.targetItem) {
      colonist.state = 'idle';
      return;
    }

    // Move to item
    if (this.isAtPosition(colonist, job.targetItem.position)) {
      // Try to pick up the item
      const result = this.rimWorld.pickupItems(job.targetItem.id, job.targetItem.quantity);
      
      if (result.taken > 0) {
        console.log(`${colonist.id} picked up ${result.taken} ${job.targetItem.type}`);
        
        // Add to colonist inventory
        colonist.inventory.push({
          type: job.targetItem.type,
          quantity: result.taken
        });
        colonist.inventoryWeight += result.taken;

        // Find where to deliver it
        if (job.destination) {
          colonist.targetPosition = job.destination;
          colonist.state = 'hauling_delivery';
        } else {
          // No destination, complete the job
          this.rimWorld.completeHaulingJob(job.id);
          colonist.state = 'idle';
          colonist.currentJob = null;
        }
      } else {
        // Couldn't pick up item, fail the job
        console.log(`${colonist.id} failed to pick up ${job.targetItem.type}`);
        this.rimWorld.failHaulingJob(job.id);
        colonist.state = 'idle';
        colonist.currentJob = null;
      }
    } else {
      // Still moving to item
      this.moveColonistToward(colonist, job.targetItem.position);
    }
  }

  private handleHaulingDeliveryState(colonist: any): void {
    const job = colonist.currentJob;
    if (!job || !job.destination) {
      colonist.state = 'idle';
      return;
    }

    // Move to destination
    if (this.isAtPosition(colonist, job.destination)) {
      // Drop off items at destination
      const itemsToDropOff = colonist.inventory.filter((item: any) => 
        job.targetItem && item.type === job.targetItem.type
      );

      for (const item of itemsToDropOff) {
        // Drop items at destination (they'll auto-stack)
        this.rimWorld.dropItems(item.type, item.quantity, job.destination);
        
        // Remove from colonist inventory
        const index = colonist.inventory.indexOf(item);
        if (index > -1) {
          colonist.inventory.splice(index, 1);
          colonist.inventoryWeight -= item.quantity;
        }
      }

      console.log(`${colonist.id} delivered items to stockpile`);
      
      // Complete the job
      this.rimWorld.completeHaulingJob(job.id);
      colonist.state = 'idle';
      colonist.currentJob = null;
      colonist.targetPosition = null;
    } else {
      // Still moving to destination
      this.moveColonistToward(colonist, job.destination);
    }
  }

  private handleConstructionState(colonist: any): void {
    const job = colonist.currentJob;
    if (!job) {
      colonist.state = 'idle';
      return;
    }

    // Move to construction site
    if (job.targetPosition && this.isAtPosition(colonist, job.targetPosition)) {
      // Check if construction has all required materials
      if (job.metadata?.buildingId && this.rimWorld.isConstructionReady(job.metadata.buildingId)) {
        // Start actual construction work
        console.log(`${colonist.id} starting construction`);
        
        // Simulate construction time
        setTimeout(() => {
          this.completeConstruction(job.metadata.buildingId);
          colonist.state = 'idle';
          colonist.currentJob = null;
        }, 3000);
      } else {
        // Construction not ready, go idle and let hauling jobs bring materials
        console.log(`${colonist.id} waiting for construction materials`);
        colonist.state = 'idle';
        colonist.currentJob = null;
      }
    } else if (job.targetPosition) {
      this.moveColonistToward(colonist, job.targetPosition);
    }
  }

  private completeConstruction(buildingId: string): void {
    console.log(`Construction completed: ${buildingId}`);
    this.rimWorld.completeConstruction(buildingId);
    // Add building to your buildings array, etc.
  }

  // Player commands (like RimWorld's right-click orders)
  giveDirectOrder(colonist: any, position: { x: number, y: number }, workType?: WorkType): void {
    console.log(`Player ordered ${colonist.id} to work at ${position.x}, ${position.y}`);
    
    // Force assign work at this position
    this.rimWorld.forceAssignWork(colonist, position, workType);
    
    // Interrupt current job
    if (colonist.currentJob) {
      this.rimWorld.failHaulingJob(colonist.currentJob.id);
    }
    
    colonist.state = 'idle'; // Will pick up forced job on next update
    colonist.currentJob = null;
  }

  // Change colonist work priorities (like RimWorld's work tab)
  setColonistWorkPriority(colonist: any, workType: WorkType, priority: number): void {
    console.log(`Setting ${colonist.id} ${workType} priority to ${priority}`);
    this.rimWorld.setWorkPriority(colonist, workType, priority);
  }

  // Emergency mode (prioritize critical work)
  setEmergencyMode(colonist: any, emergency: boolean): void {
    if (colonist.workSettings) {
      colonist.workSettings.emergencyMode = emergency;
      console.log(`${colonist.id} emergency mode: ${emergency}`);
    }
  }

  // Utility methods
  private isAtPosition(colonist: any, target: { x: number, y: number }): boolean {
    const distance = Math.hypot(colonist.position.x - target.x, colonist.position.y - target.y);
    return distance < 16; // Within 16 pixels
  }

  private moveColonistToward(colonist: any, target: { x: number, y: number }): void {
    const dx = target.x - colonist.position.x;
    const dy = target.y - colonist.position.y;
    const distance = Math.hypot(dx, dy);
    
    if (distance > 0) {
      const speed = 2; // 2 pixels per frame
      colonist.position.x += (dx / distance) * speed;
      colonist.position.y += (dy / distance) * speed;
    }
  }

  // Main update loop
  update(): void {
    // Update RimWorld systems
    this.rimWorld.update();

    // Update all colonists with enhanced FSM
    for (const colonist of this.getColonists()) {
      this.updateColonistFSM(colonist, Date.now());
    }
  }

  // Main render loop
  render(): void {
    // Render RimWorld systems
    this.rimWorld.render(this.getCameraX(), this.getCameraY());
    
    // Render colonists, buildings, etc.
    // ... your existing rendering code ...
  }

  // Mock methods for example - replace with your actual implementations
  private getColonists(): any[] { return []; }
  private getCameraX(): number { return 0; }
  private getCameraY(): number { return 0; }
}

// Example usage:
/*
const game = new EnhancedGame(canvas);

// Spawn a colonist with work settings
const colonist = game.spawnColonist(100, 100);

// Set work priorities (0 = disabled, 1-4 = priority level)
game.setColonistWorkPriority(colonist, 'hauling', 3);
game.setColonistWorkPriority(colonist, 'construction', 2);
game.setColonistWorkPriority(colonist, 'mining', 0); // Disable mining

// Give direct orders
game.giveDirectOrder(colonist, { x: 200, y: 300 }, 'hauling');

// Drop some items for testing
game.rimWorld.dropItems('wood', 20, { x: 50, y: 50 });
game.rimWorld.dropItems('food', 10, { x: 300, y: 300 });

// Start construction that needs materials
const materials = new Map([['wood', 15], ['stone', 10]]);
game.rimWorld.requestConstructionMaterials('house_1', { x: 400, y: 400 }, materials, 3);

// Game loop
setInterval(() => {
  game.update();
  game.render();
}, 1000 / 60); // 60 FPS
*/
