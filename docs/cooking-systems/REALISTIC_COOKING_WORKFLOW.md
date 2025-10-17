# Realistic Cooking Workflow System

## Overview

The cooking system has been redesigned to follow a realistic, multi-step workflow that separates the cooking process from the hauling process. This creates a more immersive and RimWorld-like experience where colonists must:

1. **Gather ingredients** from farms
2. **Transport ingredients** to cooking stations
3. **Cook meals** at the stove
4. **Store finished meals** via hauling jobs

## Workflow Architecture

### Previous System (Before)
```
Colonist picks up wheat → Goes to stove → Cooks → 
Carries bread to pantry → Stores bread
```
**Issue**: Single colonist did everything, cooking and hauling were tightly coupled

### New System (After)
```
COOKING JOB:
1. Go to farm → Pick up wheat (5 units)
2. Go to stove → Deposit wheat in stove inventory
3. Cook at stove (consumes wheat, produces bread)
4. Bread stays in stove inventory
5. Job complete → Seek new task

HAULING JOB (separate):
1. Go to stove → Pick up bread from inventory
2. Go to pantry → Deposit bread in pantry inventory
3. Job complete → Seek new task
```

**Benefits**: 
- Separation of concerns (cooking vs hauling)
- Multiple colonists can cooperate (cook while haulers transport)
- More realistic resource flow
- Better use of work priorities

## Implementation Details

### 1. Cooking State Machine (`colonistFSM.ts`)

The cooking state now has **three sub-states**:

#### Sub-State 1: `goingToFarm`
```typescript
// Find a farm with at least 5 wheat
const farms = game.buildings.filter((b: Building) => 
  b.kind === 'farm' && 
  b.done && 
  b.inventory &&
  getInventoryItemCount(b, 'wheat') >= 5
);

// Navigate to nearest farm
// At farm: removeItemFromInventory(farm, 'wheat', 5)
// Store in colonist: c.carryingWheat = 5
// Transition to: 'goingToStove'
```

#### Sub-State 2: `goingToStove`
```typescript
// Navigate to stove with wheat
// At stove: addItemToInventory(stove, 'wheat', c.carryingWheat)
// Start cooking: stove.cookingProgress = 0
// Transition to: 'cooking'
```

#### Sub-State 3: `cooking`
```typescript
// Wait at stove (stay within 25 pixels)
// Progress cooking: stove.cookingProgress += cookSpeed * dt
// Cooking skill affects speed

// When complete (progress >= 1.0):
const wheatUsed = removeItemFromInventory(stove, 'wheat', 5);
const breadProduced = Math.floor(wheatUsed / 5) * 3; // 5 wheat = 3 bread

// Store bread IN STOVE (not colonist)
addItemToInventory(stove, 'bread', breadProduced);

// Job complete - colonist seeks new task
```

**Key Change**: Bread is stored in `stove.inventory` using `addItemToInventory()`, NOT in `c.carryingBread`

### 2. Hauling State Machine (`colonistFSM.ts`)

New `haulBread` state handles bread transport:

#### Sub-State 1: `goingToStove` (to pick up)
```typescript
// Navigate to stove
// At stove: pick up bread from inventory
const breadInStove = getInventoryItemCount(stove, 'bread');
const removed = removeItemFromInventory(stove, 'bread', amountToPickup);
c.carryingBread = removed;
// Transition to next sub-state
```

#### Sub-State 2: `goingToFarm` (reused for "going to destination")
```typescript
// Navigate to pantry with bread
// At pantry: deposit bread
const added = addItemToInventory(pantry, 'bread', c.carryingBread);
pantry.breadStored = (pantry.breadStored || 0) + added;
game.addResource('bread', added); // Update HUD

// If pantry full, overflow to global storage
// Job complete - colonist seeks new task
```

### 3. Work Assignment (`Game.ts`)

#### Cooking Work Assignment
```typescript
// Check if wheat available in farms
const farms = game.buildings.filter(b => 
  b.kind === 'farm' && 
  b.done && 
  getInventoryItemCount(b, 'wheat') >= 5
);

// Assign cooking task if:
// - Stove available
// - Wheat available (>= 5 units)
// - Colonist has Cooking work enabled
// - Stove not currently being used (or used by this colonist)
```

