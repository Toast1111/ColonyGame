# Initialization Order Fix

**Issue:** `TypeError: Cannot read properties of undefined (reading 'createStockpileZone')`

**Root Cause:** `itemManager` was initialized AFTER `newGame()` was called, but `newGame()` tried to create stockpile zones.

---

## The Problem

**Original Code (BROKEN):**

```typescript
constructor(canvas: HTMLCanvasElement) {
  // ... setup ...
  
  this.bindInput();
  this.newGame();  // ❌ Calls newGame() FIRST
  
  // ... other initialization ...
  
  // Initialize item database
  itemDatabase.loadItems();
  
  // Initialize floor item + stockpile system
  this.itemManager = new ItemManager({ /* ... */ });  // ❌ Created AFTER newGame()
  
  // ... rest ...
}
```

**newGame() tried to use itemManager:**

```typescript
newGame() {
  // ... colonist spawning ...
  
  // Create initial stockpile zones
  const generalZone = this.itemManager.createStockpileZone(...);  // ❌ CRASH! itemManager is undefined
}
```

---

## The Fix

**Move `itemManager` initialization BEFORE `newGame()` call:**

```typescript
constructor(canvas: HTMLCanvasElement) {
  // ... setup ...
  
  this.bindInput();
  
  // ✅ Initialize item database FIRST
  itemDatabase.loadItems();
  
  // ✅ Initialize itemManager BEFORE newGame()
  this.itemManager = new ItemManager({
    canvas: this.canvas,
    enableAutoHauling: false,
    defaultStockpileSize: this.defaultStockpileSize
  } as ItemManagerConfig);
  
  // ✅ NOW call newGame() - itemManager exists!
  this.newGame();
  
  // ... rest of initialization ...
}
```

---

## Dependency Graph

**Correct Order:**

```
1. Canvas setup
2. Input binding
3. itemDatabase.loadItems()       ← Needed by itemManager
4. itemManager = new ItemManager() ← Needed by newGame()
5. newGame()                        ← Creates stockpiles using itemManager
6. Other systems
```

**Why This Order:**

- `itemDatabase` must load before `itemManager` (itemManager validates item types)
- `itemManager` must exist before `newGame()` (newGame creates stockpiles)
- Other systems can initialize after (they don't depend on stockpiles)

---

## Testing

After fix, game should:
1. ✅ Start without errors
2. ✅ Show 3 green stockpile zones near HQ
3. ✅ Allow colonists to haul resources

---

## Related Files

- `src/game/Game.ts` (lines 340-360) - Constructor initialization order
- `src/game/Game.ts` (lines 1747+) - newGame() stockpile creation
- `docs/HAULING_AND_RESOURCES_FIXES.md` - Full hauling system documentation
