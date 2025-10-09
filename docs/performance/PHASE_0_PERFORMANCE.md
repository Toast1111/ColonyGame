# Phase 0: Performance Foundation

## Overview

Phase 0 establishes the performance measurement and optimization infrastructure for the Colony Game. This phase implements:

1. **Fixed Timestep Simulation** - Decouples simulation from rendering for deterministic gameplay
2. **Subsystem Budgets** - Enforces time limits on expensive operations
3. **Micro-Profiler** - Tracks performance metrics and identifies bottlenecks
4. **Performance HUD** - Real-time on-screen performance monitoring

## Architecture

### Fixed Timestep Simulation

**File:** `src/core/SimulationClock.ts`

The simulation runs at a fixed 30 Hz (configurable) while rendering runs at monitor refresh rate. This provides:

- **Deterministic gameplay** - Same input = same output regardless of frame rate
- **Smooth rendering** - Interpolation alpha allows smooth visual updates
- **Performance isolation** - Slow rendering doesn't affect game logic

**How it works:**

```typescript
// Game loop accumulates time and runs fixed-size simulation steps
const steps = simulationClock.tick(now);
for (let i = 0; i < steps; i++) {
  simulationClock.runSimulationStep((dt) => {
    update(dt); // Always receives fixed timestep (0.033s at 30Hz)
  });
}

// Rendering uses interpolation for smooth visuals
const alpha = simulationClock.getAlpha(); // 0-1 between simulation steps
renderPosition = lerp(prevPos, currentPos, alpha);
```

**Key Features:**

- Fixed simulation rate: 30 Hz (33.33ms per step)
- Maximum frame time cap: 250ms (prevents spiral of death)
- Interpolation alpha for smooth rendering
- Statistics tracking (simulation steps, render frames)

### Subsystem Budgets

**File:** `src/core/BudgetedExecution.ts`

Each heavy subsystem gets a time budget per frame to prevent any single system from hogging resources.

**Default Budgets:**

- Pathfinding: 2ms per frame
- Lighting: 2ms per frame
- AI: 2ms per frame
- Other: 2ms per frame

**How it works:**

```typescript
// Create a budgeted queue for a subsystem
const pathfindingQueue = budgetManager.getQueue('pathfinding', { budgetMs: 2.0 });

// Enqueue tasks
pathfindingQueue.enqueue({
  id: 'colonist-1-path',
  execute: () => {
    computePath(start, end);
    return true; // Task complete
  },
  priority: 10,
  subsystem: 'pathfinding'
});

// Execute tasks within budget
pathfindingQueue.execute(); // Runs as many tasks as possible within 2ms
```

**Key Features:**

- Time-budgeted execution
- Priority-based task ordering
- Automatic carryover of unused time
- Queue statistics and monitoring
- Overflow detection

**When to use budgeted execution:**

Use `budgetedRun()` for expensive operations that can be deferred:

```typescript
import { budgetedRun } from '../core/BudgetedExecution';

// Instead of computing all paths immediately
for (const colonist of colonists) {
  budgetedRun('pathfinding', [{
    id: `path-${colonist.id}`,
    execute: () => {
      const path = computePath(colonist.x, colonist.y, target.x, target.y);
      colonist.path = path;
      return true;
    },
    priority: colonist.urgency,
  }], 2.0);
}
```

### Performance Metrics

**File:** `src/core/PerformanceMetrics.ts`

Micro-profiler that tracks timing for all major subsystems with rolling averages and long task detection.

**How it works:**

```typescript
// Wrap expensive operations with timing
performanceMetrics.startTiming('pathfinding');
const path = computePath(start, end);
performanceMetrics.endTiming('colonist-3 pathfinding');

// Automatically tracks:
// - Duration (recorded if > budget)
// - Subsystem totals per frame
// - Rolling 60-frame averages
// - Long tasks (exceeding budget)
```

**Automatic Tracking:**

The following operations are already instrumented:

- **Pathfinding**: `game.computePath()` and `game.computePathWithDangerAvoidance()`
- **AI**: Colonist and enemy FSM updates
- **Rendering**: Full render pass (via RenderManager)

**Metrics Available:**

