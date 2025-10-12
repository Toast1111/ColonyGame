# UI modules

This folder contains UI modules extracted from `Game.ts`.

## Core UI Components

- **buildMenu.ts** — Build menu rendering and click handling (opened with 'B' key)
- **colonistProfile.ts** — Colonist profile panel and tabs
- **contextMenu.ts** — Context menu show/hide/draw
- **placement.ts** — Placement ghost and controls
- **buildingInventoryPanel.ts** — Building inventory UI
- **workPriorityPanel.ts** — Work priority management UI
- **debugConsole.ts** — In-game debug console
- **performanceHUD.ts** — Performance metrics overlay

## HUD (Heads-Up Display)

The `hud/` folder contains all HUD elements:

- **hud/topBar.ts** — Top resource bar (wood, stone, food, colonists, time)
- **hud/hotbar.ts** — Bottom building selection ribbon (1-9 number keys)
- **hud/messages.ts** — Toast notification messages
- **hud/index.ts** — Main HUD orchestrator that combines all HUD elements

### Usage

```typescript
import { drawHUD } from './ui/hud/index';

// In render loop
const hotbarRects = drawHUD(ctx, canvas, {
  res: { wood: 100, stone: 50, food: 75 },
  colonists: 5,
  cap: 10,
  hiding: 0,
  day: 1,
  tDay: 0.5,
  isNight: false,
  hotbar: [...],
  messages: [...]
}, game);
```

## Unused Stubs

- **gestures.ts** (reserved for touch/pointer gesture helpers)
- **uiUtils.ts** (reserved for shared UI helpers)

You can safely delete the stub files if not needed.

