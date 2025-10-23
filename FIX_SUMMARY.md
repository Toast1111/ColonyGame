# Game Issues Fix Summary

This document details the fixes applied to resolve 6 reported game issues.

## Issue 1: Colonists Drafted While at Door Refuse to Move

**Problem**: When a colonist is waiting at a door (`waitingAtDoor` state) and gets drafted, they remain stuck because the door queue keeps them locked in place.

**Solution**: Added door queue cleanup when colonist enters drafted state.

**File**: `src/game/colonist_systems/colonistFSM.ts` (lines 2307-2326)

**Changes**:
```typescript
case 'drafted': {
  // Release door queue if colonist was waiting at a door when drafted
  if (c.waitingForDoor) {
    if (c.id) {
      releaseDoorQueue(c.waitingForDoor, c.id);
    }
    c.waitingForDoor = null;
    c.doorWaitStart = undefined;
    c.doorPassingThrough = null;
    c.doorApproachVector = null;
  }
  // ... rest of drafted logic
}
```

**Impact**: Colonists can now be drafted immediately even when waiting at doors, allowing for emergency combat response.

---

## Issue 2: Stockpile Zones and Zone Overlays Cannot Be Deleted

**Problem**: No UI mechanism existed to delete stockpile zones or mining zones after creation.

**Solution**: Extended the existing building deletion system (`eraseInRect` and `cancelOrErase`) to also handle zones.

**File**: `src/game/placement/placementSystem.ts` (lines 292-368)

**Changes**:
1. **eraseInRect**: Added zone removal for drag-select deletion
2. **cancelOrErase**: Added zone detection and removal for single-click deletion

**Usage**:
- Right-click drag over zones to delete multiple zones and buildings
- Right-click single zones to delete individual zones

**Impact**: Players can now remove unwanted stockpile and mining zones, improving base planning flexibility.

---

## Issue 3: Colonists Can Get Stuck When Mining Mountain Tiles

**Problem**: Colonists attempting to mine mountain tiles could get stuck if the tile was unreachable or pathfinding failed.

**Solution**: Added stuck detection that monitors colonist position every 3 seconds and abandons the task if minimal movement is detected.

**File**: `src/game/colonist_systems/colonistFSM.ts` (lines 1833-1853)

**Changes**:
```typescript
// If colonist hasn't moved much in a while, they might be stuck
// Store last position check in the target object itself
if (!(r as any).lastCheckTime || c.t - (r as any).lastCheckTime > 3) {
  const lastX = (r as any).lastCheckX ?? c.x;
  const lastY = (r as any).lastCheckY ?? c.y;
  const movedDist = Math.hypot(c.x - lastX, c.y - lastY);
  
  if ((r as any).lastCheckTime && movedDist < 10) {
    // Stuck - clear path and abandon
    console.log(`Colonist stuck mining mountain at (${gx},${gy}), abandoning`);
    // ... cleanup and state change
  }
  // Update check position
  (r as any).lastCheckTime = c.t;
  (r as any).lastCheckX = c.x;
  (r as any).lastCheckY = c.y;
}
```

**Impact**: Colonists no longer get permanently stuck on unreachable mountain tiles, improving mining efficiency.

---

## Issue 4: Enemies Spawn Right at HQ Instead of Map Outskirts

**Problem**: Enemy spawn positions were set outside world bounds (negative coordinates or > world size), which then got clamped to edge positions that could be very close to HQ.

**Solution**: Complete rewrite of spawn logic to:
1. Spawn inside world bounds with edge margins (100px from edge)
2. Enforce minimum 400px distance from HQ
3. Avoid mountain tiles
4. Only fallback to HQ perimeter if 30 edge attempts fail

**File**: `src/game/Game.ts` (lines 1894-1980)

**Key Changes**:
```typescript
const EDGE_MARGIN = 100; // Distance from world edge (pixels)
const MIN_DISTANCE_FROM_HQ = 400; // Minimum distance from HQ (pixels)

// Spawn on edges INSIDE world bounds
if (edge === 0) { 
  x = rand(EDGE_MARGIN, WORLD.w - EDGE_MARGIN); 
  y = EDGE_MARGIN; 
}
// ... similar for other edges

// Check if far enough from HQ
const distFromHQ = Math.hypot(x - HQ_X, y - HQ_Y);
if (distFromHQ < MIN_DISTANCE_FROM_HQ) {
  continue; // Too close to HQ
}
```

**Impact**: Enemies now spawn at map edges, giving players time to prepare defenses and creating proper wave mechanics.

---

## Issue 5: Revolver, Shotgun, Sniper Weapons Not Fully Implemented

**Problem**: Enemy generator referenced `Revolver` and `Shotgun` weapons that didn't exist in the item database, causing errors.

**Solution**: Added complete weapon definitions for Revolver and Shotgun to the item database.

**File**: `src/data/itemDatabase.ts` (lines 169-216)

**New Weapons**:

### Revolver
- **Damage**: 18 (high)
- **Range**: 28 tiles
- **Armor Penetration**: 25%
- **Stopping Power**: 1.2
- **Accuracy**: 92% touch, 85% short, 65% medium, 45% long
- **Stats**: Powerful six-shooter with high damage but slow fire rate

### Shotgun
- **Damage**: 25 (very high)
- **Range**: 15 tiles (short)
- **Armor Penetration**: 10%
- **Stopping Power**: 1.8
- **Accuracy**: 98% touch, 85% short, 45% medium, 20% long
- **Stats**: Devastating at close range with spread shot pattern

**Impact**: Enemy loadouts now work correctly with full weapon variety, and these weapons are available for colonists to find/use.

---

## Issue 6: Mobile Building Placement UI Misfires When Dragging

**Problem**: When a player drags the ghost building to reposition it on mobile, releasing the touch would auto-confirm placement because it detected as a "tap on ghost."

**Solution**: Added drag state check to prevent auto-confirm after dragging.

**File**: `src/game/Game.ts` (lines 1448-1473)

**Changes**:
```typescript
// 2) Tap on ghost = confirm, UNLESS we just finished dragging
// If we were dragging, don't auto-confirm on release
if (isClickOnGhost(this, mx, my)) {
  // Only confirm if this wasn't a drag operation
  if (!this.pendingDragging) {
    this.confirmPending();
  }
  // Clear drag state regardless
  this.pendingDragging = false;
  return;
}
```

**Impact**: Mobile users can now drag buildings to reposition without accidental placement, improving touch UX.

---

## Testing Recommendations

1. **Drafted Colonists**: Draft colonists while they're waiting at doors and verify they move immediately
2. **Zone Deletion**: Create stockpile/mining zones and delete them with right-click
3. **Mining**: Create mining zones with unreachable mountain tiles and verify colonists don't get stuck
4. **Enemy Spawn**: Start a new night and verify enemies spawn at map edges, not near HQ
5. **Weapons**: Check enemy equipment in combat to see Revolvers and Shotguns
6. **Mobile Placement**: On mobile/touch device, drag building placement and verify it doesn't auto-place

## Build Status

✅ **Build successful** - All TypeScript compilation passes with no errors
✅ **No breaking changes** - All fixes are backwards compatible
✅ **No new dependencies** - Only existing code modified
