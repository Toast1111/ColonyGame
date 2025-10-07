# Floor Speed Fix - Movement Speed Now Matches Pathfinding Costs

## Problem Identified

The colonist movement speed system had a **critical disconnect** from the pathfinding system:

### Old (Broken) System
```typescript
// Pathfinding correctly uses costs
const stepCost = moveCost × grid.cost[idx];  // 0.5 for stone road

// But movement speed used flat bonus 😢
if (grid.cost[idx] <= 0.7) {
  speed += 25;  // Same +25 for any "path-like" tile!
}
```

**Problem**: 
- Stone road (cost 0.5) gave +25 speed
- Dirt path (cost 0.6) gave +25 speed  
- Wooden floor (cost 0.65) gave +25 speed
- **No difference between floor types!**

### Root Cause
The legacy path system only had ONE path type, so a flat `+25` bonus made sense. But with the new terrain system having multiple floor types with different costs (0.5, 0.6, 0.65), the flat bonus didn't scale properly.

## Solution Implemented

### New (Fixed) System
```typescript
// Movement speed is inversely proportional to cost
const tileCost = grid.cost[idx];

if (tileCost > 0 && tileCost < 1.0) {
  // On fast surface (floor) - speed boost!
  speed = baseSpeed / tileCost;
} else if (tileCost > 1.0) {
  // On slow terrain (mud) - speed penalty
  speed = baseSpeed / tileCost;
}
```

**Benefits**:
- Stone road (cost 0.5) → **2x speed** (100% faster!)
- Dirt path (cost 0.6) → **1.67x speed** (67% faster)
- Wooden floor (cost 0.65) → **1.54x speed** (54% faster)
- Mud (cost 2.5) → **0.4x speed** (60% slower!)

## Real-World Examples

### Colonist with base speed 50

| Surface | Cost | Old Speed | New Speed | Improvement |
|---------|------|-----------|-----------|-------------|
| **Grass** | 1.0 | 50 | 50 | Baseline |
| **Dirt Path** | 0.6 | 75 (+25) | 83.3 | **+11% faster** |
| **Stone Road** | 0.5 | 75 (+25) | 100 | **+33% faster!** |
| **Wooden Floor** | 0.65 | 75 (+25) | 76.9 | Slight improvement |
| **Mud** | 2.5 | 50 (no bonus) | 20 | **-60% slower** |

### Why This Matters

**Old System:**
```
Colonist choosing between:
  - Stone road through mud: +25 speed
  - Dirt path around mud: +25 speed
  
AI picks arbitrarily (same perceived speed!)
```

**New System:**
```
Colonist choosing between:
  - Stone road through mud: 100 speed (2x on road!)
  - Dirt path around mud: 83 speed (1.67x on path)
  
AI correctly picks stone road! ✅
```

## Code Changes

### File: `src/game/Game.ts`

#### 1. Movement Speed Calculation (Line ~1463)
```typescript
// OLD - Flat bonus
if (this.grid.cost[idx] <= 0.7) {
  speed += 25;
}

// NEW - Inverse cost scaling
const tileCost = this.grid.cost[idx];
if (tileCost > 0 && tileCost < 1.0) {
  speed = baseSpeed / tileCost;  // Fast surfaces
} else if (tileCost > 1.0) {
  speed = baseSpeed / tileCost;  // Slow surfaces
}
```

#### 2. Debug Speed Display (Line ~2040)
```typescript
// OLD - Flat bonus
if (this.grid.cost[idx] <= 0.7) speed += 25;

// NEW - Inverse cost scaling
const tileCost = this.grid.cost[idx];
if (tileCost > 0) {
  speed = baseSpeed / tileCost;
}
```

## Testing the Fix

### In-Game Test
1. Build a stone road (press `9`, paint path)
2. Build a dirt path nearby (press `0`, paint path)
3. Enable colonist debug: `game.debug.colonists = true`
4. Watch colonist speeds:
   - On stone road: ~100 speed (2x base)
   - On dirt path: ~83 speed (1.67x base)
   - On grass: ~50 speed (1x base)

### Console Test
```javascript
// Check grid costs
const idx = game.cellIndexAt(colonist.x, colonist.y);
console.log('Tile cost:', game.grid.cost[idx]);

// Expected costs:
// 0.5 = stone road
// 0.6 = dirt path
// 0.65 = wooden floor
// 1.0 = grass
// 2.5 = mud
```

## Performance Impact

**No performance change** - we're replacing one calculation with another of equal complexity:

```typescript
// Old: 1 comparison + 1 addition
if (cost <= 0.7) speed += 25;

// New: 1-2 comparisons + 1 division
if (tileCost > 0 && tileCost < 1.0) speed = baseSpeed / tileCost;
```

Division is slightly more expensive than addition, but we're talking nanoseconds and this happens once per colonist per frame.

## Why Movement Speed Matters

### Pathfinding vs Movement
- **Pathfinding** chooses the path (already worked correctly)
- **Movement speed** determines how fast colonists travel that path

Even if pathfinding chooses the optimal route, if movement speed doesn't respect floor types, colonists won't feel faster on roads!

### Player Experience
**Before Fix:**
```
Player: "I built expensive stone roads but colonists don't seem faster?"
Reality: They ARE taking the roads (pathfinding works), 
         but only get +25 speed (same as free dirt paths)
```

**After Fix:**
```
Player: "Wow, colonists zoom on stone roads!"
Reality: 2x speed on stone roads vs 1.67x on dirt paths - 
         premium roads actually feel premium!
```

## Future Enhancements

### Weather Effects (Ready!)
```typescript
// Rain makes terrain muddy
if (weather === 'rain') {
  terrainCost *= 1.5;  // 50% slower
}

// Speed automatically adjusts!
speed = baseSpeed / (terrainCost × floorCost);
```

### Skill-Based Speed (Ready!)
```typescript
// Pawns with high movement skill
const movementSkill = colonist.skills.movement || 1.0;
baseSpeed *= movementSkill;

// Still respects terrain!
speed = baseSpeed / tileCost;
```

## Verification Checklist

- [x] Stone roads faster than dirt paths
- [x] Dirt paths faster than grass
- [x] Mud slower than grass
- [x] Debug overlay shows correct speeds
- [x] Pathfinding still works correctly
- [x] No performance regression
- [x] Logs show correct speed calculations

## Related Systems

This fix integrates with:
- ✅ **Terrain System** (`src/game/terrain.ts`) - Provides floor costs
- ✅ **Pathfinding** (`src/core/pathfinding.ts`) - Uses same costs for A*
- ✅ **Movement** (`src/game/Game.ts`) - Now correctly applies speed
- ✅ **Debug** (`src/game/Game.ts`) - Shows accurate speeds

## Conclusion

**Movement speed now properly reflects terrain/floor costs!**

- Stone roads are **actually faster** than dirt paths
- Mud is **actually slower** than grass  
- Premium floors **feel premium**
- System is **future-proof** for biomes, weather, skills

The disconnect between pathfinding costs and movement speed has been **completely eliminated**! 🎉
