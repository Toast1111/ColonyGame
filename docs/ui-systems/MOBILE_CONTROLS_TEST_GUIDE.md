# Mobile Controls Test Guide

## Quick Test

Open the game at `http://localhost:5173/` and test the mobile control buttons.

### Mobile Control Buttons (Bottom Right)

The mobile controls should appear in the bottom-right corner of the screen:

```
       🏗️  Build Menu
       ✖️  Cancel
       🧹  Erase
       ⏯️  Pause
       ⏩  Fast Forward
    ＋ －  Zoom Controls
```

### Test Each Button

#### 1. Build Button (🏗️)
**Action:** Click the build button

**Expected:**
- ✅ Build menu opens
- ✅ Shows all building types
- ✅ Click again to close

**Console check:**
```javascript
// Should toggle
game.showBuildMenu
```

#### 2. Cancel Button (✖️)
**Action:** 
1. Select a building from hotbar or build menu
2. Click cancel button

**Expected:**
- ✅ Building selection clears
- ✅ Toast message: "Build canceled"
- ✅ Ghost preview disappears

**Console check:**
```javascript
// Should be null after cancel
game.selectedBuild
```

#### 3. Pause Button (⏯️)
**Action:** Click the pause button

**Expected:**
- ✅ Game pauses (colonists stop moving)
- ✅ Toast message: "Paused"
- ✅ Click again to resume
- ✅ Toast message: "Resumed"
- ✅ Button icon changes: ⏸️ ↔ ▶️

**Console check:**
```javascript
// Should toggle
game.paused
```

#### 4. Fast Forward Button (⏩)
**Action:** Click the fast forward button

**Expected:**
- ✅ Game speeds up (6x faster)
- ✅ Toast message: "Fast-forward ON"
- ✅ Button background changes to blue
- ✅ Click again to disable
- ✅ Toast message: "Fast-forward OFF"
- ✅ Button background returns to normal

**Console check:**
```javascript
// Should be 6 when on, 1 when off
game.fastForward
```

#### 5. Zoom In (＋)
**Action:** Click zoom in button multiple times

**Expected:**
- ✅ Camera zooms in (world gets bigger)
- ✅ Max zoom: 2.2x
- ✅ Smooth zooming

**Console check:**
```javascript
// Should increase up to 2.2
game.camera.zoom
```

#### 6. Zoom Out (－)
**Action:** Click zoom out button multiple times

**Expected:**
- ✅ Camera zooms out (world gets smaller)
- ✅ Min zoom: 0.6x
- ✅ Smooth zooming

**Console check:**
```javascript
// Should decrease down to 0.6
game.camera.zoom
```

### Common Issues (Now Fixed)

#### Before the Fix
- ❌ Buttons visible but don't work
- ❌ No console errors (silent failure)
- ❌ Clicking does nothing
- ❌ Callbacks have null game reference

#### After the Fix
- ✅ All buttons work correctly
- ✅ Toast messages appear
- ✅ Game state updates properly
- ✅ No console errors

### Debug Console Commands

Test the buttons programmatically:

```javascript
// Show current state
console.log('Build Menu:', game.showBuildMenu);
console.log('Selected Build:', game.selectedBuild);
console.log('Paused:', game.paused);
console.log('Fast Forward:', game.fastForward);
console.log('Zoom:', game.camera.zoom);

// Test mobile controls exist
console.log('Mobile Controls:', game.mobileControls);

// Check gameRef is set
console.log('Has game ref:', window.game !== null);
```

### Visual Verification

1. **Buttons Visible**: ✅ Should see all 7 buttons
2. **Button Styling**: ✅ Dark background with light text
3. **Button Size**: ✅ 44-48px touch-friendly size
4. **Button Layout**: ✅ Vertical stack with zoom controls side-by-side
5. **Button Position**: ✅ Bottom-right corner, above legend

### Responsive Design

#### Desktop (> 1024px)
- ✅ Buttons visible and functional
- ✅ Can use keyboard shortcuts instead
- ✅ Mouse click works

#### Tablet/Mobile (≤ 1024px)
- ✅ Buttons larger (48px min-height)
- ✅ Touch-friendly spacing
- ✅ Touch events work properly

### Test on Different Devices

#### Desktop Browser
1. Open `http://localhost:5173/`
2. Test all buttons with mouse
3. ✅ All should work

#### Mobile/Tablet
1. Open `http://<your-ip>:5173/` on device
2. Test all buttons with touch
3. ✅ All should work

#### Developer Tools Mobile Emulation
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select a mobile device
4. Test all buttons
5. ✅ All should work

### Integration Test

**Complete workflow:**
1. Click Build (🏗️) → menu opens
2. Select House from build menu
3. Click Cancel (✖️) → build canceled
4. Click Pause (⏯️) → game pauses
5. Click Pause again → game resumes
6. Click Fast Forward (⏩) → game speeds up
7. Click Fast Forward again → normal speed
8. Click Zoom In (＋) several times → zoomed in
9. Click Zoom Out (－) several times → zoomed out

**Expected:** All steps work correctly with proper feedback ✅

### Success Criteria

- [ ] All 7 buttons visible
- [ ] Build button toggles menu
- [ ] Cancel button clears selection
- [ ] Pause button toggles pause state
- [ ] Fast forward button toggles speed
- [ ] Zoom buttons change camera zoom
- [ ] Toast messages appear for each action
- [ ] No console errors
- [ ] Works on desktop
- [ ] Works on mobile/tablet

If all checkboxes are ✅, the mobile controls are working correctly!

## Troubleshooting

### Buttons Not Visible
Check CSS:
```javascript
document.getElementById('mobileControls')
// Should return the element
```

### Buttons Not Working
Check game reference:
```javascript
// Should be true
game !== null && game !== undefined
```

### No Toast Messages
Check toast manager:
```javascript
game.toastManager
// Should exist
```

### Console Errors
Check browser console (F12) for any error messages.

## What Was Fixed

The core issue was a **JavaScript closure scope problem**:

- Callbacks were created before the game existed
- They captured `null` and never updated
- Now they use a mutable reference object (`gameRef`)
- The reference is updated after game creation
- All callbacks now work correctly

See `docs/MOBILE_CONTROLS_FIX.md` for technical details.
