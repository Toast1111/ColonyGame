# Navigation Mesh Quick Reference

## What is the NavMesh?

A **240x240 tile grid** (57,600 cells) that determines where entities can move. Each tile stores:
- **solid** (0/1): Can units pass through?
- **cost** (float): How long does it take to cross? (0.5 = road, 1.0 = grass, 100+ = water)

## Two Rebuild Methods

### 1. Full Rebuild: `rebuildNavGrid()`

**When**: Major changes (building placed/removed, game init)
**Time**: ~5-8ms
**Triggers**:
- Game initialization
- Building placed/demolished
- Building construction completed
- Door state changes
- Manual debug

**Process**:
```
clearGrid() → syncTerrainToGrid() → mark buildings → mark obstacles → rebuild regions
```

### 2. Partial Rebuild: `rebuildNavGridPartial(worldX, worldY, radius)`

**When**: Small localized changes (tree/rock destroyed)
**Time**: ~0.3ms (56x faster!)
**Triggers**:
- Tree chopped
- Rock mined
- Resource respawned

**Process**:
```
clearGridArea() → restore terrain → re-mark intersecting objects → rebuild regions in area
```

## Key Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `makeGrid()` | Create empty 240x240 grid | Game init |
| `clearGrid()` | Reset all to passable | Full rebuild |
| `clearGridArea()` | Reset specific area | Partial rebuild |
| `syncTerrainToGrid()` | Copy terrain costs | After terrain changes |
| `markRectSolid()` | Block rectangular area | Buildings |
| `markCircleSolid()` | Block circular area | Trees, rocks |
| `markRoadPath()` | Reduce movement cost | Roads, doors |
| `rebuildNavGrid()` | Full rebuild | Building placed |
| `rebuildNavGridPartial()` | Localized rebuild | Tree destroyed |

## Building Types & Pathfinding

**Passable** (colonists walk through):
- HQ, Path, House, Farm, Bed, Door

**Blocking** (marked solid):
- Wall, Turret, Storage, Campfire, Medical Bed

**Special**:
- **Path**: cost 0.6 (40% faster than grass)
- **Door**: cost 0.6 (walkable, but slows when closed)
- **House door tile**: cost 0.5 (50% faster approach)

## Cost Values

| Terrain/Feature | Cost | Speed Impact |
|-----------------|------|--------------|
| Fast Road | 0.5 | 2x faster |
| Basic Path | 0.6 | 1.67x faster |
| Slow Path | 0.7 | 1.43x faster |
| Grass | 1.0 | Normal |
| Sand | 1.1 | 10% slower |
| Rough Terrain | 1.5 | 50% slower |
| Deep Water | 100+ | Impassable |

## Region System Integration

After navmesh rebuild, regions update automatically:

**Full**: `regionManager.onBuildingsChanged()` - flood-fills entire map
**Partial**: `regionManager.rebuildArea()` - flood-fills affected area only

## Performance Optimization

- **Sectioned Grid**: 32x32 tile sections with dirty flags
- **Partial Rebuilds**: Only update ~10x10 area around change (~100 cells vs 57,600)
- **Terrain Caching**: Terrain costs stored in separate grid, synced when needed

## Debugging

```typescript
// In browser console
game.debug.navGrid = true;      // Visualize solid/passable tiles
game.debug.regionDebug = true;  // Visualize regions
game.rebuildNavGrid();           // Manual full rebuild
```

## Recent Bug Fix (Oct 2025)

**Problem**: Cells incorrectly marked as solid, creating holes in regions

**Cause**: `syncTerrainToGrid()` only SET solid flag (1) but never CLEARED it (0)

**Fix**: Explicitly set solid flag for both passable AND impassable terrain:
```typescript
// OLD (broken)
if (!isTerrainPassable()) grid.solid[idx] = 1;

// NEW (fixed)
if (!isTerrainPassable()) {
  grid.solid[idx] = 1;
} else {
  grid.solid[idx] = 0; // ✅ Explicitly clear!
}
```

## Flow Diagram

```
Game Init
  ↓
makeGrid() → 240x240 empty grid
  ↓
syncTerrainToGrid() → Copy terrain costs
  ↓
rebuildNavGrid() → Mark buildings/obstacles
  ↓
regionManager.initialize() → Create regions
  ↓
Game Running
  ↓
┌─────────────────────────┐
│ Tree/Rock Destroyed?    │
└─────────┬───────────────┘
          │ YES
          ↓
rebuildNavGridPartial() → Update small area (~0.3ms)
          ↓
regionManager.rebuildArea() → Update regions in area
          ↓
Continue Game (no stutter!)

┌─────────────────────────┐
│ Building Changed?       │
└─────────┬───────────────┘
          │ YES
          ↓
rebuildNavGrid() → Full update (~5ms)
          ↓
regionManager.onBuildingsChanged() → Full region rebuild
          ↓
Continue Game (acceptable pause)
```

## Files

- **Grid Structure**: `src/core/pathfinding.ts`
- **Rebuild Logic**: `src/game/navigation/navGrid.ts`
- **Navigation Manager**: `src/game/managers/NavigationManager.ts`
- **Placement Triggers**: `src/game/placement/placementSystem.ts`
- **Resource Triggers**: `src/game/Game.ts` (tree/rock destruction)
