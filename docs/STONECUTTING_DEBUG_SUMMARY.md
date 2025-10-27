# Stonecutting & Research Bug Fixes

## Issues Reported
1. **Research crash**: `game.reservationManager.reserveInside is not a function` when colonist interacts with research bench
2. **Stonecutting idle**: Colonists stuck in idle when rubble and stonecutting table present

## Fixes Applied

### 1. Research Crash (FIXED)
**Problem**: Research state called `game.reservationManager.reserveInside(bench)` which doesn't exist in ReservationManager

**Location**: `colonistFSM.ts` line 2193

**Root Cause**: ReservationManager doesn't have a `reserveInside()` method. The ResearchWorkGiver already ensures benches are free by checking `!game.reservationManager.getInsideCount(b)`, so no reservation call is needed in the FSM state.

**Fix**: Removed the incorrect `reserveInside()` call from research state:
```typescript
// BEFORE (line 2193):
if (game.pointInRect(c, bench)) {
  // Reserve spot
  game.reservationManager.reserveInside(bench);  // ❌ This method doesn't exist
  
  // Generate research points...
}

// AFTER:
if (game.pointInRect(c, bench)) {
  // Generate research points based on colonist's research skill (or use base rate)
  const researchSpeed = 5; // Base research points per second
  const points = researchSpeed * dt;
}
```

### 2. Stonecutting Idle Issue (DEBUG ADDED)
**Status**: Diagnostic logging added to identify root cause

**Debug Logging Added** (in `stonecutting.ts`):
- Check if colonist can do Crafting work
- Verify itemManager exists
- Count total rubble available on floor
- Count available stonecutting tables
- Log when candidate is created with priority and distance

**Console Output to Check**:
```
[StonecuttingWG] Colonist cannot do Crafting work  // Work disabled for colonist
[StonecuttingWG] No itemManager found              // System not initialized
[StonecuttingWG] Total rubble available: X         // Should be ≥2 to proceed
[StonecuttingWG] Found X available stonecutting tables  // Should be >0
[StonecuttingWG] Added stonecutting candidate...   // Task successfully added
```

**Potential Causes to Investigate**:
1. **Crafting work disabled**: Default priority is 3, but may be disabled (0) for specific colonists
2. **Research not unlocked**: Stonecutting requires `stonecutting` research to be completed
3. **Building not complete**: Table's `done` property might still be false
4. **Table occupied**: Another colonist might have claimed it (`cuttingColonist` property)
5. **Item system issue**: RubbleitemManager might not be tracking rubble items correctly

## Testing Steps

### Test Research Fix
1. Start game, build research bench
2. Research stonecutting
3. Assign colonist to research
4. **Expected**: No crash when colonist reaches bench
5. **Expected**: Research progress increases

### Test Stonecutting Workflow
1. Unlock stonecutting research
2. Mine mountain tiles → should drop **rubble** (darker gray, #5a6268)
3. Mine surface rocks → should drop **stone** (lighter gray, #708090)
4. Build stonecutting table (requires: 30 wood, 5 stone)
5. Check browser console for `[StonecuttingWG]` debug output
6. Watch colonist behavior:
   - Should pick up 2 rubble from floor
   - Walk to stonecutting table
   - Cut rubble (with animation/progress)
   - Drop 1 stone block on floor

### Debug Commands (press ` to open console)
```bash
toggle enemies          # Disable night spawns
resources unlimited     # Infinite resources for testing
spawn colonist 3        # Add more test subjects
research unlock stonecutting  # Force unlock research
give stone 100          # Get stone for building table
give wood 100           # Get wood for building table
```

## File Changes
- `src/game/colonist_systems/colonistFSM.ts` - Removed invalid `reserveInside()` call (line 2193)
- `src/game/workGivers/stonecutting.ts` - Added comprehensive debug logging

## Next Steps
1. **Test in browser** with debug console open
2. **Check console output** for stonecutting work giver diagnostics
3. **Report findings** from console logs to identify exact blocker
4. **Remove debug logging** once issue is resolved
