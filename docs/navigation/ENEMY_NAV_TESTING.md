# Enemy Navigation Testing Guide

## Quick Test Steps

### 1. Start the Game
```bash
npm run dev
```

Open http://localhost:5173/ in your browser.

### 2. Spawn Enemies
- Wait for night time (enemies spawn automatically)
- Or use console to spawn enemies manually:
```javascript
// Spawn a test enemy near your HQ
game.spawnEnemy(game.HQ.x - 500, game.HQ.y - 500)
```

### 3. Observe Enemy Behavior

**What to look for:**
- ✅ Enemies should move in a zigzag pattern (grid-aligned)
- ✅ No sudden "snap-back" when recalculating paths
- ✅ Enemies should reach colonists/HQ much faster than before
- ✅ Movement should look more predictable and controlled

**Red flags:**
- ❌ Enemies teleporting/snapping to different positions
- ❌ Enemies getting stuck and not moving
- ❌ Enemies moving backward frequently
- ❌ Extremely slow progress toward targets

### 4. Test Moving Targets

Create a scenario where colonists are moving:

1. Build a stockpile zone far from resources
2. Order colonists to haul items
3. Spawn enemies nearby
4. Watch if enemies can chase moving colonists effectively

**Expected:** Enemies should follow colonists without constant path recalculation.

### 5. Enable Debug Visualization

```javascript
// In browser console
game.debug.navGrid = true;  // Show navigation grid
game.debug.paths = true;    // Show pathfinding paths
game.debug.colonistInfo = true; // Show colonist states
```

This will help you see:
- The grid structure enemies are following
- The calculated paths (should be zigzag patterns)
- When paths are being recalculated

### 6. Test Edge Cases

**Obstacles:**
- Build walls to create maze-like structures
- Verify enemies can pathfind around them
- Check diagonal movement through tight spaces

**Doors:**
- Build a building with a door
- Verify enemies attack the door when it blocks their path
- Check that enemies continue after destroying the door

**Multiple Enemies:**
- Spawn 5-10 enemies at once
- Verify no pathfinding conflicts
- Check performance with many simultaneous paths

## Performance Testing

### Before/After Comparison

**Old System Issues:**
- Enemy takes 3+ in-game days to reach HQ from spawn
- Constant jittery movement
- Obvious backward movement after each path recalc

**New System Expected:**
- Enemy reaches HQ in < 1 in-game day from spawn
- Smooth, predictable movement
- Minimal backward movement

### Frame Rate Check

```javascript
// Monitor FPS with many enemies
for (let i = 0; i < 20; i++) {
  game.spawnEnemy(
    game.HQ.x - 800 + Math.random() * 1600,
    game.HQ.y - 800 + Math.random() * 1600
  )
}
```

FPS should remain stable (>30 fps) with 20+ enemies.

## Common Issues & Fixes

### Issue: Enemies still snapping back
**Possible cause:** Old pathfinding still being used
**Fix:** Verify `computeEnemyPath` is being called in `ensureEnemyPath()`

### Issue: Enemies not moving at all
**Possible cause:** Grid not initialized or path returns null
**Check:** Console for errors, verify `game.grid` exists

### Issue: Enemies moving too slowly
**Not a bug:** Grid-aligned movement may appear slower on roads
**Reason:** Old system "cut corners", new system follows grid

### Issue: Diagonal movement looks weird
**Expected behavior:** 8-directional movement creates 45° diagonals
**Normal:** Enemies will move diagonally when appropriate

## Success Criteria

The new system is working correctly if:

1. ✅ Enemies consistently reach their targets
2. ✅ No visible "snap-back" behavior
3. ✅ Path recalculations are infrequent (check console logs)
4. ✅ Movement follows the tile grid visibly
5. ✅ Performance is stable with many enemies
6. ✅ Enemies can navigate complex obstacle courses
7. ✅ Diagonal movement works smoothly
8. ✅ Enemies attack doors blocking their path

## Reporting Issues

If you find problems, provide:
1. What you were doing when it occurred
2. Screenshot/video if possible
3. Console errors (F12 → Console tab)
4. Number of enemies/colonists at the time
5. Whether debug visualization was enabled

## Next Steps

If testing is successful:
- Consider implementing similar grid-based pathfinding for colonists
- Add flow fields for large enemy groups (RimWorld-style raids)
- Implement enemy formation movement
- Add tactical positioning AI
