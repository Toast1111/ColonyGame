# Game.ts Refactoring Roadmap - October 7, 2025

## Current Status

**Game.ts**: 3,242 lines
**Target**: <500 lines (ultimate goal)

### Progress So Far

✅ **Phase 1**: Core Systems Created
- GameState (160 lines) - Entity data
- TimeSystem (110 lines) - Time/speed control
- CameraSystem (155 lines) - Camera & transforms  
- ResourceSystem (165 lines) - Resources & storage

✅ **Phase 2**: Systems Integration
- Added property redirects for backward compatibility
- Game.ts successfully delegates to systems

✅ **Phase 3**: UI/Input Managers
- InputManager (170 lines) - Keyboard events ✅ COMPLETE
- UIManager (240 lines) - UI state management ✅ COMPLETE  
- Keyboard bug fixed - toggles now work properly

**Total Extracted So Far**: ~1,000 lines of organized code

## Remaining Work - Extraction Opportunities

### 🎯 High Impact (Start Here)

#### 1. Input Event Handlers → InputManager
**Lines to Extract**: ~400 lines  
**Current Location**: Game.ts `bindInput()` method  
**Complexity**: Medium

**What to move**:
- Mouse event listeners (mousemove, mousedown, mouseup)
- Touch event listeners (touchstart, touchmove, touchend)
- Wheel event for zooming
- Window resize handler

**Challenge**: Some handlers call game logic methods (paintPathAtMouse, pendingPlacement handling). Need to use callbacks or emit events.

**Strategy**:
```typescript
// InputManager provides events, Game subscribes
inputManager.on('mouseMove', (pos) => {
  if (this.pendingPlacement && this.mouse.down) {
    this.updatePendingPlacement(pos);
  }
});
```

---

#### 2. Rendering → RenderManager
**Lines to Extract**: ~300 lines
**Current Location**: Game.ts `draw()` method
**Complexity**: Low (already modular)

**What to move**:
- Main draw() orchestration
- Ghost placement rendering
- Debug rendering (nav grid, paths, regions)
- Particle rendering

**Already extracted**:
- ✅ drawHUD() in render.ts
- ✅ drawBuildMenu() in ui/buildMenu.ts
- ✅ drawColonistProfile() in ui/colonistProfile.ts
- ✅ drawContextMenu() in ui/contextMenu.ts
- ✅ drawPlacementUI() in ui/placement.ts

**What remains**:
- Coordinating all the draw calls
- Ghost placement (when not in precise placement mode)
- Debug overlays

**Strategy**:
```typescript
// RenderManager
class RenderManager {
  constructor(private game: Game) {}
  
  render() {
    this.drawWorld();
    this.drawEntities();
    this.drawGhosts();
    this.drawDebug();
    this.drawUI();
  }
}
```

---

### 📦 Medium Impact

#### 3. Building System → BuildingManager
**Lines to Extract**: ~200 lines
**Current Location**: Scattered through Game.ts
**Complexity**: Medium

**What to move**:
- `tryBuild()` - building placement validation
- `finalizePlacement()` - construction completion
- Building collision detection
- Building cost validation
- Construction queue management

**Keep in Game.ts**:
- Building array (already in GameState)
- Final placement confirmation (thin wrapper)

---

#### 4. Colonist Logic → ColonistManager  
**Lines to Extract**: ~300 lines
**Current Location**: Game.ts methods
**Complexity**: High (deeply integrated)

**What to move**:
- `getWorkSpeedMultiplier()`
- `getMoveSpeedMultiplier()`
- `getArmorReduction()`
- `recalculateColonistHealth()`
- `tryConsumeInventoryFood()`
- `recalcInventoryWeight()`
- Equipment/inventory helpers

**Keep in Game.ts**:
- Colonist array (already in GameState)
- FSM update calls (thin wrapper)

---

#### 5. Combat System → CombatManager
**Lines to Extract**: ~150 lines
**Current Location**: Game.ts combat methods
**Complexity**: Medium

**What to move**:
- `applyDamageToColonist()`
- `calculatePainFromDamage()`
- `calculateBleedingFromDamage()`
- `calculateHealRate()`
- `calculateInfectionChance()`
- `generateInjuryDescription()`
- Turret firing logic

**Keep in Game.ts**:
- Combat FSM updates (thin wrapper)

---

### 🔧 Low Impact (Later)

#### 6. Enemy Spawning → EnemyManager
**Lines to Extract**: ~100 lines
**Current Location**: Game.ts enemy methods
**Complexity**: Low

**What to move**:
- `tryRespawn()` - enemy spawn logic
- `scatter()` - enemy positioning
- Enemy spawn rates
- Day/night spawn modifiers

---

## Recommended Extraction Order

### Phase 4: Input Event Handlers (Next!)
**Impact**: Removes 400 lines, completes InputManager
**Risk**: Medium - needs careful callback design
**Benefit**: Clean separation of input handling

### Phase 5: Rendering 
**Impact**: Removes 300 lines
**Risk**: Low - already modular
**Benefit**: Clear render pipeline

### Phase 6: Building System
**Impact**: Removes 200 lines  
**Risk**: Medium - touches many systems
**Benefit**: Cleaner building logic

### Phase 7: Colonist Manager
**Impact**: Removes 300 lines
**Risk**: High - heavily integrated
**Benefit**: Consolidates colonist logic

### Phase 8: Combat Manager
**Impact**: Removes 150 lines
**Risk**: Medium
**Benefit**: Isolated combat calculations

### Phase 9: Enemy Manager
**Impact**: Removes 100 lines
**Risk**: Low
**Benefit**: Complete enemy separation

## Final Architecture Goal

```
Game.ts (~400 lines)
├── Constructor & initialization
├── Main update() loop
├── Thin wrappers calling managers
└── Manager coordination

Managers/Systems (~2,800 lines organized)
├── GameState (160 lines) - Data
├── TimeSystem (110 lines) - Time
├── CameraSystem (155 lines) - Camera
├── ResourceSystem (165 lines) - Resources
├── InputManager (600 lines) - All input ✨
├── UIManager (240 lines) - UI state
├── RenderManager (400 lines) - Rendering ✨
├── BuildingManager (250 lines) - Buildings ✨
├── ColonistManager (350 lines) - Colonists ✨
├── CombatManager (200 lines) - Combat ✨
└── EnemyManager (150 lines) - Enemies ✨
```

## Success Metrics

- ✅ Game.ts under 500 lines
- ✅ Each manager has single, clear responsibility
- ✅ 100% backward compatible
- ✅ No regressions in functionality
- ✅ Easier to test and maintain

## Next Steps

1. **Start Phase 4**: Extract input event handlers
   - Move mouse/touch/wheel listeners to InputManager
   - Use event callbacks for game logic
   - Test all input interactions

2. **Continue to Phase 5**: Create RenderManager
   - Move draw() orchestration
   - Keep existing render functions
   - Clean render pipeline

3. **Iterate through remaining phases**

---

**Current Focus**: Complete InputManager by moving all event handlers
**Next Focus**: Create RenderManager for clean rendering
**Ultimate Goal**: Game.ts as thin coordinator, all logic in focused managers
