# Adaptive AI Tick Rate System

## Overview

The Adaptive AI Tick Rate System dramatically reduces CPU usage by updating AI entities at different frequencies based on their importance to gameplay. Entities near the camera, in combat, or performing critical tasks update frequently (10-20 Hz), while distant, idle, or sleeping entities update much less often (0.2-5 Hz).

**Performance Impact**: 50-80% reduction in AI update calls for colonies with 10+ colonists

## Importance-Based Tick Rates

### CRITICAL (10-20 Hz)
**Target**: 15 Hz average

**When Used**:
- Entity is in combat
- Entity is very close to camera center (within 25% of viewport)
- Entity has low health (<30%)
- Entity is performing critical tasks (fight, flee, rescue, extinguish, doctor)

**Example**: A colonist fighting enemies near the camera center updates 15 times per second for maximum responsiveness.

### NORMAL (5-10 Hz)
**Target**: 7.5 Hz average

**When Used**:
- Entity is visible on screen but not close
- Entity is performing important tasks while offscreen
- Default state for visible entities

**Example**: A colonist hauling materials across the visible map updates 7-8 times per second.

### LOW (1-5 Hz)
**Target**: 3 Hz average

**When Used**:
- Entity is offscreen but not too far (within 2x viewport distance)
- Entity is idle but not sleeping
- Entity is wandering

**Example**: A colonist wandering off-screen updates 3 times per second - enough to react to threats, but saving CPU.

### MINIMAL (0.2-1 Hz)
**Target**: 0.6 Hz average

**When Used**:
- Entity is sleeping
- Entity is in stasis (future feature)
- Entity is very far from camera (>2x viewport distance)

**Example**: A sleeping colonist updates once every 1-2 seconds - just enough to check if they should wake up.

## How It Works

### 1. Importance Calculation

Every frame, each entity's importance is calculated based on:

```typescript
const importance = adaptiveTickRate.calculateImportance({
  entityX, entityY,           // Entity position
  cameraX, cameraY,           // Camera position
  cameraWidth, cameraHeight,  // Viewport size
  cameraZoom,                 // Zoom level
  isInCombat,                 // Combat state
  isSleeping,                 // Sleep state
  isStasis,                   // Stasis state (future)
  task,                       // Current task
  health, maxHealth           // Health status
});
```

**Priority Order** (highest to lowest):
1. Combat → CRITICAL
2. Stasis/Sleeping → MINIMAL
3. Low health (<30%) → CRITICAL
4. Near camera center → CRITICAL
5. On screen → NORMAL
6. Important task (offscreen) → NORMAL
7. Nearby but offscreen → LOW
8. Far from camera → MINIMAL

### 2. Update Scheduling

Each entity gets a unique update schedule:

```typescript
// Check if entity should update this frame
if (adaptiveTickRate.shouldUpdate(entityId, importance)) {
  // Update AI/FSM
  updateColonistFSM(game, colonist, dt);
}
// Otherwise, colonist continues current action
```

**Key Features**:
- **Jitter**: Random offset prevents all entities from updating simultaneously
- **Importance Promotion**: Increasing importance triggers immediate update
- **Stable IDs**: Entity IDs remain stable across frames for consistent scheduling

### 3. Partial Updates

When an entity is skipped:
- **Physics continues**: Position, rotation, animation still update
- **Current action persists**: Walking, building, hauling continues
- **Decision-making deferred**: New task selection, pathfinding waits

This creates smooth movement even for low-priority entities while saving CPU on complex AI decisions.

## Performance Monitoring

### HUD Display

Press **M** to toggle the Performance HUD, which shows:

```
🤖 AI: 25.0% updated (5/20)
  └─ CRIT:2 NORM:8 LOW:7 MIN:3
```

**Reading the Stats**:
- `25.0%`: Percentage of entities that updated this frame
- `5/20`: 5 entities updated out of 20 total
- `CRIT:2`: 2 entities at CRITICAL importance
- `NORM:8`: 8 entities at NORMAL importance
- `LOW:7`: 7 entities at LOW importance
- `MIN:3`: 3 entities at MINIMAL importance

**Healthy Numbers**:
- 20-40% update rate with mixed importance levels = optimal
- 80-100% update rate = most entities critical/visible (expected in combat)
- <10% update rate = most entities sleeping/idle (expected at night)

## Implementation Details

### File: `src/core/AdaptiveTickRate.ts`

**Core Classes**:

#### `AdaptiveTickRateManager`
Main manager that tracks all entities and determines update frequency.

**Key Methods**:
- `beginFrame(time)`: Call at start of each frame
- `calculateImportance(params)`: Determine entity importance level
- `shouldUpdate(id, importance)`: Check if entity should update
- `forceUpdate(id, importance)`: Force immediate update (e.g., player interaction)
- `removeEntity(id)`: Clean up when entity is destroyed
- `getStats()`: Get performance statistics

