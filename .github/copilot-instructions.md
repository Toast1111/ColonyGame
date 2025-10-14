# Colony Game AI Agent Instructions

## Architecture Overview

This is a 2D TypeScript colony survival game using Canvas rendering and Vite, heavily inspired by **RimWorld**. The game emulates RimWorld's colony management mechanics, AI systems, and design philosophy. When implementing new features, follow RimWorld's approach to gameplay mechanics, UI patterns, and system interactions.

### Core Architecture (Manager Pattern Migration)

The codebase is **actively refactoring** from a monolithic `Game.ts` (3200+ lines) to a manager-based architecture. New code should use the manager pattern:

**Core Managers** (in `src/game/managers/`):
- `InputManager` - Mouse/keyboard/touch input, coordinate conversion, gesture detection
- `UIManager` - Panel visibility, selection state, context menus, hotbar system
- `RenderManager` - Rendering orchestration and optimization
- `NavigationManager` - A* pathfinding, nav grid management, deferred rebuilds

**Core Systems** (in `src/game/systems/`):
- `GameState` - Entity storage (colonists, buildings, enemies, circles)
- `TimeSystem` - Day/night cycle, game speed, pause state
- `CameraSystem` - Camera position, zoom, world transforms
- `ResourceSystem` - Wood/stone/food/medicine tracking with capacity
- `AudioManager` - Sound effects with category-based volume (singleton)

**Access Pattern**: Game class delegates to systems:
```typescript
game.state.colonists       // Instead of game.colonists
game.timeSystem.getDayFrac() // Instead of game.getDayFrac()
game.inputManager.getMouse() // Instead of game.mouse
game.audioManager.play('buildings.placement.confirm')
```

### Critical Systems

**FSM Pattern**: All entities use finite state machines with explicit transitions:
- `src/game/colonist_systems/colonistFSM.ts` - 20+ states (idle, build, harvest, chop, mine, flee, sleep, eat, heal, doctoring, cooking, drafted, etc.)
- `src/ai/enemyFSM.ts` - Enemy AI with attack/flee behavior
- States include: `seekTask`, `move`, `build`, `harvest`, `chop`, `mine`, `flee`, `sleep`, `eat`, `heal`, `goToSleep`, `doctoring`, `beingTreated`, `downed`, `waitingAtDoor`, `cooking`, `storingBread`, `guard`, `drafted`

**RimWorld Systems** (`src/game/rimworld-systems/`):
- Floor-based item management with automatic stacking
- Stockpile zones with item filtering
- Hauling job system for automated item transport
- Construction material delivery

**Building Inventory** (`src/game/systems/buildingInventory.ts`):
- Per-building item storage (pantry, farm, warehouse, stove)
- Multi-slot inventory with capacity limits
- Item types from `itemDatabase.ts` (624 lines of item definitions)

**Work Priority System** (`src/game/systems/workPriority.ts`):
- RimWorld-style work assignment (14 work types)
- Per-colonist priority matrix (1-4 scale)
- Modal UI panel with drag-to-paint priorities

**Medical System** (`src/game/health/`):
- Injury tracking with body parts and severities
- Treatment items (bandages, herbal medicine, medicine)
- Medical jobs via `medicalWorkGiver.ts`
- Health progression and bleeding mechanics

**Door System** (`src/game/systems/doorSystem.ts`):
- Queue-based door access for colonists/enemies
- Animated door states (closed/opening/open/closing)
- Collision integration with pathfinding

## Development Workflow

### Setup & Build
```bash
npm install          # Install dependencies
npm run dev          # Dev server with hot reload (--host flag for network access)
npm run build        # TypeScript compilation + Vite build
npm run preview      # Preview production build
```