```typescript
// Current frame
metrics.currentFrame.pathfindingMs;
metrics.currentFrame.aiMs;
metrics.currentFrame.renderMs;

// Rolling averages (last 60 frames)
const avg = metrics.getAverageMetrics();
avg.pathfindingMs; // Average pathfinding time over 60 frames

// Budget utilization (percentage)
const utilization = metrics.getBudgetUtilization();
utilization.pathfinding; // e.g., 85% (1.7ms / 2ms budget)

// Top offenders
const offenders = metrics.getTopOffenders(5);
// [
//   { subsystem: 'pathfinding', duration: 5.2, details: 'path (100,100)->(500,500)' },
//   { subsystem: 'ai', duration: 3.8, details: 'colonist AI' }
// ]
```

### Performance HUD

**File:** `src/game/ui/performanceHUD.ts`

On-screen real-time performance monitor for development and debugging.

**Toggle:** Press **M** key to show/hide

**Display:**

```text
📊 PERFORMANCE MONITOR
✓ FPS: 60.0 | Frame: 16.2ms
⏱ Sim: 30Hz | α: 0.45

SUBSYSTEMS:
  Pathfinding  0.82ms [███████████░░░░] 41%
  Lighting     0.00ms [░░░░░░░░░░░░░░░] 0%
  AI           1.23ms [█████████████░░] 62%
  Render       3.45ms [████████████████] 172% ⚠
  Other        0.50ms [███████░░░░░░░░] 25%

QUEUES:
  pathfinding: 3 tasks

TOP OFFENDERS:
  pathfinding: 5.2ms (path (100,100)->(500,500))
  ai: 3.8ms (colonist AI)
  render: 3.5ms
```

**Color Coding:**

- ✓ Green: Within budget / Good performance
- ⚠ Yellow: Approaching budget limit (>80%)
- ✗ Red: Over budget / Poor performance

**Configuration:**

```typescript
// In Game.ts constructor or via debug console
const hud = initPerformanceHUD({
  visible: true,
  position: 'top-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  opacity: 0.85,
  showDetails: true,
  showQueues: true
});
```

## Performance Targets

### Frame Budget (60 FPS = 16.67ms)

| Subsystem    | Budget | Target Usage | Max Acceptable |
|--------------|--------|--------------|----------------|
| Pathfinding  | 2ms    | 1-1.5ms      | 2ms            |
| Lighting     | 2ms    | 0-1ms        | 2ms            |
| AI           | 2ms    | 1.5-2ms      | 2ms            |
| Render       | 2ms    | 3-5ms        | 8ms            |
| Other        | 2ms    | 0.5-1ms      | 2ms            |
| **Total**    | 10ms   | 6-10.5ms     | 16ms           |

**Notes:**

- Render budget is soft - it's harder to split rendering across frames
- Total budget leaves ~6ms headroom for browser/OS overhead
- "Other" includes physics, combat, resource management, etc.

### Simulation Rate

- **Target:** 30 Hz (33.33ms per step)
- **Rendering:** Monitor refresh rate (typically 60 Hz)
- **Interpolation:** Enabled for smooth visuals

### Dropped Frame Target

- **Target:** < 1% dropped frames (frames > 16.67ms)
- **Acceptable:** < 5% dropped frames
- **Critical:** > 10% dropped frames indicates serious performance issues

## Usage Guide

### Enabling Performance Monitoring

1. **Press M** to toggle the performance HUD
2. **Check console** for periodic summaries (every 5 seconds)

### Reading the Console Summary

```text
=== Performance Summary ===
FPS: 58.3 | Frame: 17.2ms | Dropped: 3.2%
Subsystems (avg):
  Pathfinding: 1.23ms (62% budget)
  Lighting:    0.00ms (0% budget)
  AI:          1.82ms (91% budget)
  Render:      4.12ms (206% budget)
  Other:       0.95ms (48% budget)
Top Offenders (last 100 tasks):
  render: 8.23ms
  pathfinding: 5.12ms (path (100,100)->(500,500))
  ai: 3.45ms (colonist AI)
========================
```

**What to look for:**

- **FPS < 55:** Performance issues
- **Dropped frames > 5%:** Frequent stuttering
- **Any subsystem > 100% budget:** Needs optimization
- **Top offenders > 5ms:** Specific bottlenecks to investigate

