# Mobile Placement Cancel Bug Fix

## Issue
When using the mobile nudge placement system, clicking the X (cancel) icon would return to the ghost placement state instead of canceling the building action entirely.

## Root Cause
The `cancelPending()` function in `src/game/placement/placementSystem.ts` was only clearing:
- `game.pendingPlacement` (the nudge UI state)
- `game.placeUIRects` (the button rectangles)

But it was **NOT** clearing `game.selectedBuild`, which meant:
1. User selects a building from the hotbar → `selectedBuild` is set
2. User taps the map → `pendingPlacement` is created (nudge UI appears)
3. User clicks X (cancel) → `pendingPlacement` is cleared but `selectedBuild` remains
4. User taps the map again → New `pendingPlacement` is created because `selectedBuild` is still set

## Solution
Updated the `cancelPending()` function to also clear `selectedBuild`:

```typescript
export function cancelPending(game: Game) { 
  game.pendingPlacement = null; 
  game.placeUIRects = []; // Clean up placement UI
  game.selectedBuild = null; // Clear selected build to fully cancel
}
```

## Expected Behavior

### Before Fix
1. Select building from hotbar
2. Tap map to enter nudge mode
3. Click X (cancel) button
4. **BUG**: Ghost placement still active, can create new nudge UI by tapping
5. Must press Escape or click another UI element to fully cancel

### After Fix
1. Select building from hotbar
2. Tap map to enter nudge mode
3. Click X (cancel) button
4. **FIXED**: Building selection is completely cleared
5. Next tap will select colonist or show context menu (normal behavior)

## Testing Steps

1. **Test Cancel Flow**
   - Open hotbar and select any building
   - Tap on the map to enter nudge mode
   - Observe the placement UI with nudge arrows
   - Tap the X (cancel) button
   - **Expected**: No ghost building visible
   - Tap on the map again
   - **Expected**: Select colonist or empty area (no placement UI)

2. **Test Confirm Flow (Should Still Work)**
   - Select a building
   - Tap on the map to enter nudge mode
   - Use nudge arrows to position
   - Tap the ✓ (confirm) button
   - **Expected**: Building is placed and selection is cleared

3. **Test Escape Key (Desktop)**
   - Select a building
   - Click to enter nudge mode
   - Press Escape key
   - **Expected**: All placement state cleared

## Files Modified
- `src/game/placement/placementSystem.ts` - Updated `cancelPending()` function

## Related Systems
- Mobile placement UI (`src/game/ui/mobilePlacement.ts`)
- Hotbar selection (`src/game/ui/hud/modernHotbar.ts`)
- Placement system (`src/game/placement/placementSystem.ts`)

## Impact
- **User Experience**: ✅ Much better - cancel now works as expected
- **Desktop Mode**: ✅ No impact - desktop uses direct placement
- **Mobile Mode**: ✅ Fixed - cancel properly exits building mode
- **Code Complexity**: ✅ Minimal change, single line addition
- **Breaking Changes**: ❌ None

## Notes
The fix ensures that canceling the placement UI fully resets the building selection state, preventing the confusing behavior where ghost placement would persist after canceling.
