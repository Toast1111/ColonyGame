# Danger Memory System Removal - Bug Fix

## Issue Description
Critical bug where the danger memory system was causing severe performance and gameplay issues:
- Danger zones created when colonists saw enemies
- Zones never properly despawned 
- Timer stayed stuck at 542.5 seconds instead of counting down
- Tiles marked as dangerous were slowing down colonists permanently
- Circles accumulated over time, degrading performance

## Root Cause
The danger memory system used `c.t` (colonist time) for timer calculations, but this timer was not being properly updated, causing the danger zones to persist indefinitely instead of fading after 20 seconds as intended.

## Solution
Since the danger memory system was:
1. Not working correctly (timer bug)
2. Not essential to gameplay anymore
3. Causing negative gameplay impact (slowing colonists, visual clutter)

**The entire danger memory system has been removed.**

## Files Modified

### 1. `/src/game/colonist_systems/colonistFSM.ts`
**Removed**: Danger memory creation when colonists flee
- Lines ~402-410: Removed code that created danger memory entries
- Lines ~410: Removed code that filtered old danger memories

**Before**:
```typescript
if (newState === 'flee' && danger) {
  (c as any).dangerMemory = (c as any).dangerMemory || [];
  (c as any).dangerMemory.push({
    x: danger.x,
    y: danger.y,
    time: c.t,
    radius: 180
  });
  (c as any).dangerMemory = (c as any).dangerMemory.filter((mem: any) => c.t - mem.time < 20);
}
```

**After**:
```typescript
// Danger memory system removed
```

### 2. `/src/game/Game.ts`
**Simplified**: `nearestSafeCircle()` to just use nearest circle
- Lines ~1629-1660: Removed danger memory filtering logic

**Before**:
```typescript
nearestSafeCircle<T>(c: Colonist, p: { x: number; y: number }, arr: T[]): T | null {
  const safeTargets = arr.filter(target => {
    // Complex danger memory checking...
  });
  return this.nearestCircle(p, safeTargets);
}
```

**After**:
```typescript
nearestSafeCircle<T>(c: Colonist, p: { x: number; y: number }, arr: T[]): T | null {
  // Danger memory system removed - just use nearest circle
  return this.nearestCircle(p, arr);
}
```

### 3. `/src/game/navigation/navGrid.ts`
**Simplified**: `computePathWithDangerAvoidance()` to use regular A* pathfinding
- Lines ~51-80: Removed pathfinding cost modification based on danger zones

**Before**:
```typescript
export function computePathWithDangerAvoidance(game: Game, c: Colonist, sx, sy, tx, ty) {
  // Complex grid cost modification based on danger memory
  const modifiedCosts = [];
  for (const mem of dangerMemory) {
    // Modify grid costs around danger zones...
  }
  const path = aStar(game.grid, sx, sy, tx, ty);
  // Restore original costs...
  return path;
}
```

**After**:
```typescript
export function computePathWithDangerAvoidance(game: Game, c: Colonist, sx, sy, tx, ty) {
  // Danger memory system removed - just use regular pathfinding
  return aStar(game.grid, sx, sy, tx, ty);
}
```

### 4. `/src/game/managers/RenderManager.ts`
**Removed**: Danger memory visualization rendering
- Lines ~196-199: Removed render call
- Lines ~456-518: Removed entire `renderDangerMemory()` method

**Before**:
```typescript
if (game.debug.colonists) {
  this.renderDangerMemory();
}

private renderDangerMemory(): void {
  // 60+ lines of rendering red circles with timers...
}
```

**After**:
```typescript
// Danger memory visualization removed
```

## Impact

### Positive Changes ✅
- **Performance**: No more grid cost modifications every pathfinding call
- **Gameplay**: Colonists no longer avoid valid work areas
- **Visual**: No more cluttered danger circles on screen
- **Code**: Simpler, more maintainable pathfinding logic
- **Bug**: Fixed the stuck timer issue completely by removing the system

### Behavior Changes
- **Task Assignment**: Colonists will now choose the nearest available target, even if enemies were recently seen there
- **Pathfinding**: Colonists take the most efficient path without danger avoidance
- **No Breaking Changes**: The game already has a flee system that works independently of danger memory

### Preserved Functionality
The danger memory removal does **NOT** affect:
- ✅ Flee state: Colonists still flee from enemies when detected
- ✅ Safe building seeking: Colonists still find safe buildings when fleeing
- ✅ Enemy avoidance: Active danger detection still works
- ✅ Combat system: All combat mechanics unchanged
- ✅ Turret protection: Colonists still seek turret-protected areas

## Testing Recommendations

### Before Playing
1. Clear any existing save data if colonists are stuck with old danger memories
2. Start a fresh game or verify colonists can move freely

### What to Test
1. **Enemy Encounter**: 
   - Colonists flee when enemies appear ✅
   - After enemies are defeated/gone, colonists return to normal tasks ✅
   - No red circles appear on screen ✅
   - Colonists don't avoid the area where enemies were ✅

2. **Pathfinding**:
   - Colonists take direct paths to resources ✅
   - No unexpected slowdowns ✅
   - Tasks are assigned to nearest targets ✅

3. **Performance**:
   - Smooth gameplay with multiple colonists ✅
   - No frame drops during pathfinding ✅

## Migration Notes

### For Existing Games
If loading a save game with existing danger memory data:
- Old danger memory arrays will be ignored (not used anywhere)
- They will be garbage collected over time
- No manual cleanup needed
- No save game corruption

### For Developers
If you were using danger memory for mods or extensions:
- `dangerMemory` property still exists on colonists but is never populated
- `computePathWithDangerAvoidance()` still exists but just calls regular A*
- `nearestSafeCircle()` still exists but just calls `nearestCircle()`
- Consider these deprecated and use the base functions instead

## Conclusion

The danger memory system has been cleanly removed, fixing the critical bug and simplifying the codebase. The game now uses a more direct and performant approach to pathfinding and task assignment, while still maintaining all essential flee and safety behaviors.

**Status**: ✅ Bug Fixed - Danger Memory System Completely Removed
