# UI Refactoring Testing Guide

## Quick Start
```bash
npm run dev
# Open browser to http://localhost:5173
```

## Test Checklist

### ✅ Input System (InputManager)

#### Mouse Controls
- [ ] Move mouse - cursor position updates correctly
- [ ] Left click - buildings placed, colonists selected
- [ ] Right click - context menus appear
- [ ] Mouse drag - camera pans when dragging empty space
- [ ] World coordinates - `this.mouse.wx/wy` updates with camera movement

#### Keyboard Controls
- [ ] **W/A/S/D** - Camera pans in all directions
- [ ] **+/-** - Zoom in/out
- [ ] **Space** - Pause/unpause
- [ ] **1-9** - Hotbar building selection
- [ ] **H** - Toggle build menu
- [ ] **Escape** - Cancel placement, close menus
- [ ] **B** - Toggle debug paths
- [ ] **F** - Toggle camera follow
- [ ] **G** - Debug mode toggle

#### Touch Controls (Mobile/Tablet)
- [ ] Single finger drag - camera pans
- [ ] Pinch gesture - zoom in/out
- [ ] Long press colonist - context menu appears
- [ ] Long press building - context menu appears
- [ ] Tap - select colonist/building
- [ ] `lastInputWasTouch` - correctly detects touch vs mouse

### ✅ UI System (UIManager)

#### Building Selection
- [ ] Click hotbar slot - building selected
- [ ] Press number key (1-9) - building selected
- [ ] `selectedBuild` - reflects current selection
- [ ] Ghost preview - shows at cursor position

#### Build Menu
- [ ] Press **H** - menu toggles open/closed
- [ ] Click building in menu - selects building
- [ ] Click outside menu - closes menu
- [ ] `showBuildMenu` - reflects menu state

#### Colonist Selection
- [ ] Click colonist - colonist panel opens
- [ ] Click colonist again - panel closes
- [ ] Press **F** - toggle camera follow
- [ ] `selColonist` - reflects selected colonist
- [ ] `follow` - camera tracks colonist

#### Context Menus
- [ ] Right-click colonist - shows colonist actions
  - [ ] Draft/Undraft
  - [ ] Medical options (if injured)
  - [ ] Priority (if drafted)
- [ ] Right-click building - shows building actions
  - [ ] Destroy
  - [ ] Medical (if infirmary)
- [ ] Click menu item - action executes
- [ ] Click outside - menu closes
- [ ] Long-press (touch) - context menu appears

#### Placement UI (Touch Precise Placement)
- [ ] Tap hotbar on touch device - shows placement UI
- [ ] Arrow buttons - move ghost building
- [ ] Rotate buttons - rotate building (doors, etc.)
- [ ] OK button - confirms placement
- [ ] Cancel button - cancels placement
- [ ] Drag ghost - moves with finger
- [ ] `pendingPlacement` - reflects placement state

#### Colonist Panel
- [ ] Tabs switch (Bio, Health, Gear, Social, Skills, Log)
- [ ] X button closes panel
- [ ] Panel follows colonist if **F** pressed
- [ ] `colonistProfileTab` - reflects active tab

### ✅ Integration Tests

#### Multi-System Interactions
- [ ] Build → Place → Resource deduction works
- [ ] Select colonist → Press F → Camera follows
- [ ] Keyboard → Mouse → Touch all work seamlessly
- [ ] Pause → Keyboard shortcuts still work
- [ ] Fast forward → Input still responsive

#### Backward Compatibility
- [ ] Old code using `this.mouse.x` still works
- [ ] Old code using `this.keyState['w']` still works
- [ ] Old code using `this.selectedBuild` still works
- [ ] Event handlers still function correctly

## Known Issues (Pre-existing)

These warnings existed before refactoring:
- Duplicate case clause for `'medical_bandage'` in Game.ts
- Duplicate case clause for `'heal'` in colonistFSM.ts

## Debug Console Tests

Open console with backtick (**`**):

```javascript
// Check managers exist
window.game.inputManager
window.game.uiManager

// Check input state
window.game.mouse
window.game.keyState
window.game.lastInputWasTouch

// Check UI state
window.game.selectedBuild
window.game.selColonist
window.game.showBuildMenu
window.game.pendingPlacement

// Test input methods
window.game.keyPressed('w')
window.game.inputManager.wasLastInputTouch()

// Test UI methods
window.game.uiManager.selectBuilding('house')
window.game.uiManager.toggleBuildMenu()
```

## Performance Tests

- [ ] No FPS drop after refactoring
- [ ] Input response time < 16ms (60fps)
- [ ] Large colonies (50+ colonists) still responsive
- [ ] No memory leaks (long play sessions)

## Success Criteria

✅ All input methods work correctly
✅ All UI interactions function as before
✅ No console errors
✅ No TypeScript compilation errors
✅ Performance unchanged
✅ Backward compatibility maintained

---

**Report any issues**: If something breaks, check:
1. Console for errors
2. `game.inputManager` and `game.uiManager` exist
3. Property getters/setters returning correct values
4. Event handlers firing correctly
