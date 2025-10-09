# Performance Optimization Documentation

This directory contains documentation for the Colony Game performance optimization initiative.

## Phase 0: Foundation (✅ Complete)

**Status:** Implemented and tested

Phase 0 establishes the measurement and budgeting infrastructure:

- Fixed timestep simulation (30 Hz)
- Subsystem time budgets (2ms each)
- Performance metrics and micro-profiler
- On-screen performance HUD (toggle with 'M')
- Automatic performance logging

**Documents:**
- [Full Documentation](./PHASE_0_PERFORMANCE.md) - Complete guide to all systems
- [Quick Reference](./PHASE_0_QUICKREF.md) - Quick start and common patterns
- [Implementation Summary](./PHASE_0_SUMMARY.md) - What was built and why

**Key Features:**
- Press **M** to toggle performance HUD
- Console summary every 5 seconds
- Track pathfinding, AI, render, and other subsystems
- Budget enforcement for expensive operations

## Future Phases

### Phase 1: Pathfinding Optimization (Planned)

Goals:
- Reduce pathfinding to <1.5ms average (75% budget)
- Implement path caching
- Add hierarchical pathfinding
- Use budgeted execution for A*

### Phase 2: Lighting System (Planned)

Goals:
- Build lighting with budgeting from day 1
- Progressive light updates
- Target <1ms average (50% budget)

### Phase 3: AI Optimization (Planned)

Goals:
- Reduce AI to <1.5ms average (75% budget)
- Implement AI LOD (level of detail)
- Behavior tree pruning
- Smart update scheduling

### Phase 4: Render Optimization (Planned)

Goals:
- Reduce render to <5ms average
- Sprite batching
- Frustum culling
- Dirty rectangle optimization

## Quick Links

### Using the Performance Systems

1. **Enable monitoring:** Press 'M' in-game
2. **Check console:** Auto-logged every 5 seconds
3. **Read metrics:** See [Quick Reference](./PHASE_0_QUICKREF.md)
4. **Debug issues:** See [Debugging Guide](./PHASE_0_PERFORMANCE.md#debugging-performance-issues)

### Adding Performance Tracking

```typescript
// Track your code
import { PerformanceMetrics } from '../core/PerformanceMetrics';
const metrics = PerformanceMetrics.getInstance();

metrics.startTiming('pathfinding'); // or 'ai', 'lighting', 'render', 'other'
// ... your code ...
metrics.endTiming('operation description');
```

### Using Budgeted Execution

```typescript
// Spread expensive work across frames
import { budgetedRun } from '../core/BudgetedExecution';

budgetedRun('pathfinding', [
  {
    id: 'unique-task-id',
    execute: () => {
      // Do work
      return true; // true = done, false = continue next frame
    },
    priority: 10
  }
], 2.0); // 2ms budget
```

## Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| FPS | 60 | <55 | <30 |
| Frame Time | <16ms | >16ms | >33ms |
| Pathfinding | <2ms | >2ms | >4ms |
| AI | <2ms | >2ms | >4ms |
| Render | <8ms | >10ms | >16ms |

## Files

### Core Systems

- `src/core/PerformanceMetrics.ts` - Metrics tracking
- `src/core/SimulationClock.ts` - Fixed timestep
- `src/core/BudgetedExecution.ts` - Time budgeting

### UI

- `src/game/ui/performanceHUD.ts` - Performance overlay

### Integration

- `src/game/Game.ts` - Main game loop (modified)
- `src/game/managers/RenderManager.ts` - HUD rendering (modified)

## Debugging Tools

### In-Game

- **M key** - Toggle performance HUD
- **Debug console** - Access via ` or ~ key

### Console Commands

```javascript
// Performance metrics
game.performanceMetrics.getSummary();
game.performanceMetrics.getAverageMetrics();
game.performanceMetrics.getBudgetUtilization();
game.performanceMetrics.reset();

// Simulation
game.simulationClock.getStats();
game.simulationClock.setSimulationHz(20); // Change rate

// Toggle HUD
game.debug.performanceHUD = !game.debug.performanceHUD;
```

## Contributing

When adding performance-sensitive code:

1. Wrap with `metrics.startTiming()` / `endTiming()`
2. Use `budgetedRun()` for deferrable work
3. Test with performance HUD enabled
4. Verify subsystem stays within budget
5. Document expected performance

See [Integration Checklist](./PHASE_0_PERFORMANCE.md#integration-checklist)

## Resources

- [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) - Glenn Fiedler
- [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html)
- Main project docs: [../README.md](../README.md)

---

**Current Status:** Phase 0 complete ✅ | Ready for Phase 1 planning
