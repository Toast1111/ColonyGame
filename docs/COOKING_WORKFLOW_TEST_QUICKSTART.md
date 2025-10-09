# Cooking Workflow Testing - Quick Guide

## What Changed

Cooking is now a **multi-step, realistic workflow**:

### Old System ❌
```
Single colonist: Get wheat → Cook → Carry bread → Store bread
```

### New System ✅
```
COOK:    Go to farm → Pick wheat → Go to stove → Cook → Done
         (bread stays in stove)

HAULER:  Go to stove → Pick bread → Go to pantry → Store → Done
         (separate job)
```

## Quick Test

1. **Setup**:
   - Build: Farm (with wheat), Stove, Pantry
   - Enable work priorities:
     - Colonist 1: Cooking = Priority 1
     - Colonist 2: Hauling = Priority 1

2. **Watch the workflow**:
   - Cook goes to farm
   - Cook picks up 5 wheat
   - Cook goes to stove
   - Cook cooks for ~10 seconds
   - **Bread appears in stove inventory (NOT carried by cook)**
   - Cook seeks new task
   - Hauler goes to stove
   - Hauler picks up bread
   - Hauler goes to pantry
   - Hauler deposits bread

3. **Debug in console**:
   ```javascript
   // Check stove inventory
   game.buildings.find(b => b.kind === 'stove').inventory
   
   // Check cooking colonist
   game.colonists.find(c => c.state === 'cooking')?.cookingSubState
   
   // Check hauling colonist
   game.colonists.find(c => c.state === 'haulBread')?.carryingBread
   ```

## What to Look For

✅ **Success indicators**:
- Cook walks to farm first (not directly to stove)
- Cook carries wheat to stove
- Bread stays in stove inventory after cooking
- Separate colonist hauls bread to pantry
- Messages: "picked up wheat", "cooked X bread", "stored bread"

❌ **Potential issues**:
- Cook stuck at farm: No wheat available
- No hauling: Enable Hauling work priority
- Timeout errors: Farm/stove too far apart (increase timeout if needed)

## Key Files Modified

- `/src/game/colonist_systems/colonistFSM.ts` - Multi-step cooking & hauling states
- `/src/game/Game.ts` - Hauling work assignment
- `/src/game/types.ts` - New colonist properties

See `docs/REALISTIC_COOKING_WORKFLOW.md` for full details.

## Server Info

Dev server running at: **http://localhost:5174/**
