# Navigation Manager Extraction - Phase 6

## Summary

Extracted all navigation-related code from `Game.ts` into a dedicated `NavigationManager` class, reducing Game.ts by **207 lines** (from 2,762 → 2,555 lines).

## Files Modified

### New File Created

- **src/game/managers/NavigationManager.ts** (267 lines)
  - Complete navigation logic extraction
  - Pathfinding wrappers and colonist-aware path planning
  - Region-based search with fallback mechanisms
  - Complex circle approach algorithm

### Game.ts Updates

- Added `navigationManager = new NavigationManager(this)` instantiation
- Replaced all navigation method implementations with delegation:
  ```typescript
  rebuildNavGrid() { this.navigationManager.rebuildNavGrid(); }
  computePath(sx, sy, tx, ty) { return this.navigationManager.computePath(sx, sy, tx, ty); }
  bestApproachToCircle(c, circle, interact) { return this.navigationManager.bestApproachToCircle(c, circle, interact); }
  ```
- Removed navigation function imports (now only in NavigationManager)
- Updated `syncTerrainToGrid()` call in constructor to use instance method

## NavigationManager Architecture

### Simple Delegation Methods (A* Wrappers)

```typescript
rebuildNavGrid()                    // Rebuild navigation grid after obstacles change
syncTerrainToGrid()                 // Sync terrain costs to pathfinding grid
computePath(sx, sy, tx, ty)         // Basic A* pathfinding
computePathWithDangerAvoidance()    // Colonist-aware pathfinding with danger memory
cellIndexAt(x, y)                   // Convert world coords to grid index
isBlocked(x, y)                     // Check if position is walkable
```

### Region-Based Searches

All `findNearest*ByRegion()` methods use the RegionManager for fast spatial queries with global search fallback:

```typescript
findNearestBuildingByRegion(x, y, filter)  // Filter by building type/state
findNearestTreeByRegion(x, y)              // Find harvestable trees
findNearestRockByRegion(x, y)              // Find minable rocks
```

**Fallback Strategy**: If regions are disabled, falls back to brute-force global search to maintain compatibility.

### Advanced Pathfinding

**`bestApproachToCircle()`** (~130 lines) - Intelligent approach point selection for circular targets (trees, rocks):

1. **Circle Sampling**: Tests 16 angles around target, biased toward colonist position
2. **Tile Snapping**: Converts to grid centers and deduplicates
3. **Candidate Filtering**: Removes blocked tiles and out-of-bounds positions
4. **Path Evaluation**: Evaluates up to 8 candidates with A* pathfinding
5. **Cost Calculation**: Sums grid costs along path, prefers road tiles (-0.05 cost)
6. **Early Exit**: Returns immediately if great path found (≤3 nodes, ≤2.0 cost)
7. **Fallback Logic**: Ray-walks toward colonist if no candidates found

**Performance Optimizations**:
- Candidate cap: Maximum 8 A* evaluations per call
- Angle ordering: Tests most promising directions first
- Tile deduplication: Prevents redundant path evaluations
- Bounds checking: Avoids expensive `cellIndexAt()` calls for invalid positions

### Helper Methods

```typescript
isReachable(sx, sy, ex, ey)                          // Quick reachability check via regions
isWithinInteractionRange(x, y, circle, distance)     // Distance-based interaction validation
```

## Dependencies

NavigationManager depends on:
- **Game instance**: Access to grid, buildings, trees, rocks, RegionManager
- **Navigation imports**: `rebuildNavGrid`, `computePath`, `computePathWithDangerAvoidance`, etc. from `./navigation/navGrid`
- **Pathfinding utilities**: `syncTerrainToGrid` from `core/pathfinding`
- **Constants**: `T` (tile size) from `./constants`
- **Types**: `Colonist`, `Building` from `./types`

## Integration Points

All colonist AI, combat, and resource gathering systems use navigation methods:

### Colonist FSM (`colonistFSM.ts`)
- `computePathWithDangerAvoidance()` - Safe pathfinding
- `findNearestTreeByRegion()` - Locate wood sources
- `findNearestRockByRegion()` - Locate stone sources
- `bestApproachToCircle()` - Approach harvesting positions

### Enemy FSM (`enemyFSM.ts`)
- `computePath()` - Direct pathfinding
- `findNearestBuildingByRegion()` - Target buildings for attack

### Building Placement
- `rebuildNavGrid()` - Update grid after construction
- `isBlocked()` - Validate placement locations

### Medical System
- `findNearestBuildingByRegion()` - Locate medical facilities
- `isReachable()` - Verify patients can reach beds

## Testing Verification

Tested with:
- ✅ Colonist pathfinding to resources (trees, rocks)
- ✅ Enemy pathfinding to HQ
- ✅ Building placement and grid updates
- ✅ Regional searches with fallback mode
- ✅ Circle approach algorithm for harvesting

All systems functioning correctly - no behavioral changes observed.

## Progress Tracking

### Overall Refactoring Progress

- **Started at**: 3,252 lines
- **After Phase 1-3** (GameState, systems): 3,002 lines (-250)
- **After Phase 4** (InputManager): 2,834 lines (-168)
- **After Phase 5** (RenderManager): 2,762 lines (-72)
- **After Phase 6** (NavigationManager): **2,555 lines** (-207)
- **Total reduction**: **697 lines** (21.4% progress)
- **Remaining to target (<500)**: 2,055 lines (79% remaining)

### Extracted Managers Summary

```bash
# Manager size comparison
wc -l src/game/managers/*.ts
#  170 src/game/managers/InputManager.ts
#  267 src/game/managers/NavigationManager.ts
#  708 src/game/managers/RenderManager.ts
#  115 src/game/managers/UIManager.ts
# 1,260 total manager lines extracted
```

## Next Phase

**Phase 7**: Building System Manager
- Extract building placement, construction, and update logic
- Target: ~400 lines
- Files: `placeBuilding()`, `updateBuilding()`, `demolishBuilding()`