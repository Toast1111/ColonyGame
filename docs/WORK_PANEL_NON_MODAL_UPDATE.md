# Work Priority Panel - Non-Modal Update

## Changes Made

### Problem
The work priority panel was appearing as a fullscreen modal (centered on screen with dark backdrop), but it should appear in the bottom-left corner like the build menu for consistency.

### Solution

#### 1. Repositioned Panel to Bottom-Left
**File: `/src/game/ui/workPriorityPanel.ts`**

Updated `calculatePanelLayout()`:
- **Before**: Centered on screen (70% width × 60% height)
- **After**: Bottom-left position (85% width × 55% height)
- **Position**: 2% from left edge, above hotbar with 1% gap
- Matches build menu positioning style

#### 2. Removed Modal Styling
**File: `/src/game/ui/workPriorityPanel.ts`**

- ❌ Removed: Fullscreen semi-transparent backdrop
- ❌ Removed: Gradient background
- ❌ Removed: Double-border styling
- ❌ Removed: Close button (use tab/ESC instead)
- ❌ Removed: Help text in header
- ✅ Added: Clean dark background matching build menu (`rgba(15, 23, 42, 0.96)`)
- ✅ Added: Simple border matching build menu style
- ✅ Added: Simplified header with modern typography

#### 3. Updated Input Handling
**File: `/src/game/Game.ts`**

- **Removed modal input blocking** - Panel no longer prevents game interaction
- **Updated wheel handler** - Allows both panel scrolling and camera zoom
- **Simplified keyboard handlers** - P and ESC now just toggle the work tab

### Visual Comparison

**Before (Modal):**
```
┌─────────────────────────────────────┐
│     [Dark backdrop covers screen]   │
│                                     │
│     ┌─────────────────────┐        │
│     │  Work Priorities    │        │
│     │  [centered panel]   │        │
│     │                     │        │
│     └─────────────────────┘        │
│                                     │
└─────────────────────────────────────┘
```

**After (Non-Modal):**
```
┌─────────────────────────────────────┐
│  [Game visible in background]       │
│                                     │
│                                     │
│                                     │
│┌────────────────────────────┐      │
││ Work Priorities            │      │
││ [table here]               │      │
│└────────────────────────────┘      │
│ [Build][Work][Sched][Res][Ani][Q]  │
└─────────────────────────────────────┘
```

### Benefits

✅ **Consistent UI** - Both Build and Work panels use same positioning  
✅ **Non-blocking** - Can still see and interact with game world  
✅ **Modern styling** - Clean, minimalistic design without clutter  
✅ **Better UX** - Matches user expectations from build menu  
✅ **Space efficient** - Takes up 85% width × 55% height, positioned smartly

### How to Use

1. **Click Work tab** → Panel appears in bottom-left
2. **Click Work tab again or ESC** → Panel closes
3. **Can still play while panel is open** - Non-modal design
4. **Scroll wheel over panel** → Scrolls the work priorities table
