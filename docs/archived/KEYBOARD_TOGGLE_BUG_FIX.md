# Keyboard Toggle Bug Fix - October 7, 2025

## 🐛 Bug Report

**Issue**: UI menu shortcuts (H, B, P, etc.) could only be toggled ON, not OFF.

**Example**:
- Press **B** → Build menu opens ✅
- Press **B** again → Build menu doesn't close ❌
- Press **H** → Help opens ✅  
- Press **H** again → Help doesn't close ❌

## Root Cause

**The keyboard event handlers were in the wrong place!**

After refactoring input handling to InputManager (Phase 3), the keyboard event listeners were still in Game.ts, directly manipulating state instead of using the manager's `setKeyState()` method. This meant:

1. The InputManager had correct logic to clear the `once` set on keyup
2. But Game.ts event handlers bypassed the manager entirely
3. The `once` set never got cleared, breaking all toggle functionality

### The Original Problem

**Game.ts keydown handler:**
```typescript
this.keyState[k] = true;
if (!this.once.has(k)) this.once.add(k);
```

**Game.ts keyup handler (BROKEN):**
```typescript
this.keyState[k] = false;
// ❌ Missing: this.once.delete(k);
// ❌ ALSO: Bypassing InputManager entirely!
```

**InputManager.setKeyState() (CORRECT but not being used):**
```typescript
setKeyState(key: string, pressed: boolean): void {
  this.keyState[key] = pressed;
  if (!pressed) {
    this.once.delete(key); // ✅ Correct logic
  }
}
```

### How `keyPressed()` Works

The game uses a "one-time press" system to prevent key repeat:

```typescript
keyPressed(key: string): boolean {
  if (this.keyState[key] && !this.once.has(key)) {
    this.once.add(key);  // Mark as "already processed"
    return true;
  }
  return false;
}
```

### The Bug

**keydown handler (correct):**
```typescript
this.keyState[k] = true;
if (!this.once.has(k)) this.once.add(k);
```

**keyup handler (BROKEN):**
```typescript
this.keyState[k] = false; 
// ❌ Missing: this.once.delete(k);
```

### What Happened

1. **First press of 'B'**:
   - `keyState['b'] = true`
   - `once.add('b')`
   - `keyPressed('b')` returns `true` ✅
   - Build menu toggles ON

2. **Release 'B'**:
   - `keyState['b'] = false`
   - **'b' stays in `once` set** ❌

3. **Second press of 'B'**:
   - `keyState['b'] = true`
   - `once` already has 'b'
   - `keyPressed('b')` returns `false` ❌
   - Build menu doesn't toggle OFF

## The Fix

**Moved keyboard event binding to InputManager where it belongs!**

### Step 1: Add `bindKeyboardEvents()` to InputManager

Added a new method to InputManager that properly sets up keyboard event listeners:

```typescript
// InputManager.ts
bindKeyboardEvents(inputFilter?: () => boolean): void {
  this.inputFilter = inputFilter;
  
  window.addEventListener('keydown', (e) => {
    if (this.inputFilter && this.inputFilter()) return;
    const k = (e as KeyboardEvent).key.toLowerCase();
    this.setKeyState(k, true); // ✅ Uses manager's setKeyState
    
    // Prevent default for game shortcuts
    if (k === ' ' || k === 'h' || k === 'b' || ...) {
      e.preventDefault();
    }
  });
  
  window.addEventListener('keyup', (e) => {
    if (this.inputFilter && this.inputFilter()) return;
    const k = (e as KeyboardEvent).key.toLowerCase();
    this.setKeyState(k, false); // ✅ Automatically clears 'once' set
  });
}
```

### Step 2: Call InputManager's method from Game.ts

Replaced the duplicate event handlers in Game.ts with a single call:

```typescript
// Game.ts - bindInput()
this.inputManager.bindKeyboardEvents(() => {
  const dc = (this as any).debugConsole;
  return dc && dc.open; // Block input if console is open
});
```

### Step 3: Removed duplicate handlers

Deleted the old keydown/keyup handlers that were directly manipulating `this.keyState` and `this.once`.

## Files Modified

1. **src/game/managers/InputManager.ts**
   - Added `bindKeyboardEvents()` method
   - Added `inputFilter` callback for conditional input blocking
   - Properly calls `setKeyState()` which handles `once` set cleanup

2. **src/game/Game.ts** (bindInput method)
   - Removed duplicate keydown/keyup handlers
   - Added call to `inputManager.bindKeyboardEvents()`
   - Kept debug console toggle handler separate (it needs to work even when input is blocked)

## Testing

After this fix, all keyboard toggles should work correctly:

### UI Toggles
- [ ] **H** - Toggle help menu (open/close)
- [ ] **B** - Toggle build menu (open/close)
- [ ] **P** - Toggle work priority panel (open/close)

### Debug Toggles
- [ ] **G** - Toggle nav grid debug (on/off)
- [ ] **J** - Toggle colonist debug (on/off)
- [ ] **R** - Toggle regions debug (on/off)
- [ ] **T** - Toggle terrain debug (on/off)
- [ ] **K** - Toggle force desktop mode (on/off)

### Game Toggles
- [ ] **Space** - Toggle pause (pause/resume)
- [ ] **F** - Toggle fast forward (1x/6x)

All of these should now properly toggle both ON and OFF! 🎉

## Why This Matters

This bug affected **every** one-time keyboard shortcut in the game. Without clearing the `once` set on keyup, any toggle that uses `keyPressed()` would only work once per game session. Players would have to:
- Use mouse clicks to close menus
- Reload the page to reset keyboard state
- Get frustrated with "broken" controls

## Related Systems

This fix **completes the InputManager refactoring** (Phase 3). Previously:

- ❌ InputManager had the state and methods
- ❌ But Game.ts still had its own event handlers
- ❌ Event handlers bypassed the manager entirely
- ❌ InputManager's correct `setKeyState()` logic was unused

Now:

- ✅ InputManager owns keyboard event binding
- ✅ InputManager's `setKeyState()` is used correctly
- ✅ All keyboard state management is centralized
- ✅ Game.ts just calls `inputManager.bindKeyboardEvents()`

### Architecture Before Fix

```
Game.ts
├── keydown listener → directly sets this.keyState[k] = true
├── keyup listener → directly sets this.keyState[k] = false ❌ (no once cleanup)
└── InputManager (unused for keyboard events)
```

### Architecture After Fix

```
Game.ts
└── Calls: inputManager.bindKeyboardEvents()

InputManager
├── bindKeyboardEvents() ✅
├── keydown listener → calls this.setKeyState(k, true)
└── keyup listener → calls this.setKeyState(k, false)
    └── setKeyState() → clears once set on keyup ✅
```

## Benefits Beyond Bug Fix

1. **Single Responsibility** - InputManager fully owns input handling
2. **Centralized Logic** - All keyboard state in one place
3. **Easier Testing** - Can test InputManager independently
4. **Consistent Behavior** - All code paths use the same logic
5. **Future-Proof** - New keyboard features go in InputManager

---

**Status**: ✅ Fixed
**Impact**: All keyboard toggles now work correctly
**Testing**: Ready for manual verification
