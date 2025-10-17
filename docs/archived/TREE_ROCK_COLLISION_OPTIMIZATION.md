# Tree & Rock Collision Optimization

## Overview

This optimization removes trees and rocks from the collision/pathfinding system to eliminate game stuttering caused by frequent region rebuilds. Colonists can now walk through trees and rocks, significantly improving performance.

## Problem

Previously, trees and rocks were treated as solid obstacles in the pathfinding grid:
- Every time a tree/rock was harvested, the region system needed to be rebuilt
- This caused noticeable stuttering during gameplay
- Colonists would pathfind around trees/rocks, creating complex paths
- Region manager needed constant updates for tree/rock positions

## Solution

**Colonists can now walk through trees and rocks!**

This is realistic from a gameplay perspective:
- Trees and rocks are resources, not solid walls
- Colonists should be able to walk between trees in a forest
- Only buildings and walls should block movement

## Changes Made

### 1. Pathfinding System (`src/core/pathfinding.ts`)

**Removed tree/rock collision from `rebuildSection()` function:**

```typescript
// BEFORE: Trees and rocks were marked as solid
for (const tree of trees) {
  if (intersectsCircle(...)) {
    markCircleSolidNoUpdate(grid, tree.x, tree.y, tree.r);
  }
}
for (const rock of rocks) {
  if (intersectsCircle(...)) {
    markCircleSolidNoUpdate(grid, rock.x, rock.y, rock.r);
  }
}

// AFTER: Removed completely, added comment
// OPTIMIZATION: Trees and rocks no longer block pathfinding
// Colonists can walk through them to eliminate stuttering from constant region rebuilds
// They still prevent building placement (checked in placementSystem.ts)
```

**Benefits:**
- No need to rebuild pathfinding grid when trees/rocks are harvested
- No need to rebuild regions when trees/rocks spawn or despawn
- Simplified pathfinding calculations
- Reduced memory usage in region manager

### 2. Colonist FSM (`src/game/colonist_systems/colonistFSM.ts`)

**No changes needed!**

The colonist FSM already relied on the pathfinding grid for collision detection. Since trees/rocks were removed from the pathfinding grid, colonists automatically can walk through them without any additional code changes.

The `wouldCollideWithBuildings()` function only checks buildings, not trees/rocks.

### 3. Placement Validation (`src/game/placement/placementSystem.ts`)

**Kept tree/rock collision checks in `canPlace()` function:**

```typescript
// Trees and rocks still prevent building placement (UNCHANGED)
for (const t of game.trees) { 
  if (circleRectOverlap(t, rect)) return false; 
}
for (const r of game.rocks) { 
  if (circleRectOverlap(r, rect)) return false; 
}
```

**This is critical:** Buildings should NOT be allowed to spawn on top of trees/rocks. The placement validation ensures:
- Players can't build through trees/rocks
- Trees/rocks must be harvested before building in that location
- Maintains logical game rules

### 4. Debug Rendering (`src/game/managers/RenderManager.ts`)

**No changes needed!**

The debug nav grid visualization shows solid tiles from the pathfinding grid. Since trees/rocks are no longer marked as solid, they won't appear in the nav debug overlay anymore (which is correct behavior).

## Performance Impact

### Before Optimization
- **Frequent stuttering** when colonists chop trees or mine rocks
- Region rebuilds triggered on every resource removal
- Complex pathfinding calculations avoiding each tree/rock
- Higher CPU usage during pathfinding

### After Optimization
- **No stuttering** from resource harvesting
- No region rebuilds needed for trees/rocks
- Simpler, more direct colonist paths
- Significantly reduced CPU usage
- Smoother gameplay overall

## Gameplay Impact

### Visual Changes
- Colonists will walk **through** trees and rocks on their way to destinations
- Colonists will still stop at trees/rocks to chop/mine them (task behavior unchanged)
- Paths appear more direct and natural

### Game Logic Changes
- Trees and rocks are now **purely visual obstacles** with collision only for building placement
- Harvesting behavior unchanged
- Building placement rules unchanged (can't build on trees/rocks)
- Enemy pathfinding also benefits from the optimization

## Testing Checklist

✅ Colonists can walk through trees  
✅ Colonists can walk through rocks  
✅ Colonists still stop at trees to chop them  
✅ Colonists still stop at rocks to mine them  
✅ Buildings cannot be placed on trees  
✅ Buildings cannot be placed on rocks  
✅ No stuttering when chopping trees  
✅ No stuttering when mining rocks  
✅ Game builds successfully  
✅ Dev server runs without errors  

## Future Considerations

This optimization could be extended to other decorative/resource objects in the future:
- Bushes, flowers, or other vegetation
- Small debris or decorations
- Any object that should be "walkable" but not "buildable"

## Related Files

- `src/core/pathfinding.ts` - Pathfinding grid management
- `src/game/colonist_systems/colonistFSM.ts` - Colonist AI movement
- `src/game/placement/placementSystem.ts` - Building placement validation
- `src/game/navigation/regionManager.ts` - Region-based pathfinding (benefits from fewer rebuilds)

## Conclusion

This optimization dramatically improves game performance by removing unnecessary collision calculations for decorative/resource objects. The game now runs smoothly even during heavy resource harvesting, and colonists take more direct paths to their destinations.

**Result:** Eliminated game stuttering! ✨