### Debug Console (CRITICAL for testing)
Press **backtick (`)** to open in-game debug console. Essential commands:
```bash
toggle enemies           # Disable night spawns for peaceful testing
resources unlimited      # Infinite resources
spawn colonist 3         # Add 3 colonists
heal all                 # Full heal all colonists
godmode all              # Make invincible
give pistol all          # Equip weapons
speed 3                  # 3x game speed
```
See `docs/DEBUG_CONSOLE_QUICKREF.md` for full reference.

### Key Development Files
- **Entry Point**: `src/main.ts` - Initializes Game class, binds to canvas
- **Game Loop**: `src/game/Game.ts` - Main update/render loop (still 3200+ lines, being refactored)
- **Type Definitions**: `src/game/types.ts` - All core types (Building, Colonist, Enemy, Resources, etc.)
- **Constants**: `src/game/constants.ts` - `T = 32` (tile size), `WORLD` dimensions (240×240 tiles)
- **Buildings**: `src/game/buildings.ts` - `BUILD_TYPES` object with all building definitions

### Testing Approach
- No formal test framework yet (planned)
- Test via debug console + manual gameplay
- Mobile testing: Toggle mobile controls via header dropdown
- Performance testing: Press `P` for performance HUD (FPS, tick rate, entity counts)

## Project-Specific Conventions

**Tile-Based World**: Everything uses `T = 32` pixel tiles. Buildings snap to grid, pathfinding operates on tile centers. World size: 240×240 tiles (7680×7680 pixels).

**Coordinate Systems**:
- **World coordinates**: Pixels (0,0 to WORLD.w, WORLD.h)
- **Grid coordinates**: Tiles (divide by T, use Math.floor)
- **Screen coordinates**: Canvas pixels (apply camera transform)
- Use `applyWorldTransform(ctx, camera)` before rendering world objects

**Building System**:
- Buildings have `done` property (false during construction)
- Use `hasCost()` and `payCost()` helpers for resource transactions
- Buildings with `inventory` property use `buildingInventory.ts` functions
- Rotation via `rot` property (0/90/180/270 degrees)

**Collision Detection**:
- Custom circle-rectangle collision in FSM system
- Buildings block pathfinding except: HQ, paths, houses, farms, beds, open doors
- Colonists have `r` (radius) property for collision circles

**Asset Loading**:
- Images in `src/assets/images.ts` - Vite imports as URLs
- Audio in `src/assets/audio/manifest.ts` - `.ogg` files with variants
- Colonist sprites composited from heads, bodies, hair parts
- Audio uses `AudioManager.getInstance().play(key, options)`

**Performance Optimizations**:
- `AdaptiveTickRateManager` - Dynamic tick rates based on entity count
- `SimulationClock` - Fixed 30Hz simulation tick
- `BudgetedExecutionManager` - Spread heavy computations across frames
- `DirtyRectTracker` - Partial canvas updates (future optimization)
- Pathfinding uses sectioned grids with dirty flags

## Integration Points

**RimWorld Systems Integration**:
```typescript
const rimWorld = new RimWorldSystemManager({ canvas, enableAutoHauling: true });
rimWorld.dropItems('wood', 20, { x: 50, y: 50 });
const job = rimWorld.assignHaulingJob(colonist.id, colonist.position);
```

**Pathfinding Integration**:
- Buildings auto-update nav grid via `navigationManager.rebuildNavGrid()`
- Roads/paths provide speed bonuses via `getSpeedMultiplier(game, x, y)`
- Deferred rebuild system prevents frame drops: `game.deferredRebuildSystem.requestFullRebuild()`

**Audio Integration**:
```typescript
game.audioManager.play('buildings.placement.confirm', { volume: 0.8 });
game.audioManager.play('weapons.pistol.shoot', { rng: Math.random });
game.audioManager.setMasterVolume(0.5);
```

**GitHub Pages Deployment**:
- Auto-deploys on push to `main` via `.github/workflows/deploy.yml`
- Vite uses `BASE_PATH` env var for correct asset paths
- Deployed to: `https://<username>.github.io/ColonyGame/`

## Critical Implementation Details

**FSM State Transitions**: When adding new states, update `updateColonistFSM()`:
```typescript
switch (c.state) {
  case 'newState':
    // State logic here
    if (condition) {
      c.state = 'nextState';
      c.target = null; // Clear state data
    }
    break;
}
```

**Building Inventory**: Always check capacity before adding items:
```typescript
import { addItemToInventory, hasInventorySpace } from './systems/buildingInventory';
if (hasInventorySpace(building, 'wheat')) {
  addItemToInventory(building, 'wheat', 10);
}
```

**Touch/Mobile Support**:
- `InputManager` tracks touch gestures (pan, pinch-zoom)
- `UIManager.pendingPlacement` for precise mobile placement
- Mobile controls in `src/game/ui/dom/mobileControls.ts`
- Always test UI changes with `game.isTouch = true` flag

**Work Priority System**: When adding new work types, update `workPriority.ts`:
```typescript
const WORK_TYPES = ['Doctor', 'Patient', 'Firefight', 'Warden', 'Handle', 
  'Cook', 'Hunt', 'Construct', 'Grow', 'Mine', 'Plant', 'Smith', 
  'Tailor', 'Art', 'Craft', 'Haul', 'Clean', 'Research'];
```

**Documentation Structure**: This project has extensive docs in `docs/`:
- `docs/README.md` - Index of all 59+ documentation files
- Organized by system: refactoring/, medical/, combat/, navigation/, etc.
- Always check existing docs before implementing major features

When modifying core systems:
1. Test with debug console commands
2. Verify mobile controls still work
3. Check pathfinding updates correctly
4. Ensure resource capacity constraints are respected
5. Test FSM state transitions don't break
6. Update relevant docs in `docs/` folder
