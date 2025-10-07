# Pathfinding Floor Bug - Visual Explanation

## The Bug in Pictures

### Before Fix ❌

```
Step 1: Player places stone road
┌─────────────────────────────────────┐
│  Terrain Grid (Source of Truth)    │
│  floors[idx] = FLOOR_STONE_ROAD     │
│  Cost: 0.5                          │
└─────────────────────────────────────┘
              ↓ syncTerrainToGrid()
┌─────────────────────────────────────┐
│  Pathfinding Grid                   │
│  cost[idx] = 0.5  ✅                │
└─────────────────────────────────────┘

Step 2: Player builds nearby (triggers rebuild)
┌─────────────────────────────────────┐
│  rebuildNavGrid() called            │
│    → clearGrid()                    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Pathfinding Grid                   │
│  cost[idx] = 1.0  ❌ WIPED OUT!     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  A* Pathfinding                     │
│  All costs = 1.0                    │
│  No preference for roads!           │
└─────────────────────────────────────┘
```

### After Fix ✅

```
Step 1: Player places stone road
┌─────────────────────────────────────┐
│  Terrain Grid (Source of Truth)    │
│  floors[idx] = FLOOR_STONE_ROAD     │
│  Cost: 0.5                          │
└─────────────────────────────────────┘
              ↓ syncTerrainToGrid()
┌─────────────────────────────────────┐
│  Pathfinding Grid                   │
│  cost[idx] = 0.5  ✅                │
└─────────────────────────────────────┘

Step 2: Player builds nearby (triggers rebuild)
┌─────────────────────────────────────┐
│  rebuildNavGrid() called            │
│    → clearGrid()                    │
│    → syncTerrainToGrid()  ✅ NEW!   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Pathfinding Grid                   │
│  cost[idx] = 0.5  ✅ RESTORED!      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  A* Pathfinding                     │
│  Road: 0.5 < Grass: 1.0             │
│  Prefers roads!  ✅                 │
└─────────────────────────────────────┘
```

## Pathfinding Comparison

### Scenario: Colonist hauling wood

```
Start (HQ)
   |
   |  ╔════════════════╗
   |  ║  STONE ROAD    ║  Cost: 0.5 per tile
   |  ║  (diagonal)    ║  
   |  ╚════════════════╝
   |         vs
   |  [ Grass shortcut ]  Cost: 1.0 per tile
   |  [ (straight)    ]
   ↓
Wood Pile (Destination)
```

### Before Fix ❌
```
Pathfinding sees:
  Road cost: 1.0  (wrong - wiped out!)
  Grass cost: 1.0
  
No preference → Random path choice
```

### After Fix ✅
```
Pathfinding sees:
  Road cost: 0.5  (correct - restored!)
  Grass cost: 1.0
  
Prefers road → Total cost lower
```

## Cost Flow Diagram

```
┌─────────────────────────────────────────────┐
│           TERRAIN SYSTEM                    │
│                                             │
│  TerrainGrid {                              │
│    terrain: Uint8Array   // Base layer     │
│    floors: Uint8Array    // Floor layer    │
│  }                                          │
│                                             │
│  Floor Types:                               │
│    FLOOR_STONE_ROAD = 5  → cost 0.5        │
│    FLOOR_DIRT_PATH = 4   → cost 0.6        │
│    FLOOR_WOODEN = 7      → cost 0.65       │
└─────────────────────────────────────────────┘
                     ↓
              calculateMovementCost(x, y)
              terrainCost × floorCost
                     ↓
┌─────────────────────────────────────────────┐
│        PATHFINDING GRID                     │
│                                             │
│  Grid {                                     │
│    cost: Float32Array                       │
│    solid: Uint8Array                        │
│    terrainGrid: TerrainGrid  ← LINKED!      │
│  }                                          │
│                                             │
│  Rebuild Process:                           │
│  1. clearGrid() → reset to 1.0              │
│  2. syncTerrainToGrid() ✅ → restore costs  │
│  3. Mark buildings solid                    │
└─────────────────────────────────────────────┘
                     ↓
                A* Algorithm
              for (neighbor) {
                stepCost = 1.0 × grid.cost[idx]
                if (stepCost < currentBest)
                  prefer this path
              }
                     ↓
┌─────────────────────────────────────────────┐
│              AGENT MOVEMENT                 │
│                                             │
│  Path: [{x, y}, {x, y}, ...]                │
│                                             │
│  Movement Speed:                            │
│    speed = baseSpeed / tileCost             │
│                                             │
│  Stone road: 50 / 0.5 = 100 speed  ⚡       │
│  Grass: 50 / 1.0 = 50 speed                 │
└─────────────────────────────────────────────┘
```

## The Key Fix

### navGrid.ts
```typescript
// OLD (BROKEN)
export function rebuildNavGrid(game: Game) {
  clearGrid(game.grid);  // Wipes costs to 1.0
  // ... buildings ...
  // Floor costs LOST! ❌
}

// NEW (FIXED)
export function rebuildNavGrid(game: Game) {
  clearGrid(game.grid);  // Wipes costs to 1.0
  
  if (game.grid.terrainGrid) {
    syncTerrainToGrid(game.grid);  // ✅ Restore from source of truth!
  }
  
  // ... buildings ...
  // Floor costs PRESERVED! ✅
}
```

## Real-World Example

### Build sequence:
1. Player builds stone road from HQ to farm
2. Road costs: 0.5 (synced to pathfinding grid)
3. Player builds warehouse nearby
4. `rebuildNavGrid()` called (buildings changed)
5. **Before fix**: Road costs wiped to 1.0 ❌
6. **After fix**: Road costs restored to 0.5 ✅
7. Colonists path over road to reach warehouse ✅

## Why It Matters

```
Without roads:
  HQ → Warehouse (grass only)
  Distance: 10 tiles × 1.0 cost = 10.0 total cost
  Time: 10 tiles × 50 speed = 20 seconds

With roads (before fix):
  HQ → Warehouse (via road)
  Distance: 12 tiles × 1.0 cost = 12.0 total cost  ❌
  Pathfinding picks grass (shorter)
  
With roads (after fix):
  HQ → Warehouse (via road)
  Distance: 12 tiles × 0.5 cost = 6.0 total cost  ✅
  Pathfinding picks road (lower cost!)
  Time: 12 tiles × 100 speed = 12 seconds
  
Result: Faster AND pathfinding works correctly! 🎉
```

## Testing Visualization

### Enable Debug Overlays

```javascript
game.debug.navGrid = true;    // Press N
game.debug.terrain = true;    // Press T
game.debug.colonists = true;  // Press J
```

### What You'll See:

```
Terrain Debug (T):
  🟦 Blue = Stone road (floor layer)
  🟫 Brown = Dirt path (floor layer)
  🟩 Green = Grass (terrain layer)

NavGrid Debug (N):
  ⬛ Dark = Low cost (0.5) ← Roads!
  ⬜ Light = High cost (1.0) ← Grass
  
Colonist Debug (J):
  🟢 Green line = Path
  → Should follow dark tiles (roads)
```

## Summary

**Problem**: Grid rebuilds wiped floor costs  
**Fix**: Restore costs from terrain grid after clearing  
**Result**: Agents now prefer roads over grass! ✅

Roads are no longer just decorative - they provide real gameplay benefit! 🎉
