# Phase 0 Performance - Quick Reference

## Quick Start

### Enable Performance Monitoring

Press **M** to toggle the performance HUD overlay.

### Console Summary

Performance summary is automatically logged to console every 5 seconds.

## Key Shortcuts

| Key | Action |
|-----|--------|
| **M** | Toggle Performance HUD |

## At a Glance

### What's New

- ✅ Fixed timestep simulation (30 Hz)
- ✅ Subsystem time budgets (2ms each)
- ✅ Real-time performance metrics
- ✅ On-screen performance HUD (throttled & cached for performance)
- ✅ Automatic performance logging
- ✅ Long task detection

### HUD Optimizations

- **Throttled updates:** 3 Hz (configurable) instead of 60 Hz
- **Offscreen caching:** Text rendered to cache, then blitted
- **Overhead:** ~0.1ms per frame (20-30x improvement)
- **Mobile-friendly:** Critical for Safari/iPad

### Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| FPS | 60 | <55 | <30 |
| Frame Time | <16ms | >16ms | >33ms |
| Pathfinding | <2ms | >2ms | >4ms |
| AI | <2ms | >2ms | >4ms |
| Render | <8ms | >10ms | >16ms |

## HUD Display Guide

```text
📊 PERFORMANCE MONITOR
✓ FPS: 60.0 | Frame: 16.2ms          ← Overall performance
⏱ Sim: 30Hz | α: 0.45                 ← Simulation rate & interpolation

SUBSYSTEMS:                           ← Per-subsystem breakdown
  Pathfinding  0.82ms [█████░░] 41%   ← Time | Bar | Budget %
  Lighting     0.00ms [░░░░░░] 0%
  AI           1.23ms [██████░] 62%
  Render       3.45ms [████████] 172% ⚠ ← Over budget warning
  Other        0.50ms [███░░░░] 25%

QUEUES:                               ← Budgeted task queues
  pathfinding: 3 tasks

TOP OFFENDERS:                        ← Slowest operations
  pathfinding: 5.2ms (details)
```

### Status Indicators

- ✓ **Green** - Good performance
- ⚠ **Yellow** - Warning (>80% budget)
- ✗ **Red** - Critical (>100% budget)

## Code Examples

### Add Performance Tracking

```typescript
import { PerformanceMetrics } from '../core/PerformanceMetrics';

const metrics = PerformanceMetrics.getInstance();

function myExpensiveFunction() {
  metrics.startTiming('other');
  // Your code here
  metrics.endTiming('description of operation');
}
```

### Use Budgeted Execution

```typescript
import { budgetedRun } from '../core/BudgetedExecution';

budgetedRun('pathfinding', [
  {
    id: 'task-1',
    execute: () => {
      // Do work
      return true; // true = done, false = continue next frame
    },
    priority: 10
  }
], 2.0); // 2ms budget
```

### Get Metrics Programmatically

```typescript
// In debug console
game.performanceMetrics.getSummary();
game.performanceMetrics.getAverageMetrics();
game.performanceMetrics.getBudgetUtilization();
game.simulationClock.getStats();
```

## Troubleshooting

### Low FPS (<55)

1. Press **M** to show HUD
2. Check which subsystem is over budget (>100%)
3. Look at "TOP OFFENDERS" list
4. Focus optimization on top offender

### Stuttering

- Check "Dropped" percentage in console
- Look for sporadic high values in offenders list
- These are "long tasks" that need optimization

### High Render Time

- Normal for render to exceed 2ms budget
- Becomes critical above 16ms
- Consider reducing draw calls or culling

## Debug Console Commands

```javascript
// Toggle performance HUD
game.debug.performanceHUD = !game.debug.performanceHUD;

// Get summary
console.log(game.performanceMetrics.getSummary());

// Reset metrics
game.performanceMetrics.reset();

// Change sim rate (default 30 Hz)
game.simulationClock.setSimulationHz(20);
```

## Files Changed/Added

### New Files

- `src/core/PerformanceMetrics.ts` - Metrics tracking
- `src/core/SimulationClock.ts` - Fixed timestep
- `src/core/BudgetedExecution.ts` - Time budgeting
- `src/game/ui/performanceHUD.ts` - HUD overlay

### Modified Files

- `src/game/Game.ts` - Main game loop updated
- `src/game/managers/RenderManager.ts` - HUD integration

## Common Patterns

### Before (Variable Timestep)

```typescript
frame = (now: number) => {
  const dt = (now - last) / 1000;
  update(dt); // dt varies each frame!
  render();
};
```

### After (Fixed Timestep)

```typescript
frame = (now: number) => {
  const steps = simClock.tick(now);
  for (let i = 0; i < steps; i++) {
    simClock.runSimulationStep((dt) => {
      update(dt); // dt is always 0.033s at 30Hz
    });
  }
  render(); // Smooth with interpolation
};
```

## Next Steps

Phase 0 provides the foundation. Future phases will optimize:

1. **Pathfinding** - Caching, chunking, hierarchical A*
2. **Lighting** - Implement with budgeting from day 1
3. **AI** - Behavior tree pruning, LOD systems
4. **Rendering** - Culling, batching, sprite optimization

## Questions?

See full documentation: `docs/performance/PHASE_0_PERFORMANCE.md`
