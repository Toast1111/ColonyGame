# FSM Blueprint Editor - Quick Reference

## Quick Start

1. **Open Editor**: `http://localhost:8080/FSM-Blueprint-Editor-Standalone.html`
2. **Copy FSM**: Copy entire `updateColonistFSM()` or `updateEnemyFSM()` function
3. **Parse**: Paste code → Click "Parse & Visualize"
4. **Layout**: Click "Auto Layout" to organize
5. **Export**: Click "Export TypeScript" when done

## What Gets Parsed

### Automatically Detected
- ✅ All `case 'stateName':` statements
- ✅ All `changeState('target', 'condition')` calls
- ✅ Direct state assignments: `c.state = 'state'`
- ✅ State priorities (inferred from naming)
- ✅ State types (critical/work/rest/movement/management)
- ✅ Transition conditions

### State Variables Supported
- `c.state` (Colonist FSM)
- `e.state` (Enemy FSM)
- Any `entity.state` pattern

## Current States Recognized

### Colonist FSM (20+ states)
```
Critical (90-100):
  flee (100), drafted (99), waitingAtDoor (98)
  downed (97), beingTreated (96), doctoring (95), heal (90)

Rest/Needs (65-80):
  sleep (80), goToSleep (55), eat (65), resting (35)

Work (40-45):
  cooking (42), haulBread (43), storingBread (45)
  build (40), chop (40), mine (40), harvest (40)

Movement/Idle (10-25):
  move (25), idle (15), seekTask (10)
```

## Color Coding

- 🔴 **Red** = Critical (flee, drafted, medical)
- 🔵 **Blue** = Rest/Health (sleep, eat, heal)
- 🟢 **Green** = Work (build, chop, mine, cooking)
- 🟡 **Yellow** = Movement (move, go, chase)
- 🟣 **Purple** = Management (idle, seekTask)

## Keyboard Shortcuts

- **Ctrl+S**: Save project
- **Ctrl+O**: Load project  
- **Ctrl+E**: Export code
- **Delete**: Remove handles from selected connection
- **Esc**: Cancel connection

## Mouse Controls

- **Drag node**: Move state
- **Double-click node**: Edit properties
- **Double-click connection**: Add bendable handles
- **Drag handle**: Bend connection curve
- **Click connection**: Select connection
- **Scroll wheel**: Zoom in/out

## Tips & Tricks

### Getting Best Results
1. Copy the **entire** FSM function (all cases)
2. Click "Auto Layout" first for clean organization
3. Then manually adjust for readability
4. Double-click connections for curved paths (looks better)

### Understanding the Visualization
- **Higher on screen** = Higher priority
- **More connections** = More complex state
- **Red borders** = Emergency states
- **Green borders** = Productive work

### Export Format
Generated code includes:
- Switch-case template with comments
- Priority lookup function
- State diagram documentation
- TypeScript type definitions
- All transitions documented

## Common Issues

**No states found?**
→ Make sure you pasted the entire `switch (state) { ... }` block

**Wrong state variable?**
→ Editor auto-detects `c.state` or `e.state`, works generically

**Missing transitions?**
→ Editor finds `changeState()` calls, might miss custom patterns

**States in wrong order?**
→ Click "Auto Layout" to organize by type and priority

## Testing the Fix

### Test 1: Colonist FSM
```bash
# Copy lines ~226-2090 from:
src/game/colonist_systems/colonistFSM.ts

# Expected: 20+ states, 50+ transitions
```

### Test 2: Enemy FSM
```bash
# Copy lines ~215-341 from:
src/ai/enemyFSM.ts

# Expected: Enemy states detected with e.state
```

### Test 3: Future FSMs
```typescript
// Any FSM with this pattern works:
switch (entity.state) {
  case 'stateA': {
    if (cond) changeState('stateB', 'reason');
    break;
  }
}
```

## Visual Guide

```
┌─────────────────────────────────────────┐
│  Toolbar: Parse | Auto Layout | Export  │
├──────────┬──────────────────────────────┤
│ Sidebar  │  Canvas (drag nodes here)   │
│          │                              │
│ - Code   │  🔴 Critical States (top)   │
│   Input  │  🔵 Rest States             │
│          │  🟢 Work States             │
│ - Palette│  🟡 Movement States         │
│   (drag) │  🟣 Idle States (bottom)    │
│          │                              │
│ - Help   │  [Minimap in corner]        │
└──────────┴──────────────────────────────┘
           Status Bar: zoom | info
```

## Success Criteria

When properly working, you should see:
- ✅ All states from your FSM parsed
- ✅ Connections between states with conditions
- ✅ States colored by type
- ✅ Auto-layout organizes logically
- ✅ Export generates useful TypeScript

## Pattern Recognition

The editor understands these patterns:

```javascript
// Pattern 1: changeState with condition
if (hungry) changeState('eat', 'hunger > 80');

// Pattern 2: changeState without condition  
changeState('idle');

// Pattern 3: Direct assignment
c.state = 'flee';

// Pattern 4: State priority detection (from naming)
case 'flee': → Detected as priority 100 (critical)
case 'idle': → Detected as priority 15 (low)
```
