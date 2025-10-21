# RimWorld Systems Cleanup Plan

## Current Status

The `src/game/rimworld-systems/` folder contains a mix of:
- **PRODUCTION CODE** (actually used in the game)
- **EXPERIMENTAL CODE** (never fully integrated)
- **EXAMPLE CODE** (demonstration files)
- **DUPLICATE/LEGACY CODE** (old versions of systems)

This creates confusion and makes the codebase harder to maintain.

## What's Actually Being Used

### ✅ **ACTIVELY USED** (Keep & Refactor)

1. **Floor Items System** (`items/floorItems.ts`)
   - Used by: FSM (`colonistFSM.ts`), work givers, debug console
   - Purpose: Visual floor-based item management with stacking
   - **Action**: Move to `src/game/systems/floorItems.ts`

2. **Stockpile Zones** (`stockpiles/stockpileZones.ts`)
   - Used by: Game.ts, rimWorldManager.ts, debug console
   - Purpose: Designated storage areas with filtering
   - **Action**: Move to `src/game/systems/stockpileZones.ts`

3. **RimWorld System Manager** (`rimWorldManager.ts`)
   - Used by: Game.ts (initialized and updated in game loop)
   - Purpose: Integrates floor items + stockpiles + rendering
   - **Action**: Refactor to `src/game/managers/ItemManager.ts` (rename for clarity)

4. **RimWorld Renderer** (`rendering/rimWorldRenderer.ts`)
   - Used by: rimWorldManager.ts for visual feedback
   - Purpose: Renders items and zones
   - **Action**: Move to `src/game/rendering/itemRenderer.ts`

5. **Basic Logistics** (`logistics/haulManager.ts`)
   - Used by: rimWorldManager.ts, workGivers
   - Purpose: Hauling job management
   - **Action**: Move to `src/game/systems/haulManager.ts`

### ⚠️ **PARTIALLY USED** (Needs Decision)

6. **Enhanced Logistics** (`logistics/enhancedHaulManager.ts`)
   - Initialized but never fully integrated
   - Complex RimWorld-style job system
   - **Decision Needed**: Remove or finish integration?

### ❌ **NOT USED** (Delete)

7. **AI System** (`ai/colonistAI.ts`, `ai/ai-vs-fsm-comparison.ts`)
   - Alternative AI system that was never integrated
   - Conflicts with existing FSM
   - **Action**: DELETE (FSM is working fine after our bug fix)

8. **Examples** (`examples/*.ts`)
   - Demo/test files not part of production code
   - **Action**: DELETE or move to `docs/examples/`

9. **Empty Docs** (`ai/WHY_REPLACE_FSM.md`)
   - Empty file
   - **Action**: DELETE

## Proposed New Structure

```
src/game/
├── managers/
│   ├── ItemManager.ts          # Renamed from rimWorldManager
│   ├── InputManager.ts         # Existing
│   ├── UIManager.ts            # Existing
│   └── ...
├── systems/
│   ├── floorItems.ts           # Floor item management
│   ├── stockpileZones.ts       # Stockpile zone management
│   ├── haulManager.ts          # Hauling jobs
│   ├── workPriority.ts         # Existing
│   └── ...
├── rendering/
│   ├── itemRenderer.ts         # Item/zone rendering
│   └── ...
└── types/
    ├── items.ts                # Item-related types
    ├── stockpiles.ts           # Stockpile-related types
    └── ...
```

## Migration Steps

### Phase 1: Move Production Code (Safe)

1. **Move Floor Items**
   ```bash
   # Move file
   move src/game/rimworld-systems/items/floorItems.ts src/game/systems/floorItems.ts
   
   # Update imports in:
   - src/game/Game.ts
   - src/game/colonist_systems/colonistFSM.ts
   - src/game/workGivers/floorHauling.ts
   - src/game/ui/debugConsole.ts
   ```

2. **Move Stockpile Zones**
   ```bash
   move src/game/rimworld-systems/stockpiles/stockpileZones.ts src/game/systems/stockpileZones.ts
   ```

3. **Move Haul Manager**
   ```bash
   move src/game/rimworld-systems/logistics/haulManager.ts src/game/systems/haulManager.ts
   ```

4. **Move Renderer**
   ```bash
   move src/game/rimworld-systems/rendering/rimWorldRenderer.ts src/game/rendering/itemRenderer.ts
   # Rename class: RimWorldRenderer -> ItemRenderer
   ```

5. **Refactor Manager**
   ```bash
   move src/game/rimworld-systems/rimWorldManager.ts src/game/managers/ItemManager.ts
   # Rename class: RimWorldSystemManager -> ItemManager
   # Update Game.ts: this.rimWorld -> this.itemManager
   ```

### Phase 2: Update All Imports

**Files to update:**
- `src/game/Game.ts` - Main initialization
- `src/game/colonist_systems/colonistFSM.ts` - Floor item drops
- `src/game/workGivers/floorHauling.ts` - Work giver
- `src/game/ui/debugConsole.ts` - Debug commands
- `src/game/types.ts` - Type exports

