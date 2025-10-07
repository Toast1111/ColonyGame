# Quick Test: Verify Agents Path Over Floors

## The Bug (Fixed!)
Agents were NOT routing over floor tiles despite proper costs being set.

## The Fix
- `rebuildNavGrid()` now restores terrain costs after clearing
- `clearSection()` preserves terrain costs during section rebuilds
- Pathfinding grid now always reflects terrain/floor costs

## How to Test

### 1. Visual Debug Test (Easiest)

1. **Enable terrain debug**: Press `T` key
   - Floor tiles show colored overlay (blue/brown/tan)
   
2. **Enable pathfinding debug**: `game.debug.navGrid = true` in console
   - Shows pathfinding costs as colored grid
   
3. **Build a stone road** (press `9` key, paint road)
   - Visual: Road appears blue/gray
   - Debug: Grid shows 0.5 cost (darker color)
   
4. **Build on grass nearby** to trigger `rebuildNavGrid()`
   - Floor costs should PERSIST (still 0.5)
   - If bug exists: costs reset to 1.0

### 2. Agent Behavior Test

1. **Build a diagonal stone road** from HQ to a resource pile
   ```
   HQ -------- Stone Road -------- Wood Pile
              (diagonal path)
   ```

2. **Order colonist to haul wood**
   - Before fix: Colonist ignores road, goes straight through grass
   - After fix: Colonist follows road (0.5 cost < 1.0 grass)

3. **Spawn enemy** (or wait for night)
   - Before fix: Enemy ignores roads
   - After fix: Enemy uses roads when convenient

### 3. Cost Persistence Test

1. **Place stone road** (press `9`)
2. **Check cost**: `game.grid.cost[game.cellIndexAt(x, y)]` = `0.5` ✅
3. **Build nearby** to trigger rebuild
4. **Check cost again**: Should still be `0.5` ✅
   - Before fix: Would be `1.0` ❌

### 4. Pathfinding Preference Test

1. **Create two paths** to same destination:
   ```
   Start
     ├── Path A: All grass (cost 1.0 each step)
     └── Path B: Through stone road (cost 0.5 each step)
   
   Destination
   ```

2. **Order colonist to destination**
   - Should choose Path B (lower total cost)
   - Enable debug: `game.debug.colonists = true`
   - Watch colonist path (green line should follow road)

## Quick Console Tests

```javascript
// 1. Check if terrain grid is linked
game.grid.terrainGrid !== undefined  // Should be true ✅

// 2. Place floor and check cost
const x = 1000, y = 1000;  // World coordinates
const tx = Math.floor(x / 32), ty = Math.floor(y / 32);
const idx = ty * game.grid.cols + tx;

game.terrainGrid.floors[idx] = 5;  // FLOOR_STONE_ROAD
game.syncTerrainToGrid();
game.grid.cost[idx];  // Should be 0.5 ✅

// 3. Rebuild and verify cost persists
game.rebuildNavGrid();
game.grid.cost[idx];  // Should STILL be 0.5 ✅ (bug fix!)

// 4. Check pathfinding uses costs
const path = game.computePath(100, 100, 2000, 2000);
// Path should prefer low-cost tiles (roads/floors)
```

## Expected Results

### ✅ After Fix (Working)
- Floor costs: `0.5` (stone), `0.6` (dirt), `0.65` (wood)
- Pathfinding prefers floors over grass
- Grid rebuilds preserve floor costs
- Agents visibly use roads when beneficial
- Debug overlay shows correct costs

### ❌ Before Fix (Broken)
- Floor costs: Always `1.0` after rebuild
- Pathfinding ignores floors (no cost difference)
- Grid rebuilds wipe floor costs
- Agents ignore roads completely
- Debug overlay shows uniform `1.0` everywhere

## Debug Commands

```javascript
// Enable all debug overlays
game.debug.navGrid = true;    // Pathfinding costs
game.debug.colonists = true;  // Colonist paths
game.debug.terrain = true;    // Terrain/floor layers

// Check specific tile cost
const worldX = 1000, worldY = 1000;
const idx = game.cellIndexAt(worldX, worldY);
console.log('Cost:', game.grid.cost[idx]);
console.log('Floor:', game.terrainGrid.floors[idx]);

// Manually test path
const path = game.computePath(
  game.colonists[0].x, 
  game.colonists[0].y,
  1000, 
  1000
);
console.log('Path length:', path?.length);
```

## Common Issues

### Issue: "Costs still resetting to 1.0"
- **Check**: Is `game.grid.terrainGrid` defined?
  - Fix: `game.grid.terrainGrid = game.terrainGrid;`
- **Check**: Is `syncTerrainToGrid()` being called?
  - Fix: Call after placing floors

### Issue: "Agents still not using roads"
- **Check**: Are floor costs actually 0.5-0.65?
  - Use console: `game.grid.cost[idx]`
- **Check**: Is movement speed using costs?
  - Should be `speed = baseSpeed / tileCost`

### Issue: "Roads disappear after building"
- **Check**: Does `rebuildNavGrid()` call `syncTerrainToGrid()`?
  - Should be in `navGrid.ts` after `clearGrid()`

## Success Criteria

- [x] Stone roads show 0.5 cost in debug
- [x] Costs persist after `rebuildNavGrid()`
- [x] Colonists path over roads when beneficial
- [x] Enemies path over roads when convenient
- [x] Movement speed matches pathfinding costs
- [x] Visual and logical systems aligned

**If all tests pass, the bug is fixed!** 🎉
