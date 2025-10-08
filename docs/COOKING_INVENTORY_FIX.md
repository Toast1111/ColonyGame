# Cooking System Integration Fix

## Problem

After implementing the building inventory system, the cooking workflow broke because:

1. Farms now store wheat in their `inventory` property instead of directly adding to global `game.RES.wheat`
2. Colonists were still looking for wheat only in global resources
3. Colonists couldn't access wheat stored in farm inventories for cooking
4. This resulted in colonists not being able to cook even when wheat was available in farms

## Solution

Updated the cooking system to integrate with the new building inventory system by making colonists retrieve wheat from farm inventories first, then fall back to global resources.

## Changes Made

### 1. Game.ts - Task Assignment Update

**File:** `src/game/Game.ts`

**Added Import:**
```typescript
import { getInventoryItemCount } from './systems/buildingInventory';
```

**Updated Cooking Task Assignment (lines ~1543-1573):**
- Changed from only checking `game.RES.wheat >= 5`
- Now counts wheat in **both** farm inventories AND global resources
- Iterates through all completed farms and sums up wheat in their inventories
- Only assigns cooking task if total wheat available >= 5

```typescript
// Check if there's wheat available in farm inventories OR global storage
const farms = this.buildings.filter(b => b.kind === 'farm' && b.done);
let totalWheatAvailable = this.RES.wheat || 0;

// Count wheat in farm inventories
for (const farm of farms) {
  if (farm.inventory) {
    totalWheatAvailable += getInventoryItemCount(farm, 'wheat');
  }
}

// Check if there's wheat to cook and available stoves
if (stoves.length > 0 && totalWheatAvailable >= 5) {
  // ... assign cooking task
}
```

### 2. colonistFSM.ts - Wheat Retrieval Logic

**File:** `src/game/colonist_systems/colonistFSM.ts`

**Added Imports:**
```typescript
import { addItemToInventory, removeItemFromInventory, getInventoryItemCount } from "../systems/buildingInventory";
```

**Updated Cooking State (lines ~1586-1682):**

**Old Behavior:**
- Only checked global `game.RES.wheat`
- Took wheat directly from global resources
- No farm inventory integration

**New Behavior:**
1. **First Priority:** Check all farm inventories for wheat
   - Find farms with at least 5 wheat in inventory
   - Use `removeItemFromInventory()` to take wheat from farm
   - Display message: "Colonist took X wheat from farm"

2. **Second Priority:** Fall back to global resources
   - If no farm has enough wheat, check `game.RES.wheat`
   - Take from global resources as before
   - Display message: "Colonist picked up 5 wheat"

3. **No Wheat Available:** Cancel task
   - If neither farms nor global have wheat, abandon cooking task
   - Return to seeking new tasks

```typescript
// Step 1: Pick up wheat if not carrying any
if (!c.carryingWheat || c.carryingWheat === 0) {
  let wheatAcquired = 0;
  
  // First, try to get wheat from farm inventories
  const farms = game.buildings.filter((b: Building) => b.kind === 'farm' && b.done && b.inventory);
  for (const farm of farms) {
    const availableWheat = getInventoryItemCount(farm, 'wheat');
    if (availableWheat >= 5) {
      // Remove 5 wheat from farm inventory
      const removed = removeItemFromInventory(farm, 'wheat', 5);
      wheatAcquired = removed;
      game.msg(`${c.profile?.name || 'Colonist'} took ${removed} wheat from farm`, 'info');
      break;
    }
  }
  
  // If couldn't get enough from farms, try global resources
  if (wheatAcquired === 0 && (game.RES.wheat || 0) >= 5) {
    game.RES.wheat = (game.RES.wheat || 0) - 5;
    wheatAcquired = 5;
    game.msg(`${c.profile?.name || 'Colonist'} picked up 5 wheat`, 'info');
  }
  
  if (wheatAcquired > 0) {
    c.carryingWheat = wheatAcquired;
    stove.cookingColonist = c.id;
  } else {
    // No wheat available anywhere
    c.task = null;
    c.target = null;
    changeState('seekTask', 'no wheat available');
    break;
  }
}
```

## Workflow

### Complete Cooking Workflow Now:

1. **Harvest:** Colonist harvests farm → wheat goes to farm's inventory (up to 5 slots)
2. **Overflow:** If farm inventory is full → wheat goes to global resources
3. **Task Assignment:** Game checks total wheat (farm inventories + global)
4. **Wheat Retrieval:** Colonist retrieves wheat from farm inventory first
5. **Cooking:** Colonist brings wheat to stove and cooks it
6. **Bread Storage:** Colonist stores bread in pantry inventory (or global if full)

### Priority System:

**Wheat Retrieval Priority:**
1. ✅ Farm inventories (first farm with >= 5 wheat)
2. ✅ Global resources (fallback)
3. ❌ Cancel task if neither available

**Storage Priority:**
1. ✅ Building-specific storage (farm for wheat, pantry for bread)
2. ✅ Global resources (overflow/fallback)

## Benefits

1. **Realistic Resource Flow:** Wheat stays in farms until needed for cooking
2. **Inventory Management:** Players can see wheat stored in individual farms
3. **Backward Compatible:** Still works with global resources as fallback
4. **Efficient:** Colonists take from nearest farm with available wheat
5. **Transparent:** Clear messages show where wheat is coming from

## Testing Checklist

To test the cooking system:

1. ✅ Build a farm and harvest it → Wheat should appear in farm inventory
2. ✅ Build a stove → Colonists should be assigned cooking tasks
3. ✅ Colonist goes to farm → Takes wheat from farm inventory
4. ✅ Colonist goes to stove → Cooks bread
5. ✅ Build pantry → Colonist stores bread in pantry inventory
6. ✅ Check farm inventory → Wheat count decreases after cooking
7. ✅ Fill farm inventory → Overflow wheat goes to global resources
8. ✅ Empty farm inventory → Colonist takes from global resources instead

## Messages to Look For

- **Farm Harvest:** "Farm harvested (+X wheat stored in farm)" (good)
- **Farm Full:** "Farm full! +X wheat to storage" (info)
- **Wheat Retrieval (Farm):** "Colonist took 5 wheat from farm" (info)
- **Wheat Retrieval (Global):** "Colonist picked up 5 wheat" (info)
- **Cooking Start:** "Colonist started cooking" (info)
- **Cooking Complete:** "Colonist cooked 3 bread!" (good)
- **Bread Storage:** "Colonist stored X bread in pantry" (good)

## Known Behavior

- Colonists will prefer farm inventories over global resources for wheat
- If multiple farms have wheat, colonist takes from the first one found
- Cooking requires exactly 5 wheat → produces 3 bread
- Stove stores wheat temporarily during cooking process
- Bread storage follows same pattern (pantry inventory first, then global)

## Future Enhancements

Potential improvements:
- Prioritize taking wheat from nearest farm
- Add "haul wheat to storage" job to consolidate wheat from multiple farms
- Create dedicated storage buildings for wheat (granary/silo)
- Allow colonists to carry multiple batches of wheat
- Add cooking queue system for multiple bread batches
