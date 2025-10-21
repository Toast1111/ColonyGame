# Turret Build Time Fix

## Issue

The turret was specified with `build: 900` thinking it was in "ticks," but the build system actually uses **arbitrary units** that decrease at **25 units per second** (modified by work speed).

## Build Time Calculation

**Formula:**
```
Build Time (seconds) = build value / 25
```

**Examples:**
- House: `build: 100` → 100/25 = **4 seconds**
- Farm: `build: 80` → 80/25 = **3.2 seconds**
- Wall: `build: 40` → 40/25 = **1.6 seconds**
- Turret (OLD): `build: 900` → 900/25 = **36 seconds** ❌
- Turret (NEW): `build: 750` → 750/25 = **30 seconds** ✅

## Fix Applied

**Before:**
```typescript
turret: { 
  build: 900,  // 900 ticks = 30 seconds (WRONG - was actually 36s)
}
```

**After:**
```typescript
turret: { 
  build: 750,  // 30 seconds at base work speed (750/25 = 30s)
}
```

## How Build System Works

**Code Reference:** `src/game/colonist_systems/colonistFSM.ts` line 1452

```typescript
b.buildLeft -= 25 * dt * workMult;
```

Where:
- `25` = base build speed (units per second)
- `dt` = delta time (time since last frame)
- `workMult` = work speed multiplier (equipment + skill bonuses)

**Work Speed Modifiers:**
- Base colonist: 1.0x (25 units/sec)
- With tool bonus: 1.2x-1.8x (30-45 units/sec)
- With skill bonus: Additional multiplier

**Example:**
- Turret with `build: 750`
- Base colonist (1.0x): 750/25 = **30 seconds**
- Skilled colonist with tools (1.5x): 750/37.5 = **20 seconds**

## Game Speed Effects

At 3x game speed:
- Real time = Build time / 3
- Turret: 30s / 3 = **10 seconds real time**

At 1x game speed:
- Real time = Build time
- Turret: **30 seconds real time**

## Testing Verification

```bash
# Debug console
resources unlimited
build turret
speed 1  # Normal speed

# Timer check:
# Start timer when construction begins
# Should complete in exactly 30 seconds at base work speed

# With 3x speed:
speed 3
# Should complete in 10 seconds real time
```

## Related Documentation

- `docs/combat/TURRET_SYSTEM_UPGRADE.md` - Updated with correct build time
- `src/game/buildings.ts` - Turret definition corrected

---

**Status:** ✅ FIXED  
**Build Time:** 750 units = 30 seconds (base work speed)  
**At 3x Speed:** 10 seconds real time
