# Quick Reference: Enemy Navigation Upgrade

## What Changed?

Enemies now use **grid-based pathfinding** instead of smooth interpolated paths.

### Visual Difference

**Before:** Smooth diagonal lines → snap-back on recalc → barely any progress  
**After:** Zigzag tile-to-tile movement → consistent forward progress

## Key Improvements

| Metric | Before | After |
|--------|--------|-------|
| Recalc threshold | 0.75 tiles | 1.5 tiles |
| Recalc interval | 0.9-1.5s | 1.5-2.5s |
| Path type | Smoothed | Grid-aligned |
| Snap-back bug | ✗ Yes | ✓ Fixed |

## How to Test

```bash
npm run dev
# Open http://localhost:5173/

# In browser console:
game.debug.colonists = true  # Enable debug view
game.spawnEnemy()            # Spawn test enemy
```

## Debug Visualization

When `game.debug.colonists = true`:
- **Red dashed line** = Enemy path
- **Red squares** = Path waypoints
- **Highlighted square** = Current target
- **Info overlay** = Enemy stats

## Modified Files

1. `src/core/pathfinding.ts` - New `computeEnemyPath()` function
2. `src/ai/enemyFSM.ts` - Updated movement and recalc logic
3. `src/game/Game.ts` - Added enemy debug rendering

## Expected Behavior

✓ Enemies move in zigzag patterns along tile centers  
✓ No position jumps when path recalculates  
✓ Enemies reach HQ/colonists much faster  
✓ Paths remain stable when targets move slightly  

## Future Possibilities

If this works well:
- Apply to colonist pathfinding (4-directional for RimWorld feel)
- Add flow fields for large enemy raids
- Implement formation-based group movement
- Add tactical positioning AI

## Documentation

- `ENEMY_NAV_IMPLEMENTATION.md` - Full technical details
- `ENEMY_NAVIGATION_UPGRADE.md` - Design documentation
- `ENEMY_NAV_TESTING.md` - Comprehensive testing guide
