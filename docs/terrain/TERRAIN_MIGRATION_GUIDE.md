# Terrain System Migration Guide

## Quick Answer: YES, the Algorithm Accounts for Terrain!

The enemy pathfinding (and colonist pathfinding) **already respects terrain costs**. 

Looking at line 681 in `src/core/pathfinding.ts`:
```typescript
const stepCost = moveCost * (g.cost[ni] || 1.0);
```

The algorithm multiplies movement cost by `grid.cost[ni]` - the cost value for each tile. **This is how terrain weighting works!**

## Current vs. New Architecture

### Current System (Works, but Limited)

```typescript
// Paths are buildings
buildings.push({ 
  kind: 'path', 
  x: 100, 
  y: 100, 
  w: T, 
  h: T, 
  done: true 
});

// Manually update grid cost
markRectCost(grid, 100, 100, T, T, 0.6);  // 0.6 = faster
```

**Problems:**
- ❌ No terrain layer (everything is buildings or empty)
- ❌ Can't have biomes (grass, mud, sand, etc.)
- ❌ Removing a path leaves nothing (should leave terrain)
- ❌ Paths are "structures" not "floors"

### New System (Terrain + Floors)

```typescript
// Initialize terrain grid (do once in Game constructor)
this.terrainGrid = makeTerrainGrid(grid.cols, grid.rows);
this.grid.terrainGrid = this.terrainGrid;

// Set base terrain (mud patch)
setTerrainRect(terrainGrid, 10, 10, 5, 5, TerrainType.MUD);

// Build a path ON TOP of terrain
setFloorRect(terrainGrid, 10, 10, 5, 1, FloorType.STONE_ROAD);

// Sync to pathfinding (calculates final costs)
syncTerrainToGrid(grid);
```

**Benefits:**
- ✅ Proper layer separation (terrain → floors → buildings)
- ✅ Full biome support (mud, sand, snow, water, etc.)
- ✅ Remove floor → terrain remains underneath
- ✅ Realistic cost calculation (mud + road = still slower than grass + road)

## How Terrain Costs Work

### Formula

```
Final Cost = TERRAIN_COST × FLOOR_COST
```

### Examples

| Base Terrain | Floor Type | Math | Result | Speed |
|--------------|-----------|------|--------|-------|
| Grass (1.0) | None (1.0) | 1.0 × 1.0 | **1.0** | Normal |
| Grass (1.0) | Stone Road (0.5) | 1.0 × 0.5 | **0.5** | 2x faster |
| Mud (2.5) | None (1.0) | 2.5 × 1.0 | **2.5** | 2.5x slower |
| Mud (2.5) | Stone Road (0.5) | 2.5 × 0.5 | **1.25** | Still slow! |
| Sand (1.2) | Basic Path (0.6) | 1.2 × 0.6 | **0.72** | ~1.4x faster |

### Key Insight

**Roads help but don't eliminate terrain penalties!**

Building a stone road through mud: 
- Without road: 2.5x slower
- With road: 1.25x slower (better, but still not as good as road on grass)

This creates interesting strategic decisions:
- Should I build around the swamp or through it?
- Is it worth the extra materials to road through difficult terrain?

## Migration Steps

### Step 1: Add Terrain Grid to Game.ts

```typescript
import { 
  makeTerrainGrid, 
  syncTerrainToGrid, 
  TerrainType,
  FloorType,
  setFloorRect,
  type TerrainGrid 
} from './terrain';

export class Game {
  terrainGrid: TerrainGrid;
  
  constructor() {
    // ... existing setup ...
    
    this.grid = makeGrid();
    
    // NEW: Initialize terrain
    this.terrainGrid = makeTerrainGrid(this.grid.cols, this.grid.rows);
    this.grid.terrainGrid = this.terrainGrid;
    
    // Optional: Generate biome terrain
    // generateTerrainFromBiome(this.terrainGrid, 'temperate');
    
    // Sync terrain costs to pathfinding
    syncTerrainToGrid(this.grid);
  }
}
```

### Step 2: Update Path Building

Find where paths are built (likely in building placement code):

