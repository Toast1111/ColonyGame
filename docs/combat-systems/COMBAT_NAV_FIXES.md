# Combat & Navigation Bug Fixes

## Summary

Fixed two critical gameplay bugs affecting combat accuracy and pathfinding:

1. **Combat Accuracy Bypass** - Ranged weapons always hit, ignoring accuracy calculations
2. **Random Path Blocking Tiles** - Trees/rocks incorrectly marked as solid obstacles

---

## Issue 1: Combat Accuracy Bypass ❌ → ✅

### Problem

The combat system calculated accuracy values but **never used them for hit/miss checks**:
- Accuracy was only used to determine bullet spread
- Every shot spawned a bullet that would damage the first enemy it collided with
- Skill level, distance, and cover had **no effect** on whether shots landed

### Root Cause

**File: `src/game/combat/pawnCombat.ts`** (Colonist ranged combat)
```typescript
// BEFORE: Accuracy calculated but not used for hit/miss
const acc = Math.max(0.1, baseAcc * (1 - cover));
const maxSpread = (1 - acc) * 20 * (Math.PI / 180);
const aimAng = ang + (Math.random() - 0.5) * maxSpread;
// Bullet ALWAYS created, no hit roll!
const bullet = { ... };
game.bullets.push(bullet);
```

**File: `src/game/combat/combatSystem.ts`** (Turret combat)
```typescript
// BEFORE: Same issue in turrets
const accuracy = Math.max(0.35, Math.min(0.95, 0.85 - (dist / range) * 0.3));
const spread = (1 - accuracy) * 18;
// Bullet ALWAYS created
```

### Solution

Added **explicit hit/miss roll** before creating bullets:

**Colonist Combat (`pawnCombat.ts` lines 633-660):**
```typescript
// Roll for hit/miss - if miss, the shot goes wild
const hitRoll = Math.random();
const ang = Math.atan2(target.y - c.y, target.x - c.x);
let ax: number, ay: number;

if (hitRoll <= acc) {
  // Hit! Aim directly at target with minor spread
  const minorSpread = (1 - acc) * 5 * (Math.PI / 180);
  const aimAng = ang + (Math.random() - 0.5) * minorSpread;
  ax = c.x + Math.cos(aimAng) * dist;
  ay = c.y + Math.sin(aimAng) * dist;
} else {
  // Miss! Shot goes wide
  const missSpread = 35 * (Math.PI / 180); // 35 degree cone
  const aimAng = ang + (Math.random() - 0.5) * missSpread;
  const missDist = dist * (1.2 + Math.random() * 0.8); // 120-200% distance
  ax = c.x + Math.cos(aimAng) * missDist;
  ay = c.y + Math.sin(aimAng) * missDist;
}
```

**Turret Combat (`combatSystem.ts` lines 80-107):**
```typescript
// Roll for hit/miss
const hitRoll = Math.random();
const ang = Math.atan2(target.y - bc.y, target.x - bc.x);
let ax: number, ay: number;

if (hitRoll <= accuracy) {
  // Hit! Aim at target with minor spread
  const minorSpread = (1 - accuracy) * 8; // degrees
  const spreadRad = (minorSpread * Math.PI) / 180;
  const jitter = (Math.random() - 0.5) * spreadRad;
  const aimAng = ang + jitter;
  ax = bc.x + Math.cos(aimAng) * dist;
  ay = bc.y + Math.sin(aimAng) * dist;
} else {
  // Miss! Shot goes wide
  const missSpread = 30; // degrees
  const spreadRad = (missSpread * Math.PI) / 180;
  const jitter = (Math.random() - 0.5) * spreadRad;
  const aimAng = ang + jitter;
  const missDist = dist * (1.2 + Math.random() * 0.6);
  ax = bc.x + Math.cos(aimAng) * missDist;
  ay = bc.y + Math.sin(aimAng) * missDist;
}
```

### Melee Combat Status ✅

Melee combat **already had proper hit/miss checks** implemented:

**File: `src/game/combat/pawnCombat.ts` (lines 463-466):**
```typescript
// Calculate hit chance based on weapon and skill
const baseHitChance = weaponDef?.meleeHitChance ?? 0.75;
const skillBonus = meleeLvl * 0.02; // 2% per skill level
const hitChance = Math.min(0.98, baseHitChance + skillBonus);

// Check if hit lands
if (Math.random() > hitChance) {
  // Miss!
  (c as any).meleeCd = 0.8;
  return;
}
```

---

## Issue 2: Random Path Blocking Tiles 🟥 → ⬜

### Problem

Red squares appeared in the pathfinding debug visualizer showing "blocked" tiles:
- These tiles physically prevented colonist movement
- Appeared randomly across the map
- No buildings or walls present at those locations

### Root Cause

**Trees and rocks were being marked as solid obstacles** in the navigation grid, despite the game being optimized to allow walking through them.

**File: `src/game/navigation/navGrid.ts`** (lines 104-105):
```typescript
// WRONG: Trees/rocks marked as solid
for (const tree of game.trees) markCircleSolid(game.grid, tree.x, tree.y, tree.r);
for (const rock of game.rocks) markCircleSolid(game.grid, rock.x, rock.y, rock.r);
```

**File: `docs/TREE_ROCK_COLLISION_OPTIMIZATION.md`:**
> This optimization removes trees and rocks from the collision/pathfinding system to eliminate game stuttering caused by frequent region rebuilds. Colonists can now walk through trees and rocks, significantly improving performance.

The documentation clearly stated trees/rocks should NOT block pathfinding, but the code hadn't been updated to match this optimization.

### Solution

