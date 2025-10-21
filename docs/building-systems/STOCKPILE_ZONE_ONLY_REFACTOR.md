# Stockpile Zone-Only Refactor

## Summary

Removed `stock` (Stockpile) and `warehouse` building definitions from `BUILD_TYPES`. These are now **zone-only** features that don't place physical buildings. When selected from the build menu, they create drag-to-define zones instead.

## Changes Made

### 1. **Removed Building Definitions** (`src/game/buildings.ts`)

**Removed:**
- `stock` - Stockpile building (2×2, 100 storage, 10 wood cost)
- `warehouse` - Warehouse building (3×2, 300 storage, 40 wood + 20 stone cost)

**Added comments:**
```typescript
// NOTE: 'stock' (Stockpile) removed - now zone-only, not a building
// NOTE: 'warehouse' removed - now zone-only, not a building
```

### 2. **Created Zone Definition System** (`src/game/zones.ts` - NEW FILE)

```typescript
export interface ZoneDef {
  category: string;
  name: string;
  description: string;
  key: string;
  color: string;
  isZone: true;  // Flag to distinguish from buildings
}

export const ZONE_TYPES: Record<string, ZoneDef> = {
  stock: {
    category: 'Zones',
    name: 'Stockpile Zone',
    description: 'Drag to create a storage area. Colonists will haul items here automatically.',
    key: '5',
    color: COLORS.stock,
    isZone: true
  }
};

export function isZone(key: string): boolean;
export function getZoneDef(key: string): ZoneDef | undefined;
```

### 3. **Updated Build Menu Integration** (`src/game/buildings.ts`)

Modified `groupByCategory()` to include zones:

```typescript
export function groupByCategory(defs: Record<string, BuildingDef>) {
  const out: Record<string, Array<[string, BuildingDef]>> = {};
  
  // Add buildings
  for (const k of Object.keys(defs)) {
    const d = defs[k]; const cat = d.category || 'Other';
    (out[cat] ||= []).push([k, d]);
  }
  
  // Add zones (drag-to-create areas, not physical buildings)
  for (const k of Object.keys(ZONE_TYPES)) {
    const z = ZONE_TYPES[k];
    const cat = z.category || 'Other';
    (out[cat] ||= []).push([k, z as any]);
  }
  
  return out;
}
```

## Behavior

### Before:
- Selecting "Stockpile" from build menu would:
  - Show a building placement ghost
  - Place a physical building when confirmed
  - Building would block pathfinding
  - Building could be damaged/destroyed

### After:
- Selecting "Stockpile Zone" from build menu:
  - Activates zone drag mode (right-click drag to define rectangle)
  - Creates a stockpile **zone** (overlay on ground)
  - No physical building placed
  - Colonists can walk through zones
  - Zones cannot be damaged
  - Items dropped in zones are automatically hauled by colonists

## Integration with Existing Systems

### Zone Creation (`src/game/Game.ts`)

The game already has special handling for `selectedBuild === 'stock'`:

```typescript
// In mousedown handler:
if (this.selectedBuild === 'stock') {
  this.uiManager.zoneDragStart = { x: this.mouse.wx, y: this.mouse.wy };
}

// In mouseup handler:
if (this.uiManager.zoneDragStart && this.selectedBuild === 'stock') {
  this.finalizeStockpileDrag(...);
}
```

This system remains unchanged - it now works exclusively with zones, not buildings.

### ItemManager Integration

Zones are managed by `ItemManager` (formerly `RimWorldSystemManager`):

```typescript
// Create zone
game.itemManager.createStockpileZone(x, y, width, height, 'Stockpile');

// Access zones
game.itemManager.stockpiles.zones  // Array of all zones
```

## Build Menu Display

Stockpile zones appear in the **"Zones"** category of the build menu, separate from buildings. The UI treats them identically to buildings (same click handlers, same rendering), but the game logic knows to create zones instead of buildings.

## Future Zones

This architecture supports adding more zone types:

```typescript
// Example: Growing zones, dumping zones, etc.
ZONE_TYPES = {
  stock: { /* ... */ },
  growing: {
    category: 'Zones',
    name: 'Growing Zone',
    description: 'Drag to designate crop planting area',
    key: 'g',
    color: COLORS.farm,
    isZone: true
  }
};
```

## Files Modified

1. **`src/game/buildings.ts`**
   - Removed `stock` and `warehouse` definitions
   - Updated `groupByCategory()` to include zones
   - Added import for `ZONE_TYPES`

2. **`src/game/zones.ts`** (NEW)
   - Created zone definition system
   - Defined `stock` zone
   - Helper functions for zone detection

## Testing

### Build Status
✅ **Compiles successfully** (no TypeScript errors)

### Expected Behavior
1. Open build menu → "Zones" category appears
2. Click "Stockpile Zone" → Cursor changes to zone mode
3. Right-click drag → Yellow rectangle preview shows
4. Release mouse → Zone created, colonists haul items there
5. No physical building placed

### Manual Testing Checklist
- [ ] Stockpile zone appears in build menu
- [ ] Zone drag creates stockpile without building
- [ ] Colonists can walk through zones
- [ ] Items are hauled to zones automatically
- [ ] Zone overlay renders correctly
- [ ] Zone filters (item types) work as expected

## Related Systems

- **Floor Items**: `src/game/systems/floorItems.ts`
- **Stockpile Zones**: `src/game/systems/stockpileZones.ts`
- **Hauling Jobs**: `src/game/systems/haulManager.ts`
- **Item Rendering**: `src/game/rendering/itemRenderer.ts`
- **ItemManager**: `src/game/managers/ItemManager.ts`

## Benefits

### ✅ Architectural Clarity
- Zones are conceptually different from buildings
- Code reflects design intent (zones ≠ buildings)
- Easier to add new zone types

### ✅ Gameplay Improvement
- No wasted resources on stockpile "buildings"
- Zones are free and instant
- More RimWorld-like behavior
- Colonists can walk through stockpile areas

### ✅ Future Extensibility
- Easy to add growing zones, dumping zones, etc.
- Clear separation between physical structures and zones
- Zone system can have different rules (no HP, no construction time, etc.)

## Migration Notes

### Existing Saves
Existing stockpile/warehouse **buildings** will remain in save files. They will continue to function but cannot be built anymore. A save migration script could convert them to zones if needed.

### Debug Console
```bash
stockpile 5 5 10 8       # Create zone at (5,5) with 10×8 size
items                     # List floor items
zones                     # (future) List all zones
```

## Conclusion

Stockpiles are now **zone-only** features. The build menu still shows them, but they create zones (overlays) instead of physical buildings. This matches RimWorld's design philosophy where stockpiles, growing zones, and other designators are not actual buildings but simply marked areas on the ground.
