# Work Priority Panel - DPR Scaling Fix

## Problem
The work priority panel was not scaling correctly with the dynamic window size, and click/tap coordinates were not mapping to the correct cells.

## Root Cause
The game uses **Device Pixel Ratio (DPR)** for high-DPI display support:
- **Canvas physical dimensions**: `canvas.width = logicalWidth * DPR`
- **Mouse event coordinates**: `e.offsetX` and `e.offsetY` are in **logical/CSS space** (not scaled)
- **Canvas drawing**: Happens in **physical pixel space** (scaled by DPR)

### The Mismatch
1. The panel was drawing at physical coordinates: `canvas.width × canvas.height`
2. Mouse clicks were in logical space: `e.offsetX × e.offsetY`
3. These coordinate systems didn't match up, causing clicks to miss their targets

## Solution
Multiply mouse coordinates by DPR to convert from logical to physical space:

```typescript
// Before (incorrect):
handleWorkPriorityPanelClick(e.offsetX, e.offsetY, ...)

// After (correct):
handleWorkPriorityPanelClick(e.offsetX * this.DPR, e.offsetY * this.DPR, ...)
```

## Implementation Details

### In `Game.ts`
- Changed click handler to scale mouse coordinates by `this.DPR`
- This matches how other UI elements handle clicks (see line 619: `const mx = this.mouse.x * this.DPR`)

### In `workPriorityPanel.ts`
- Drawing already uses `canvas.width` and `canvas.height` (physical dimensions) ✅
- Click detection now receives DPR-scaled coordinates ✅
- Both systems now work in the same coordinate space ✅

### Responsive Sizing
The `calculateDimensions()` function properly calculates panel layout:
- Uses 90% of screen width (600-1400px range)
- Uses 85% of screen height (400-900px range)
- Cell sizes adapt to colonist count and available space
- Works correctly because both drawing and clicking use physical canvas dimensions

## Testing
To test the fix:
1. Open the game in browser
2. Press `P` to open work priority panel
3. Verify panel scales with window resizing
4. Click on cells to cycle priorities
5. Verify clicks register on the correct cells
6. Test on different screen sizes and DPR settings

## Technical Context
This is a common issue in canvas-based applications:
- Modern displays have DPR > 1 (Retina displays = 2x, some = 3x)
- Canvas physical size ≠ CSS size to maintain sharpness
- All UI coordinates must be in the same space (logical OR physical, not mixed)
- The game chose physical space for drawing, so clicks must be converted to physical space
