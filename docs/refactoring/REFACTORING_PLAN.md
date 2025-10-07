# Game.ts Refactoring Plan

## 🎯 Goal
Break down the **3,147-line monolithic Game.ts** into maintainable, testable, single-responsibility systems.

## 📊 Current State (BEFORE)

```
Game.ts: 3,147 lines
├── State: colonists, enemies, buildings, resources, etc.
├── Time: day/night, speed, pause
├── Camera: position, zoom, screen↔world conversion
├── Resources: wood, stone, food, storage management
├── Input: mouse, keyboard, touch events
├── UI: HUD, panels, menus, rendering coordination
├── Combat: turret AI, bullet spawning
├── Pathfinding: grid updates, path computation
├── Task assignment: pickTask() - 100+ lines
├── Medical: treatment assignment
├── Building: placement, construction
├── Enemy spawning
└── Debug tools
```

**Problems:**
- Impossible to navigate (3,147 lines!)
- Tight coupling (everything depends on Game)
- Hard to test individual systems
- Slow IDE performance
- Merge conflicts
- Difficult for new developers

## 🏗️ Target Architecture (AFTER)

```
src/game/
├── Game.ts (200-300 lines - coordinator only)
│   ├── Owns systems
│   ├── Coordinates update()/draw()
│   └── Handles system integration
│
├── core/
│   ├── GameState.ts ✅ CREATED
│   │   └── All entities and data (colonists, buildings, resources...)
│   ├── GameLoop.ts
│   └── Renderer.ts
│
├── systems/
│   ├── TimeSystem.ts ✅ CREATED
│   │   └── Day/night, speed, pause
│   ├── CameraSystem.ts ✅ CREATED
│   │   └── Position, zoom, coordinate transforms
│   ├── ResourceSystem.ts ✅ CREATED
│   │   └── Resource management, storage, costs
│   ├── WorkSystem.ts (TODO)
│   │   └── Task assignment, work priorities
│   ├── CombatSystem.ts (TODO)
│   │   └── Turrets, bullets, damage
│   ├── BuildingSystem.ts (TODO)
│   │   └── Placement, construction, building logic
│   ├── SpawnSystem.ts (TODO)
│   │   └── Enemy spawning, resource respawning
│   └── MedicalSystem.ts (exists, but needs integration)
│
├── managers/
│   ├── InputManager.ts (TODO)
│   │   └── Mouse, keyboard, touch, gestures
│   └── UIManager.ts (TODO)
│       └── HUD, panels, menus
│
└── ... (existing structure continues)
```

## ✅ Completed Systems

### 1. GameState.ts
**Location:** `src/game/core/GameState.ts`  
**Purpose:** Central data container - no logic, just state  
**Contains:**
- Colonists, enemies, buildings, trees, rocks, bullets, particles
- Resources (wood, stone, food, medicine, herbal)
- Selection state, hotbar, messages
- Assignment tracking (WeakSets, Maps)
- `reset()` method for new game

### 2. TimeSystem.ts
**Location:** `src/game/systems/TimeSystem.ts`  
**Purpose:** Manages game time and speed  
**API:**
- `update(dt)` - Advance time
- `isNight()` - Check if nighttime
- `didNightJustStart()` - Detect night transition
- `toggleFastForward()`, `togglePause()`
- `getEffectiveDt(dt)` - dt × speed (accounting for pause)
- Getters: `getDay()`, `getTimeOfDay()`, `getCurrentHour()`, `isPaused()`, `getFastForward()`

### 3. CameraSystem.ts
**Location:** `src/game/systems/CameraSystem.ts`  
**Purpose:** Camera control and coordinate transforms  
**API:**
- `pan(dx, dy)` - Pan camera
- `panWithSpeed(dx, dy, dt)` - Keyboard panning
- `zoom(delta)` - Zoom in/out
- `centerOn(x, y)` - Center on world position
- `screenToWorld(sx, sy)` - Convert screen → world coords
- `worldToScreen(wx, wy)` - Convert world → screen coords
- `isVisible(x, y, w, h)` - Culling check
- `setCanvasDimensions(w, h, dpr)` - Update on resize

### 4. ResourceSystem.ts
**Location:** `src/game/systems/ResourceSystem.ts`  
**Purpose:** Resource and storage management  
**API:**
- `addResource(type, amount, capacity)` - Add with capacity check
- `subtractResource(type, amount)` - Remove resources
- `hasCost(cost)` - Check if can afford
- `payCost(cost)` - Deduct resources
- `getStorageCapacity(warehouses, tents)` - Calculate total storage
- `isStorageFull()` - Check storage limit
- `formatCost(cost)` - Format for UI display

