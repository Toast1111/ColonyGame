# Building Inventory System - Complete Implementation

## Overview

A complete RimWorld-style building inventory system has been implemented, allowing buildings like farms, pantries, warehouses, and stockpiles to store items internally. Players can now click on buildings to view their contents and manage colonist workflows around item storage and retrieval.

## Features

### ✅ Building Inventory Storage
- **Pantries** can store up to 10 different item stacks (bread, food, etc.)
- **Farms** can store up to 5 stacks of wheat before colonists haul it away
- **Warehouses** can store up to 20 different item stacks
- **Stockpiles** can store up to 15 different item stacks
- **HQ** can store up to 30 different item stacks
- **Stoves** have temporary storage (3 slots) for cooking ingredients

### ✅ Interactive UI Panel
- Click/tap on any inventory-capable building to view contents
- Beautiful modal panel showing:
  - Item icons (emojis) for visual identification
  - Item quantities with progress bars
  - Slot usage (e.g., "5/10 slots used")
  - Total item count
  - Full/nearly-full warnings (color-coded bars)
- Close by clicking X button, clicking outside panel, or pressing ESC

### ✅ Context Menu Integration
- Right-click (or long-press on mobile) on buildings with inventory
- Shows "View Inventory" option with current stats
- Displays item count and slot usage directly in menu

### ✅ Automated Storage
- Farms now store harvested wheat in their own inventory
- Wheat automatically goes to farm inventory first, overflow to global storage
- Pantries store bread from colonist cooking
- Bread goes to pantry inventory first, overflow to global storage
- Legacy `breadStored` property maintained for backwards compatibility

## System Components

### 1. Building Inventory Data Structure

**Location:** `src/game/types.ts`

```typescript
export interface BuildingInventoryItem {
  type: keyof Resources; // Resource type (wood, stone, food, wheat, bread, etc.)
  quantity: number;
  maxStack?: number; // Max stack size for this item type
}

export interface BuildingInventory {
  items: BuildingInventoryItem[];
  capacity: number; // Maximum number of different item slots
  maxWeight?: number; // Optional weight limit (future feature)
}

// Added to Building type:
inventory?: BuildingInventory;
```

### 2. Inventory Management System

**Location:** `src/game/systems/buildingInventory.ts`

**Key Functions:**
- `initializeBuildingInventory(building, capacity)` - Set up inventory for a building
- `addItemToInventory(building, itemType, quantity)` - Add items (returns amount actually added)
- `removeItemFromInventory(building, itemType, quantity)` - Remove items (returns amount removed)
- `getInventoryItemCount(building, itemType)` - Check quantity of specific item
- `hasInventorySpace(building, itemType?)` - Check if building can accept more items
- `getTotalInventoryCount(building)` - Get total items across all types
- `transferItems(fromBuilding, toBuilding, itemType, quantity)` - Move items between buildings

**Stack Sizes:**
- Wood: 75
- Stone: 75
- Food: 50
- Wheat: 100
- Bread: 50
- Medicine: 20
- Herbal Medicine: 30

### 3. Inventory UI Panel

**Location:** `src/game/ui/buildingInventoryPanel.ts`

**Functions:**
- `openBuildingInventoryPanel(building)` - Show inventory for a building
- `closeBuildingInventoryPanel()` - Hide the panel
- `drawBuildingInventoryPanel(ctx, canvasWidth, canvasHeight)` - Render the panel
- `handleBuildingInventoryPanelClick(mouseX, mouseY, canvasWidth, canvasHeight)` - Handle clicks

**Features:**
- Fully responsive design (scales with screen size)
- Modal overlay (blocks interactions with game world)
- Color-coded progress bars (green → orange → red as slots fill)
- Touch-friendly (works on mobile)
- Z-index positioned correctly (below work priority panel, above context menus)

### 4. Context Menu Provider

**Location:** `src/game/ui/contextMenus/buildings/providers/inventory.ts`

Automatically adds "View Inventory" option to context menu for all buildings with inventory, showing current item count and slot usage.

## Integration Points

### Building Creation
**Location:** `src/game/buildings.ts`

Buildings automatically initialize inventory when created if they're storage-capable:

```typescript
export function makeBuilding(kind, wx, wy) {
  const building = { /* ... */ };
  
  // Initialize inventory for storage buildings
  if (shouldHaveInventory(kind)) {
    const capacity = getDefaultInventoryCapacity(kind);
    initializeBuildingInventory(building, capacity);
  }
  
  return building;
}
```

### Farm Harvest
**Location:** `src/game/colonist_systems/colonistFSM.ts` (harvest state)

```typescript
// Farms now produce wheat - store it in the farm's inventory
const wheatAmount = Math.round(10 * yieldMult);

if (f.inventory) {
  const added = addItemToInventory(f, 'wheat', wheatAmount);
  if (added > 0) {
    game.msg(`Farm harvested (+${added} wheat stored in farm)`, 'good');
  }
  
  // If farm inventory is full, add remainder to global resources
  if (added < wheatAmount) {
    const remainder = wheatAmount - added;
    game.addResource('wheat', remainder);
    game.msg(`Farm full! +${remainder} wheat to storage`, 'info');
  }
}
```

### Bread Storage
**Location:** `src/game/colonist_systems/colonistFSM.ts` (storingBread state)

```typescript
// Try to store in pantry inventory first
if (pantry.inventory) {
  const added = addItemToInventory(pantry, 'bread', c.carryingBread);
  if (added > 0) {
    game.msg(`${c.profile?.name} stored ${added} bread in pantry`, 'good');
  }
  
  // If pantry is full, add remainder to global resources
  if (added < c.carryingBread) {
    const remainder = c.carryingBread - added;
    game.addResource('bread', remainder);
    game.msg(`Pantry full! +${remainder} bread to general storage`, 'info');
  }
}
```

