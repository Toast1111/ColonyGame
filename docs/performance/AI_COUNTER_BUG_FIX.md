# AI Counter Bug Fix

## Issue

Performance HUD was showing **"AI: 0.0% updated (0/25479)"** where 25,479 was growing infinitely over time.

## Root Cause

In `src/core/AdaptiveTickRate.ts`, the `totalEntities` counter was being incremented every time `shouldUpdate()` was called, but was **never reset** between frames.

```typescript
// BEFORE (buggy)
public beginFrame(currentTime: number): void {
  this.frameTime = currentTime;
  this.updatedThisFrame = 0;      // Reset ✓
  this.skippedThisFrame = 0;      // Reset ✓
  // totalEntities NOT reset! ✗   // BUG: Accumulated forever
}
```

This caused `totalEntities` to accumulate across frames:
- Frame 1: 3 colonists checked → totalEntities = 3
- Frame 2: 3 colonists checked → totalEntities = 6  
- Frame 3: 3 colonists checked → totalEntities = 9
- ...after 8,493 frames → totalEntities = 25,479

## Fix

Added reset for `totalEntities` in `beginFrame()`:

```typescript
// AFTER (fixed)
public beginFrame(currentTime: number): void {
  this.frameTime = currentTime;
  this.totalEntities = 0;         // Reset each frame ✓
  this.updatedThisFrame = 0;
  this.skippedThisFrame = 0;
}
```

## Expected Behavior After Fix

Performance HUD should now show realistic numbers:
```
AI: 33.3% updated (1/3)    // 1 out of 3 colonists updated
AI: 66.7% updated (2/3)    // 2 out of 3 colonists updated
AI: 0.0% updated (0/5)     // 0 out of 5 total entities updated
```

The denominator (total entities) should match the actual number of colonists + enemies in the game, typically 3-20.

## Why This Wasn't Harmful

Despite the display bug, the adaptive tick rate system was **working correctly**:
- Entities were still being updated at proper intervals
- Performance was not affected
- Only the counter display was wrong

The bug was purely cosmetic in the performance HUD.

## Testing

After this fix, refresh the game and check the performance HUD:
- Total entities should be 3-20 (actual count)
- Number should stay stable, not grow over time
- Percentage calculations should be meaningful

---

**Fixed in commit:** [current]
**File modified:** `src/core/AdaptiveTickRate.ts` (line 82)
