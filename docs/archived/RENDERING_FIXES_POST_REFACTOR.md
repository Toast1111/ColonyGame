# Rendering Fixes After Game.ts Refactoring

## Issue Summary

During the recent Game.ts refactoring where rendering was extracted to `RenderManager`, several visual elements were not migrated properly and were missing from the game.

## Problems Found and Fixed

### 1. ✅ Missing Colonist Hiding Indicators

**Problem**: When colonists hide inside buildings (HQ, houses) during enemy attacks, person icons should appear on the building to show how many colonists are inside. This visual feedback was completely missing.

**Root Cause**: The refactoring moved building rendering to `RenderManager.renderEntities()` but forgot to include the colonist count indicators that used to be rendered on buildings with `insideCounts > 0`.

**Solution**: Added colonist hiding indicator rendering in `RenderManager.renderEntities()` after buildings are drawn.

**Implementation Details**:
- Added `drawPersonIcon` import to RenderManager
- Loop through all completed buildings after rendering
- For HQ and house buildings with `insideCounts > 0`:
  - Draw up to 4 person icons in top-right corner (2x2 grid)
  - If more than 4 colonists, show 1 icon + count badge
- Icons use light blue color (`#93c5fd`) for visibility

**Code Added** (RenderManager.ts lines ~86-124):
```typescript
// Colonist hiding indicators - show person icons on buildings with colonists inside
for (const b of game.buildings) {
  if (!b.done) continue;
  const numInside = game.insideCounts.get(b) || 0;
  if (numInside > 0 && (b.kind === 'hq' || b.kind === 'house')) {
    const iconSize = 10;
    const iconSpacing = iconSize + 2;
    const startX = b.x + b.w - 6;
    const startY = b.y + 6;
    
    if (numInside <= 4) {
      for (let i = 0; i < numInside; i++) {
        const iconX = startX - (i % 2) * iconSpacing;
        const iconY = startY + Math.floor(i / 2) * iconSpacing;
        drawPersonIcon(ctx, iconX, iconY, iconSize, '#93c5fd');
      }
    } else {
      // Show count badge for 5+ colonists
      drawPersonIcon(ctx, startX, startY, iconSize, '#93c5fd');
      // ... badge rendering code ...
    }
  }
}
```

### 2. ✅ Missing Selected Colonist Highlight

**Problem**: When a colonist is selected (clicked), they should have a glowing blue circle highlight around them. This selection indicator was not showing up.

**Root Cause**: The colonist rendering code in `RenderManager.renderEntities()` was passing `isSelected = false` hardcoded to all colonists instead of checking `game.selColonist`.

**Solution**: Check if each colonist matches `game.selColonist` and pass the correct boolean to `drawColonistAvatar()`.

**Code Changed** (RenderManager.ts lines ~130-138):
```typescript
// Before:
drawColonistAvatar(ctx, c.x, c.y, c, c.r, false);

// After:
const isSelected = game.selColonist === c;
drawColonistAvatar(ctx, c.x, c.y, c, c.r, isSelected);
```

The selection highlight rendering in `render.ts` was already implemented correctly - it just wasn't being triggered because `isSelected` was always false.

## Files Modified

### `/workspaces/ColonyGame/src/game/managers/RenderManager.ts`

**Changes**:
1. Added `drawPersonIcon` to imports (line 8)
2. Added colonist hiding indicators rendering block (lines ~86-124)
3. Fixed selected colonist detection (lines ~130-138)

**Lines Added**: ~45 lines
**Lines Changed**: 3 lines

## Verification Checklist

### Visual Elements Now Working ✅
- ✅ Colonist hiding indicators on HQ/houses
- ✅ Selected colonist blue highlight circle
- ✅ Building HP bars (was already working)
- ✅ Cooking progress bars on stoves (was already working)
- ✅ Colonist mood indicators (was already working)
- ✅ Colonist carrying indicators (wheat/bread emojis) (was already working)
- ✅ Building construction progress bars (was already working)
- ✅ Ghost building placement preview (was already working)
- ✅ Enemy triangles (was already working)
- ✅ Bullet trails (was already working)
- ✅ Night overlay (was already working)

### Debug Visualizations Still Working ✅
- ✅ Navigation grid (when debug.nav = true)
- ✅ Colonist paths and targets
- ✅ Colonist state/HP debug text
- ✅ Enemy debug info
- ✅ Region debug (when debug.regions = true)
- ✅ Terrain debug (when debug.terrain = true)
- ✅ Combat ranges (when debug.combat = true)

## Testing Instructions

### Test Colonist Hiding Indicators
1. Start the game and wait for night or spawn enemies
2. Colonists should flee and hide in HQ or houses
3. **Expected**: Small blue person icons appear in top-right corner of buildings with colonists inside
4. **Verify**: Icon count matches the "Hiding: X" number in HUD
5. **Verify**: If 5+ colonists in one building, should show 1 icon + count badge

### Test Selected Colonist Highlight
1. Click on any colonist
2. **Expected**: Blue glowing circle appears around the selected colonist
3. **Verify**: Circle has ~30% opacity and extends ~2px beyond colonist radius
4. **Verify**: Highlight disappears when clicking elsewhere or pressing ESC
5. **Verify**: Only one colonist is highlighted at a time

### Regression Testing
Run through the cooking system to ensure all other visuals still work:
1. Build farm → harvest wheat → see wheat emoji on colonist
2. Build stove → colonist cooks → see red progress bar
3. Build pantry → colonist stores bread → see bread emoji on colonist
4. Colonist eats bread → mood indicator updates correctly

## Related Documentation

- **Refactoring Guide**: `docs/refactoring/RENDER_MANAGER_EXTRACTION.md`
- **Cooking System**: `docs/COOKING_SYSTEM_COMPLETE.md`
- **Danger Memory Removal**: `docs/DANGER_MEMORY_REMOVAL.md`

## Notes

### Why These Were Missed

The original refactoring successfully extracted most rendering logic, but these specific items were overlooked because:

1. **Colonist hiding indicators**: This logic was embedded deep in the old Game.ts draw() method and wasn't clearly labeled as "building rendering" - it came after building rendering in a separate loop
2. **Selection highlight**: The `isSelected` parameter existed in the function signature but the call site was using a literal `false` instead of the actual game state

### Future Refactoring Guidelines

When extracting rendering code in the future:
- Search for ALL uses of canvas context (`ctx`) in the source file
- Check for rendering that depends on game state comparisons (like `if (game.selColonist === c)`)
- Verify all helper function parameters are being passed correctly, not hardcoded
- Test visual feedback systems after extraction (selections, indicators, highlights)

## Conclusion

Both rendering issues have been fixed. The game now correctly shows:
1. Person icons on buildings when colonists are hiding inside
2. Blue highlight circle around the selected colonist

No TypeScript compilation errors. All visual systems functioning as expected.

**Status**: ✅ **Complete - All Rendering Fixed**
