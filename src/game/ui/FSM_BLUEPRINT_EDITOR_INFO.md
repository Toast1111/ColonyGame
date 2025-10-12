# FSM Blueprint Editor

## Overview

The **FSM Blueprint Editor** (`FSM-Blueprint-Editor-Standalone.html`) is a **standalone development tool** for visualizing Finite State Machine (FSM) code from the game. It is **NOT** part of the main game runtime - it's a separate HTML file used during development.

## Purpose

This tool helps developers:
- Visualize FSM state transitions from TypeScript code
- Understand colonist AI behavior patterns
- Debug enemy AI state machines
- Create visual documentation of FSM logic

## Why It's an HTML File

This is intentionally a **standalone HTML file** (not integrated into the TypeScript build) because:

1. **Development Tool Only** - Not needed in production game builds
2. **Self-Contained** - Can be opened directly in a browser without running the game
3. **Independent Workflow** - Used during development to analyze FSM code
4. **No Dependencies** - Doesn't require the game to be running

## Usage

1. Open `FSM-Blueprint-Editor-Standalone.html` directly in a web browser
2. Paste FSM code (from `colonistFSM.ts` or `enemyFSM.ts`) into the input area
3. The tool will visualize the state machine with nodes and transitions
4. Use for debugging, documentation, or understanding complex state flows

## Should This Be Converted to TypeScript?

**No** - This should remain a standalone HTML tool because:

- It's a development utility, not a game feature
- Self-contained HTML files are easier to share and use
- No need to bundle it with the game
- Opening it doesn't require building/running the game

## Alternative: Move to /tools Directory

If you want better organization, consider:

```
/tools/
  └── fsm-blueprint-editor/
      ├── index.html (renamed from FSM-Blueprint-Editor-Standalone.html)
      └── README.md (this file)
```

This keeps development tools separate from the main game codebase.
