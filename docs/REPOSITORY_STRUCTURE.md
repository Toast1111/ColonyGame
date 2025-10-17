# Repository Structure Guide

This document describes the organization of the ColonyGame repository.

## Root Structure

```
ColonyGame/
├── docs/               # All documentation
├── src/                # Source code
├── dist/               # Build output (generated)
├── node_modules/       # Dependencies (generated)
├── index.html          # Entry HTML
├── style.css          # Global styles
├── package.json        # Project config
├── tsconfig.json       # TypeScript config
├── vite.config.ts      # Build config
└── README.md          # Project readme
```

## Documentation Structure (`docs/`)

Documentation is organized by system/feature:

- **archived/** - Historical implementation summaries and old docs
- **audio/** - Audio system documentation and debugging guides
- **bug-fixes/** - Bug fix summaries
- **building-systems/** - Building placement and inventory systems
- **combat-systems/** - Combat, weapons, and melee systems
- **cooking-systems/** - Cooking workflow and recipes
- **combat/** - Combat manager guides
- **debug-tools/** - Debug console and FSM analysis tools
- **door-system/** - Door animation and queue system
- **floor-system/** - Floor types and speed modifiers
- **medical/** - Medical AI, health, and treatment systems
- **navigation/** - Navigation grid and pathfinding
- **pathfinding/** - Navmesh optimization and performance
- **performance/** - Optimization guides (rendering, AI, async)
- **refactoring/** - Code refactoring documentation
- **reference/** - External reference code (e.g., RimWorld source)
- **regions/** - Region system (for spatial partitioning)
- **terrain/** - Terrain generation and migration
- **tools/** - Development tools (FSM Blueprint Editor)
- **ui-systems/** - UI/UX implementation and refactoring
- **work-priority/** - Work priority panel system

## Source Code Structure (`src/`)

### Top-Level Directories

- **ai/** - Enemy AI and FSM systems
- **assets/** - Game assets (images, audio)
- **core/** - Core utilities and performance systems
- **data/** - Game data (item database)
- **game/** - Main game code (see below)
- **types/** - TypeScript type definitions
- **main.ts** - Application entry point

### Game Directory (`src/game/`)

The main game logic is organized into:

#### Systems (`src/game/systems/`)
Core game systems that manage state:
- `CameraSystem.ts` - Camera position and zoom
- `TimeSystem.ts` - Day/night cycle
- `ResourceSystem.ts` - Wood/stone/food tracking
- `LightingSystem.ts` - Dynamic lighting
- `buildingInventory.ts` - Per-building storage
- `doorSystem.ts` - Door queues and animation
- `workPriority.ts` - Work assignment priorities
- `workGiverManager.ts` - Job assignment orchestration
- `deferredRebuildSystem.ts` - Batched nav grid updates

#### Managers (`src/game/managers/`)
High-level managers extracted from monolithic Game.ts:
- `InputManager.ts` - Mouse/keyboard/touch input
- `UIManager.ts` - Panel visibility and selection state
- `RenderManager.ts` - Rendering orchestration
- `NavigationManager.ts` - A* pathfinding and nav grids

#### Rendering (`src/game/render/`)
Rendering utilities and systems:
- `index.ts` - Main render functions
- `sprites/` - Colonist and weapon sprite rendering
- `debug/` - Debug visualization (terrain, etc.)

#### UI (`src/game/ui/`)
User interface components:
- `panels/` - Modal/overlay panels (work priority, inventory, performance HUD)
- `hud/` - HUD elements (hotbar, build menu, top bar)
- `contextMenus/` - Right-click menus for buildings/colonists
- `dom/` - DOM-based UI (header, mobile controls, error overlay)
- `bootstrap.ts` - UI initialization
- `debugConsole.ts` - In-game debug console

#### Colonist Systems (`src/game/colonist_systems/`)
Colonist behavior and appearance:
- `colonistFSM.ts` - Finite state machine (20+ states)
- `colonistGenerator.ts` - Procedural colonist creation
- `traits/` - Appearance, backgrounds, passive traits

#### Combat (`src/game/combat/`)
Combat and weapon systems:
- `combatManager.ts` - Combat orchestration
- `combatSystem.ts` - Turret and projectile updates
- `pawnCombat.ts` - Colonist/enemy combat
- `weaponStats.ts` - Weapon definitions

#### Health (`src/game/health/`)
Medical and injury systems:
- `healthSystem.ts` - Injury tracking and progression
- `medicalSystem.ts` - Treatment definitions
- `medicalWorkGiver.ts` - Medical job assignment

#### RimWorld Systems (`src/game/rimworld-systems/`)
RimWorld-inspired features:
- `rimWorldManager.ts` - Main integration point
- `items/` - Floor-based item management
- `stockpiles/` - Stockpile zones with filtering
- `logistics/` - Hauling job system
- `examples/` - Integration examples (basic, advanced, test)

#### Other Directories
- `audio/` - Audio manager and sound mappings
- `core/` - Core game state (GameState.ts)
- `navigation/` - Navigation grid utilities
- `placement/` - Building placement system
- `skills/` - Colonist skills
- `test/` - Unit tests
- `workGivers/` - Specific work givers (construction, mining, hauling, etc.)

### Core Systems (`src/core/`)

Performance and utility systems:
- `pathfinding.ts` - A* pathfinding algorithm
- `utils.ts` - Math and utility functions
- `particles/` - Particle effects system
- `AdaptiveTickRate.ts` - Dynamic tick rate adjustment
- `BudgetedExecution.ts` - Frame budget management
- `DirtyRectTracker.ts` - Partial canvas updates
- `PerformanceMetrics.ts` - Performance monitoring
- `SimulationClock.ts` - Fixed simulation rate
- `RenderCache.ts` - Sprite and render caching
- `RenderOptimizations.ts` - Render utility functions

### Assets (`src/assets/`)

Game assets organized by type:
- `audio/` - Sound effects (buildings, cooking, medical, UI, weapons)
- `images.ts` - Image asset imports
- `things/colonist/` - Colonist sprite parts
- `things/item/` - Item icons
- `farm/` - Farm-related assets

## Key Design Patterns

### Manager Pattern
Core systems use the manager pattern with dependency injection:
```typescript
class Game {
  inputManager = new InputManager();
  uiManager = new UIManager();
  renderManager = new RenderManager(this);
  navigationManager = new NavigationManager(this);
}
```

### Finite State Machines
Entities (colonists, enemies) use explicit FSM states with clear transitions.

### Work Giver System
RimWorld-style job assignment with priorities and work types.

## Recent Reorganization (2025-10-17)

The repository structure was reorganized to improve navigation:

1. **Documentation cleanup**:
   - Moved 24+ markdown files from root to organized docs/ subdirectories
   - Created categorical directories (audio, combat-systems, ui-systems, etc.)
   - Moved archived summaries to docs/archived/

2. **Source code organization**:
   - Consolidated duplicate example files in rimworld-systems/examples/
   - Moved render.ts to render/index.ts with subdirectories (sprites/, debug/)
   - Created ui/panels/ for modal panels (work priority, colonist profile, etc.)
   - Removed empty files (gestures.ts, lightingRender.ts)
   - Moved reference materials to docs/reference/

3. **Import updates**:
   - Updated all import paths to reflect new structure
   - Verified build succeeds after reorganization

## Navigation Tips

- **Finding a feature**: Check the relevant subdirectory in `src/game/` or `docs/`
- **API documentation**: Look in system-specific directories (e.g., `docs/medical/`)
- **Debug tools**: Press backtick (`) for in-game console, check `docs/debug-tools/`
- **Performance**: See `docs/performance/` for optimization guides
- **Examples**: Check `src/game/rimworld-systems/examples/` for integration examples
