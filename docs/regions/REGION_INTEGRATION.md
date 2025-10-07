# Region System Integration Guide

## Quick Start

The region system is now integrated into the game and provides better performance for finding objects and checking reachability.

## Using Region-Based Finding

### Old Way (Linear Search)
```typescript
// DON'T do this anymore - slow O(N) search
let closestTree = null;
let closestDist = Infinity;
for (const tree of game.trees) {
  if (tree.hp <= 0) continue;
  const dist = Math.hypot(colonist.x - tree.x, colonist.y - tree.y);
  if (dist < closestDist) {
    closestDist = dist;
    closestTree = tree;
  }
}
```

### New Way (Region-Based Search)
```typescript
// DO this - fast region-based search
const tree = game.findNearestTreeByRegion(colonist.x, colonist.y);
const rock = game.findNearestRockByRegion(colonist.x, colonist.y);
const building = game.findNearestBuildingByRegion(
  colonist.x,
  colonist.y,
  b => b.kind === 'house' && b.done
);
```

## Checking Reachability

### Before Pathfinding
```typescript
// Check if destination is reachable BEFORE calling expensive A*
if (!game.isReachable(colonist.x, colonist.y, target.x, target.y)) {
  // Target is unreachable (behind walls, different area, etc.)
  console.log('Target unreachable - skipping pathfinding');
  return;
}

// Now safe to pathfind - we know a path exists
const path = game.computePath(colonist.x, colonist.y, target.x, target.y);
```

## Debug Controls

- Press **R** to toggle region visualization
- Press **G** to toggle navigation grid
- Press **J** to toggle colonist info

## Performance Notes

The region system automatically:
- Updates when buildings are placed/destroyed
- Rebuilds affected regions incrementally
- Caches object locations for fast lookup
- Falls back to global search if disabled

## Migration Checklist

If you're updating existing colonist AI code:

1. **Replace global searches** with region-based methods:
   - `game.findNearestTreeByRegion(x, y)`
   - `game.findNearestRockByRegion(x, y)`
   - `game.findNearestBuildingByRegion(x, y, filter)`

2. **Add reachability checks** before pathfinding:
   - `game.isReachable(startX, startY, endX, endY)`

3. **Remove manual spiral/distance checks** - regions handle this better

## Example: Updated Colonist FSM

```typescript
// BEFORE - manual search
case 'chop':
  if (!c.target) {
    let best = null;
    let bestDist = Infinity;
    for (const tree of game.trees) {
      if (tree.hp <= 0) continue;
      const dist = Math.hypot(c.x - tree.x, c.y - tree.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = tree;
      }
    }
    c.target = best;
  }
  break;

// AFTER - region-based
case 'chop':
  if (!c.target) {
    c.target = game.findNearestTreeByRegion(c.x, c.y);
  }
  // Optional: check reachability
  if (c.target && !game.isReachable(c.x, c.y, c.target.x, c.target.y)) {
    console.log('Tree unreachable - finding another');
    c.target = null;
  }
  break;
```

## Future Enhancements

The region system is designed to support:
- **Room temperature** - track temp per room
- **Access control** - prisoners can't leave prison regions
- **Animal pathfinding** - animals use different traversal rules
- **Smell/smoke propagation** - spread effects through connected regions

See `REGION_SYSTEM.md` for full documentation.
