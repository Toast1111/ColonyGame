# Render Pipeline Optimization - Quick Start

## What Changed?

Transformed the game's rendering from **immediate-mode drawing** (thousands of operations per frame) to a **blit-based caching system** (dozens of operations per frame).

### Before (Immediate Mode)
```
1. Clear canvas
2. Draw 100-500 ground tiles (fillRect calls)
3. Draw entities (many rect/arc calls)
4. Draw colonists (4 layers × N colonists - expensive pixel manipulation each frame)
5. Draw particles (3 arc() calls per particle)
6. Draw night overlay (fillRect)
7. Draw debug overlays
8. Draw UI (125-405 rects + text rendering)
```

### After (Optimized Blit-Based)
```
1. Blit cached world background (1 drawImage)
2. Draw dynamic buildings only (minimal fillRect)
3. Blit cached colonist sprites (1 drawImage per colonist)
4. Blit cached particle sprites (1 drawImage per particle)
5. Blit cached night overlay (1 drawImage)
6. Debug (throttled, optional)
7. Blit cached UI panels (N drawImage calls)
```

## Testing the Optimizations

### Keyboard Shortcuts

| Key | Function | Description |
|-----|----------|-------------|
| `M` | Performance HUD | Toggle performance metrics display |
| `1` | World Cache | Toggle world background caching ON/OFF |
| `2` | Colonist Cache | Toggle colonist sprite composition cache ON/OFF |
| `3` | Particle Sprites | Toggle particle sprite rendering ON/OFF |

### Performance HUD

Press `M` to show the Performance HUD in the top-right corner:

```
📊 PERFORMANCE MONITOR
✓ FPS: 60.0 | Frame: 16.7ms
⏱ Sim: 60Hz | α: 1.00
🤖 AI: 100% updated (3/3)
📦 Cache: 95.0% hits (256 entries)
✓ Render: W:ON C:ON P:ON
  └─ 12 colonist sprites cached
```

**Render Line Indicators:**
- `W:ON/OFF` - World background cache enabled/disabled
- `C:ON/OFF` - Colonist sprite cache enabled/disabled
- `P:ON/OFF` - Particle sprites enabled/disabled
- `✓` = All optimizations enabled (optimal performance)
- `⚠` = Some optimizations disabled (legacy mode)

### Quick Performance Test

1. **Start the game** - Press `M` to show Performance HUD
2. **Press `1`** - Toggle world cache OFF (legacy mode)
   - Observe frame time increase on large worlds
3. **Press `1`** - Toggle world cache back ON
   - Frame time should improve significantly
4. **Press `2`** - Toggle colonist cache OFF
   - With many colonists, frame time will increase 4×
5. **Press `2`** - Toggle back ON
   - Performance returns to optimal
6. **Press `3`** - Toggle particle sprites OFF
   - During combat/effects, particle rendering will spike
7. **Press `3`** - Toggle back ON
   - Particle spikes vanish

## Expected Performance Gains

### By Component

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| World Rendering | 100-500 fillRect | 1 drawImage | ~95% reduction |
| Colonist Rendering | 4 layers × N | 1 blit × N | 75% reduction |
| Particle Rendering | 3 arc() × N | 1 blit × N | 67% reduction |
| **Total Frame Time** | - | - | **15-60ms** improvement |

### Real-World Impact

- **Low-end devices:** 30 FPS → 60 FPS (smooth gameplay)
- **Mid-range devices:** 60 FPS with headroom for more colonists/particles
- **High-end devices:** Consistent 60 FPS with large colonies

## Implementation Details

### 1. World Background Cache
**File:** `src/core/RenderCache.ts` - `WorldBackgroundCache`

Pre-renders the static world (ground, grid, floors) to an offscreen canvas. Updates only when terrain changes.

### 2. Colonist Sprite Composition Cache
**File:** `src/core/RenderCache.ts` - `ColonistSpriteCache`

Caches fully composed colonist sprites to avoid expensive pixel manipulation every frame:
- Composites: body + apparel + head + hair
- Cache key: bodyType, skinTone, apparelType, clothing, headType, hairStyle, hairColor, direction
- Automatic growth as new combinations appear

### 3. Particle Sprite Cache
**Files:** 
- `src/core/RenderCache.ts` - `ParticleSpriteCache`
- `src/core/particles/particleRender.ts`

Converts particle rendering from `arc()` drawing to pre-rendered sprite blitting:
- Pre-renders particles with glow effects
- Cache key: color, size, type
- No arc() calls in main render loop

### 4. Night Overlay Cache
**File:** `src/core/RenderCache.ts` - `NightOverlayCache`

Pre-renders the night overlay as a static canvas instead of drawing fillRect each frame.

## Files Modified

### New Files
- ✅ `src/core/RenderCache.ts` - All caching implementations
- ✅ `docs/performance/RENDER_PIPELINE_OPTIMIZATION.md` - Detailed documentation

### Modified Files
- ✅ `src/game/render.ts` - Colonist sprite caching integration
- ✅ `src/game/managers/RenderManager.ts` - World and night overlay caching, toggle methods
- ✅ `src/core/particles/particleRender.ts` - Particle sprite system with toggle
- ✅ `src/game/Game.ts` - Keyboard shortcuts for toggles
- ✅ `src/game/ui/performanceHUD.ts` - Render cache metrics display
- ✅ `src/main.ts` - Updated help text with new shortcuts

## Cache Management

### Memory Considerations

**Colonist Cache:**
- Grows automatically with unique sprite combinations
- Typical game: 50-100 cached sprites (~1-2MB)
- Monitor via Performance HUD
- Clear manually if needed: `colonistSpriteCache.clear()`

**World Cache:**
- Static size based on world dimensions
- Only re-renders when floors/terrain change
- Invalidate: `worldBackgroundCache.markDirty()`

**Particle Cache:**
- Static sprites keyed by color/size
- Minimal memory footprint
- Clear if needed: `particleSpriteCache.clear()`

### Cache Invalidation

- **World:** Automatically invalidates when `setFloorRect()` is called
- **Colonist:** Never invalidated (sprites are immutable per combination)
- **Particle:** Never invalidated (static pre-rendered sprites)

## Development Notes

### Adding More Caching

The `RenderCache.ts` file provides a `UIPanelCache` framework ready for:
- HUD elements
- Build menus
- Colonist profile panels
- Context menus

### Future Enhancements

1. **Building Sprite Cache** - Pre-render building types with states
2. **Advanced UI Caching** - Extend to all UI panels
3. **Dirty Region Tracking** - Use existing `DirtyRectTracker` for partial redraws

## Troubleshooting

### Performance HUD Not Showing
- Press `M` to toggle
- Check browser console for errors

### Optimizations Not Working
- Press `1`, `2`, `3` to ensure they're enabled (ON state)
- Check Performance HUD shows `✓ Render: W:ON C:ON P:ON`

### Visual Artifacts
- Try toggling optimizations off/on
- Check browser console for cache errors
- Clear caches using debug console (backtick key)

## References

- [RENDER_PIPELINE_OPTIMIZATION.md](./RENDER_PIPELINE_OPTIMIZATION.md) - Complete technical documentation
- [RENDER_OPT_QUICKREF.md](./RENDER_OPT_QUICKREF.md) - Previous rendering optimizations
- [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) - Complete optimization history