## 🔄 Integration Steps

### Phase 1: Add Systems to Game.ts (Non-Breaking)
```typescript
class Game {
  // New systems (add these)
  state = new GameState();
  timeSystem = new TimeSystem();
  cameraSystem = new CameraSystem();
  resourceSystem = new ResourceSystem();
  
  // Old properties (keep for now)
  colonists: Colonist[] = []; // Will redirect to state
  day = 1; // Will redirect to timeSystem
  camera = { x: 0, y: 0, zoom: 1 }; // Will redirect to cameraSystem
  RES = { wood: 0, ... }; // Will redirect to resourceSystem
  // ... etc
}
```

### Phase 2: Redirect Old Properties (Backward Compatible)
Use getters/setters to make old code work with new systems:
```typescript
// Example: Redirect colonists to GameState
get colonists(): Colonist[] {
  return this.state.colonists;
}
set colonists(value: Colonist[]) {
  this.state.colonists = value;
}

// Example: Redirect day to TimeSystem
get day(): number {
  return this.timeSystem.getDay();
}
```

### Phase 3: Update Internal Game.ts Code
Replace direct access with system calls:
```typescript
// OLD:
this.day++;
this.tDay += dt / this.dayLength;
if (this.tDay > 0.5) { /* night */ }

// NEW:
this.timeSystem.update(dt);
if (this.timeSystem.isNight()) { /* night */ }
if (this.timeSystem.didNightJustStart()) { /* spawn enemies */ }
```

### Phase 4: Remove Redundant Properties
Once all code uses systems, remove old properties and getters.

## 📈 Benefits

### Immediate:
✅ **GameState.ts** - Clear view of all game data in one place  
✅ **TimeSystem** - Day/night logic isolated and testable  
✅ **CameraSystem** - Camera code no longer mixed with game logic  
✅ **ResourceSystem** - Resource management encapsulated

### Long-term:
✅ **Maintainability** - Find code easily, understand responsibilities  
✅ **Testability** - Test systems in isolation  
✅ **Performance** - TypeScript analyzes smaller files faster  
✅ **Onboarding** - New developers understand structure  
✅ **Features** - Add new systems without touching Game.ts  
✅ **Debugging** - Isolate issues to specific systems

## 🚀 Next Steps

1. ✅ **Create systems** (DONE)
2. **Integrate systems into Game.ts** (add as properties)
3. **Add property redirects** (getters/setters for backward compatibility)
4. **Update Game.ts internals** (use system APIs)
5. **Test thoroughly** (verify no regressions)
6. **Remove old properties** (clean up)
7. **Create more systems** (WorkSystem, InputManager, etc.)
8. **Document APIs** (JSDoc for each system)

## 📝 Migration Example

### Before:
```typescript
// Game.ts - everything in one place
class Game {
  day = 1;
  tDay = 0;
  fastForward = 1;
  paused = false;
  
  update(dt: number) {
    if (!this.paused) {
      this.tDay += (dt * this.fastForward) / this.dayLength;
      if (this.tDay >= 1) {
        this.tDay -= 1;
        this.day++;
      }
    }
  }
  
  isNight() {
    return this.tDay > 0.5;
  }
}
```

### After:
```typescript
// Game.ts - clean coordinator
class Game {
  timeSystem = new TimeSystem();
  
  update(dt: number) {
    this.timeSystem.update(dt);
    if (this.timeSystem.didNightJustStart()) {
      this.spawnEnemies();
    }
  }
}

// systems/TimeSystem.ts - focused responsibility
class TimeSystem {
  private day = 1;
  private tDay = 0;
  private fastForward = 1;
  // ... (see TimeSystem.ts for full implementation)
}
```

## 🎯 Success Metrics

- [ ] Game.ts under 500 lines
- [ ] All systems under 300 lines each
- [ ] Zero runtime regressions
- [ ] All existing features work
- [ ] Easier to add new features
- [ ] Faster IDE performance
- [ ] Clear system boundaries

## 🔗 Related Files

- `src/game/core/GameState.ts` - State container
- `src/game/systems/TimeSystem.ts` - Time management
- `src/game/systems/CameraSystem.ts` - Camera control
- `src/game/systems/ResourceSystem.ts` - Resource management
- `src/game/Game.ts` - Main game class (to be refactored)

---

**Status:** ✅ Systems created, ready for integration  
**Next:** Integrate systems into Game.ts (Phase 1)