#### Hauling Work Assignment (NEW)
```typescript
// Check stoves for bread in inventory
const stoves = game.buildings.filter(b => 
  b.kind === 'stove' && 
  b.done && 
  b.inventory &&
  getInventoryItemCount(b, 'bread') > 0
);

// Assign hauling task if:
// - Bread in stove inventory
// - Pantry available
// - Colonist has Hauling work enabled

candidates.push({
  workType: 'Hauling',
  task: 'haulBread',
  target: stove,
  extraData: nearestPantry, // Store pantry reference
  distance: distanceToStove,
  priority: getWorkPriority('Hauling')
});
```

### 4. Type Definitions (`types.ts`)

Added new properties to `Colonist` type:
```typescript
// Cooking sub-state tracking
cookingSubState?: 'goingToFarm' | 'goingToStove' | 'cooking' | null;
cookingSourceFarm?: Building | null; // Which farm we're getting wheat from
```

Added new state to `ColonistState` type:
```typescript
export type ColonistState = '...' | 'cooking' | 'haulBread' | 'storingBread' | '...';
```

### 5. State Priorities

State priorities determine which tasks can interrupt others:
```typescript
case 'storingBread': return 45;  // Complete current cooking job
case 'haulBread': return 43;      // Hauling is productive work
case 'cooking': return 42;        // Cooking is productive work
case 'build':
case 'chop':
case 'mine':
case 'harvest': return 40;        // Other productive work
```

**Priority Rules**:
- Cooking and hauling have similar priority (42-43)
- Both can be interrupted by hunger (65) or sleep (80)
- Both take precedence over idle work (15)

## Resource Flow

```
┌──────────┐   removeItemFromInventory()   ┌──────────────┐
│   FARM   │───────────────────────────────▶│   COLONIST   │
│ (wheat)  │         5 wheat                │ carryingWheat│
└──────────┘                                └───────┬──────┘
                                                    │
                                                    │ addItemToInventory()
                                                    ▼
                                            ┌──────────────┐
                                            │    STOVE     │
                                            │  (wheat: 5)  │
                                            └───────┬──────┘
                                                    │
                                                    │ cooking (10 seconds)
                                                    │ removeItemFromInventory(wheat, 5)
                                                    │ addItemToInventory(bread, 3)
                                                    ▼
                                            ┌──────────────┐
                                            │    STOVE     │
                                            │  (bread: 3)  │
                                            └───────┬──────┘
                                                    │
                                                    │ removeItemFromInventory()
                                                    ▼
                                            ┌──────────────┐
                                            │   COLONIST   │
                                            │ carryingBread│
                                            └───────┬──────┘
                                                    │
                                                    │ addItemToInventory()
                                                    ▼
                                            ┌──────────────┐
                                            │   PANTRY     │
                                            │  (bread: 3)  │
                                            └──────────────┘
```

## Building Inventory Capacities

```typescript
stove.capacity = 3;    // Can hold 3 stacks
farm.capacity = 5;     // Can hold 5 stacks
pantry.capacity = 10;  // Can hold 10 stacks
```

Each stack can hold multiple units of the same item type.

## Testing Guide

### Test Scenario 1: Basic Cooking Workflow
1. Build a farm and plant wheat
2. Wait for wheat to grow (5+ units)
3. Build a stove and pantry
4. Assign a colonist with Cooking priority 1
5. **Expected behavior**:
   - Colonist goes to farm
   - Picks up 5 wheat
   - Goes to stove
   - Cooks for 10 seconds (skill-dependent)
   - 3 bread appears in stove inventory
   - Colonist seeks new task

### Test Scenario 2: Hauling Workflow
1. After bread is cooked (from Scenario 1)
2. Assign a colonist with Hauling priority 1
3. **Expected behavior**:
   - Colonist goes to stove
   - Picks up bread from stove inventory
   - Goes to pantry
   - Deposits bread in pantry inventory
   - Global bread count increases

