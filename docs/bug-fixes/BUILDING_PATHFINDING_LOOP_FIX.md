# Building Pathfinding Loop Fix

**Date**: October 19, 2025  
**Issue**: Colonists building structures rapidly repath in infinite loop, causing audio spam  
**Status**: ✅ Fixed

## Problem

When colonists were building structures, they would:
1. Walk to the building site
2. Arrive and start building (audio plays)
3. Finish their path → path gets cleared
4. Next frame: no path exists, so `moveAlongPath` creates a new path
5. Path immediately completes → path gets cleared
6. Repeat steps 4-5 infinitely

This caused:
- **Rapid repathing** every frame while building
- **Audio spam** - construction sounds playing constantly
- **Performance hit** - unnecessary pathfinding calculations

## Root Cause Analysis

In `colonistFSM.ts`, the build case was calling `moveAlongPath` unconditionally:

```typescript
// BEFORE (buggy):
game.moveAlongPath(c, dt, pt, interactRadius);  // Always called

const currentDist = Math.hypot(c.x - pt.x, c.y - pt.y);
if (currentDist <= interactRadius) {
  // Build logic
}
```

**The problem**: When a colonist arrives at the building site:
1. `moveAlongPath` finishes the path (colonist reached destination)
2. Path gets cleared: `c.path = undefined` (see `Game.ts` line 2431)
3. Next frame, `moveAlongPath` sees no path and target exists
4. Creates new path even though colonist is already in range
5. Path finishes immediately → cleared → repeat

This is the **same fundamental issue** as the original wall building bug, but manifesting as infinite repathing instead of stopping work.

## Solution

Only call `moveAlongPath` when the colonist is **NOT** already within interaction range:

```typescript
// AFTER (fixed):
const currentDist = Math.hypot(c.x - pt.x, c.y - pt.y);

// Only move if not in range - prevents infinite repathing
if (currentDist > interactRadius) {
  game.moveAlongPath(c, dt, pt, interactRadius);
}

// Build if within interaction range
if (currentDist <= interactRadius) {
  // Build logic + audio
}
```

**Key insight**: Separate movement from work action. Once in range, stop pathfinding entirely.

## Changes Made

**File**: `src/game/colonist_systems/colonistFSM.ts`  
**Lines**: ~1420-1430 (build case)

```diff
- // Move toward the building - moveAlongPath returns true when path is complete
- game.moveAlongPath(c, dt, pt, interactRadius);
- 
- // Check if colonist is within interaction range to build (regardless of pathfinding state)
+ // Check if colonist is within interaction range first
  const currentDist = Math.hypot(c.x - pt.x, c.y - pt.y);
+ 
+ // Only move if not in range - prevents infinite repathing when already at destination
+ if (currentDist > interactRadius) {
+   game.moveAlongPath(c, dt, pt, interactRadius);
+ }
+ 
+ // Build if within interaction range
  if (currentDist <= interactRadius) {
```

## Why This Works

1. **Before arriving**: `currentDist > interactRadius` → `moveAlongPath` is called → colonist moves
2. **Upon arrival**: `currentDist <= interactRadius` → `moveAlongPath` is NOT called → no repathing
3. **While building**: Colonist stays in range, builds continuously, audio plays at proper intervals

The colonist's path naturally clears when finished, but since `moveAlongPath` is no longer called when in range, no new path is created.

## Benefits

✅ **No more infinite repathing** - Colonists stay put when building  
✅ **Audio plays correctly** - Construction sounds at 1.5-2 second intervals as designed  
✅ **Performance improvement** - No wasted pathfinding calculations  
✅ **Natural behavior** - Colonists walk to site once, then build without moving  

## Testing

```bash
npm run build  # ✅ Success
```

**In-game testing**:
1. Place a building (wall, house, etc.)
2. Colonist should walk to the site
3. Upon arrival, should **stay in place** while building
4. Construction audio should play every 1.5-2 seconds (not rapidly)
5. Building should complete normally

## Related Issues

This fix uses the same principle as the original wall building fix:
- **Original bug**: Colonists stopped building after 0.2s (path cleared, movement stopped)
- **This bug**: Colonists continuously repath while building (path cleared, new path created)
- **Solution**: Don't tie pathfinding to work actions - check distance instead

Both bugs stem from the fact that `moveAlongPath` clears the path when complete, which interacts poorly with work that requires being near a target.

## Technical Notes

**Why does the path get cleared?**  
In `Game.ts` line 2431, when `pathIndex >= path.length`:
```typescript
c.path = undefined; 
c.pathIndex = undefined;
```

This is correct behavior - when you reach your destination, you don't need a path anymore. The bug was calling `moveAlongPath` when you're already at the destination, causing it to rebuild the path unnecessarily.

**Interaction radius**: Currently set to `T * 1.5` (48 pixels) for building work. This gives colonists a comfortable working distance without being too close to the structure.
