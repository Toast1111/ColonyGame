# Modern UI/HUD System Documentation

## Overview

A complete redesign of the Colony Game UI/HUD system featuring:
- ✨ **Circular Radial Build Menu** - Intuitive category-based building selection
- 🎯 **Minimalist Dynamic HUD** - Clean, auto-hiding resource displays
- 🎮 **Contextual Action Panel** - Smart actions that adapt to your selection
- 📢 **Toast Notification System** - Modern sliding notifications
- 🗺️ **Mini-map** - Tactical overview with real-time updates
- 🎬 **Smooth Animations** - Polished transitions throughout

## Toggle Modern UI

Press **`U`** to toggle between Modern UI and Classic UI modes.

**Default:** Modern UI is enabled by default

## Key Features

### 1. Minimalist Modern HUD

**Location:** Screen corners

The new HUD uses a compact, non-intrusive design:

- **Top-left:** Resource panel with icons
  - Wood 🪵, Stone 🪨, Food 🍖
  - Wheat 🌾, Bread 🍞 (when available)
  - Compact grid layout (2 columns)

- **Top-right:** Time and day display
  - Current day number
  - Time in HH:MM format
  - Day/night indicator (☀️/🌙)

- **Bottom-left:** Colony stats
  - Colonist count with population cap
  - Hiding colonists indicator

- **Bottom-right:** Storage indicator
  - Visual progress bar
  - Percentage display
  - Color-coded (green/yellow/red based on capacity)

### 2. Circular Radial Build Menu

**Hotkey:** Press `B` to open

