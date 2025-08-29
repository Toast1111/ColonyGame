# RimWorld-Style Item System

A complete floor-based item management system with stockpile zones and automatic hauling, inspired by RimWorld.

## Features

- **Floor Items**: Items are visually represented on the game world floor
- **Automatic Stacking**: Similar items stack together automatically within range
- **Stockpile Zones**: Designated areas for item storage with filtering
- **Hauling Jobs**: Automatic job generation for moving misplaced items
- **Construction Integration**: Material delivery system for building projects
- **Visual Rendering**: Complete rendering system for items and zones

## Quick Start

```typescript
import { RimWorldSystemManager } from './rimworld-systems';

// Initialize the system
const rimWorld = new RimWorldSystemManager({
  canvas: gameCanvas,
  enableAutoHauling: true,
  defaultStockpileSize: 64
});

// Create stockpile zones
const storage = rimWorld.createStockpileZone(100, 100, 128, 128, "General Storage");
const foodZone = rimWorld.createStockpileZone(250, 100, 96, 96, "Food Storage");
rimWorld.updateStockpileItems(foodZone.id, ['food']);

// Drop items on the floor
rimWorld.dropItems('wood', 20, { x: 50, y: 50 });
rimWorld.dropItems('food', 10, { x: 300, y: 300 });

// In your game loop
function gameLoop() {
  rimWorld.update();           // Update hauling jobs
  rimWorld.render(cameraX, cameraY); // Render items and zones
}

// Assign hauling jobs to colonists
const job = rimWorld.assignHaulingJob(colonist.id, colonist.position);
if (job) {
  // Set colonist to haul the item to storage
}
```

## System Components

### FloorItemManager
Manages individual items on the floor with automatic stacking.

```typescript
// Create items
const item = rimWorld.floorItems.createItem('wood', 25, { x: 100, y: 100 });

// Pick up items
const result = rimWorld.floorItems.takeFromItem(item.id, 10);
console.log(`Picked up ${result.taken} items`);

// Find nearby items
const nearby = rimWorld.floorItems.getItemsNearPosition({ x: 100, y: 100 }, 50);
```

### StockpileManager
Manages storage zones with item filtering and priority.

```typescript
// Create zones
const zone = rimWorld.stockpiles.createZone(x, y, width, height, "Zone Name");

// Configure what items are allowed
rimWorld.stockpiles.updateZoneAllowedItems(zone.id, ['wood', 'stone']);

// Set priority (higher = preferred)
zone.priority = 3;

// Find best storage for an item
const bestZone = rimWorld.stockpiles.findBestZoneForItem('wood');
```

### LogisticsManager  
Handles hauling jobs and construction material requests.

```typescript
// Get hauling jobs for colonists
const job = rimWorld.logistics.getNextHaulingJob(colonist.id, colonist.position);

// Request materials for construction
const materials = new Map([['wood', 20], ['stone', 10]]);
rimWorld.logistics.createConstructionRequest('house_1', position, materials);

// Check if construction is ready
if (rimWorld.logistics.isConstructionReady('house_1')) {
  // Start building
}
```

## Integration with Existing Game

### Replace Abstract Storage

**OLD WAY:**
```typescript
// Global resource pool
this.RES = { wood: 100, stone: 50 };

takeFromStorage(type: string, amount: number) {
  const available = this.RES[type] || 0;
  const taken = Math.min(amount, available);
  this.RES[type] = available - taken;
  return taken;
}
```

**NEW WAY:**
```typescript
// Visual floor-based storage
takeFromStorage(type: ItemType, amount: number, position: Vec2) {
  const nearbyItems = rimWorld.floorItems.getItemsNearPosition(position, 100);
  const matchingItems = nearbyItems.filter(item => item.type === type);
  
  let totalTaken = 0;
  for (const item of matchingItems) {
    if (totalTaken >= amount) break;
    const result = rimWorld.pickupItems(item.id, amount - totalTaken);
    totalTaken += result.taken;
  }
  return totalTaken;
}
```

### Update Colonist FSM

Add hauling states to your colonist finite state machine:

```typescript
case 'idle':
  // Check for hauling jobs
  const job = rimWorld.assignHaulingJob(colonist.id, colonist.position);
  if (job) {
    colonist.state = 'hauling';
    colonist.currentJob = job;
    colonist.targetPosition = job.targetItem.position;
  }
  break;

case 'hauling':
  // Move to item and pick it up
  if (atTarget) {
    const result = rimWorld.pickupItems(job.targetItem.id, job.targetItem.quantity);
    if (result.taken > 0) {
      const storage = rimWorld.findBestStorageLocation(job.targetItem.type);
      colonist.targetPosition = storage.position;
      colonist.state = 'hauling_delivery';
    }
  }
  break;

case 'hauling_delivery':
  // Move to storage and drop off
  if (atTarget) {
    rimWorld.completeHaulingJob(job.id);
    colonist.state = 'idle';
  }
  break;
```

### Construction Updates

Replace material requests with the new system:

```typescript
startConstruction(buildingType: string, position: Vec2) {
  const materials = new Map();
  materials.set('wood', 20);
  materials.set('stone', 10);
  
  rimWorld.requestConstructionMaterials(buildingId, position, materials);
}

// Check before starting construction
if (rimWorld.isConstructionReady(buildingId)) {
  // All materials delivered, start building
  startBuilding();
  rimWorld.completeConstruction(buildingId); // Cleanup
}
```

## Configuration Options

```typescript
const config = {
  canvas: gameCanvas,           // Canvas for rendering
  enableAutoHauling: true,      // Automatically create hauling jobs
  defaultStockpileSize: 64      // Default zone size
};
```

## Item Types

Built-in item types with different properties:

- `wood`: Light construction material (weight: 1, stack: 50)
- `stone`: Heavy construction material (weight: 1, stack: 30)  
- `food`: Perishable items (weight: 0.5, stack: 20)
- `metal`: Valuable materials (weight: 2, stack: 25)
- `cloth`: Light materials (weight: 0.1, stack: 100)
- `medicine`: Rare items (weight: 0.1, stack: 10)

## Visual System

The system provides complete visual feedback:

- **Stockpile Zones**: Green-tinted areas with dashed borders
- **Floor Items**: Color-coded items with quantity indicators
- **Item Stacking**: Multiple items visually grouped together
- **Hauling Paths**: Debug lines showing item movement (optional)

## Performance Notes

- Items automatically stack to reduce entity count
- Visual grouping optimizes rendering
- Hauling jobs are generated efficiently
- Old jobs are automatically cleaned up

## Migration Guide

1. **Remove global resource variables** (`this.RES = {}`)
2. **Replace `takeFromStorage()` calls** with item pickup near colonists
3. **Add hauling states** to colonist FSM
4. **Update construction system** to use material requests
5. **Add rendering calls** to your game loop
6. **Create initial stockpile zones** for your base

The system is designed to be a drop-in replacement that provides much more intuitive and visual gameplay!
