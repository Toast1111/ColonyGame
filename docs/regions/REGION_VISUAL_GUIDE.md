# Region System - Visual Guide

## What You Should See

### Press R to toggle region debug view

## Example 1: Open Map (No Buildings)

```
[Large outdoor region covering most of map]
- Trees and rocks create small blocked areas
- Should see 1-10 regions depending on obstacles
- All connected as one outdoor space
```

**Expected Stats:**
- Regions: 1-10
- Rooms: 1-5
- Avg Region Size: 1000+ cells

## Example 2: Build Some Walls

```
Before:           After:
. . . . .         . . . . .
. . . . .   -->   . # # # .   (# = wall)
. . . . .         . #   # .
. . . . .         . # # # .
. . . . .         . . . . .

[Region 0: Outside] [Region 1: Inside walls]
```

**Expected Stats:**
- Regions: 2+
- Rooms: 2
- Clear color difference inside vs outside

## Example 3: Add a Door

```
Before:           After:
. # # # .         . # # # .
. #   # .   -->   . # D # .   (D = door, 1x1 region)
. # # # .         . # # # .

[Region 0: Outside] [Region 1: Door] [Region 2: Inside]
          ^                ^              ^
       (blue)         (green, tiny)   (orange)
```

**Expected Stats:**
- Regions: 3+
- Rooms: 1 (all connected through door)
- Tiny 1x1 region visible at door

## Debugging

### ✅ GOOD: Multiple colored regions
```
[Blue area] [Green tiny dot = door] [Orange area]
```

### ❌ BAD: Only one big region
```
[All same color everywhere]
```

**Fix:** Check that:
1. Walls are being marked as solid
2. Doors have `done: true`
3. Region system is enabled

## Colors

Each region gets a **different hue** based on its ID:
- Region 0: Red-ish
- Region 1: Orange-ish  
- Region 2: Yellow-ish
- Region 3: Green-ish
- etc. (cycles through color wheel)

## Links (Green Lines)

You should see **green lines** where regions connect:
- At doorways
- Along open boundaries
- Between adjacent regions

**No green lines = no connections = regions isolated**

## Stats Panel (Top Left)

When region debug is on:
```
Regions: XX        <- Should be > 1 with buildings
Rooms: XX          <- Groups of connected regions
Avg Region Size: XX <- Cells per region
Avg Room Size: XX  <- Regions per room
```

## Real-World Test

1. **Start game** - Should see 1-5 regions
2. **Build 4 walls in a square** - Should create 2 regions
3. **Add door to wall** - Should create 3rd region (the door)
4. **Press R** - See different colors inside vs outside
5. **Check stats** - Regions should be >= 3

## Performance Check

Region building should be **fast**:
- Initial build: ~50-100ms
- After placing building: ~50-100ms  
- Should see console log: "Built X regions in Yms"

**If slower than 200ms**, something is wrong!

## Common Issues

**Issue: Only see 1-2 regions**
- Walls might not be blocking
- Doors might not be finished (`done: false`)
- Check nav grid (press G) - walls should show red

**Issue: Door doesn't create region**
- Door must have `done: true`
- Door must be 1x1 tile (32x32 pixels)
- Check door is on passable ground

**Issue: Can't path through door**
- Nav grid issue (not region issue)
- Check door is marked passable in nav grid
- Verify door system is working

## Visual Checklist

✅ Multiple colored regions visible  
✅ Door shows as tiny 1x1 region  
✅ Green links connect regions  
✅ Stats show Regions > 1  
✅ Different colors inside/outside walls  
✅ Build time < 100ms  

If all checked, **region system is working!** 🎉
