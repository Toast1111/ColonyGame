# Weapon Stats System - Implementation Summary

## Overview
This document describes the implementation of a comprehensive RimWorld-style weapon stats system with advanced combat mechanics including armor penetration, stopping power, range-based accuracy, and DPS calculations.

## Body Part HP Changes

Updated body part HP values to match the specification:
- **Head** (contains brain): 10 HP (was 40 HP)
- **Torso** (general body): 40 HP (was 80 HP)
- **Arms**: 30 HP each (unchanged)
- **Legs**: 35 HP each (unchanged)

## Weapon Stats

### New Weapon Properties

All weapons now support the following advanced stats:

1. **Armor Penetration** (`armorPenetration: number`)
   - Range: 0-1
   - Directly subtracts from armor rating
   - If AP > armor %, armor is completely ignored
   - Example: 0.25 AP vs 0.30 armor = 0.05 effective armor (5% damage reduction)

2. **Stopping Power** (`stoppingPower: number`)
   - Value >= 1 can stagger humans and human-like creatures
   - Stagger effect: Reduces speed to 1/6th for 95 ticks (1.58 seconds)
   - Applied to both colonists and enemies

3. **Burst Count** (`burstCount: number`)
   - How many bullets are fired in each burst
   - Time between bullets in burst: 0.1 seconds (fixed)

4. **Aim Time** (`aimTime: number`)
   - Warmup time before shooting (in seconds)
   - Colonist must remain stationary during aim time

5. **Cooldown Time** (`cooldownTime: number`)
   - Time after shooting before next burst can begin (in seconds)

6. **Range-Based Accuracy**
   - `accuracyTouch`: Accuracy at 3 tiles (touch range)
   - `accuracyShort`: Accuracy at 12 tiles (short range)
   - `accuracyMedium`: Accuracy at 25 tiles (medium range)
   - `accuracyLong`: Accuracy at 40 tiles (long range)
   - Linear interpolation used for values in between

## Weapon Definitions

### Pistol
- **Damage**: 12
- **Range**: 25 tiles
- **Burst Count**: 1
- **Aim Time**: 0.4s
- **Cooldown**: 0.5s
- **Armor Penetration**: 15%
- **Stopping Power**: 0.8 (cannot stagger)
- **Accuracy**: 95% (touch) → 80% (short) → 55% (medium) → 35% (long)
- **Optimal DPS**: 13.33

### Assault Rifle
- **Damage**: 15
- **Range**: 45 tiles
- **Burst Count**: 3
- **Aim Time**: 0.6s
- **Cooldown**: 0.7s
- **Armor Penetration**: 25%
- **Stopping Power**: 1.2 (can stagger)
- **Accuracy**: 70% (touch) → 88% (short) → 75% (medium) → 50% (long)
- **Optimal DPS**: 32.14

### Sniper Rifle
- **Damage**: 35
- **Range**: 60 tiles
- **Burst Count**: 1
- **Aim Time**: 1.2s
- **Cooldown**: 1.5s
- **Armor Penetration**: 50%
- **Stopping Power**: 2.0 (strong stagger)
- **Accuracy**: 30% (touch) → 70% (short) → 92% (medium) → 95% (long)
- **Optimal DPS**: 12.96
- **Note**: Poor at close range, excellent at long range

### SMG (Submachine Gun)
- **Damage**: 8
- **Range**: 20 tiles
- **Burst Count**: 5
- **Aim Time**: 0.3s
- **Cooldown**: 0.4s
- **Armor Penetration**: 10%
- **Stopping Power**: 0.7 (cannot stagger)
- **Accuracy**: 98% (touch) → 75% (short) → 45% (medium) → 20% (long)
- **Optimal DPS**: 36.36
- **Note**: High DPS at close range, poor at distance

### Combat Knife (Melee)
- **Damage**: 15
- **Range**: 1 tile
- **Burst Count**: 1
- **Aim Time**: 0.2s
- **Cooldown**: 0.6s
- **Armor Penetration**: 10%
- **Stopping Power**: 0.5 (cannot stagger)

## DPS Calculations

### Optimal DPS
Formula: `(damage × burstCount) / (aimTime + (burstCount - 1) × 0.1 + cooldownTime)`

This represents maximum damage output if every shot hits an unarmored target.

### DPS at Range
Formula: `OptimalDPS × AccuracyAtRange`

