# Terrain System Architecture

## Overview

The terrain system separates **ground terrain** (biomes, natural surface) from **floors** (built structures) and **buildings** (solid structures). This creates a proper layered architecture for future biome support.

## Layer Architecture

```
┌─────────────────────────────────────┐
│         BUILDINGS LAYER             │  ← Walls, doors, structures (blocks movement)
│  (Stored in game.buildings array)  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│          FLOORS LAYER               │  ← Paths, roads, floors (modifies movement speed)
│    (TerrainGrid.floors array)      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         TERRAIN LAYER               │  ← Grass, mud, stone (base movement speed)
│   (TerrainGrid.terrain array)      │
└─────────────────────────────────────┘
```

## Movement Cost Calculation

The final movement cost for a tile is calculated as:

```typescript
finalCost = TERRAIN_COSTS[terrain] * FLOOR_COSTS[floor]
```

### Examples

| Terrain | Floor | Calculation | Final Cost | Effect |
|---------|-------|-------------|------------|--------|
| Grass (1.0) | None (1.0) | 1.0 × 1.0 | 1.0 | Normal speed |
| Grass (1.0) | Stone Road (0.5) | 1.0 × 0.5 | 0.5 | 2x faster |
| Mud (2.5) | None (1.0) | 2.5 × 1.0 | 2.5 | 2.5x slower |
| Mud (2.5) | Stone Road (0.5) | 2.5 × 0.5 | 1.25 | Slow but improved |
| Stone (1.1) | Basic Path (0.6) | 1.1 × 0.6 | 0.66 | ~1.5x faster |

### Key Insight

**Floors modify but don't replace terrain effects.** Building a road through mud helps, but it's still slower than a road on grass.

## Terrain Types

### Passable Terrain
```typescript
GRASS:         1.0   // Baseline
DIRT:          1.0   // Same as grass
STONE:         1.1   // Slightly slower
SAND:          1.2   // Harder to walk on
GRAVEL:        1.05  // Barely slower
SOFT_DIRT:     1.4   // Noticeably slower
MUD:           2.5   // Significantly slower
SHALLOW_WATER: 1.8   // Wading through water
MARSH:         2.0   // Swampy ground
SNOW:          1.3   // Cold and difficult
ICE:           0.9   // Faster but slippery
```

### Impassable Terrain
```typescript
DEEP_WATER:    999.0 // Cannot traverse
ROCK:          999.0 // Solid rock wall
```

**Note:** Costs >= 100 are treated as impassable by pathfinding.

## Floor Types

All floors are **built structures** that exist on top of terrain:

```typescript
NONE:          1.0   // No floor (use terrain as-is)
BASIC_PATH:    0.6   // 40% speed bonus
STONE_ROAD:    0.5   // 50% speed bonus (best)
WOODEN_FLOOR:  0.7   // Indoor flooring
CONCRETE:      0.55  // Modern road
METAL_FLOOR:   0.65  // Industrial
CARPET:        0.85  // Decorative, minor bonus
```

## Integration with Pathfinding

### Current System (Legacy)

The old system treats paths as buildings:
```typescript
// OLD: Path is a building
buildings.push({ kind: 'path', x, y, w, h, done: true })
```

**Problems:**
- Paths are stored as buildings (wrong layer)
- Removing a path destroys the tile entirely
- No way to have terrain underneath paths
- Can't have biome-specific terrain

### New System (Terrain-Based)

```typescript
// NEW: Path is a floor on terrain
setFloorRect(terrainGrid, gx, gy, gw, gh, FloorType.BASIC_PATH)
syncTerrainToGrid(grid)  // Update pathfinding costs
```

**Benefits:**
- Terrain persists under floors
- Remove floor → terrain remains
- Supports biomes naturally
- Proper layer separation

## Usage Examples

### 1. Initialize Terrain Grid

```typescript
import { makeTerrainGrid, TerrainType, FloorType } from './game/terrain';

// In Game.ts constructor
this.terrainGrid = makeTerrainGrid(this.grid.cols, this.grid.rows);
this.grid.terrainGrid = this.terrainGrid;  // Link to pathfinding grid
```

### 2. Generate Biome Terrain

```typescript
import { generateTerrainFromBiome, syncTerrainToGrid } from './game/terrain';

// Generate swamp biome
generateTerrainFromBiome(this.terrainGrid, 'swamp');
syncTerrainToGrid(this.grid);  // Update pathfinding
```

### 3. Build a Path/Road

```typescript
import { setFloorRect, FloorType, syncTerrainToGrid } from './game/terrain';

// Build stone road at tile coordinates (10, 10) size 5x1
const gx = 10, gy = 10, gw = 5, gh = 1;
setFloorRect(this.terrainGrid, gx, gy, gw, gh, FloorType.STONE_ROAD);
syncTerrainToGrid(this.grid);  // Update pathfinding costs
```

### 4. Remove a Floor

```typescript
import { removeFloorRect, syncTerrainToGrid } from './game/terrain';

// Remove floor (terrain underneath remains)
removeFloorRect(this.terrainGrid, gx, gy, gw, gh);
syncTerrainToGrid(this.grid);
```

### 5. Paint Custom Terrain

```typescript
import { setTerrainRect, TerrainType, syncTerrainToGrid } from './game/terrain';

// Create a mud pit
setTerrainRect(this.terrainGrid, 20, 20, 10, 10, TerrainType.MUD);
syncTerrainToGrid(this.grid);
```

## Pathfinding Integration

