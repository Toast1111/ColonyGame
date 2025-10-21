# Tile-Based Stockpile Stacking System

## Summary

Implemented a proper tile-based stacking system for stockpile zones. Items now stack intelligently on individual tiles (32×32px grid), with overflow automatically moving to adjacent vacant tiles instead of piling on top of each other.

## Problem

**Before:**
- Items dropped at the same position would stack infinitely
- No concept of tile occupancy
- Stack overflow would create random offset positions
- Visual clutter with items overlapping
- Not RimWorld-like behavior

## Solution

### **Tile-Based Grid System**

Each stockpile zone is divided into tiles of size `T` (32px). Items are placed at tile centers, and the system tracks:

1. **Which tiles are occupied**
2. **What item types are in each tile**
3. **Stack quantities vs limits**
4. **Available space for new items**

### **Smart Positioning Algorithm**

When dropping items in a stockpile, the system uses a 3-strategy approach:

```typescript
// Strategy 1: Find a tile with matching item type that's not at stack limit
// → Adds to existing stack of same type

// Strategy 2: Find a completely empty tile
// → Creates new stack in vacant space

// Strategy 3: Find a tile that's not completely full (different item types)
// → Allows up to 3 different stacks per tile (mixed storage)
```

## Changes Made

### 1. **Updated `StockpileManager.findStoragePositionInZone()`**
(`src/game/systems/stockpileZones.ts`)

```typescript
findStoragePositionInZone(
  zone: StockpileZone, 
  itemType: ItemType, 
  existingItems?: Array<{ position: Vec2; type: ItemType; quantity: number; stackLimit: number }>
): Vec2 | null
```

**Key Features:**
- Builds tile occupancy map from existing items
- Returns tile center coordinates (grid-snapped)
- Prioritizes stacking with same-type items
- Falls back to empty tiles
- Allows mixed storage (up to 3 stacks/tile)
- Returns `null` if zone is completely full

**Occupancy Tracking:**
```typescript
const tileOccupancy = new Map<string, Array<ItemInfo>>();
// Key format: "col,row" → List of items in that tile
```

### 2. **Updated `FloorItemManager.createItem()`**
(`src/game/systems/floorItems.ts`)

Changed from radius-based stacking to **position-based stacking**:

```typescript
// OLD: Stack with items within stackRadius (24-32px)
findNearbyStackableItem(item) {
  distance <= def.stackRadius // Fuzzy matching
}

// NEW: Stack with items at EXACT position (tile-based)
findStackableItemAtPosition(item) {
  distance <= 8 // Small tolerance for floating point
}
```

**Benefits:**
- Items only stack if at the **same tile**
- No more random stacking behavior
- Overflow stays at same position (triggers re-hauling to new tile)

### 3. **Updated `ItemManager.dropItems()`**
(`src/game/managers/ItemManager.ts`)

Now uses tile-aware positioning:

```typescript
dropItems(itemType, quantity, position) {
  const zone = this.stockpiles.getZoneAtPosition(position);
  
  if (zone && zone accepts this item) {
    // Find proper tile-based position
    const allItems = this.floorItems.getAllItems();
    const betterPosition = this.stockpiles.findStoragePositionInZone(
      zone, itemType, allItems
    );
    if (betterPosition) {
      finalPosition = betterPosition; // Use grid-snapped position
    }
  }
  
  // Create item at proper tile position
  this.floorItems.createItem(itemType, quantity, finalPosition);
}
```

### 4. **Updated `ItemManager.findBestStorageLocation()`**
(`src/game/managers/ItemManager.ts`)

Now passes existing items for occupancy checking:

```typescript
findBestStorageLocation(itemType) {
  const bestZone = this.stockpiles.findBestZoneForItem(itemType);
  const allItems = this.floorItems.getAllItems(); // Get all items
  
  const position = this.stockpiles.findStoragePositionInZone(
    bestZone, itemType, allItems // Pass for tile occupancy
  );
  
  return { zone: bestZone, position };
}
```

## Behavior Examples

### **Example 1: First Drop**
```
Stockpile Zone (3×2 tiles):
┌────┬────┬────┐
│    │    │    │  Empty zone
├────┼────┼────┤
│    │    │    │
└────┴────┴────┘

Drop 10 wood at position (x, y):
┌────┬────┬────┐
│ W10│    │    │  Wood placed at tile (0,0)
├────┼────┼────┤
│    │    │    │
└────┴────┴────┘
```

### **Example 2: Stacking Same Type**
```
Drop another 20 wood:
┌────┬────┬────┐
│ W30│    │    │  Stacks with existing wood (10+20)
├────┼────┼────┤
│    │    │    │
└────┴────┴────┘
```

### **Example 3: Stack Limit Overflow**
```
Drop 40 more wood (stackLimit=50):
┌────┬────┬────┐
│W50 │W20 │    │  First tile hits limit (50),
├────┼────┼────┤  overflow (20) goes to next tile
│    │    │    │
└────┴────┴────┘
```

