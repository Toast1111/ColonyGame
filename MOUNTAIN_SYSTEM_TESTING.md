# Mountain System Testing Guide

## Overview
This document outlines the testing procedures for the refined mountain generation and mining mechanics.

## Changes Made

### 1. Building Placement Validation
- **File**: `src/game/placement/placementSystem.ts`
- **Change**: Added mountain tile collision check to `canPlace()` function
- **Expected Behavior**: Buildings cannot be placed over mountain tiles; ghost preview shows red when hovering over mountains

### 2. Ore Resource Definitions
- **Files**: 
  - `src/data/itemDatabase.ts` - Added Coal and Copper item definitions
  - `src/game/types/items.ts` - Added ore types to ItemType union
  - `src/game/systems/floorItems.ts` - Added floor item properties for all ores

### 3. Mining Mechanics
- **File**: `src/game/colonist_systems/colonistFSM.ts`
- **Change**: Fixed ore resource dropping to use proper ItemType enum values
- **Expected Behavior**: When mining mountains, ores drop as floor items instead of being added directly to resources

## Testing Procedures

### Test 1: Building Placement Restriction
1. Start game with debug console (press backtick `)
2. Run: `mountains reveal` to expose all ores
3. Select any building from build menu
4. Try to place over a mountain tile
5. **Expected**: Ghost preview shows RED, cannot confirm placement
6. Place building adjacent to mountain (not overlapping)
7. **Expected**: Ghost preview shows GREEN, placement succeeds

### Test 2: Ore Visibility and Mining
1. Start game
2. Run: `spawn colonist 3` to add colonists
3. Designate a mining zone over mountains (M key or Mining Zone from menu)
4. **Expected**: Colonists only mine exposed mountain tiles (edges)
5. As mountains are mined, adjacent tiles become exposed
6. **Expected**: More mountain tiles become mineable as interior is revealed

### Test 3: Ore Floor Items
1. Start mining zone over mountains
2. Watch colonists mine different ore types
3. **Expected Results**:
   - Plain stone: Gray items on ground
   - Coal: Dark gray/black items
   - Copper: Reddish-brown items
   - Steel: Blue-gray items
   - Silver: Light silver items
   - Gold: Golden yellow items
4. Items should stack when similar types are nearby
5. **Expected**: Haulers should move ore items to stockpile zones

### Test 4: Mountain Passability
1. Designate mining zone through a mountain range
2. Let colonists mine a path through
3. **Expected**: 
   - Before mining: Pathfinding avoids mountains
   - After mining: Colonists can path through mined areas
   - Navigation grid updates automatically

### Test 5: Ore Yield by Type
Check mining yields match expected values (base values, modified by skill):
- Stone (NONE): 3 per tile
- Coal: 5 per tile
- Copper: 4 per tile
- Steel: 6 per tile
- Silver: 3 per tile
- Gold: 2 per tile

Mining skill increases yield up to 50% (at level 25).

## Debug Console Commands

```
mountains count     # Show mountain tile count and ore distribution
mountains reveal    # Expose all mountain ores (skip fog of war)
spawn colonist 3    # Add 3 colonists for testing
resources unlimited # Infinite resources for building
toggle enemies      # Disable enemy spawns for peaceful testing
speed 3             # 3x game speed for faster testing
```

## Known Limitations

1. **Ore Rarity**: Ore distribution is procedurally generated:
   - Gold: ~5% of mountain tiles
   - Silver: ~8%
   - Steel: ~12%
   - Copper: ~15%
   - Coal: ~25%
   - Plain Stone: ~35%

2. **Mining Zones Required**: Colonists only mine mountains within designated mining zones (similar to RimWorld)

3. **Exposed Tiles Only**: Ores must be visible (adjacent to non-mountain tile) before colonists will mine them

4. **Mountain HP**: Each mountain tile has HP based on ore type (70-120 HP). Mining speed is affected by:
   - Tool equipment (pickaxe, etc.)
   - Mining skill level
   - Base mining speed (12 damage/sec)

## Regression Checks

Ensure existing functionality still works:
- [ ] Regular rock mining (small rocks on map) still functions
- [ ] Resource system (wood, stone, food) unchanged
- [ ] Building construction on normal terrain works
- [ ] Pathfinding avoids walls and other obstacles
- [ ] Floor types (paths, roads) can still be built
