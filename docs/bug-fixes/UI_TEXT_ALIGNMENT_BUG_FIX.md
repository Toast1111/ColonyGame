# UI Text Alignment Bug Fix

**Issue:** When opening the build menu, all canvas text (stockpile labels, resource counts, etc.) would shift position downwards.

**Root Cause:** Canvas context state leak - the `drawModernBuildMenu()` function was modifying `ctx.textAlign` and `ctx.textBaseline` without properly isolating those changes.

---

## The Problem

Canvas rendering context maintains state that persists across function calls:
- `textAlign` (left, center, right)
- `textBaseline` (top, middle, bottom, alphabetic)
- `fillStyle`, `strokeStyle`, `lineWidth`, etc.

When the modern build menu renders, it sets:
```typescript
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
```

These changes would persist AFTER the function returned, affecting all subsequent text rendering including:
- Stockpile zone labels
- Resource counters
- Building names
- UI tooltips

**Why `ctx.save()`/`ctx.restore()` is critical:**

Canvas has two types of state:
1. **Transform matrix state** (position, rotation, scale) - saved by `ctx.save()`
2. **Drawing style state** (colors, text alignment, line width) - ALSO saved by `ctx.save()`

Without `ctx.save()`/`ctx.restore()` wrapping the entire function, style changes leak out.

---

## The Fix

**Before:**
```typescript
export function drawModernBuildMenu(...) {
  // ... lots of rendering code ...
  ctx.textAlign = 'center';  // ❌ Leaks to other rendering!
  ctx.textBaseline = 'middle';
  // ... more rendering ...
  
  // Manual reset (unreliable - might miss some)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  
  return rects;
}
```

**After:**
```typescript
export function drawModernBuildMenu(...) {
  ctx.save();  // ✅ Save ALL canvas state
  
  // ... lots of rendering code ...
  ctx.textAlign = 'center';  // Safe - will be restored
  ctx.textBaseline = 'middle';
  // ... more rendering ...
  
  ctx.restore();  // ✅ Restore ALL canvas state
  return rects;
}
```

**What `ctx.save()` saves:**
- Transformation matrix (translate, rotate, scale)
- Clipping region
- `strokeStyle`, `fillStyle`
- `globalAlpha`, `globalCompositeOperation`
- `lineWidth`, `lineCap`, `lineJoin`, `miterLimit`
- `lineDashOffset`
- `shadowOffsetX`, `shadowOffsetY`, `shadowBlur`, `shadowColor`
- `font`, `textAlign`, `textBaseline`, `direction`
- `imageSmoothingEnabled`

**What `ctx.restore()` restores:**
ALL of the above properties to their previous values!

---

## Why This Happened

The bug occurred when:
1. User clicks Build tab → `drawModernBuildMenu()` called
2. Function sets `textAlign = 'center'`
3. Function returns WITHOUT restoring state
4. Next frame, stockpile labels render with `textAlign = 'center'` instead of `'left'`
5. Text appears shifted because center-aligned text calculates position differently

**Timeline:**
```
Frame 1: Normal rendering
  └─ Stockpiles render with textAlign='left' ✅

Frame 2: Build menu opened
  └─ drawModernBuildMenu() sets textAlign='center'
  └─ Function returns, state LEAKS
  
Frame 3: Rendering with leaked state
  └─ Stockpiles render with textAlign='center' ❌ (shifted!)
  └─ Resource text renders with textAlign='center' ❌ (shifted!)
```

---

## Additional Fixes Applied

Also fixed the same issue in:

### `src/game/rendering/itemRenderer.ts`

**Stockpile zone rendering:**
```typescript
renderStockpileZones(zones, cameraX, cameraY) {
  ctx.save();  // ✅ Added
  
  // ... rendering with textAlign changes ...
  
  ctx.restore();  // ✅ Added
}
```

**Floor item icons:**
```typescript
private drawItemTypeIcon(...) {
  ctx.save();  // ✅ Added
  
  ctx.textAlign = 'center';
  // ... rendering ...
  
  ctx.restore();  // ✅ Added
}
```

**Item quantities:**
```typescript
private drawQuantityText(...) {
  ctx.save();  // ✅ Added
  
  ctx.textAlign = 'right';
  // ... rendering ...
  
  ctx.restore();  // ✅ Added
}
```

---

## Best Practices

**Always use `ctx.save()`/`ctx.restore()` when:**
1. Changing text alignment
2. Changing text baseline
3. Changing colors/styles temporarily
4. Applying transformations
5. Setting clip regions
6. ANY time you modify canvas context state

**Pattern:**
```typescript
function renderSomething(ctx: CanvasRenderingContext2D) {
  ctx.save();  // Save state at START
  
  // Modify state freely
  ctx.textAlign = 'center';
  ctx.fillStyle = 'red';
  ctx.translate(100, 100);
  
  // ... rendering ...
  
  ctx.restore();  // Restore state at END
}
```

**Why this matters:**
- Prevents state leaks between rendering functions
- Makes code more maintainable
- Avoids mysterious rendering bugs
- Enables parallel development (functions don't interfere)

---

## Testing

After fix:
1. ✅ Open build menu - text stays in correct position
2. ✅ Select category - text stays in correct position
3. ✅ Close build menu - text stays in correct position
4. ✅ Stockpile labels render consistently
5. ✅ Resource counters render consistently

---

## Files Modified

- `src/game/ui/hud/modernBuildMenu.ts` - Added `ctx.save()`/`ctx.restore()` wrapper
- `src/game/rendering/itemRenderer.ts` - Added `ctx.save()`/`ctx.restore()` to 3 methods

---

## Related Issues

This is a common pattern in canvas applications. Similar fixes may be needed in:
- Other UI panels that modify text state
- Custom rendering functions
- Animation systems
- Particle effects

**Rule of thumb:** If a function modifies `ctx.*` properties, wrap it in `save()`/`restore()`.