**Removed tree/rock collision from `rebuildNavGrid()`** (lines 104-107):
```typescript
// OPTIMIZATION: Trees and rocks no longer block pathfinding
// Colonists can walk through them to eliminate stuttering from constant region rebuilds
// They still prevent building placement (checked in placementSystem.ts)
// for (const tree of game.trees) markCircleSolid(game.grid, tree.x, tree.y, tree.r);
// for (const rock of game.rocks) markCircleSolid(game.grid, rock.x, rock.y, rock.r);
```

**Removed from `rebuildNavGridPartial()`** (lines 43-65):
```typescript
// OPTIMIZATION: Trees and rocks no longer block pathfinding
// Colonists can walk through them to eliminate stuttering from constant region rebuilds
// They still prevent building placement (checked in placementSystem.ts)

// Re-mark trees that intersect with this area
// for (const tree of game.trees) {
//   const tGx = Math.floor(tree.x / T);
//   const tGy = Math.floor(tree.y / T);
//   if (tGx >= minGx && tGx <= maxGx && tGy >= minGy && tGy <= maxGy) {
//     markCircleSolid(game.grid, tree.x, tree.y, tree.r);
//   }
// }

// Re-mark rocks that intersect with this area
// for (const rock of game.rocks) {
//   const rGx = Math.floor(rock.x / T);
//   const rGy = Math.floor(rock.y / T);
//   if (rGx >= minGx && rGx <= maxGx && rGy >= minGy && rGy <= maxGy) {
//     markCircleSolid(game.grid, rock.x, rock.y, rock.r);
//   }
// }
```

### Important Notes

**Building placement still checks trees/rocks!**

Trees and rocks are still validated in `placementSystem.ts`:
```typescript
// Trees and rocks still prevent building placement (UNCHANGED)
for (const t of game.trees) { 
  if (circleRectOverlap(t, rect)) return false; 
}
for (const r of game.rocks) { 
  if (circleRectOverlap(r, rect)) return false; 
}
```

This ensures players must harvest resources before building, maintaining logical gameplay rules.

---

## Files Modified

### Combat System
1. **`src/game/combat/pawnCombat.ts`**
   - Lines 633-660: Added hit/miss roll for colonist ranged combat
   - Misses now shoot wide with larger spread and overshoot distance

2. **`src/game/combat/combatSystem.ts`**
   - Lines 80-107: Added hit/miss roll for turret combat
   - Turrets now miss based on distance and accuracy

### Navigation System
3. **`src/game/navigation/navGrid.ts`**
   - Lines 43-65: Commented out tree/rock blocking in partial rebuild
   - Lines 104-107: Commented out tree/rock blocking in full rebuild
   - Added optimization comments explaining why trees/rocks are passable

---

## Testing

### Combat Accuracy Testing

**Enable debug console (press `):**
```javascript
// Test at various distances
game.debug.combat = true;  // Show turret ranges
game.colonists[0].x = 1000;
game.colonists[0].y = 1000;
spawn enemy 1  // Spawn enemy nearby
give rifle all  // Give colonists rifles

// Watch for misses - you should see bullets going wide
// Long range shots should miss more often than close range
```

**Expected Results:**
- **Short range (3 tiles)**: ~95% hit rate (rifles have `accuracyTouch: 0.95`)
- **Medium range (25 tiles)**: ~55% hit rate (`accuracyMedium: 0.55`)
- **Long range (40 tiles)**: ~35% hit rate (`accuracyLong: 0.35`)
- **With cover**: Additional accuracy penalty
- **High shooting skill**: +2% accuracy per skill level

### Pathfinding Testing

**Enable debug overlays:**
```javascript
game.debug.navGrid = true;  // Press N key
```

**Expected Results:**
- ✅ No red squares on trees
- ✅ No red squares on rocks
- ✅ Red squares only on buildings (walls, warehouses, etc.)
- ✅ Colonists walk through trees/rocks freely
- ✅ Buildings still cannot be placed on trees/rocks

---

## Performance Impact

### Combat
- **Minimal overhead**: Single `Math.random()` call per shot
- More realistic combat balancing via accuracy system
- Skill progression now meaningful for shooting

### Navigation
- **Major performance improvement**: No navgrid rebuild on tree/rock harvest
- **Eliminates stuttering** when chopping/mining
- Simpler pathfinding calculations (fewer obstacles)
- Aligns with documented optimization strategy

---

## Related Documentation

- `docs/TREE_ROCK_COLLISION_OPTIMIZATION.md` - Original optimization spec
- `docs/MELEE_COMBAT_IMPLEMENTATION.md` - Melee hit chance system
- `docs/COMBAT_OVERHAUL_SUMMARY.md` - Combat system overview
- `src/data/itemDatabase.ts` - Weapon accuracy values by range

---

## Gameplay Impact

### Combat Balance
- **Early game harder**: Low-skill colonists will miss frequently
- **Late game rewarding**: High-skill colonists become deadly accurate
- **Cover matters**: Accuracy penalties from cover now actually reduce hits
- **Distance tactics**: Long-range sniping less reliable, encourages positioning

### Navigation
- **Smoother gameplay**: No more random blocking tiles
- **Faster movement**: Colonists can take direct paths through forests
- **Better resource gathering**: No pathfinding recalculation when harvesting
- **Matches RimWorld philosophy**: Resources are not walls

---

## Conclusion

Both bugs are now **fully resolved**:

✅ **Combat accuracy system active** - Shots can miss based on skill, distance, and cover  
✅ **Pathfinding optimized** - Trees/rocks passable, no random blocking tiles  

The game now plays as designed with proper combat mechanics and smooth navigation.
