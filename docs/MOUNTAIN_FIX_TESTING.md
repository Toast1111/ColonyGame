# Mountain Collision Fix - Testing Guide

This document describes how to test the fixes for enemy spawning and colonist mountain collision issues.

## Issue Fixed

### Problem 1: Enemies Spawning on Mountains
**Before:** Enemies could spawn on mountain tiles and walk through them indefinitely.
**After:** Enemies are validated during spawn to ensure they:
- Don't spawn on mountain tiles
- Spawn on passable grid cells
- Have fallback spawn near HQ if no valid edge position found

### Problem 2: Colonists Getting Stuck on Mountains
**Before:** Colonists could physically move onto mountain tiles during hauling, getting permanently stuck.
**After:** Movement validation now includes mountain collision checks, preventing colonists from entering mountain tiles.

## Manual Testing Instructions

### Test 1: Enemy Spawning Validation

1. Start a new game
2. Open debug console with backtick (`)
3. Generate mountains near edges: The game already spawns mountains, so wait for night
4. When night comes, observe enemy spawn points
5. Verify: Enemies should NOT spawn on gray/dark mountain tiles
6. Use debug command `toggle enemies` to disable spawning, then manually spawn:
   - `spawn enemy 10` - spawn 10 enemies
   - Check that none appear on mountains

### Test 2: Colonist Mountain Collision

1. Start a new game
2. Open debug console with backtick (`)
3. Create a test scenario:
   ```
   spawn colonist 5
   resources unlimited
   ```
4. Build a hauling job near mountains:
   - Chop trees near mountain edges
   - Build a stockpile zone
   - Assign colonists to haul
5. Watch colonists navigate around mountains
6. Verify: Colonists should path around mountains, not through them
7. If a colonist somehow ends up stuck (very rare edge case), the rescue system will teleport them after 3 seconds

### Test 3: Enemy Mountain Collision

1. Open debug console
2. Spawn enemies near mountains:
   ```
   spawn enemy 5
   toggle enemies
   ```
3. Watch enemies path toward HQ
4. Verify: Enemies navigate around mountains, don't walk through them

### Test 4: Edge Cases

1. **Large mountain clusters**: Ensure enemies don't spawn trapped inside mountain rings
2. **Hauling through tight spaces**: Test colonist hauling between narrow mountain passages
3. **Combat near mountains**: Ensure drafted colonists and fleeing behavior work near mountains

## Code Changes Summary

### `src/game/Game.ts`
- `spawnEnemy()` now validates spawn positions
- Tries up to 20 positions before falling back to HQ-relative spawn
- Checks for mountain tiles and grid passability

### `src/game/colonist_systems/colonistFSM.ts`
- `wouldCollideWithBuildings()` now checks mountain tiles
- Mountain collision prevents movement into impassable terrain

### `src/ai/enemyFSM.ts`
- `wouldCollideWithBuildings()` now checks mountain tiles for enemies
- Ensures enemies can't phase through mountains

## Expected Behavior

✅ **Enemies spawn only on passable terrain**
✅ **Colonists cannot move onto mountain tiles**
✅ **Enemies cannot move through mountain tiles**
✅ **Existing stuck detection rescues colonists from edge cases**
✅ **Pathfinding already avoids mountains (verified to be working)**

## Debug Console Commands

Useful commands for testing:
- `` ` `` - Toggle debug console
- `toggle enemies` - Disable/enable night enemy spawns
- `spawn colonist N` - Spawn N colonists
- `spawn enemy N` - Spawn N enemies
- `resources unlimited` - Infinite resources
- `speed N` - Set game speed (1-3)
- `godmode all` - Make colonists invincible for testing
