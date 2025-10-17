# Weapon Rendering Bug Fix - Ranged Weapons Not Displaying

## Problem

Ranged weapons (guns) were not rendering when colonists were drafted, but melee weapons (knife) were displaying correctly.

## Root Cause

The issue was in `src/game/combat/pawnCombat.ts` in the `updateColonistCombat()` function:

```typescript
// Line 380: Set isAiming for drafted colonists
if (c.isDrafted) {
  c.isAiming = true;  // ✅ Weapon should be visible
}

// ... later in ranged combat section ...

// Lines 533-537: When no target found
if (target) {
  // has target - aim at it
  c.isAiming = true;
} else {
  // NO TARGET - this was clearing isAiming!
  c.isAiming = false;  // ❌ BUG: This overrode the drafted flag!
}
```

**The Problem:** When a drafted colonist with a ranged weapon had no target nearby, the code would set `isAiming = false`, which overwrote the `isAiming = true` that was set earlier for drafted colonists.

**Why Melee Worked:** Melee weapons triggered animations (`meleeAttackProgress`), and the renderer checks for animations OR drafted status. Since melee was actively animating, it bypassed the `isAiming` check.

## Solution

Modified the logic to preserve `isAiming = true` for drafted colonists even when they don't have a target:

```typescript
// Update aim tracking for weapon rendering
if (target) {
  c.aimTarget = { x: target.x, y: target.y };
  c.aimAngle = Math.atan2(target.y - c.y, target.x - c.x);
  c.isAiming = true;
} else {
  // Clear aim target when no enemy, but keep isAiming true if drafted
  // This ensures drafted colonists still display their weapons
  c.aimTarget = null;
  c.aimAngle = undefined;
  if (!c.isDrafted) {
    c.isAiming = false;  // Only clear if NOT drafted
  }
  // If drafted, isAiming stays true (set earlier at line 380)
}
```

## Fix Summary

| State | Before Fix | After Fix |
|-------|-----------|-----------|
| **Drafted + No Target** | `isAiming = false` ❌ | `isAiming = true` ✅ |
| **Drafted + Has Target** | `isAiming = true` ✅ | `isAiming = true` ✅ |
| **Not Drafted + No Target** | `isAiming = false` ✅ | `isAiming = false` ✅ |
| **Not Drafted + Has Target** | `isAiming = true` ✅ | `isAiming = true` ✅ |

## Expected Behavior After Fix

✅ **Ranged weapons now display when:**
- Colonist is drafted (even without target)
- Colonist is aiming at a target
- Colonist is in combat with a target

✅ **Melee weapons display when:**
- Colonist is drafted
- Colonist is actively attacking (animation playing)
- Colonist is aiming at a target

## Testing

To verify the fix:

1. **Draft a colonist with a gun** (press 'R')
2. **Weapon should appear immediately** even if no enemies nearby
3. **Move near an enemy** - weapon should rotate toward target
4. **Move away from enemies** - weapon should stay visible while drafted
5. **Undraft the colonist** - weapon should disappear

## Files Modified

- `src/game/combat/pawnCombat.ts` (lines 527-542)

## Related Systems

This fix ensures consistency between:
- Draft system (FSM)
- Combat targeting system
- Weapon rendering system
- Animation system

All systems now correctly respect the drafted state for weapon visibility.