### Enemy Pathfinding (Already Compatible!)

The `computeEnemyPath()` function **already respects terrain costs**:

```typescript
// Line 681 in pathfinding.ts
const stepCost = moveCost * (g.cost[ni] || 1.0);
```

When you call `syncTerrainToGrid()`, it updates `grid.cost[]` with terrain-based costs, and the pathfinding automatically uses them!

### Example Path Through Different Terrain

```
Scenario: Enemy at A, target at B
Terrain: Grass everywhere except mud strip in middle

A (grass) → → → (grass) → ✗ (mud) ✗ → (grass) → → B

Without terrain costs:
  Path: Straight through mud (shortest distance)
  
With terrain costs:
  Path: Detours around mud (faster overall despite longer distance)
```

## Migration Path from Current System

### Phase 1: Add Terrain Grid (Non-Breaking)
1. Add `terrainGrid` to Game
2. Initialize with all grass terrain
3. Keep existing path buildings working
4. Both systems coexist

### Phase 2: Migrate Paths to Floors
1. When building a path, also set floor in terrain grid
2. Mark old path buildings as deprecated
3. Pathfinding uses whichever cost is better

### Phase 3: Remove Legacy Paths
1. Convert all path buildings to floors
2. Remove path building type
3. Full terrain system active

## Rendering Terrain

### Basic Rendering

```typescript
function renderTerrain(ctx: CanvasRenderingContext2D, terrainGrid: TerrainGrid) {
  for (let y = 0; y < terrainGrid.rows; y++) {
    for (let x = 0; x < terrainGrid.cols; x++) {
      const idx = y * terrainGrid.cols + x;
      
      // Render terrain
      const terrain = getTerrainTypeFromId(terrainGrid.terrain[idx]);
      const terrainVisuals = TERRAIN_VISUALS[terrain];
      ctx.fillStyle = terrainVisuals.color;
      ctx.fillRect(x * T, y * T, T, T);
      
      // Render floor on top
      const floor = getFloorTypeFromId(terrainGrid.floors[idx]);
      if (floor !== FloorType.NONE) {
        const floorVisuals = FLOOR_VISUALS[floor];
        ctx.fillStyle = floorVisuals.color;
        ctx.fillRect(x * T, y * T, T, T);
      }
    }
  }
}
```

### Advanced: Pattern Rendering

```typescript
// Add noise pattern for variation
function renderTerrainWithPattern(ctx, terrainGrid) {
  // ... loop through tiles ...
  
  if (terrainVisuals.pattern === 'noise') {
    // Add subtle color variation
    const noise = Math.random() * 0.1;
    const [r, g, b] = hexToRgb(terrainVisuals.color);
    ctx.fillStyle = `rgb(${r + noise}, ${g + noise}, ${b + noise})`;
  }
  
  // ... render ...
}
```

## Future Enhancements

### Biome System
- Multiple biome types (swamp, desert, tundra, temperate)
- Smooth biome transitions
- Procedural generation with noise functions
- Biome-specific flora/fauna

### Weather Effects
- Rain makes terrain muddy (increase cost temporarily)
- Snow covers ground (visual + cost change)
- Flooding creates shallow water
- Seasons affect terrain properties

### Terrain Modification
- Digging to change terrain type
- Irrigation to convert desert to farmland
- Drainage to convert swamp to usable land
- Terraform tools for players

### Advanced Pathfinding
- Swimming skill affects water movement cost
- Equipment modifies terrain penalties (snowshoes on snow)
- Temperature affects ice/snow passability
- Fatigue increases mud/difficult terrain penalties

## Performance Considerations

### Memory Usage
```
Grid: 240x240 tiles = 57,600 tiles
Terrain: 1 byte per tile = ~57 KB
Floors:  1 byte per tile = ~57 KB
Total:   ~114 KB (negligible)
```

### CPU Usage
- `syncTerrainToGrid()`: O(n) where n = tiles
  - For 240x240: ~57K operations
  - Run once per terrain change
  - Very fast (<1ms on modern hardware)

### Optimization Tips
1. Only sync affected sections (use dirty flags)
2. Batch terrain changes before syncing
3. Cache terrain costs in pathfinding grid
4. Use typed arrays for memory efficiency

## API Reference

### Core Functions

```typescript
// Grid creation
makeTerrainGrid(cols: number, rows: number): TerrainGrid

// Terrain modification
setTerrainRect(grid, gx, gy, gw, gh, type: TerrainType): void
setFloorRect(grid, gx, gy, gw, gh, type: FloorType): void
removeFloorRect(grid, gx, gy, gw, gh): void

// Cost calculation
calculateMovementCost(grid, gx, gy): number
isTerrainPassable(grid, gx, gy): boolean

// Pathfinding integration
syncTerrainToGrid(pathfindingGrid: Grid): void

// Generation
generateTerrainFromBiome(grid, biome): void
```

### Type Enums

```typescript
TerrainType.GRASS | DIRT | MUD | SAND | STONE | etc.
FloorType.BASIC_PATH | STONE_ROAD | WOODEN_FLOOR | etc.
```

## Conclusion

The terrain system provides:
- ✅ Proper layer separation (terrain → floors → buildings)
- ✅ Full biome support
- ✅ Flexible movement cost system
- ✅ Compatible with existing pathfinding
- ✅ Minimal performance overhead
- ✅ Easy to extend for new features

**The enemy pathfinding already works with this system!** Just call `syncTerrainToGrid()` after modifying terrain, and enemies will automatically respect the new costs.
