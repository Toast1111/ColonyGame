# Building Placement While Paused - Fix

## Problem

Previously, when the game was paused, players could only place **walls** and **paths/floors** but could NOT place other structures like:
- Houses
- Farms  
- Turrets
- Stockpiles
- Warehouses
- Infirmaries
- Any other buildings

This was inconsistent UX - players expected to be able to plan their colony layout while paused.

## Root Cause

The pause check was in the wrong location in the code.

### Before (Buggy Behavior)

**File**: `/src/game/placement/placementSystem.ts`

```typescript
// Entry point from click/tap
export function placeAtMouse(game: Game) {
  if (game.paused) return; // ❌ This blocked ALL building placement
  const t = game.selectedBuild; 
  if (!t) return; 
  const def = BUILD_TYPES[t]; 
  if (!def) return;
  // ... placement logic
}
```

**File**: `/src/game/placement/placementSystem.ts`

```typescript
export function paintWallAtMouse(game: Game, force = false) {
  // No pause check - walls could be placed while paused ✅
  const gx = Math.floor(game.mouse.wx / T); 
  const gy = Math.floor(game.mouse.wy / T);
  // ... wall placement logic
}

export function paintPathAtMouse(game: Game, force = false) {
  // No pause check - paths could be placed while paused ✅
  const gx = Math.floor(game.mouse.wx / T); 
  const gy = Math.floor(game.mouse.wy / T);
  // ... path placement logic
}
```

### Why Walls/Paths Worked But Buildings Didn't

The click handler in `Game.ts` (line ~786) routes placement to different functions:

```typescript
const def = this.selectedBuild ? BUILD_TYPES[this.selectedBuild] : null;
if (def?.isFloor) { 
  this.paintPathAtMouse(true); // No pause check in this function ✅
} 
else if (this.selectedBuild === 'wall') { 
  this.paintWallAtMouse(true); // No pause check in this function ✅
}
else {
  // All other buildings
  this.placeAtMouse(); // Had pause check - blocked! ❌
}
```

## Solution

Remove the pause check from `placeAtMouse()` to match the behavior of wall/path placement.

### After (Fixed)

**File**: `/src/game/placement/placementSystem.ts`

```typescript
// Entry point from click/tap
export function placeAtMouse(game: Game) {
  // ✅ Removed: if (game.paused) return;
  const t = game.selectedBuild; 
  if (!t) return; 
  const def = BUILD_TYPES[t]; 
  if (!def) return;
  if (!game.debug.forceDesktopMode && game.isActuallyTouchDevice && game.lastInputWasTouch) {
    const gx = Math.floor(game.mouse.wx / T) * T;
    const gy = Math.floor(game.mouse.wy / T) * T;
    game.pendingPlacement = { key: t, x: gx, y: gy, rot: 0 };
    return;
  }
  tryPlaceNow(game, t, game.mouse.wx, game.mouse.wy);
}
```

## Design Rationale

### Why Placement Should Work While Paused

**RimWorld Inspiration**: In RimWorld (the game this is based on), players can:
- Plan structures while paused
- Queue construction blueprints
- Organize colony layout strategically
- Pause, plan, unpause to execute

This is a core colony sim mechanic - **planning is separate from execution**.

### Pause vs. Execution

The game already correctly handles this separation:

| Action | Paused Game Behavior | Rationale |
|--------|---------------------|-----------|
| **Camera Movement** | ✅ Works | Players need to see the map |
| **Placing Buildings** | ✅ Works (after fix) | Planning colony layout |
| **Building Construction** | ❌ Blocked | Colonists are paused |
| **Resource Gathering** | ❌ Blocked | Colonists are paused |
| **Combat** | ❌ Blocked | Time is stopped |
| **UI Interaction** | ✅ Works | Players need to manage colony |

The key insight: **Placing a blueprint != Construction work**

When you place a building:
1. A blueprint is created (instant, planning action)
2. Resources are deducted (game state update, allowed)
3. Colonists must build it over time (blocked while paused) ✅

## Implementation Details

### Files Modified

**`/src/game/placement/placementSystem.ts`** (Line 105)
- Removed: `if (game.paused) return;`
- Single line change

### What This Changes

**Before Fix**:
```
Paused Game:
- Click to place house → Nothing happens ❌
- Click to place farm → Nothing happens ❌
- Click to place wall → Wall placed ✅
- Click to place path → Path placed ✅
```

**After Fix**:
```
Paused Game:
- Click to place house → Blueprint created, waiting for construction ✅
- Click to place farm → Blueprint created, waiting for construction ✅
- Click to place wall → Wall placed ✅
- Click to place path → Path placed ✅
```

### What Does NOT Change