### **Example 4: Different Item Types**
```
Drop 15 stone:
┌────┬────┬────┐
│W50 │W20 │S15 │  Different type → new tile
├────┼────┼────┤
│    │    │    │
└────┴────┴────┘
```

### **Example 5: Mixed Storage**
```
Drop 5 food when all tiles have items:
┌────┬────┬────┐
│W50 │W20 │S15 │  Food shares tile with existing items
│    │ F5 │    │  (up to 3 stacks per tile allowed)
└────┴────┴────┘
```

### **Example 6: Zone Full**
```
All tiles maxed out:
┌────┬────┬────┐
│W50 │W50 │W50 │  findStoragePositionInZone()
│S30 │S30 │S30 │  returns null → hauling system
│F20 │F20 │F20 │  finds different zone or leaves outside
└────┴────┴────┘
```

## Integration Points

### **Hauling System**
When colonists haul items, they use `findBestStorageLocation()` which:
1. Finds best zone for item type
2. Gets all existing items
3. Calls `findStoragePositionInZone()` with occupancy data
4. Returns proper tile-centered position

### **Overflow Handling**
If a tile hits stack limit:
1. Items are placed at same position
2. System detects multiple items at same spot
3. Auto-hauling triggers
4. Colonist moves overflow to next available tile

### **Manual Drops**
When player drops items via debug console or construction:
1. `dropItems()` checks if position is in stockpile
2. If yes, finds proper tile via `findStoragePositionInZone()`
3. Items automatically snap to tile centers

## Stack Limits by Item Type

```typescript
wood:     stackLimit: 50
stone:    stackLimit: 30
food:     stackLimit: 20
wheat:    stackLimit: 40
bread:    stackLimit: 30
metal:    stackLimit: 25
cloth:    stackLimit: 100
medicine: stackLimit: 10
```

## Performance Considerations

### **Tile Occupancy Map**
- Built on-demand per `findStoragePositionInZone()` call
- O(n) where n = number of items in zone
- Efficient for typical stockpile sizes (< 100 items)

### **Search Strategy**
- **Best case**: O(1) - first tile has matching stackable item
- **Average case**: O(tiles) - scans until empty tile found
- **Worst case**: O(tiles) - scans entire zone, returns null

### **Optimization Opportunities**
- Cache tile occupancy map in `StockpileZone`
- Update incrementally on item add/remove
- Use spatial hashing for large stockpiles

## Debug Console Testing

```bash
# Create a stockpile zone
stockpile 5 5 10 8  # x=5, y=5, width=10, height=8 tiles

# Drop items to test stacking
drop wood 30 6 6    # First stack
drop wood 25 6 6    # Stacks at same tile (total 50+5)
drop wood 20 6 6    # Overflow to next tile
drop stone 15 6 6   # Different type → separate tile

# Check item positions
items               # Lists all floor items with positions
```

## Visual Indicators

The rendering system already handles:
- Floor item sprites at tile positions
- Quantity text overlays
- Stockpile zone highlights (yellow rectangle)
- Item type colors from `ITEM_DEFINITIONS`

## Future Enhancements

### **Priority Areas**
- Allow marking specific tiles in a zone as "priority" for certain items
- Example: "Store weapons near entrance, food near kitchen"

### **Organization Mode**
- Implement `zone.settings.organized` flag
- Enforce strict tile assignments (1 item type per tile)
- Auto-reorganize when enabled

### **Zone Templates**
- Pre-defined zone sizes (small/medium/large)
- Auto-calculate optimal tile count
- Suggest layouts based on item types

### **Capacity Warnings**
- UI indicator when zone is >80% full
- Suggestion to expand or create new zone
- Colonist hauling prioritization

## Related Files

- `src/game/systems/stockpileZones.ts` - Zone management & tile logic
- `src/game/systems/floorItems.ts` - Item creation & stacking
- `src/game/managers/ItemManager.ts` - High-level item coordination
- `src/game/systems/haulManager.ts` - Hauling jobs (uses tile positions)
- `src/game/rendering/itemRenderer.ts` - Visual rendering
- `src/game/constants.ts` - `T = 32` tile size constant

## Testing Checklist

- [x] Items stack at same tile position
- [x] Stack overflow moves to adjacent tile
- [x] Different item types use separate tiles
- [x] Mixed storage works (up to 3 stacks/tile)
- [x] Full zone returns null position
- [x] Hauling system uses tile-based positions
- [x] Manual drops snap to tile centers
- [ ] Large stockpiles (>100 items) remain performant
- [ ] Zone resizing handles existing items correctly
- [ ] Save/load preserves tile positions

## Conclusion

The tile-based stacking system provides RimWorld-like storage behavior where items are organized on a grid, stack intelligently up to their limits, and overflow to adjacent tiles. This replaces the old fuzzy radius-based stacking with deterministic, visual grid-aligned storage that's easier to understand and manage.
