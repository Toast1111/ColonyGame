# Tile Alignment Fix for Pathfinding Issues

## Problem Description

Colonists were getting stuck when trying to interact with objects because trees, rocks, and floor items could spawn at arbitrary pixel coordinates between tile centers. Since the pathfinding system operates on a tile-based grid (32×32 pixels per tile), colonists could find paths to the general area but couldn't reach the exact interaction point if objects were positioned between tiles.

## Root Cause

1. **Tree/Rock Spawning**: The `scatter()` and `tryRespawn()` methods used `rand()` to generate completely random positions, which could place objects anywhere within the world bounds - including between tile boundaries.

2. **Floor Item Dropping**: When items were dropped from harvesting trees, mining rocks, or using the debug console, they inherited the arbitrary positioning from their source objects or were placed at exact click coordinates.

3. **Pathfinding Expectations**: The navigation system expects interactable objects to be positioned at or near tile centers for optimal pathfinding performance.

## Solution Implemented

### 1. Tile Alignment Utilities (`src/game/utils/tileAlignment.ts`)

Created comprehensive utility functions:

- `snapToTileCenter(x, y)`: Snaps any position to the nearest tile center
- `getTileCenterPos(gx, gy)`: Gets tile center from grid coordinates  
- `worldToGrid(x, y)`: Converts world pixels to grid coordinates
- `isAlignedToTileCenter(x, y)`: Checks if position is already aligned
- `findNearbyAlignedPosition()`: Finds alternative aligned positions when blocked

### 2. Resource Spawning Fixes (`src/game/Game.ts`)

**scatter() method**: Added tile alignment for initial world generation
```typescript
// Before: Random positioning
this.trees.push({ x: p.x, y: p.y, r: 12, hp: 40, type: 'tree' });

// After: Tile-aligned positioning  
const alignedPos = snapToTileCenter(p.x, p.y);
this.trees.push({ x: alignedPos.x, y: alignedPos.y, r: 12, hp: 40, type: 'tree' });
```

**tryRespawn() method**: Added tile alignment for resource respawning
```typescript
// Snap to tile center for pathfinding alignment
const alignedPos = snapToTileCenter(p.x, p.y);
if (kind==='tree') this.trees.push({ x:alignedPos.x, y:alignedPos.y, r:12, hp:40, type:'tree' });
```

### 3. Floor Item Dropping Fix (`src/game/managers/ItemManager.ts`)

Updated `dropItems()` method to snap items to tile centers when not in stockpiles:

```typescript
if (zone && zone accepts item) {
  // Use stockpile's tile-based positioning (already working)
  finalPosition = stockpilePosition;
} else {
  // Not in stockpile - snap to tile center for pathfinding alignment
  finalPosition = snapToTileCenter(position.x, position.y);
}
```

This ensures items dropped from:
- Tree chopping (`colonistFSM.ts` line ~1705)
- Rock mining (`colonistFSM.ts` line ~1909) 
- Debug console (`debugConsole.ts` line ~487)
- Other harvesting activities

All get properly aligned for colonist interaction.

## Testing Instructions

### 1. Debug Console Testing

Open debug console with backtick (`` ` ``) and run:

```bash
# Test current alignment status
alignment test

# Spawn test items to verify new alignment
alignment spawn

# Drop items manually to test
drop wood 10 here

# Check floor items positions
items list
```

### 2. Gameplay Testing

1. **New Game Start**:
   - Start a new game
   - Run `alignment test` to verify trees/rocks are tile-aligned
   - Should show "✅ All tested objects are tile-aligned!"

2. **Resource Gathering**:
   - Order colonists to chop trees
   - Verify wood drops are accessible (no getting stuck)
   - Order colonists to mine rocks  
   - Verify stone drops are accessible

3. **Manual Item Dropping**:
   - Use debug console: `drop wood 20 here`
   - Items should snap to tile centers automatically
   - Colonists should be able to haul them without issues

4. **Respawn Testing**:
   - Wait for resources to respawn naturally (4+ seconds)
   - New trees/rocks should be tile-aligned
   - Run `alignment test` periodically to verify

### 3. Visual Verification

Enable tile grid overlay (if available) or use the performance HUD (press `P`) to see tile boundaries. All trees, rocks, and loose items should be centered within their tiles.

## Expected Results

- ✅ **No more stuck colonists**: Colonists should pathfind successfully to all trees, rocks, and floor items
- ✅ **Consistent positioning**: All objects snap to tile centers (coordinates ending in .0 for 32-pixel tiles)
- ✅ **Maintained gameplay**: No impact on game balance or visual appearance
- ✅ **Debug tools**: New alignment testing commands for verification

## Files Modified

1. `src/game/utils/tileAlignment.ts` - **NEW** - Tile alignment utilities
2. `src/game/Game.ts` - Updated scatter() and tryRespawn() methods
3. `src/game/managers/ItemManager.ts` - Updated dropItems() method  
4. `src/game/ui/debugConsole.ts` - Added alignment testing commands

## Backward Compatibility

This fix is fully backward compatible:
- Existing save games will continue to work
- Already-spawned objects retain their positions
- New objects spawned after the fix will be properly aligned
- No breaking changes to game mechanics or UI

## Future Improvements

Consider these enhancements for even better pathfinding:

1. **Migration Command**: Add debug command to align existing objects in save games
2. **Building Placement**: Ensure buildings also snap to tile boundaries
3. **Visual Debug Mode**: Add grid overlay to visualize tile alignment  
4. **Automatic Validation**: Add startup checks to warn about misaligned objects

The core pathfinding issue should now be resolved, making colonist movement much more reliable and predictable.