This factors in weapon accuracy at a specific range (before shooter's skill, armor, cover, etc.)

Examples:
- **Rifle at short range (12 tiles)**: 32.14 × 0.88 = 28.28 DPS
- **Sniper at long range (40 tiles)**: 12.96 × 0.95 = 12.31 DPS
- **SMG at touch range (3 tiles)**: 36.36 × 0.98 = 35.63 DPS

## Combat Mechanics

### Accuracy Interpolation
The system uses linear interpolation between accuracy breakpoints:

```typescript
if (distance <= 3) return accuracyTouch;
else if (distance <= 12) interpolate between touch and short;
else if (distance <= 25) interpolate between short and medium;
else if (distance <= 40) interpolate between medium and long;
else return accuracyLong;
```

Example: At 17.5 tiles (halfway between short and medium):
- Short range accuracy: 88%
- Medium range accuracy: 75%
- Interpolated accuracy: (88 + 75) / 2 = 81.5%

### Armor Penetration
When a bullet hits an armored target:

```typescript
const effectiveArmor = Math.max(0, armorRating - armorPenetration);
const damageDealt = damage × (1 - effectiveArmor);
```

Example:
- Rifle damage: 15
- Rifle AP: 0.25 (25%)
- Flak Vest armor: 0.30 (30%)
- Effective armor: max(0, 0.30 - 0.25) = 0.05 (5%)
- Damage dealt: 15 × (1 - 0.05) = 14.25 ≈ 14

### Stopping Power (Stagger)
When a bullet with stopping power >= 1 hits:

```typescript
if (stoppingPower >= 1) {
  target.staggeredUntil = currentTime + 1.58; // 95 ticks at 60fps
}

// During movement:
if (target.staggeredUntil > currentTime) {
  speed = speed / 6; // Reduced to 1/6th
}
```

## Implementation Details

### Files Modified
1. **src/game/types.ts**
   - Added `staggeredUntil` to Colonist and Enemy types
   - Added `armorPenetration` and `stoppingPower` to Bullet type

2. **src/data/itemDatabase.ts**
   - Added new weapon stat fields to ItemDef interface
   - Updated all weapon definitions with new stats

3. **src/game/combat/pawnCombat.ts**
   - Added `interpolateAccuracy()` function
   - Updated `getWeaponStats()` to return `accuracyFn`
   - Modified bullet creation to include AP and stopping power

4. **src/game/combat/combatSystem.ts**
   - Updated damage application to handle armor penetration
   - Added stopping power application on hit

5. **src/game/colonist_systems/colonistFSM.ts**
   - Applied stagger speed reduction to colonist movement

6. **src/ai/enemyFSM.ts**
   - Applied stagger speed reduction to enemy movement

7. **src/game/health/healthSystem.ts**
   - Updated body part HP values

### New Files Created
1. **src/game/combat/weaponStats.ts**
   - `calculateOptimalDPS()`: Calculates maximum DPS
   - `getAccuracyAtRange()`: Interpolates accuracy by distance
   - `calculateDPSAtRange()`: Calculates DPS at specific range
   - `getWeaponStatsSummary()`: Returns comprehensive stats

2. **src/game/test/weaponStatsTest.ts**
   - Test suite for weapon stats system
   - Available in browser console as `window.testWeaponStats()`

## Testing

To test the weapon stats in browser console:
```javascript
await window.testWeaponStats();
```

This will display:
- All weapon stats (damage, range, accuracy, etc.)
- DPS calculations at various ranges
- Body part HP values
- Armor penetration examples
- Stopping power demonstrations

## Balance Considerations

### Weapon Roles
- **Pistol**: Balanced sidearm, good at all ranges
- **Rifle**: Versatile main weapon, can stagger, good burst damage
- **Sniper**: Long-range specialist, high single-shot damage, strong stagger
- **SMG**: Close-quarters specialist, highest DPS up close, poor at range
- **Knife**: Melee backup, no stagger capability

### Combat Flow
1. Colonist acquires target
2. Enters aim time (must stand still)
3. Fires burst (if burstCount > 1)
4. Enters cooldown
5. Can move during cooldown or continue shooting

### Stagger Strategy
Weapons with SP >= 1 can create tactical opportunities:
- Sniper (SP 2.0): Strong stagger, slows enemy advances
- Rifle (SP 1.2): Moderate stagger, disrupts enemy attacks
- SMG/Pistol: Cannot stagger, rely on raw DPS