**Features:**
- Categories arranged in a circle around cursor/center
- Click a category to see buildings in that category
- Hover for visual feedback
- Icons for each building type
- Cost indicators (red ✗ if can't afford)
- Back button to return to categories

**How to use:**
1. Press `B` or click build button
2. Menu appears at screen center (or cursor on desktop)
3. Click a category segment to expand
4. Click a building to select it for placement
5. Click back button or press `Escape` to close

**Building Icons:**
- 🏠 House
- 🌾 Farm
- 📦 Storage
- 🧱 Wall
- 🔫 Turret
- ⛏️ Mine
- 🪨 Quarry
- 🛤️ Path
- 🚪 Door
- 🛏️ Bed
- 🍳 Kitchen
- 🔨 Workshop
- 🔬 Research
- 🏗️ Default (for others)

### 3. Toast Notification System

**Location:** Right side of screen

**Types:**
- ℹ️ **Info** (blue) - General information
- ✓ **Success** (green) - Successful actions
- ⚠ **Warning** (yellow) - Warnings
- ✗ **Error** (red) - Errors

**Features:**
- Slide in animation from right
- Auto-dismiss after duration (default 3 seconds)
- Progress bar showing time remaining
- Stack multiple toasts vertically
- Click to dismiss manually
- Smooth fade out animation

**Usage in code:**
```typescript
game.showToast('Resource gathered!', 'success');
game.showToast('Low on food', 'warning', 5000);
```

### 4. Contextual Action Panel

**Location:** Bottom-center (appears when colonist/building selected)

**Colonist Actions:**
- 🎯 Draft/⚔️ Undraft (R) - Toggle combat mode
- 😴 Rest Now (Z) - Force colonist to rest
- 🚑 Rescue to Bed (E) - Rescue downed colonist
- 🩸 Bandage Bleeding (B) - Stop bleeding
- 🏥 Treat Injuries (T) - Tend to wounds
- 👤 View Profile (P) - Open detailed profile

**Building Actions:**
- ✗ Cancel Construction (Del) - Cancel incomplete building
- 📦 View Inventory (I) - Check storage contents
- 🔨 Demolish (Del) - Destroy building

**Features:**
- Dynamic button layout based on context
- Keyboard shortcuts displayed
- Disabled state for unavailable actions
- Smart action availability (only show relevant actions)

### 5. Mini-map

**Location:** Bottom-right corner
**Hotkey:** (Always visible by default)

**Features:**
- Real-time colony overview
- Color-coded entities:
  - 🔵 Blue: Colonists (idle)
  - 🟢 Green: Drafted colonists
  - 🟠 Orange: Low health colonists
  - 🔴 Red: Enemies/Downed colonists
  - 🔵 Blue: HQ building
  - 🟢 Green: Houses
  - 🔴 Red: Turrets
  - ⚪ Gray: Other buildings

- Grid overlay for reference
- Camera viewport indicator (blue rectangle)
- Click to jump to location
- Legend showing entity types

### 6. Animation System

All UI elements feature smooth animations:

**Radial Menu:**
- Ease-out-back entrance animation
- Scale and fade in
- Hover effects with color transitions

**Toast Notifications:**
- Slide in from right (cubic easing)
- Fade out on dismiss
- Progress bar countdown

**HUD Elements:**
- Smooth resource value updates
- Storage bar fill animations
- Flash effects for warnings

## Keyboard Shortcuts

### UI Control
- **`U`** - Toggle Modern/Classic UI
- **`B`** - Open/Close Build Menu
- **`Escape`** - Close menus/Cancel
- **`P`** - Work Priority Panel (unchanged)

### Selection & Actions
- **`R`** - Draft/Undraft selected colonist
- **`Z`** - Rest selected colonist
- **`E`** - Rescue selected colonist
- **`B`** - Bandage bleeding (when selected)
- **`T`** - Treat injuries (when selected)
- **`I`** - View building inventory
- **`Del`** - Cancel/Demolish building

### Debug (unchanged)
- **`G`** - Toggle navigation debug
- **`J`** - Toggle colonist debug
- **`T`** - Toggle terrain debug
- **`M`** - Toggle performance HUD

## Implementation Details

### File Structure

```
src/game/ui/
├── modernHUD.ts              - Compact corner HUD
├── radialBuildMenu.ts        - Circular build menu
├── toastSystem.ts            - Toast notifications
├── miniMap.ts                - Tactical mini-map
├── contextualPanel.ts        - Dynamic action panel
└── (existing files...)
```

### Integration Points

**Game.ts:**
- `useModernUI` property (toggle)
- `showToast()` method for toast notifications
- UI animation updates in draw loop
- Mouse/hover event handlers for radial menu

**RenderManager.ts:**
- `renderModernUI()` - New modern rendering pipeline
- `renderClassicUI()` - Original UI (preserved)
- `updateUIAnimations()` - Animation frame updates
- Conditional rendering based on `useModernUI` flag

### State Management

**Radial Menu:**
```typescript
{
  visible: boolean;
  centerX: number;
  centerY: number;
  selectedCategory: string | null;
  selectedBuilding: string | null;
  animationProgress: number;
  hoveredSegment: number | null;
  hoveredItem: number | null;
}
```

**Toast System:**
```typescript
{
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration: number;
  elapsed: number;
  animationProgress: number;
  dismissed: boolean;
}
```

## Design Philosophy

### Inspired by Modern UI/UX Principles

1. **Minimalism** - Show only what's needed, when it's needed
2. **Contextual** - Adapt to user's current selection and actions
3. **Feedback** - Clear visual and animated feedback for all actions
4. **Accessibility** - Keyboard shortcuts, clear icons, readable text
5. **Performance** - Optimized rendering, minimal overhead

### Color Palette

- **Primary:** `#3b82f6` (Blue 500) - Interactive elements
- **Success:** `#10b981` (Emerald 500) - Positive actions
- **Warning:** `#f59e0b` (Amber 500) - Cautions
- **Error:** `#ef4444` (Red 500) - Errors/Danger
- **Background:** `#0b1220` (Dark) with transparency
- **Text:** `#e2e8f0` (Slate 200) - Primary text
- **Text Muted:** `#cbd5e1` (Slate 300) - Secondary text

## Performance Considerations

- **Radial Menu:** Only renders when visible
- **Toast Stack:** Auto-limits to 5 toasts maximum
- **Mini-map:** Culls off-screen entities
- **Animations:** Smooth 60fps with easing functions
- **HUD:** Minimal redraw, cached calculations

## Future Enhancements

Potential additions for future iterations:

- [ ] Animated resource value changes (counter up/down)
- [ ] HUD auto-hide on inactivity
- [ ] Radial menu customization (favorite buildings)
- [ ] Toast categories/filtering
- [ ] Mini-map zoom levels
- [ ] Theme customization
- [ ] Sound effects for UI interactions
- [ ] Gamepad/controller support

## Compatibility

- ✅ **Desktop:** Full mouse and keyboard support
- ✅ **Touch:** Touch-friendly hit areas (planned)
- ✅ **Classic Mode:** Can revert to original UI anytime
- ✅ **Responsive:** Scales with screen size and DPI

## Troubleshooting

**Q: Radial menu not appearing?**
- Press `U` to ensure Modern UI is enabled
- Press `B` to toggle the radial menu

**Q: Toasts not showing?**
- Check that Modern UI is enabled (`U`)
- Ensure `game.showToast()` is being called correctly

**Q: Mini-map not visible?**
- Mini-map should be visible by default in Modern UI mode
- Check bottom-right corner

**Q: Want to use Classic UI?**
- Press `U` to toggle back to Classic mode
- All original functionality preserved
