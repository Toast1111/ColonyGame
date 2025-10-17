// Example integration for Game.ts
// This shows how to add the RimWorld system to your existing game

import { RimWorldSystemManager, type ItemType } from '../index';

// In your Game class, add the RimWorld system:
export class Game {
  // ... existing properties ...
  public rimWorld: RimWorldSystemManager;
  public colonists: any[] = []; // Your existing colonist array
  public cameraX: number = 0;
  public cameraY: number = 0;
  public debugMode: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    // ... existing initialization ...
    
    // Initialize RimWorld system
    this.rimWorld = new RimWorldSystemManager({
      canvas: canvas,
      enableAutoHauling: true,
      defaultStockpileSize: 64,
      useEnhancedLogistics: false // Keep simple for basic example
    });

    // Create some initial stockpile zones
    this.setupInitialStockpiles();
  }

  private setupInitialStockpiles(): void {
    // Create a general storage area near the center
    const generalStorage = this.rimWorld.createStockpileZone(200, 200, 128, 128, "General Storage");
    
    // Create a food storage area
    const foodStorage = this.rimWorld.createStockpileZone(350, 200, 96, 96, "Food Storage");
    this.rimWorld.updateStockpileItems(foodStorage.id, ['food']);
    
    // Create a materials storage area
    const materialsStorage = this.rimWorld.createStockpileZone(200, 350, 128, 96, "Materials");
    this.rimWorld.updateStockpileItems(materialsStorage.id, ['wood', 'stone', 'metal']);
  }

  // Replace your old dropResource method with this:
  dropItems(itemType: ItemType, quantity: number, x: number, y: number): void {
    this.rimWorld.dropItems(itemType, quantity, { x, y });
  }

  // For construction, replace material requests:
  startConstruction(buildingType: string, x: number, y: number): void {
    const buildingId = `building_${Date.now()}`;
    
    // Define materials needed for different building types
    const materials = new Map<ItemType, number>();
    switch (buildingType) {
      case 'house':
        materials.set('wood', 20);
        materials.set('stone', 10);
        break;
      case 'wall':
        materials.set('stone', 5);
        break;
      // ... other building types
    }

    // Request materials for construction
    this.rimWorld.requestConstructionMaterials(buildingId, { x, y }, materials);
    
    // Add to your buildings array with the buildingId for tracking
    // ... existing building creation logic ...
  }

  // In your update method:
  update(): void {
    // ... existing update logic ...
    
    // Update RimWorld systems
    this.rimWorld.update();

    // Update colonists with hauling jobs
    this.updateColonistHauling();
  }

  private updateColonistHauling(): void {
    for (const colonist of this.colonists) {
      // If colonist is idle and has hauling enabled, assign hauling job
      if (colonist.state === 'idle' && colonist.canHaul) {
        const haulingJob = this.rimWorld.assignHaulingJob(colonist.id, colonist.position);
        if (haulingJob) {
          // Transition colonist to hauling state
          colonist.state = 'hauling';
          colonist.currentJob = haulingJob;
          // Set destination to the item position
          colonist.targetPosition = haulingJob.targetItem.position;
        }
      }
    }
  }

  // In your render method:
  render(): void {
    // ... existing rendering ...
    
    // Render RimWorld systems (stockpiles and floor items)
    this.rimWorld.render(this.cameraX, this.cameraY);
    
    // Optionally render debug info
    if (this.debugMode) {
      this.rimWorld.renderDebugInfo(this.cameraX, this.cameraY);
    }
  }

  // Example of replacing your old storage system:
  /*
  OLD WAY:
  takeFromStorage(itemType: string, quantity: number): number {
    const available = this.RES[itemType] || 0;
    const taken = Math.min(quantity, available);
    this.RES[itemType] = available - taken;
    return taken;
  }

  NEW WAY:
  takeFromStorage(itemType: ItemType, quantity: number, nearPosition: Vec2): number {
    // Find items near the colonist
    const nearbyItems = this.rimWorld.floorItems.getItemsNearPosition(nearPosition, 100);
    const matchingItems = nearbyItems.filter(item => item.type === itemType);
    
    let totalTaken = 0;
    for (const item of matchingItems) {
      if (totalTaken >= quantity) break;
      
      const needed = quantity - totalTaken;
      const result = this.rimWorld.pickupItems(item.id, needed);
      totalTaken += result.taken;
    }
    
    return totalTaken;
  }
  */
}

// Example colonist FSM integration:
/*
In your colonistFSM.ts, you can add hauling states:

case 'hauling':
  if (colonist.currentJob) {
    const job = colonist.currentJob;
    
    // Move to item
    if (!colonist.targetPosition) {
      colonist.targetPosition = job.targetItem.position;
    }
    
    // If we reached the item
    if (this.isAtPosition(colonist, job.targetItem.position)) {
      // Pick up the item
      const result = game.rimWorld.pickupItems(job.targetItem.id, job.targetItem.quantity);
      
      if (result.taken > 0) {
        // Successfully picked up, now find where to take it
        const storage = game.rimWorld.findBestStorageLocation(job.targetItem.type);
        if (storage) {
          colonist.targetPosition = storage.position;
          colonist.state = 'hauling_delivery';
        } else {
          // No storage available, fail the job
          game.rimWorld.failHaulingJob(job.id);
          colonist.state = 'idle';
        }
      } else {
        // Couldn't pick up item, fail the job
        game.rimWorld.failHaulingJob(job.id);
        colonist.state = 'idle';
      }
    }
    break;

case 'hauling_delivery':
  // Move to storage location and drop off item
  if (this.isAtPosition(colonist, colonist.targetPosition)) {
    // Drop off the item (it will automatically stack/organize)
    // Complete the hauling job
    game.rimWorld.completeHaulingJob(colonist.currentJob.id);
    colonist.state = 'idle';
    colonist.currentJob = null;
  }
  break;
*/
