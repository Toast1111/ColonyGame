# Pathfinding Floor Bug Fix - Agents Now Route Over Floors

## Problem Identified

**Agents (colonists/enemies) were NOT pathing over floor tiles despite proper costs being set.**

### Root Cause

The pathfinding grid rebuild process was **wiping out terrain/floor data**:

1. `rebuildNavGrid()` calls `clearGrid()` 
2. `clearGrid()` resets ALL costs to `1.0` (grass default)
3. Floor costs (0.5, 0.6, 0.65) were lost
4. Pathfinding only saw uniform 1.0 costs everywhere
5. **Result: No preference for floors!**

### Why This Happened

The system had **two separate cost sources**:
- **Terrain Grid**: Holds floor costs (0.5-0.65) 
- **Pathfinding Grid**: A* algorithm uses this for routing

When `rebuildNavGrid()` cleared the pathfinding grid, it didn't restore the terrain costs!

```typescript
// OLD (BROKEN) - navGrid.ts
export function rebuildNavGrid(game: Game) {
  clearGrid(game.grid);  // ❌ Resets ALL costs to 1.0
  
  // Only restores legacy path buildings
  if (b.kind === 'path') {
    markRoadPath(game.grid, ...);
  }
  // ❌ Floor terrain costs LOST!
}
```

## Solution Implemented

### Fix #1: Restore Terrain Costs After Clear

Modified `rebuildNavGrid()` to sync terrain costs after clearing:

```typescript
// NEW (FIXED) - navGrid.ts
export function rebuildNavGrid(game: Game) {
  clearGrid(game.grid);
  
  // ✅ Restore terrain/floor costs from terrain grid after clearing
  if (game.grid.terrainGrid) {
    syncTerrainToGrid(game.grid);
  }
  
  // Buildings...
}
```

### Fix #2: Section Rebuilds Preserve Terrain

Modified `clearSection()` to restore terrain costs when rebuilding sections:

```typescript
// NEW (FIXED) - pathfinding.ts
function clearSection(grid: Grid, sectionX: number, sectionY: number): void {
  // ...clear section...
  
  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      const idx = gy * grid.cols + gx;
      grid.solid[idx] = 0;
      
      // ✅ Restore terrain/floor costs from terrain grid
      if (grid.terrainGrid) {
        grid.cost[idx] = calculateMovementCost(grid.terrainGrid, gx, gy);
      } else {
        grid.cost[idx] = 1.0; // Fallback to grass cost
      }
    }
  }
}
```

## How It Works Now

### 1. Floor Placement
```
Player places stone road (cost 0.5)
  → Added to terrainGrid.floors[]
  → syncTerrainToGrid() updates pathfinding grid
  → grid.cost[idx] = 0.5 ✅
```

### 2. Pathfinding Rebuild
```
rebuildNavGrid() called (buildings change, etc.)
  → clearGrid() resets costs to 1.0
  → syncTerrainToGrid() RESTORES floor costs ✅
  → grid.cost[idx] = 0.5 again ✅
```

### 3. Section Rebuild
```
updateDirtySections() called
  → clearSection() resets section costs
  → Immediately restores from terrainGrid ✅
  → Floor costs preserved ✅
```

### 4. A* Pathfinding
```
aStar(grid, sx, sy, tx, ty)
  → Evaluates neighbors
  → stepCost = moveCost × grid.cost[idx]
  → Prefers low costs (0.5 < 1.0) ✅
  → Routes over floors! ✅
```

## Verification

### What Now Works

✅ **Colonists path over floors** (prefer 0.5 cost vs 1.0 grass)  
✅ **Enemies path over floors** (same A* algorithm)  
✅ **Floor costs persist** through grid rebuilds  
✅ **Section rebuilds preserve** terrain costs  
✅ **Movement speed matches** pathfinding (from previous fix)  

### Test Cases

1. **Place Stone Road**
   ```
   Before: Colonist paths around road (1.0 = 1.0)
   After: Colonist paths ON road (0.5 < 1.0) ✅
   ```

2. **Build Near Floors**
   ```
   Before: rebuildNavGrid() wipes floor costs
   After: Floors persist after rebuild ✅
   ```

3. **Enemy Navigation**
   ```
   Before: Enemies ignore roads
   After: Enemies use roads when convenient ✅
   ```

## Files Changed

### `/workspaces/ColonyGame/src/game/navigation/navGrid.ts`
- **Added**: `syncTerrainToGrid` import
- **Modified**: `rebuildNavGrid()` - Restore terrain costs after clearing
- **Lines Changed**: 1-15

### `/workspaces/ColonyGame/src/core/pathfinding.ts`
- **Modified**: `clearSection()` - Restore terrain costs when clearing section
- **Lines Changed**: 240-250

## Technical Details

### Cost Flow

```
TerrainGrid (source of truth)
  floors[idx] = FLOOR_STONE_ROAD (id: 5)
  ↓
calculateMovementCost(terrainGrid, x, y)
  terrainCost = 1.0 (grass)
  floorCost = 0.5 (stone road)
  return terrainCost × floorCost = 0.5
  ↓
syncTerrainToGrid(grid)
  grid.cost[idx] = 0.5
  ↓
A* Algorithm
  stepCost = 1.0 × grid.cost[idx] = 0.5
  Prefers this over grass (1.0)!
```

### Grid Rebuild Cycle

```
1. User places building
   → rebuildNavGrid() called
   
2. clearGrid() 
   → grid.cost[] = all 1.0
   
3. syncTerrainToGrid() ✅ NEW!
   → grid.cost[] restored from terrainGrid
   → Floor costs back!
   
4. Mark buildings solid
   → Buildings block pathfinding
   
5. A* uses grid.cost[]
   → Routes over floors correctly ✅
```

## Impact

### Before Fix
- Pathfinding saw **uniform 1.0 costs everywhere**
- Floors existed visually but **not in pathfinding**
- Agents had **no incentive to use roads**
- "Why build roads if colonists ignore them?"

### After Fix
- Pathfinding sees **actual floor costs (0.5, 0.6, 0.65)**
- Floors **integrated into pathfinding**
- Agents **prefer roads over grass**
- "Roads actually work for pathfinding!"

## Related Systems

This fix integrates with:

✅ **Terrain System** - Source of floor costs  
✅ **Pathfinding** - Uses costs for A* routing  
✅ **Movement Speed** - Already fixed to use costs  
✅ **Section Rebuilds** - Preserves costs during partial updates  

## Testing Checklist

- [x] Stone roads preferred over grass
- [x] Dirt paths preferred over grass  
- [x] Wooden floors preferred over grass
- [x] Grid rebuilds preserve floor costs
- [x] Section rebuilds preserve floor costs
- [x] Colonists route over floors
- [x] Enemies route over floors
- [x] Movement speed matches pathfinding

## Conclusion

**The pathfinding system now correctly routes agents over floor tiles!**

The disconnect between terrain costs and pathfinding costs has been **completely eliminated**. Floors are now:

1. ✅ **Stored** in terrain grid
2. ✅ **Rendered** visually  
3. ✅ **Used for pathfinding** (this fix!)
4. ✅ **Used for movement speed** (previous fix)

Building roads now has a **tangible gameplay benefit** - agents actually use them! 🎉
