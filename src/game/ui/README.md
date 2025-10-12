# UI Modules

This folder contains all UI components for the Colony Game.

## Modern UI System (New! ✨)

A complete modern UI/HUD system featuring radial menus, toast notifications, and more.

**Toggle Modern UI:** Press `U` in-game

### Modern UI Components

- **modernHUD.ts** — Minimalist corner-based HUD
- **radialBuildMenu.ts** — Circular build menu with categories
- **toastSystem.ts** — Toast notification system
- **miniMap.ts** — Tactical mini-map with real-time updates
- **contextualPanel.ts** — Dynamic action panel based on selection

### Classic UI Components

- **buildMenu.ts** — Traditional grid-based build menu
- **colonistProfile.ts** — Detailed colonist information panel
- **workPriorityPanel.ts** — RimWorld-style work assignment grid
- **contextMenu.ts** — Right-click context menus
- **placement.ts** — Building placement UI

### Shared Utilities

- **uiUtils.ts** — Shared UI helper functions
- **performanceHUD.ts** — Performance metrics overlay
- **debugConsole.ts** — Developer debug console
- **gestures.ts** — Touch gesture handling
- **buildingInventoryPanel.ts** — Building inventory interface

## Documentation

- **[Modern UI Guide](../../docs/MODERN_UI_GUIDE.md)** - Complete feature documentation
- **[Visual Layout Guide](../../docs/MODERN_UI_VISUAL.md)** - UI layouts and design
- **[Implementation Summary](../../docs/MODERN_UI_SUMMARY.md)** - Technical details

## Architecture

```
UI System
├── Modern UI (New)
│   ├── modernHUD.ts           - Compact corner HUD
│   ├── radialBuildMenu.ts     - Radial category menu
│   ├── toastSystem.ts         - Notifications
│   ├── miniMap.ts             - Tactical overview
│   └── contextualPanel.ts     - Dynamic actions
│
├── Classic UI (Original)
│   ├── buildMenu.ts           - Grid build menu
│   ├── colonistProfile.ts     - Colonist details
│   ├── workPriorityPanel.ts   - Work priorities
│   └── contextMenu.ts         - Context menus
│
└── Shared
    ├── placement.ts           - Building placement
    ├── uiUtils.ts             - Utilities
    ├── performanceHUD.ts      - Performance
    ├── debugConsole.ts        - Debug tools
    └── buildingInventoryPanel.ts - Inventory
```

## Usage Examples

### Modern UI

```typescript
// Show toast notification
game.showToast('Resource collected!', 'success');

// Check if radial menu is visible
import { isRadialMenuVisible } from './radialBuildMenu';
if (isRadialMenuVisible()) {
  // Handle radial menu interaction
}

// Update UI animations
import { updateToasts, updateRadialMenuAnimation } from './...';
updateToasts(deltaTime);
updateRadialMenuAnimation(deltaTime);
```

### Classic UI

```typescript
// Toggle build menu
game.showBuildMenu = !game.showBuildMenu;

// Show colonist profile
game.selColonist = colonist;

// Draw UI components
drawBuildMenu(game);
drawColonistProfile(game, colonist);
```

## Key Features

### Modern UI
- 🎯 **Radial Build Menu** - Circular category-based selection
- 📊 **Minimalist HUD** - Corner panels, auto-hiding
- 📢 **Toast System** - Slide-in notifications
- 🗺️ **Mini-Map** - Real-time tactical overview
- 🎮 **Contextual Panel** - Smart action buttons

### Classic UI
- 📋 **Build Menu** - Traditional grid layout
- 👤 **Colonist Profile** - Detailed stats and skills
- ⚙️ **Work Priorities** - RimWorld-style assignments
- 🖱️ **Context Menus** - Right-click actions

## Rendering Pipeline

The UI system supports dual rendering modes:

```typescript
// In RenderManager.ts
private renderUI(): void {
  if (game.useModernUI) {
    this.renderModernUI();  // New modern components
  } else {
    this.renderClassicUI(); // Original components
  }
}
```

## Performance

- **Modern UI:** ~1-2ms per frame
- **Animations:** 60fps with easing functions
- **Memory:** ~50KB additional state
- **Bundle Size:** +40KB (gzipped)

## Contributing

When adding new UI components:

1. Place in appropriate category (modern/classic/shared)
2. Follow existing naming conventions
3. Use TypeScript for type safety
4. Document public APIs
5. Test on both desktop and mobile
6. Update this README

## Backward Compatibility

✅ All original UI functionality is preserved  
✅ Toggle between modern and classic anytime  
✅ No breaking changes to existing code  
✅ Classic UI remains fully functional

---

**Press `U` in-game to toggle between Modern and Classic UI!**