#### `ImportanceLevel` enum
```typescript
enum ImportanceLevel {
  CRITICAL = 0,  // 10-20 Hz
  NORMAL = 1,    // 5-10 Hz
  LOW = 2,       // 1-5 Hz
  MINIMAL = 3    // 0.2-1 Hz
}
```

#### `IMPORTANCE_CONFIGS`
Configuration for each importance level:

```typescript
{
  targetHz: number,        // Target update frequency
  minInterval: number,     // Minimum time between updates
  maxInterval: number,     // Maximum time between updates
  jitterRange: number      // Random jitter to prevent sync
}
```

### File: `src/game/Game.ts`

**Integration Points**:

```typescript
// Create manager
adaptiveTickRate = new AdaptiveTickRateManager();

// Begin frame
this.adaptiveTickRate.beginFrame(performance.now() / 1000);

// Calculate importance
const importance = this.adaptiveTickRate.calculateImportance({...});

// Check if should update
if (this.adaptiveTickRate.shouldUpdate(colonistId, importance)) {
  updateColonistFSM(this, colonist, dt);
}

// Clean up on death
this.adaptiveTickRate.removeEntity(colonistId);
```

## Performance Benefits

### Scenario 1: Small Colony (3-5 colonists)
- **Before**: 3-5 AI updates per frame = 180-300 updates/sec
- **After**: 2-4 AI updates per frame = 120-240 updates/sec
- **Savings**: ~25% reduction
- **Reason**: Some entities likely offscreen or sleeping

### Scenario 2: Medium Colony (10-15 colonists)
- **Before**: 10-15 AI updates per frame = 600-900 updates/sec
- **After**: 3-5 AI updates per frame = 180-300 updates/sec
- **Savings**: ~60% reduction
- **Reason**: Many entities idle, offscreen, or sleeping

### Scenario 3: Large Colony (20+ colonists)
- **Before**: 20+ AI updates per frame = 1200+ updates/sec
- **After**: 4-8 AI updates per frame = 240-480 updates/sec
- **Savings**: ~70% reduction
- **Reason**: Most entities distributed across map, many sleeping at night

### Scenario 4: Combat (all colonists on-screen)
- **Before**: 10 AI updates per frame = 600 updates/sec
- **After**: 10 AI updates per frame = 600 updates/sec
- **Savings**: 0% (all entities CRITICAL)
- **Reason**: System maintains full responsiveness during combat

## Best Practices

### DO ✅
- Trust the importance calculation - it accounts for all gameplay factors
- Monitor the HUD to verify expected distribution
- Use `forceUpdate()` when player directly interacts with an entity
- Keep task lists updated (importance uses task type)

### DON'T ❌
- Don't manually change tick rates - the system is self-balancing
- Don't skip physics updates - only AI decision-making is deferred
- Don't worry about "stale" behavior - jitter ensures regular updates
- Don't use this for non-AI systems (rendering, physics, UI)

## Future Enhancements

### Planned Features
1. **Stasis System**: Ultra-low priority for colonists in safe, distant areas
2. **Group Updates**: Update nearby entities together for cache efficiency
3. **Predictive Scheduling**: Schedule updates just before entity enters screen
4. **Priority Inheritance**: Workers assigned to critical tasks get higher priority
5. **Adaptive Jitter**: Reduce jitter for sleeping entities, increase for combat

### Performance Monitoring
- Track average importance distribution over time
- Alert when >80% entities are CRITICAL (potential performance issue)
- Suggest gameplay improvements (e.g., "Too many colonists visible, consider building dormitories")

## Debugging

### Enable Detailed Logging

```typescript
// In Game.ts, add after shouldUpdate check:
if (game.debug?.aiTick) {
  console.log(`${colonistId}: ${importance} - ${updated ? 'UPDATE' : 'SKIP'}`);
}
```

### Common Issues

**Issue**: All entities updating every frame (100%)
- **Cause**: All entities visible and near camera
- **Solution**: Working as intended - zoom out or wait for entities to spread out

**Issue**: No updates happening (<1%)
- **Cause**: Clock not being called with `beginFrame()`
- **Solution**: Check `adaptiveTickRate.beginFrame()` is called in game loop

**Issue**: Entities not responding to threats
- **Cause**: Importance calculation not detecting combat
- **Solution**: Verify `isInCombat` is being set correctly

## References

- Implementation: `src/core/AdaptiveTickRate.ts`
- Integration: `src/game/Game.ts` (lines ~2015-2085)
- HUD Display: `src/game/ui/performanceHUD.ts`
- Related: `docs/performance/PHASE_0_SUMMARY.md` (performance framework)