**Search & Replace:**
- `from './rimworld-systems'` → `from '../systems/floorItems'` (context-dependent)
- `from '../rimworld-systems'` → `from '../systems/floorItems'`
- `game.rimWorld` → `game.itemManager`
- `RimWorldSystemManager` → `ItemManager`
- `RimWorldRenderer` → `ItemRenderer`

### Phase 3: Delete Unused Code

```bash
# Delete experimental AI system
rmdir /s src/game/rimworld-systems/ai

# Delete examples
rmdir /s src/game/rimworld-systems/examples

# Delete enhanced logistics (if not used)
del src/game/rimworld-systems/logistics/enhancedHaulManager.ts

# Delete the now-empty rimworld-systems folder
rmdir /s src/game/rimworld-systems
```

### Phase 4: Clean Up Types

Create proper type files:

**`src/game/types/items.ts`**
```typescript
export type ItemType = 'wood' | 'stone' | 'food' | 'wheat' | 'bread' | 'medicine';

export interface FloorItem {
  id: string;
  type: ItemType;
  quantity: number;
  position: { x: number; y: number };
  weight: number;
  stackLimit: number;
  createdAt: number;
}

export interface ItemStack {
  type: ItemType;
  totalQuantity: number;
  position: { x: number; y: number };
  itemIds: string[];
}
```

**`src/game/types/stockpiles.ts`**
```typescript
import type { ItemType } from './items';

export interface StockpileZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  allowedItems: Set<ItemType>;
  priority: number;
  settings: StockpileSettings;
}

export interface StockpileSettings {
  allowAll: boolean;
  maxStacks: number;
  organized: boolean;
}
```

## Benefits After Cleanup

### ✅ **Clarity**
- Clear separation: managers, systems, rendering
- No confusion about what's experimental vs production
- Consistent naming (no "RimWorld" prefix everywhere)

### ✅ **Maintainability**
- All item-related code in `systems/`
- Easier to find and modify
- No orphaned experimental code

### ✅ **Performance**
- Remove unused code from bundle
- Cleaner imports
- Faster TypeScript compilation

### ✅ **Documentation**
- Code structure matches actual architecture
- New developers can understand the system
- Follows the existing manager pattern

## Implementation Checklist

- [ ] Phase 1.1: Move `floorItems.ts` to `systems/`
- [ ] Phase 1.2: Move `stockpileZones.ts` to `systems/`
- [ ] Phase 1.3: Move `haulManager.ts` to `systems/`
- [ ] Phase 1.4: Move renderer to `rendering/itemRenderer.ts`
- [ ] Phase 1.5: Refactor manager to `managers/ItemManager.ts`
- [ ] Phase 2.1: Update imports in `Game.ts`
- [ ] Phase 2.2: Update imports in `colonistFSM.ts`
- [ ] Phase 2.3: Update imports in `workGivers/`
- [ ] Phase 2.4: Update imports in `ui/debugConsole.ts`
- [ ] Phase 2.5: Update type exports
- [ ] Phase 3.1: Delete `ai/` folder
- [ ] Phase 3.2: Delete `examples/` folder
- [ ] Phase 3.3: Delete `enhancedHaulManager.ts` (if unused)
- [ ] Phase 3.4: Delete empty `rimworld-systems/` folder
- [ ] Phase 4.1: Create `types/items.ts`
- [ ] Phase 4.2: Create `types/stockpiles.ts`
- [ ] Phase 4.3: Update type imports across codebase
- [ ] Test: Verify game runs without errors
- [ ] Test: Verify floor items work
- [ ] Test: Verify stockpiles work
- [ ] Test: Verify hauling jobs work
- [ ] Test: Verify debug console commands work
- [ ] Update `docs/README.md` with new structure

## Timeline Estimate

- **Phase 1-2**: 1-2 hours (moving files + updating imports)
- **Phase 3**: 15 minutes (deleting unused code)
- **Phase 4**: 30 minutes (type organization)
- **Testing**: 30 minutes
- **Total**: ~3 hours

## Risk Assessment

### Low Risk
- Moving files is safe (TypeScript will catch broken imports)
- Deleting unused code won't affect production

### Medium Risk
- Renaming `game.rimWorld` → `game.itemManager` touches many files
- Must update debug console commands carefully

### Mitigation
- Do it in phases with testing between
- Use TypeScript compiler to catch all broken references
- Test each feature after each phase

## Questions to Answer

1. **Keep Enhanced Logistics?**
   - If NO: Delete `enhancedHaulManager.ts`
   - If YES: Finish integration or document as "future work"
   - **Recommendation**: Delete (current hauling works fine)

2. **Keep Example Files?**
   - If NO: Delete entirely
   - If YES: Move to `docs/examples/`
   - **Recommendation**: Delete (README.md has enough examples)

3. **Rename RimWorld References?**
   - Should we rename `game.rimWorld` to `game.itemManager`?
   - **Recommendation**: YES (clearer, less confusing)

---

**Ready to proceed?** Start with Phase 1.1 - moving the floor items file and testing that everything still works.
