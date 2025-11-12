# Verification Steps for Colonist Eating and Sleeping Fix

## Issue Description
Colonists were not eating or sleeping because the `fatigue` property was not initialized when spawning new colonists.

## Root Cause
In `src/game/Game.ts`, the `spawnColonist()` method initialized `hunger: 0` but did not initialize `fatigue`.

## Fix Applied
Added `fatigue: 0` to the colonist initialization object at line 2312 of `src/game/Game.ts`.

## How to Verify in Game

### Using Debug Console (Press backtick `)

1. **Spawn a new colonist:**
   ```
   spawn colonist
   ```

2. **Select the colonist** (click on them)

3. **Check colonist properties:**
   ```
   select
   ```
   This should show the selected colonist's properties. Verify that:
   - `hunger` starts at 0
   - `fatigue` starts at 0 (this is the fix)

4. **Speed up time to test fatigue accumulation:**
   ```
   speed 5
   ```
   Wait a few seconds of game time

5. **Check stats again:**
   ```
   select
   ```
   You should see:
   - `hunger` increasing over time
   - `fatigue` increasing over time (this proves the fix works)

6. **Test sleep behavior:**
   - Build a bed near the colonist
   - Let the colonist's fatigue reach > 50
   - When idle and near the bed, the colonist should enter it to rest
   - Fatigue should decrease while in bed

7. **Test eating behavior:**
   - Ensure you have food: `give food 10`
   - Let colonist's hunger reach > 75
   - Colonist should seek food and eat it
   - Hunger should decrease after eating

## Expected Behavior Before Fix
- `fatigue` would be `undefined` when colonist spawns
- `(undefined || 0)` evaluates to 0, but the property wouldn't be set
- Colonists would accumulate fatigue on first update, but behavior might be inconsistent
- The fix ensures clean initialization from the start

## Expected Behavior After Fix
- `fatigue` is explicitly initialized to 0
- Fatigue increases at rate: 0.8 per second when working, 0.3 per second when idle
- Fatigue decreases at rate: 8 per second when inside building or resting
- Colonists seek beds when `fatigue > 50` and idle near a bed
- Colonists exit beds when `fatigue < 30`

## Code References
- **Fix location:** `src/game/Game.ts` line 2312
- **Fatigue update logic:** `src/game/colonist_systems/colonistFSM.ts` lines 317-331
- **Sleep seeking logic:** `src/game/colonist_systems/colonistFSM.ts` lines 1343-1386
- **Type definition:** `src/game/types.ts` line 295 (`fatigue?: number`)
