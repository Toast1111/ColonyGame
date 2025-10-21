# Floor Items Rendering Fix

**Date**: October 19, 2025  
**Issue**: Floor items and stockpile zones not rendering after refactoring  
**Status**: ✅ Fixed

## Problem

After refactoring `rimWorld` → `itemManager`, the `RenderManager` was still trying to access `(game as any).rimWorld`, which no longer exists. This caused floor items and stockpile zones to not render.

## Root Cause

The `RenderManager.ts` file was missed during the refactoring. It had hardcoded references to:
- `(game as any).rimWorld` 
- `rimWorld.stockpiles.getAllZones()`
- `rimWorld.renderer.renderStockpileZones(...)`
- `rimWorld.floorItems.getVisualStacks()`
- `rimWorld.renderer.renderFloorItems(...)`

## Solution

Updated `src/game/managers/RenderManager.ts` line 136-142:

```typescript
// BEFORE (broken):
if ((game as any).rimWorld) {
  const zones = (game as any).rimWorld.stockpiles.getAllZones();
  (game as any).rimWorld.renderer.renderStockpileZones(...);
  const stacks = (game as any).rimWorld.floorItems.getVisualStacks();
  (game as any).rimWorld.renderer.renderFloorItems(...);
}

// AFTER (fixed):
if ((game as any).itemManager) {
  const zones = (game as any).itemManager.stockpiles.getAllZones();
  (game as any).itemManager.renderer.renderStockpileZones(...);
  const stacks = (game as any).itemManager.floorItems.getVisualStacks();
  (game as any).itemManager.renderer.renderFloorItems(...);
}
```

## Testing

```bash
npm run build  # ✅ Success
```

Test in-game:
1. Use debug console: `` ` `` (backtick key)
2. `drop wood 50 here` - Should see wood pile rendered
3. `stockpile create 5 5 10 10` - Should see green stockpile zone overlay
4. Chop trees - Wood should drop and render on ground

## Files Changed

- `src/game/managers/RenderManager.ts` - Updated 5 references from `rimWorld` to `itemManager`

---

# Types Folder vs Data Folder - Explanation

## Question: Why create `src/game/types/` when `src/data/` exists?

Great question! They serve different purposes:

### `src/data/` - Static Game Definitions (Data)

**Purpose**: Database of item/building definitions with stats  
**Contents**: Static configuration data that defines what exists in the game  
**Examples**:
- `itemDatabase.ts` - Item definitions (weapon damage, armor rating, stack limits, etc.)
- Future: `buildingDatabase.ts`, `recipeDatabase.ts`

**Structure**:
```typescript
// src/data/itemDatabase.ts
export interface ItemDef {
  defName: string;        // "plasteel_longsword"
  label: string;          // "Plasteel longsword"
  damage: number;         // 20
  armorPenetration: number; // 0.4
  value: number;          // 350
  // ... stats, stats, stats
}

export const ITEMS: ItemDef[] = [
  { defName: 'club', label: 'Club', damage: 8, ... },
  { defName: 'longsword', label: 'Longsword', damage: 15, ... }
];
```

### `src/game/types/` - Runtime Object Types (Structure)

**Purpose**: TypeScript interfaces for runtime game objects  
**Contents**: Shape/structure of objects that exist during gameplay  
**Examples**:
- `items.ts` - Floor item instances (position, quantity, id)
- `stockpiles.ts` - Stockpile zone instances (bounds, settings)

**Structure**:
```typescript
// src/game/types/items.ts
export interface FloorItem {
  id: string;           // "floor_item_abc123" (runtime generated)
  type: ItemType;       // "wood" (references item definition)
  quantity: number;     // 47 (current stack amount)
  position: Vec2;       // { x: 520, y: 340 } (world position)
  createdAt: number;    // 1234567890 (timestamp)
  // ... runtime state
}
```

## Key Differences

| Aspect | `src/data/` | `src/game/types/` |
|--------|-------------|-------------------|
| **What** | Item/building definitions | Game object instances |
| **When** | Loaded once at startup | Created/destroyed during gameplay |
| **Mutability** | Immutable (read-only) | Mutable (position changes, quantity changes) |
| **Example** | "Longsword does 15 damage" | "This specific longsword is at (100, 200)" |
| **Analogy** | Class definition | Class instance |
| **Database** | Table schema + seed data | Table rows |

## Real-World Example

```typescript
// DATA - Definition (src/data/itemDatabase.ts)
const WOOD_DEF: ItemDef = {
  defName: 'wood',
  label: 'Wood',
  stackLimit: 75,
  weight: 1.0,
  value: 2
};

// TYPE - Runtime instance (src/game/types/items.ts)
const woodPile: FloorItem = {
  id: 'floor_item_001',
  type: 'wood',          // References WOOD_DEF
  quantity: 47,          // Current stack
  position: { x: 520, y: 340 },
  createdAt: Date.now()
};
```

## Conclusion

The separation makes sense because:
- **Data folder** = "What items exist in the game" (static definitions)
- **Types folder** = "What an item looks like when it's on the ground" (runtime objects)

This is a common pattern in game development (similar to RimWorld's Defs vs Things).

**Decision**: ✅ Keep both folders as-is - they serve different architectural purposes.