### Test Scenario 3: Multiple Colonists
1. Set up 2 colonists:
   - Colonist A: Cooking priority 1, Hauling disabled
   - Colonist B: Hauling priority 1, Cooking disabled
2. **Expected behavior**:
   - A cooks continuously (when wheat available)
   - B hauls bread from stove to pantry
   - Efficient production line

### Test Scenario 4: Inventory Limits
1. Fill pantry to capacity (10 stacks)
2. Cook more bread
3. **Expected behavior**:
   - Hauler picks up bread
   - Cannot fit in pantry
   - Remainder goes to global storage
   - Message: "Pantry full! +X bread to general storage"

## Debug Console Commands

Use these commands in the browser console:

```javascript
// Check stove inventory
const stove = game.buildings.find(b => b.kind === 'stove');
console.log('Stove inventory:', stove.inventory);

// Check colonist cooking state
const cook = game.colonists.find(c => c.state === 'cooking');
console.log('Cook sub-state:', cook?.cookingSubState);
console.log('Carrying wheat:', cook?.carryingWheat);

// Check hauler state
const hauler = game.colonists.find(c => c.state === 'haulBread');
console.log('Hauler carrying bread:', hauler?.carryingBread);

// Check pantry inventory
const pantry = game.buildings.find(b => b.kind === 'pantry');
console.log('Pantry inventory:', pantry.inventory);
console.log('Pantry bread (legacy):', pantry.breadStored);
```

## Common Issues & Fixes

### Issue: Colonist stuck at "goingToFarm" sub-state
**Cause**: No farm with 5+ wheat available  
**Fix**: Ensure farms have wheat inventory (check `farm.inventory`)

### Issue: Bread not being hauled
**Cause**: No colonist with Hauling work priority  
**Fix**: Enable Hauling in work priorities for at least one colonist

### Issue: Cooking timeout after 60 seconds
**Cause**: Multi-step workflow takes longer than old system  
**Fix**: Timeout extended from 30s to 60s for cooking state

### Issue: TypeScript error "Property 'cookingSubState' does not exist"
**Cause**: Type definition not updated  
**Fix**: Ensure `types.ts` includes `cookingSubState` and `cookingSourceFarm` properties

## Performance Considerations

- **Pathfinding**: Each sub-state recalculates path via `game.clearPath(c)`
- **Inventory Operations**: O(1) for add/remove/count operations
- **Work Assignment**: Scans all stoves and pantries each frame (optimize if >20 buildings)

## Future Enhancements

1. **Ingredient Variety**: Support multiple ingredient types (vegetables, meat, etc.)
2. **Recipe System**: Different meals require different ingredients
3. **Quality Levels**: Cooking skill affects meal quality
4. **Bulk Hauling**: Haulers can carry more items at once
5. **Storage Zones**: More flexible storage options beyond pantry
6. **Ingredient Preparation**: Cutting, mixing steps before cooking

## Related Systems

- **Building Inventory System**: `src/game/systems/buildingInventory.ts`
- **Work Priority System**: `src/game/rimworld-systems/logistics/enhancedHaulManager.ts`
- **Pathfinding**: `src/core/pathfinding.ts`
- **FSM Architecture**: `src/game/colonist_systems/colonistFSM.ts`

## Code Files Modified

1. `/src/game/colonist_systems/colonistFSM.ts`
   - Refactored `cooking` state with 3 sub-states
   - Added `haulBread` state with 2 sub-states
   - Updated state priority for `haulBread`

2. `/src/game/Game.ts`
   - Added hauling work assignment for bread
   - Modified cooking work assignment (removed bread storage task)

3. `/src/game/types.ts`
   - Added `cookingSubState` and `cookingSourceFarm` to `Colonist` type
   - Added `haulBread` to `ColonistState` type

## Summary

The realistic cooking workflow creates a more immersive colony simulation by:
- **Separating concerns**: Cooking and hauling are distinct jobs
- **Using building inventories**: Items flow through buildings realistically
- **Enabling specialization**: Colonists can focus on cooking OR hauling
- **Creating emergent gameplay**: Production bottlenecks, storage management, workflow optimization

This system follows RimWorld's design philosophy of simple, interconnected systems creating depth and emergent storytelling.