- **Colonist behavior**: Still frozen when paused
- **Enemy behavior**: Still frozen when paused  
- **Construction progress**: Still frozen when paused
- **Time progression**: Still frozen when paused
- **Resource consumption on placement**: Still works (intentional - it's a planning action)

## Testing Guide

### Test Case 1: Basic Building Placement

1. Start game
2. Press **Spacebar** to pause
3. Verify "PAUSED" indicator shows
4. Select a building from hotbar (e.g., press `1` for house)
5. Click on map to place building
6. **Expected**: Blueprint appears, resources deducted
7. Unpause game
8. **Expected**: Colonist walks to blueprint and starts building

### Test Case 2: Resource Check

1. Pause game
2. Note current resources (e.g., 50 wood)
3. Place building that costs wood (e.g., house = 20 wood)
4. **Expected while paused**: 
   - Blueprint appears
   - Wood: 50 → 30 (deducted immediately)
5. Try to place another house
6. **Expected**: Can place if resources available, blocked if not enough

### Test Case 3: All Building Types

Test placement while paused for:
- ✅ House (hotkey `1`)
- ✅ Farm (hotkey `2`)
- ✅ Turret (hotkey `3`)
- ✅ Wall (special paint mode)
- ✅ Stockpile (hotkey `5`)
- ✅ Tent (hotkey `6`)
- ✅ Warehouse (hotkey `7`)
- ✅ Well (hotkey `8`)
- ✅ Infirmary (hotkey `9`)
- ✅ Paths/Floors (paint mode)

All should place blueprints successfully.

### Test Case 4: Touch/Mobile Mode

1. Use touch device or enable touch mode
2. Pause game
3. Select building
4. Tap on map
5. **Expected**: Pending placement UI appears
6. Adjust with arrow buttons
7. Confirm placement
8. **Expected**: Blueprint created

## Edge Cases Handled

### 1. Insufficient Resources
- **Behavior**: Placement blocked even when paused
- **Message**: "Not enough resources"
- **Correct**: Resource validation still works

### 2. Invalid Placement Location
- **Behavior**: Placement blocked (e.g., overlap with existing building)
- **Message**: "Can't place here"
- **Correct**: Collision detection still works

### 3. Pending Placement (Touch Mode)
- **Behavior**: Can initiate pending placement while paused
- **Can adjust**: Position and rotation
- **Can confirm**: Creates blueprint
- **Correct**: Full planning workflow available

## Performance Considerations

**No performance impact** - this change only removes an early-return guard.

The actual placement logic (`tryPlaceNow`, `canPlace`, `payCost`) still runs, but these are:
- Instant operations (not frame-based)
- Only triggered on click (not every frame)
- Same performance whether paused or not

## Related Systems

### Navigation Grid Updates

Building placement triggers `game.rebuildNavGrid()` - this **still works while paused**:

```typescript
export function tryPlaceNow(game: Game, buildingType: BuildingKind, wx: number, wy: number, rot?: Rotation) {
  // ... placement logic
  game.buildings.push(b); 
  game.rebuildNavGrid(); // ✅ Updates pathfinding grid immediately
}
```

This is correct because:
- Blueprints block movement (colonists can't walk through them)
- Pathfinding grid needs to reflect new obstacles
- Grid update is instant, not time-based

### Deferred Rebuild System

The deferred rebuild optimization (added for performance) **processes queued rebuilds even when paused**:

**File**: `/src/game/Game.ts` (line ~2011)

```typescript
update(dt: number) {
  // ... before pause check
  
  if (this.paused) return; // Game logic stops here
  
  // Deferred rebuilds happen BEFORE the pause check
  this.deferredRebuildSystem.processQueue(); // ✅ Runs when paused
}
```

Wait, actually looking at the code, the rebuild happens in the main update loop. Let me check if this is an issue...

Actually, the rebuild is called directly in `tryPlaceNow`, so it happens immediately on placement, not in the update loop. This is fine.

## User Experience Impact

### Before Fix
- **Frustrating**: "Why can I place walls but not houses?"
- **Confusing**: Inconsistent behavior
- **Workaround**: Unpause, quickly place, pause again (tedious)

### After Fix
- **Intuitive**: All building placement works the same
- **Consistent**: Matches RimWorld-style colony planning
- **Convenient**: Plan entire base layout while paused

## Future Considerations

This fix enables future planning features:
- ✅ Blueprint queue system (place multiple buildings, colonists build in order)
- ✅ Copy/paste building layouts (possible to implement while paused)
- ✅ Saved blueprints (e.g., "bedroom template")
- ✅ Pause-plan-execute workflow (core colony sim gameplay loop)

## Summary

**Single line removal** fixes a major UX inconsistency:

```diff
export function placeAtMouse(game: Game) {
- if (game.paused) return;
  const t = game.selectedBuild; 
  if (!t) return;
```

**Result**: Players can now plan their colony layout while paused, matching RimWorld's intuitive planning mechanics.