### Rendering
**Location:** `src/game/managers/RenderManager.ts`

```typescript
// Building inventory panel (modal overlay)
drawBuildingInventoryPanel(ctx, canvas.width, canvas.height);
```

### Input Handling
**Location:** `src/game/Game.ts`

Modal panel blocks all game interactions when open:

```typescript
// BUILDING INVENTORY PANEL IS MODAL - Check and block other interactions
if (isBuildingInventoryPanelOpen()) {
  if (handleBuildingInventoryPanelClick(/* ... */)) {
    return; // Panel handled the click
  }
  return; // Block everything else
}
```

## Usage Guide

### For Players

1. **Build a farm, pantry, warehouse, or stockpile**
2. **Right-click (or long-press on mobile) on the building**
3. **Select "View Inventory" from the context menu**
4. **View building contents:**
   - Item icons and names
   - Quantity bars showing how full each stack is
   - Total items and slot usage
5. **Close the panel:**
   - Click the X button
   - Click/tap outside the panel
   - Press ESC key

### For Developers

```typescript
import { 
  addItemToInventory, 
  removeItemFromInventory,
  getInventoryItemCount,
  hasInventorySpace 
} from './game/systems/buildingInventory';

// Add items to a building
const building = game.buildings.find(b => b.kind === 'warehouse');
const added = addItemToInventory(building, 'wood', 50);
console.log(`Added ${added} wood to warehouse`);

// Check inventory
const woodCount = getInventoryItemCount(building, 'wood');
const hasSpace = hasInventorySpace(building, 'stone');

// Remove items
const removed = removeItemFromInventory(building, 'wood', 25);

// Open inventory UI
import { openBuildingInventoryPanel } from './game/ui/buildingInventoryPanel';
openBuildingInventoryPanel(building);
```

## Visual Design

### Panel Layout
```
┌─────────────────────────────────────────────────┐
│ Building Name Inventory                     [X] │ ← Header (blue-gray)
├─────────────────────────────────────────────────┤
│ Slots: 3/10              Total Items: 127      │ ← Info bar
├─────────────────────────────────────────────────┤
│ 🌾 Wheat                                        │
│    Quantity: 75/100      ████████░░ (75%)      │ ← Item row
├─────────────────────────────────────────────────┤
│ 🍞 Bread                                        │
│    Quantity: 48/50       █████████▓ (96%)      │ ← Nearly full (orange)
├─────────────────────────────────────────────────┤
│ 🍎 Food                                         │
│    Quantity: 4/50        █░░░░░░░░░ (8%)       │ ← Low quantity
├─────────────────────────────────────────────────┤
│    Click outside or press X to close           │ ← Footer
└─────────────────────────────────────────────────┘
```

### Color Scheme
- **Panel Background:** Dark blue-gray (#1a2332)
- **Header:** Medium blue-gray (#2d3e50)
- **Item Rows:** Slightly lighter (#2a3a4a)
- **Borders:** Light gray (#3b4a5a)
- **Progress Bars:**
  - 0-90%: Green (#4caf50)
  - 91-99%: Orange (#ff9800) - "Nearly full"
  - 100%: Red (#f44336) - "Full"

## Future Enhancements

### Planned Features
1. **Hauling Jobs** - Colonists automatically move items from farm inventories to warehouses
2. **Weight Limits** - Optional weight-based capacity (in addition to slot limits)
3. **Item Quality** - Track item quality/condition in inventory
4. **Filters** - Allow players to set which items each building accepts
5. **Transfer UI** - Drag-and-drop items between building inventories
6. **Smart Hauling** - Colonists prioritize hauling perishable items first
7. **Inventory Search** - Search/filter items in large inventories
8. **Stack Merging** - Automatically combine partial stacks when possible

### Compatibility
- ✅ Fully backwards compatible with existing save files
- ✅ Legacy `breadStored` property maintained for pantries
- ✅ Legacy `wheatStored` property maintained for stoves
- ✅ Gracefully handles buildings without inventory (falls back to global resources)

## Testing Checklist

- [x] Build a farm
- [x] Harvest wheat and verify it goes to farm inventory
- [x] Right-click farm and view inventory
- [x] Build a pantry
- [x] Cook bread and verify it goes to pantry inventory
- [x] Right-click pantry and view inventory
- [x] Verify inventory UI scales correctly on different screen sizes
- [x] Test mobile touch interactions (tap to open, tap outside to close)
- [x] Verify farm overflow (when farm inventory full, wheat goes to global storage)
- [x] Verify pantry overflow (when pantry full, bread goes to global storage)
- [x] Test with warehouses and stockpiles
- [x] Verify modal behavior (blocks game interactions when open)
- [x] Test Z-order (panel renders on top of game, below work priority panel)

## Performance Considerations

- **Minimal overhead:** Inventory only initialized for buildings that need it
- **Efficient rendering:** Panel only renders when open
- **Stack-based storage:** Reduces memory usage by grouping items
- **Lazy initialization:** Buildings created before this update work without modification

## Success Metrics

✅ **User Experience:**
- Intuitive UI for viewing building contents
- Clear visual feedback for inventory status
- Works seamlessly on desktop and mobile

✅ **Gameplay Impact:**
- Adds depth to colony management
- Creates storage strategy decisions
- Prepares foundation for hauling system

✅ **Code Quality:**
- Well-documented and maintainable
- Type-safe with full TypeScript support
- Follows existing architectural patterns

---

**Status:** ✅ Complete and Ready for Production

**Version:** 1.0.0

**Last Updated:** October 8, 2025
