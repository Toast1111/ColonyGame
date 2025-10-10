# Adaptive AI Tick Rate - Quick Reference

## What Is It?

Makes AI update less frequently based on importance. Distant/idle entities think at 1-5 Hz instead of 60 Hz, saving 50-80% CPU.

## Tick Rates

| Level | Hz | When | Example |
|-------|-----|------|---------|
| **CRITICAL** | 10-20 | Combat, near camera, low health | Fighting colonist on screen |
| **NORMAL** | 5-10 | Visible, active tasks | Hauling materials across viewport |
| **LOW** | 1-5 | Offscreen, idle | Wandering offscreen |
| **MINIMAL** | 0.2-1 | Sleeping, far away | Sleeping in bed |

## How to Use

### Monitor Performance

Press **M** to toggle HUD:

```
🤖 AI: 25.0% updated (5/20)
  └─ CRIT:2 NORM:8 LOW:7 MIN:3
```

- `25%` = Only 25% of entities updated this frame (75% saved!)
- `5/20` = 5 entities updated out of 20 total
- Breakdown shows distribution by importance level

### Healthy Stats

- **20-40%**: Optimal - good mix of priorities
- **80-100%**: Combat/all visible - expected
- **<10%**: Most sleeping/idle - expected at night

## Performance Impact

### Before (60 Hz for all)
```
10 colonists × 60 updates/sec = 600 AI updates/sec
```

### After (adaptive)
```
2 CRITICAL × 15 Hz = 30/sec
3 NORMAL × 7.5 Hz = 22.5/sec
4 LOW × 3 Hz = 12/sec
1 MINIMAL × 0.6 Hz = 0.6/sec
Total = 65 AI updates/sec (89% reduction!)
```

## What Gets Skipped?

When an entity skips an update:

✅ **Still Happens**:
- Physics (position, rotation)
- Animation
- Current action (walking, building, hauling)

❌ **Deferred**:
- New task selection
- Pathfinding
- State transitions
- Combat decisions

Result: Smooth movement, less CPU usage.

## Files Modified

- `src/core/AdaptiveTickRate.ts` - Core system
- `src/game/Game.ts` - Integration (lines ~2015-2085)
- `src/game/ui/performanceHUD.ts` - Statistics display

## How It Works

1. **Calculate importance** (combat, distance, health, task)
2. **Assign tick rate** (CRITICAL to MINIMAL)
3. **Check schedule** (skip if not due)
4. **Continue action** (physics still updates)

## Debug

To see which entities update each frame:

```typescript
// In browser console
game.debug = { aiTick: true };
```

## Common Questions

**Q: Do sleeping colonists respond to threats?**
A: Yes, they update at 0.6 Hz (every 1-2 seconds), enough to wake up when needed.

**Q: Will offscreen colonists ignore danger?**
A: No, combat automatically promotes them to CRITICAL (15 Hz).

**Q: Do I need to configure anything?**
A: No, the system is fully automatic and self-balancing.

**Q: Can I force an update?**
A: Yes, use `game.adaptiveTickRate.forceUpdate(entityId, importance)` for player interactions.

## Full Documentation

See `docs/performance/ADAPTIVE_AI_TICK_RATE.md` for complete details.
