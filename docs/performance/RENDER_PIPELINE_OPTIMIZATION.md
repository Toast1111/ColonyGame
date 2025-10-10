# Render Pipeline Optimization

## Overview

This document describes the render pipeline optimization implemented to transform the game from **immediate-mode drawing** (thousands of `fillRect`/`arc` calls) to a **blit-based rendering system** (cached canvas blitting).

## Problem Statement

**Previous Pipeline (Immediate Mode):**
1. Clear → 2. World tiles (100-500 fillRect) → 3. Entities (many rects/arcs) → 4. Colonists (4× images per colonist) → 5. Particles (arcs/lines) → 6. Night rect → 7. Debug → 8. UI (125-405 rects + text)

**Target Pipeline (Blit-Based):**
1. drawImage(worldBack) - one blit
2. Dynamic buildings only (few fillRect or mini-bitmaps)
3. Colonists (C images, after composition cache)
4. Particles/bullets (sprite images, no arcs/lines)
5. Night overlay (1 drawImage of prebuilt vignette or one fillRect)
6. Debug (optional; throttled to 4 Hz into panel)
7. UI panels (N panel blits, no live text drawing)

## Implementation

### 1. World Background Cache (`WorldBackgroundCache`)

**Location:** `src/core/RenderCache.ts`

Pre-renders the static world background (ground, grid, floors) to an offscreen canvas. This canvas is then blitted once per frame instead of drawing hundreds of tiles.

**Benefits:**
- Reduces 100-500 fillRect calls to 1 drawImage call
- Especially effective for large worlds
- Only re-renders when terrain changes

**Usage:**
```typescript
// In RenderManager
const worldCanvas = worldBackgroundCache.getCanvas(ctx, terrainGrid);
ctx.drawImage(worldCanvas, 0, 0);
```

### 2. Colonist Sprite Composition Cache (`ColonistSpriteCache`)

**Location:** `src/core/RenderCache.ts`

Caches fully composed colonist sprites (body + apparel + head + hair) to avoid expensive per-frame pixel manipulation.

**Previous Cost:**
- 4 layers per colonist
- Each layer requires ImageData tinting (very expensive)
- Called every frame for every visible colonist

**Optimized Cost:**
- 1 cached canvas blit per colonist
- Tinting only done once when sprite is first created
- 4× performance improvement for colonist rendering

**Usage:**
```typescript
// In render.ts drawColonistAvatar()
const composedSprite = colonistSpriteCache.getComposedSprite(
  colonist, direction, imageAssets, createTintedSprite
);
if (composedSprite) {
  ctx.drawImage(composedSprite, -spriteWidth/2, -offsetY);
}
```

### 3. Particle Sprite Cache (`ParticleSpriteCache`)

**Location:** `src/core/RenderCache.ts`, `src/core/particles/particleRender.ts`

Converts particle rendering from arc() drawing to pre-rendered sprite blitting.

**Previous Cost:**
- Multiple arc() + fill() calls per particle
- 2-3 circles per particle (glow, main, core)
- Called for every particle every frame

**Optimized Cost:**
- 1 drawImage call per particle
- Sprites pre-rendered with glow effects
- No arc() calls in main render loop

**Toggle:**
```typescript
toggleParticleSprites(true);  // Use sprites (optimized)
toggleParticleSprites(false); // Use arc() (legacy)
```

### 4. Night Overlay Cache (`NightOverlayCache`)

**Location:** `src/core/RenderCache.ts`

Pre-renders the night overlay to a canvas instead of drawing a fillRect every frame.

**Benefits:**
- Reduces state changes
- Consistent with blit-based pipeline
- Can be extended with vignette effects

### 5. UI Panel Cache (`UIPanelCache`)

**Location:** `src/core/RenderCache.ts`

Framework for caching UI panels to avoid expensive text rendering each frame.

**Configuration:**
- Auto-refresh every 100ms (configurable)
- Reduces text rendering calls significantly
- Safari/iPad especially benefit from this

## Performance Toggles

The optimization system includes keyboard toggles for A/B testing:

| Key | Toggle | Description |
|-----|--------|-------------|
| `1` | World Cache | Toggle world background caching |
| `2` | Colonist Cache | Toggle colonist sprite composition cache |
| `3` | Particle Sprites | Toggle particle sprite rendering |
| `M` | Performance HUD | Show/hide performance metrics |

## Performance Metrics

The Performance HUD (press `M`) displays:

```
📊 PERFORMANCE MONITOR
✓ FPS: 60.0 | Frame: 16.7ms
⏱ Sim: 60Hz | α: 1.00
🤖 AI: 100% updated (4/4)
📦 Cache: 95.0% hits (256 entries)
✓ Render: W:ON C:ON P:ON
  └─ 12 colonist sprites cached
```

**Render Line Explanation:**
- `W:ON/OFF` - World background cache enabled/disabled
- `C:ON/OFF` - Colonist sprite cache enabled/disabled  
- `P:ON/OFF` - Particle sprites enabled/disabled
- Shows number of cached colonist sprites

## Expected Performance Gains

Based on the problem statement and implementation:

1. **World Rendering:** 100-500 fillRect → 1 drawImage = **~95% reduction**
2. **Colonist Rendering:** 4 layers × N colonists → 1 blit × N colonists = **75% reduction**
3. **Particle Rendering:** 3 arc() calls → 1 drawImage = **67% reduction per particle**
4. **Overall Frame Time:** Estimated **15-60ms improvement** (especially on lower-end devices)

## Testing Methodology

### Quick Sanity Checks

1. **Toggle World Cache (Key `1`):**
   - With cache: Should see single blit operation
   - Without cache: Reverts to individual tile drawing
   - **Expected:** Significant performance difference on large worlds

2. **Toggle Colonist Cache (Key `2`):**
   - With cache: 1 blit per colonist
   - Without cache: 4 layers per colonist
   - **Expected:** 4× improvement in colonist layer time

3. **Toggle Particle Sprites (Key `3`):**
   - With sprites: Pre-rendered blits
   - Without sprites: arc() loops
   - **Expected:** Particle rendering spikes should vanish

### Performance Profiling

1. Press `M` to show Performance HUD
2. Monitor FPS and frame time with different toggle combinations
3. Test with many colonists and particles active
4. Compare legacy vs optimized modes

## Future Enhancements

### Building Sprite Cache
Convert dynamic building rendering to cached sprites:
- Pre-render building types with different states
- Cache damage states and construction progress
- Further reduce fillRect calls

### Advanced UI Caching
Extend UI panel caching to more panels:
- HUD elements
- Build menu
- Colonist profiles
- Context menus

### Dirty Region Tracking
Already implemented but not fully integrated:
- Only redraw changed regions
- Further optimize world background updates
- Combine with existing `DirtyRectTracker`

## Files Modified

### New Files
- `src/core/RenderCache.ts` - All caching implementations

### Modified Files
- `src/game/render.ts` - Colonist sprite caching integration
- `src/game/managers/RenderManager.ts` - World and night overlay caching
- `src/core/particles/particleRender.ts` - Particle sprite system
- `src/game/Game.ts` - Toggle keyboard shortcuts
- `src/game/ui/performanceHUD.ts` - Render cache metrics display

## Maintenance Notes

### Cache Invalidation

**World Cache:**
- Invalidated when floors change (setFloorRect)
- Automatically re-renders on next frame
- Call `worldBackgroundCache.markDirty()` when terrain changes

**Colonist Cache:**
- Keyed by: bodyType, skinTone, apparelType, clothing, headType, hairStyle, hairColor, direction
- Automatically grows as new combinations are encountered
- Call `colonistSpriteCache.clear()` if memory becomes an issue

**Particle Cache:**
- Keyed by: color, size, type
- Static sprites, no invalidation needed
- Call `particleSpriteCache.clear()` to free memory

### Memory Considerations

- Colonist cache grows with unique sprite combinations
- Typical game: 50-100 cached sprites (~1-2MB)
- Monitor cache size via Performance HUD
- Can add LRU eviction if needed

## References

- [RENDER_OPT_QUICKREF.md](./RENDER_OPT_QUICKREF.md) - Previous rendering optimizations
- [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) - Complete optimization history
- Problem Statement: Issue in GitHub repository
