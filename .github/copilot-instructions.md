# Colony Game AI Agent Instructions

## Architecture Overview

This is a 2D TypeScript colony survival game using Canvas rendering and Vite, heavily inspired by **RimWorld**. The game emulates RimWorld's colony management mechanics, AI systems, and design philosophy. When implementing new features, follow RimWorld's approach to gameplay mechanics, UI patterns, and system interactions.

The game features colonist AI, pathfinding, building systems, and complete RimWorld-style mechanics including stockpiles, hauling, work priorities, and colony management.

### Core Components

- **Game Loop**: Central game state in `src/game/Game.ts` (2000+ lines) - main entry point for all game logic
- **Finite State Machines**: Colonist AI in `src/game/colonist_systems/colonistFSM.ts` and enemy AI in `src/ai/enemyFSM.ts`
- **Pathfinding**: A* implementation in `src/core/pathfinding.ts` with sectioned grid optimization
- **Asset System**: Centralized image loading in `src/assets/images.ts` with lazy loading
- **RimWorld Integration**: Complete stockpile/hauling system in `src/game/rimworld-systems/`

### Key Patterns

**Tile-Based World**: Everything uses `T = 32` pixel tiles from `src/game/constants.ts`. Buildings snap to grid, pathfinding operates on tiles.

**Component Architecture**: Buildings defined in `BUILD_TYPES` object with inheritance-like properties (cost, hp, size, special abilities).

**FSM Pattern**: All entities (colonists, enemies) use state machines with explicit state transitions. See `updateColonistFSM()` for state pattern implementation.

**Resource Management**: Three resources (wood, stone, food) with storage limits. Use `addResource()` method which handles capacity automatically.

**RimWorld Design Philosophy**: New mechanics should follow RimWorld's principles:
- Emergent storytelling through system interactions
- Depth through simple, interconnected systems  
- Player agency with indirect control (orders, not direct character control)
- Realistic needs and motivations (hunger, sleep, mood)
- Automated work assignment with player oversight

## Development Workflow

### Setup & Build
```bash
npm install          # Install dependencies
npm run dev          # Dev server with hot reload
npm run build        # TypeScript compilation + Vite build
npm run preview      # Preview production build
```

### Key Development Files
- **Entry Point**: `src/main.ts` - game initialization and DOM binding
- **Game State**: `src/game/Game.ts` - all game logic, rendering, input handling  
- **Type Definitions**: `src/game/types.ts` - central type definitions
- **Constants**: `src/game/constants.ts` - world size, colors, tile size

### Debugging Tools
- `game.debug` object controls visual debugging (nav grid, paths, colonist info)
- Global `window.game` object for console debugging
- FSM states visible via debug overlay

## Project-Specific Conventions

**Coordinate System**: World coordinates (pixels), grid coordinates (tiles), camera-relative coordinates. Use `applyWorldTransform()` for rendering.

**Building System**: Buildings have `done` property for construction completion. Use `hasCost()` and `payCost()` helpers for resource transactions.

**Collision Detection**: Custom circle-rectangle collision in FSM system. Buildings block pathfinding except HQ, paths, houses, and farms.

**Asset Loading**: All images imported as modules, loaded via `ImageAssets.getInstance().loadAssets()`. Supports colonist sprite composition (heads, bodies, hair).

**Performance**: 
- Pathfinding uses sectioned grids with dirty flags for partial updates
- Particle system with object pooling
- Canvas rendering optimized with camera culling

## Integration Points

**RimWorld Systems**: Complete item management with floor items, stockpile zones, and hauling jobs. Use `RimWorldSystemManager` for integration.

**Pathfinding Integration**: Buildings automatically update pathfinding grid. Roads provide speed bonuses via `getSpeedMultiplier()`.

**Asset Integration**: Vite handles asset bundling. Images imported as URLs, loaded into canvas context.

**GitHub Actions**: Auto-deploys to GitHub Pages on main branch push. Uses `BASE_PATH` for correct asset paths.

## Critical Implementation Details

**Game Loop**: 60fps with `fastForward` multiplier for game speed. Day/night cycle affects enemy spawning.

**Colonist AI**: Multi-layered priority system - hunger/sleep override work tasks. Uses A* pathfinding with building avoidance.

**Building Construction**: Two-phase system - placement reserves space, construction completes over time with colonist labor.

**Touch Support**: Responsive UI with mobile controls, gesture handling for pan/zoom, precise placement mode for touch devices.

When modifying core systems, always test with both desktop and mobile interfaces, verify pathfinding updates, and check resource capacity constraints.