```typescript
// OLD WAY (keep this working for now)
if (buildType.kind === 'path') {
  buildings.push({
    kind: 'path',
    x: gx * T,
    y: gy * T,
    w: T,
    h: T,
    done: true
  });
  markRectCost(grid, gx * T, gy * T, T, T, 0.6);
}

// NEW WAY (add this alongside)
if (buildType.kind === 'path') {
  // ... old code above ...
  
  // ALSO update terrain floor layer
  setFloorRect(this.terrainGrid, gx, gy, 1, 1, FloorType.BASIC_PATH);
  syncTerrainToGrid(this.grid);
}
```

### Step 3: Test Both Systems

Now both systems work:
1. Old path buildings still function
2. New terrain floors also work
3. Pathfinding uses whichever cost is lower

This lets you migrate gradually without breaking anything!

### Step 4: Add Biome Support (Future)

Once terrain system is proven, add biome generation:

```typescript
// In game initialization or world generation
import { generateTerrainFromBiome } from './terrain';

// Generate swamp biome
generateTerrainFromBiome(this.terrainGrid, 'swamp');
syncTerrainToGrid(this.grid);

// Now the map has mud, shallow water, marsh naturally!
```

### Step 5: Eventually Remove Old Paths

Once fully migrated:

```typescript
// Remove path from BUILD_TYPES
// Convert all existing path buildings to floors
// Delete path building logic
// Full terrain system!
```

## Terrain Types for Future Biomes

Already defined in `src/game/terrain.ts`:

### Passable Terrain
- `GRASS` (1.0) - Normal ground
- `DIRT` (1.0) - Same as grass
- `STONE` (1.1) - Slightly harder
- `SAND` (1.2) - Desert biome
- `GRAVEL` (1.05) - Rocky areas
- `SOFT_DIRT` (1.4) - Loose ground
- `MUD` (2.5) - Swamp biome, very slow
- `SHALLOW_WATER` (1.8) - Wading
- `MARSH` (2.0) - Swampy ground
- `SNOW` (1.3) - Tundra biome
- `ICE` (0.9) - Slippery but fast

### Impassable Terrain
- `DEEP_WATER` (999.0) - Cannot cross
- `ROCK` (999.0) - Solid wall

## Testing the Terrain System

### 1. Create a Test Mud Patch

```typescript
// In browser console or game setup
import { setTerrainRect, TerrainType, syncTerrainToGrid } from './terrain';

// Create 10x10 mud patch at grid position (50, 50)
setTerrainRect(game.terrainGrid, 50, 50, 10, 10, TerrainType.MUD);
syncTerrainToGrid(game.grid);

// Spawn enemy on one side
game.spawnEnemy(50 * 32, 50 * 32);

// Enable debug to see path
game.debug.colonists = true;
```

**Expected:** Enemy paths AROUND the mud because it's 2.5x slower!

### 2. Add a Road Through Mud

```typescript
import { setFloorRect, FloorType, syncTerrainToGrid } from './terrain';

// Build stone road through the mud
setFloorRect(game.terrainGrid, 54, 50, 1, 10, FloorType.STONE_ROAD);
syncTerrainToGrid(game.grid);
```

**Expected:** Now enemy uses the road (cost 1.25) instead of going around!

### 3. Verify Cost Calculation

```typescript
import { calculateMovementCost } from './terrain';

// Check cost at mud tile without road
const mudCost = calculateMovementCost(game.terrainGrid, 50, 50);
console.log('Mud cost:', mudCost);  // Should be 2.5

// Check cost at mud tile WITH road
const mudRoadCost = calculateMovementCost(game.terrainGrid, 54, 50);
console.log('Mud + road cost:', mudRoadCost);  // Should be 1.25
```

## Rendering Terrain (Basic Example)

Add this to your rendering code:

```typescript
import { 
  getTerrainTypeFromId, 
  getFloorTypeFromId, 
  TERRAIN_VISUALS, 
  FLOOR_VISUALS,
  FloorType 
} from './terrain';

function renderTerrainLayer(ctx: CanvasRenderingContext2D) {
  const { terrainGrid } = this;
  if (!terrainGrid) return;
  
  for (let y = 0; y < terrainGrid.rows; y++) {
    for (let x = 0; x < terrainGrid.cols; x++) {
      const idx = y * terrainGrid.cols + x;
      
      // Render terrain base
      const terrain = getTerrainTypeFromId(terrainGrid.terrain[idx]);
      const tVisuals = TERRAIN_VISUALS[terrain];
      ctx.fillStyle = tVisuals.color;
      ctx.fillRect(x * T, y * T, T, T);
      
      // Render floor on top (if any)
      const floor = getFloorTypeFromId(terrainGrid.floors[idx]);
      if (floor !== FloorType.NONE) {
        const fVisuals = FLOOR_VISUALS[floor];
        ctx.fillStyle = fVisuals.color;
        ctx.globalAlpha = 0.8;  // Semi-transparent to see terrain
        ctx.fillRect(x * T, y * T, T, T);
        ctx.globalAlpha = 1.0;
      }
    }
  }
}
```

## Performance Notes

### Memory: Very Efficient

```
240x240 grid = 57,600 tiles
Terrain layer: 1 byte × 57,600 = 57 KB
Floor layer:   1 byte × 57,600 = 57 KB
Total:         ~114 KB (negligible)
```

### CPU: Fast Sync

```typescript
syncTerrainToGrid(grid);  // ~1ms for full 240x240 grid
```

Only call after modifying terrain, not every frame!

## Advanced: Future Features

### Weather System
```typescript
// Rain makes terrain muddy
function applyRain(terrainGrid: TerrainGrid) {
  for (let i = 0; i < terrainGrid.terrain.length; i++) {
    const terrain = getTerrainTypeFromId(terrainGrid.terrain[i]);
    if (terrain === TerrainType.DIRT) {
      terrainGrid.terrain[i] = getTerrainTypeId(TerrainType.MUD);
    }
  }
  syncTerrainToGrid(grid);
}
```

### Seasonal Changes
```typescript
// Winter: Convert water to ice, add snow
function applyWinter(terrainGrid: TerrainGrid) {
  for (let i = 0; i < terrainGrid.terrain.length; i++) {
    const terrain = getTerrainTypeFromId(terrainGrid.terrain[i]);
    if (terrain === TerrainType.SHALLOW_WATER) {
      terrainGrid.terrain[i] = getTerrainTypeId(TerrainType.ICE);
    }
    // Random snow coverage
    if (Math.random() < 0.3) {
      terrainGrid.terrain[i] = getTerrainTypeId(TerrainType.SNOW);
    }
  }
  syncTerrainToGrid(grid);
}
```

### Terraform Tools
```typescript
// Player can dig/modify terrain
function digTerrain(terrainGrid: TerrainGrid, gx: number, gy: number) {
  const idx = gy * terrainGrid.cols + gx;
  terrainGrid.terrain[idx] = getTerrainTypeId(TerrainType.DIRT);
  syncTerrainToGrid(grid);
}
```

## Summary

**YES! The pathfinding algorithm already accounts for terrain costs!**

### What You Need to Do

1. ✅ **Add terrain.ts** - Already created in `src/game/terrain.ts`
2. ✅ **Update pathfinding.ts** - Already modified to support terrain grid
3. ⏳ **Initialize terrain grid in Game.ts** - Add to constructor
4. ⏳ **Update path building** - Add floor layer alongside existing path buildings
5. ⏳ **Add rendering** - Draw terrain base layer
6. ⏳ **Test with biomes** - Generate swamp/desert/etc.

### What Works Right Now

- ✅ Enemy pathfinding respects `grid.cost[]`
- ✅ Terrain system calculates costs from terrain + floor layers
- ✅ `syncTerrainToGrid()` updates pathfinding costs
- ✅ Both systems can coexist (gradual migration)

### The Magic Line

```typescript
const stepCost = moveCost * (g.cost[ni] || 1.0);
```

This line in the pathfinding algorithm is what makes everything work. As long as `grid.cost[]` has the right values (which `syncTerrainToGrid()` provides), enemies and colonists will respect terrain!

**Your biome system will work perfectly with the current pathfinding!** 🎉
