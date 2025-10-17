# Melee Weapon Rotation Fix

## Problem

Melee weapons (knife, club) were not rotating toward enemies during combat, and colonists weren't facing their targets when fighting in melee.

## Root Cause

The melee combat section in `src/game/combat/pawnCombat.ts` was finding targets and performing attacks, but **never setting the aim tracking properties** (`aimTarget`, `aimAngle`, `isAiming`).

These properties are used by:
1. **Weapon Renderer** - to rotate the weapon toward the target
2. **Colonist Renderer** - to make the colonist sprite face the correct direction

Only the **ranged combat section** was setting these properties, so ranged weapons worked but melee didn't!

### Before Fix

```typescript
// Melee combat section
if (target && bestD <= reach) {
  // ❌ NO aim data set!
  // Check if another colonist is already in melee range...
  // Attack logic...
}
return; // Exit early
```

**Result:** Colonists with melee weapons stood still facing random directions while attacking.

## Solution

Added aim tracking to the melee combat section:

### When Target Found

```typescript
if (target && bestD <= reach) {
  // ✅ Set aim data for weapon rotation and sprite facing
  c.aimTarget = { x: target.x, y: target.y };
  c.aimAngle = Math.atan2(target.y - c.y, target.x - c.x);
  c.isAiming = true;
  
  // ... rest of combat logic ...
}
```

### When No Target

```typescript
} else {
  // No target in melee range - clear aim data unless drafted
  if (!c.isDrafted) {
    c.aimTarget = null;
    c.aimAngle = undefined;
    c.isAiming = false;
  }
}
```

## Expected Behavior After Fix

### Melee Combat (Knife, Club)
✅ **Colonist sprite rotates** to face the enemy  
✅ **Weapon rotates** to point at the enemy  
✅ **Attack animation plays** with correct orientation  
✅ **Smooth tracking** as enemy moves  

### Drafted Melee Colonists
✅ **Weapon visible** even when no target nearby  
✅ **Weapon rotates** toward enemies when they approach  
✅ **Colonist faces** the correct direction  

### Ranged Combat (Still Works)
✅ **No changes** to ranged weapon behavior  
✅ **Guns still rotate** toward targets  
✅ **Colonists still face** their aim direction  

## Visual Comparison

### Before Fix
```
Enemy → 👹
           
           ↓
           
Colonist → 🙂  ← Facing random direction
           🔪 ← Knife pointing wrong way
           
Attack happens but looks wrong!
```

### After Fix
```
Enemy → 👹
        ↑
        │
        └─── Colonist tracks enemy
        
Colonist → 🙂 ← Facing enemy
           🔪→ Knife pointing at enemy
           
Visual feedback matches gameplay!
```

## Implementation Details

### Files Modified
- `src/game/combat/pawnCombat.ts` (lines 422-427, 496-502)

### Properties Set
- `c.aimTarget = { x, y }` - Position of the enemy (for tracking)
- `c.aimAngle = atan2(...)` - Angle in radians from colonist to enemy
- `c.isAiming = true` - Flag that weapon should be visible and oriented

### Integration Points
1. **Combat System** → Sets aim data based on target
2. **Weapon Renderer** → Reads `aimAngle` to rotate weapon
3. **Colonist Renderer** → Reads `direction` (derived from aim) to flip sprite
4. **Animation System** → Uses aim data for attack direction

## Testing Checklist

- [x] Equip colonist with Knife
- [x] Draft colonist and move near enemy
- [x] Verify colonist sprite faces enemy ✅
- [x] Verify knife rotates toward enemy ✅
- [x] Verify stab animation plays in correct direction ✅
- [x] Equip colonist with Club
- [x] Verify club swings toward enemy ✅
- [x] Test with multiple enemies (colonist should track current target) ✅
- [x] Verify weapon disappears when undrafted with no enemies ✅

## Related Systems

This fix ensures consistency across:
- ✅ Melee combat targeting
- ✅ Ranged combat targeting  
- ✅ Weapon rendering
- ✅ Colonist sprite rendering
- ✅ Attack animations
- ✅ Draft system

All systems now use the same aim tracking mechanism regardless of weapon type.

## Performance Impact

**Negligible** - Only adds 3 property assignments per frame for melee combatants (already done for ranged).

## Notes

The fix treats melee and ranged combat symmetrically:
- Both set `aimTarget`, `aimAngle`, `isAiming`
- Both clear aim data when no target (unless drafted)
- Both preserve aim data when drafted without target
- Both use the same rendering pipeline

This makes the codebase more consistent and easier to maintain.
