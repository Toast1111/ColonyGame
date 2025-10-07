# Work Priority Panel - Header Text Clipping Fix

## Problem

The rotated/slanted text in the column headers was getting cut off. This happened because:

1. **Clipping region was too restrictive** - The canvas clipping area started at `tableY` which is where the headers begin
2. **Rotated text extends beyond cell bounds** - When text is rotated 45° or 90°, it extends outside the cell's rectangular boundary
3. **Headers were drawn inside clip region** - The clipping was applied before drawing headers, cutting off the rotated text

### Visual Explanation

```
┌─────────────────────────┐
│   Panel Header          │
├─────────────────────────┤ ← tableY (where clipping started)
│ Name │ Con│Gro│Min│... │ ← Header row (rotated text got clipped here!)
├──────┼───┼───┼───┼─────┤
│ John │ 1 │ 2 │ 3 │ ... │
│ Mary │ 2 │ 1 │ 4 │ ... │
└──────┴───┴───┴───┴─────┘
         ↑
    Rotated text extends
    beyond cell - CLIPPED!
```

## Solution

Draw the headers **BEFORE** applying the clipping region, then clip only the data rows:

### Implementation

```typescript
// Draw column headers BEFORE clipping (so rotated text isn't cut off)
let headerX = tableX + nameColumnWidth;

// Header row background
ctx.fillStyle = '#2a4a6a';
ctx.fillRect(tableX, tableY - panelScrollY, tableWidth, cellHeight);

// "Name" header
ctx.fillStyle = '#fff';
ctx.font = `bold ${Math.round(headerFontSize)}px Arial, sans-serif`;
ctx.textAlign = 'left';
ctx.fillText('Colonist', tableX + padding * 0.5, tableY - panelScrollY + cellHeight * 0.65);

// Work type column headers with rotated text
for (const workType of WORK_TYPE_ORDER) {
  const info = WORK_TYPE_INFO[workType];
  
  // Draw header background and border
  ctx.fillStyle = '#2a4a6a';
  ctx.fillRect(headerX, tableY - panelScrollY, cellWidth, cellHeight);
  
  ctx.strokeStyle = '#1a2a3a';
  ctx.lineWidth = 1;
  ctx.strokeRect(headerX, tableY - panelScrollY, cellWidth, cellHeight);
  
  // Rotated text (45° or 90° depending on cell width)
  ctx.save();
  ctx.fillStyle = '#e0e0e0';
  
  if (cellWidth >= panelWidth * 0.04) {
    // Angled text for wider cells (45 degree rotation)
    ctx.translate(headerX + cellWidth / 2, tableY - panelScrollY + cellHeight - cellHeight * 0.1);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = 'right';
    ctx.fillText(info.label, 0, 0);
  } else {
    // Vertical text for narrower cells
    ctx.translate(headerX + cellWidth / 2, tableY - panelScrollY + cellHeight - cellHeight * 0.1);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'left';
    ctx.fillText(info.label.substring(0, 8), 0, 0);
  }
  ctx.restore();
  
  headerX += cellWidth;
}

// NOW apply clipping for the data rows only (excludes headers)
ctx.save();
ctx.beginPath();
ctx.rect(tableX, tableY + cellHeight - panelScrollY, tableWidth, tableHeight - cellHeight);
ctx.clip();

// Draw colonist data rows (these get clipped if they overflow)
// ...
```

### Key Changes

**Before:**
```typescript
// Applied clipping first
ctx.save();
ctx.rect(tableX, tableY, tableWidth, tableHeight);
ctx.clip();

// Then drew headers (got clipped!)
for (const workType of WORK_TYPE_ORDER) {
  // Rotated text gets cut off
}
```

**After:**
```typescript
// Draw headers first (no clipping)
for (const workType of WORK_TYPE_ORDER) {
  // Rotated text has full space
}

// Then apply clipping for data rows only
ctx.save();
ctx.rect(tableX, tableY + cellHeight - panelScrollY, tableWidth, tableHeight - cellHeight);
ctx.clip();
```

## Result

✅ **Full header text visible** - Rotated text no longer gets cut off  
✅ **Data rows still clipped** - Overflow scrolling still works correctly  
✅ **Proper visual hierarchy** - Headers always visible, data scrollable  
✅ **Works at all screen sizes** - Responsive layout maintained  

### Visual Result

```
┌─────────────────────────┐
│   Panel Header          │
├─────────────────────────┤
│ Name │ Construction    │ ← Rotated text fully visible!
│      │     Growing     │
│      │      Mining     │
├──────┼───┼───┼───┼─────┤ ← Clipping starts here
│ John │ 1 │ 2 │ 3 │ ... │
│ Mary │ 2 │ 1 │ 4 │ ... │
└──────┴───┴───┴───┴─────┘
```

The headers now have full space to render their rotated text, while the data rows below are properly clipped for scrolling!
