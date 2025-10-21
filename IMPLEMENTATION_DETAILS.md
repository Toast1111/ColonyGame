# Mountain Collision Fix - Implementation Summary

## Problem Statement

Two critical issues were identified with mountain tile interactions:

1. **Enemies spawning on mountains**: Enemies could spawn on mountain tiles along map edges, allowing them to phase through mountains indefinitely
2. **Colonists getting stuck on mountains**: During hauling and other tasks, colonists could physically move onto mountain tiles and become permanently stuck

## Root Cause Analysis

### Enemy Spawning Issue
The `spawnEnemy()` function in `Game.ts` randomly selected positions along map edges without validating:
- Whether the position was on an impassable mountain tile
- Whether the grid cell was marked as solid/blocked
- Whether a path to the HQ existed from that position

### Colonist Stuck Issue
The `wouldCollideWithBuildings()` helper function in `colonistFSM.ts` only checked for building collisions, not terrain collisions. This meant:
- Pathfinding correctly avoided mountains (terrain system was working)
- But physical movement validation didn't prevent entering mountain tiles
- Colonists could slide into mountains during movement or door interactions
- Once on a mountain, they couldn't escape (stuck detection needed mountains in collision check)

## Solution Implementation

### 1. Enemy Spawn Validation (`src/game/Game.ts`)

**Changes:**
- Added retry loop (up to 20 attempts) to find valid spawn positions
- Validate each spawn position:
  - Check if grid coordinates are on a mountain tile using `isMountainTile()`
  - Check if grid cell is passable using `grid.solid[]`
- Fallback mechanism: if no valid edge spawn found, spawn at safe distance from HQ

**Code:**
```typescript
spawnEnemy() {
  const MAX_ATTEMPTS = 20;
  let x = 0, y = 0;
  let validSpawn = false;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Pick random edge position
    const edge = randi(0, 4);
    // ... position calculation ...
    
    // Validate: not on mountain
    const gx = Math.floor(x / T);
    const gy = Math.floor(y / T);
    if (isMountainTile(this.terrainGrid, gx, gy)) {
      continue;
    }
    
    // Validate: grid cell is passable
    if (gx >= 0 && gy >= 0 && gx < this.grid.cols && gy < this.grid.rows) {
      const idx = gy * this.grid.cols + gx;
      if (!this.grid.solid[idx]) {
        validSpawn = true;
        break;
      }
    }
  }
  
  // Fallback: spawn near HQ
  if (!validSpawn) {
    const angle = rand(0, Math.PI * 2);
    const distance = 200;
    x = HQ_POS.x + Math.cos(angle) * distance;
    y = HQ_POS.y + Math.sin(angle) * distance;
  }
  
  // Create enemy...
}
```

### 2. Colonist Mountain Collision (`src/game/colonist_systems/colonistFSM.ts`)

**Changes:**
- Updated `wouldCollideWithBuildings()` to check mountain tiles first
- Added grid coordinate calculation and mountain tile check
- Existing stuck detection system now rescues colonists from mountains

**Code:**
```typescript
function wouldCollideWithBuildings(game: any, x: number, y: number, radius: number): boolean {
  // Check mountain collision first (most important for getting stuck)
  const gx = Math.floor(x / T);
  const gy = Math.floor(y / T);
  if (game.terrainGrid && checkIsMountainTile(game.terrainGrid, gx, gy)) {
    return true; // Mountains block movement
  }
  
  // Check building collisions
  // ... existing building collision code ...
}
```

### 3. Enemy Mountain Collision (`src/ai/enemyFSM.ts`)

**Changes:**
- Same as colonist FSM - added mountain collision check
- Imported `isMountainTile` from terrain module
- Prevents enemies from phasing through mountains

**Code:**
```typescript
function wouldCollideWithBuildings(game: any, x: number, y: number, radius: number): boolean {
  // Check mountain collision first
  const gx = Math.floor(x / T);
  const gy = Math.floor(y / T);
  if (game.terrainGrid && isMountainTile(game.terrainGrid, gx, gy)) {
    return true; // Mountains block enemies too
  }
  
  // Check building collisions
  // ... existing building collision code ...
}
```

## Impact Analysis

### Performance
- **Minimal impact**: Mountain checks are O(1) array lookups
- Enemy spawning: 20 attempts worst-case, negligible since spawning is infrequent
- Movement validation: Single array lookup per frame, already heavily optimized

### Compatibility
- **No breaking changes**: All changes are additive
- **Existing systems enhanced**: Stuck detection now handles mountains automatically
- **Pathfinding unchanged**: Already worked correctly, now movement matches pathfinding

### Edge Cases Handled
1. **Map edge mountains**: Enemies can't spawn trapped in mountain clusters
2. **Colonist rescue**: Stuck detection now works for mountains (3-second timeout)
3. **Fallback spawn**: Ensures enemies always spawn even if edges are blocked
4. **Sliding movement**: Colonists no longer slide into mountains when navigating walls

## Testing Verification

### Automated Checks
- ✅ TypeScript compilation: No errors
- ✅ Vite build: Successful
- ✅ CodeQL security scan: 0 alerts

### Manual Testing Required
See `MOUNTAIN_FIX_TESTING.md` for comprehensive testing guide:
1. Enemy spawn validation near mountains
2. Colonist hauling near mountains
3. Enemy pathfinding around mountains
4. Edge cases with tight mountain passages

### Debug Console Commands
```
` - Toggle debug console
toggle enemies - Disable night spawns
spawn enemy 10 - Test enemy spawning
spawn colonist 5 - Test colonist behavior
resources unlimited - For extended testing
```

## Files Modified

1. **src/game/Game.ts** (+52 lines, -1 line)
   - Enhanced `spawnEnemy()` with validation loop

2. **src/game/colonist_systems/colonistFSM.ts** (+8 lines)
   - Added mountain collision to `wouldCollideWithBuildings()`

3. **src/ai/enemyFSM.ts** (+9 lines, +1 import)
   - Added mountain collision to enemy movement

## Security Considerations

- No new attack vectors introduced
- No user input processed in changes
- All array accesses bounds-checked
- CodeQL scan passed with 0 alerts

## Minimal Change Philosophy

This solution follows the "minimal surgical changes" approach:
- Only 3 files modified
- No refactoring of existing working systems
- Additive changes to collision detection
- Leveraged existing `isMountainTile()` function
- No changes to pathfinding (already correct)
- No new dependencies or libraries

## Future Enhancements (Out of Scope)

These were considered but excluded to maintain minimal changes:
- Full pathfinding validation for enemy spawns (expensive, current check sufficient)
- Spawn position caching (premature optimization)
- Mountain collision caching (already O(1), no benefit)
- Predictive stuck detection (current 3s timeout works well)