### Adding Performance Tracking to New Code

**For immediate operations:**

```typescript
import { PerformanceMetrics } from '../core/PerformanceMetrics';

const metrics = PerformanceMetrics.getInstance();

function expensiveOperation() {
  metrics.startTiming('other'); // or 'pathfinding', 'lighting', 'ai', 'render'
  
  // Your expensive code here
  
  metrics.endTiming('operation description');
}
```

**For deferrable operations:**

```typescript
import { budgetedRun } from '../core/BudgetedExecution';

// Queue expensive work to run within budget
budgetedRun('pathfinding', [
  {
    id: 'unique-task-id',
    execute: () => {
      // Do expensive work
      // Return true when complete, false to continue next frame
      return true;
    },
    priority: 10, // Higher = more important
  }
], 2.0); // 2ms budget
```

## Debugging Performance Issues

### Step 1: Identify the Bottleneck

1. Enable performance HUD (press **M**)
2. Watch for subsystems over budget (>100%)
3. Check console for top offenders
4. Note which operations appear most frequently

### Step 2: Measure Specific Code Paths

Add detailed timing:

```typescript
metrics.startTiming('pathfinding');
const result = expensiveFunction();
metrics.endTiming(`specific-case: ${details}`);
```

### Step 3: Optimize or Budget

#### Option A: Optimize the code

- Reduce algorithm complexity
- Add caching
- Reduce unnecessary work

#### Option B: Spread work across frames

- Use `budgetedRun()` to defer work
- Process in chunks
- Use priority queue for important tasks

#### Option C: Reduce work frequency

- Don't run every frame if not needed
- Add cooldowns or timers
- Use dirty flags

### Step 4: Verify Improvement

1. Check console summary - budget usage should decrease
2. Monitor dropped frame rate
3. Verify no new bottlenecks appeared

## Integration Checklist

When adding new performance-sensitive features:

- [ ] Wrap expensive operations with `metrics.startTiming()` / `endTiming()`
- [ ] Use `budgetedRun()` for deferrable work
- [ ] Test with performance HUD enabled
- [ ] Verify subsystem stays within budget
- [ ] Add to appropriate subsystem category (pathfinding, AI, lighting, etc.)
- [ ] Document expected performance characteristics

## Future Phases

Phase 0 provides the foundation for:

- **Phase 1:** Optimize pathfinding (A* improvements, caching, chunking)
- **Phase 2:** Implement lighting system with budgeting
- **Phase 3:** AI system optimization (behavior tree pruning, LOD)
- **Phase 4:** Rendering optimizations (culling, batching, sprites)

## Known Limitations

1. **Render budget** - Rendering is hard to budget precisely since it must complete each frame
2. **No lighting system yet** - Lighting metrics at 0% until system is implemented
3. **Interpolation** - Currently only alpha is calculated; entity position interpolation not yet implemented
4. **Fixed timestep multiplier** - Fast-forward mode interacts with fixed timestep (multiplies dt)

## Debug Console Commands

These commands are available in the debug console (press **`** or **~**):

```javascript
// Toggle performance HUD
game.debug.performanceHUD = !game.debug.performanceHUD;

// Get metrics summary
console.log(game.performanceMetrics.getSummary());

// Get current metrics
game.performanceMetrics.getAverageMetrics();

// Get budget utilization
game.performanceMetrics.getBudgetUtilization();

// Reset metrics
game.performanceMetrics.reset();

// Get simulation stats
game.simulationClock.getStats();

// Change simulation rate
game.simulationClock.setSimulationHz(20); // 20 Hz instead of 30 Hz
```

## Performance Philosophy

The Phase 0 system follows these principles:

1. **Measure First** - Always measure before optimizing
2. **Budget Everything** - Prevent any system from dominating frame time
3. **Fail Gracefully** - Degrade quality before dropping frames
4. **Transparent** - Make performance visible to developers
5. **Deterministic** - Fixed timestep ensures consistent gameplay

## References

- [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) - Glenn Fiedler
- [Frame Rate Independent Game Loops](https://www.koonsolo.com/news/dewitters-gameloop/)
- [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html)
