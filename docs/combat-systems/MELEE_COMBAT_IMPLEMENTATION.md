# Melee Combat System - Implementation Summary

## Overview
This document describes the implementation of RimWorld-style melee combat mechanics including hit chance, stacking prevention, damage types, and blunt damage mechanics.

## Features Implemented

### 1. Melee Hit Chance System
- **Base Hit Chance**: Each melee weapon has a `meleeHitChance` property (0-1 scale)
- **Skill Modifier**: Melee skill adds +2% hit chance per level
- **Maximum Hit Chance**: Capped at 98% to ensure some chance of missing
- **Gun Bash**: When using ranged weapons in melee range, base hit chance is 65% (lower than melee weapons)

Example:
- Combat Knife: 85% base hit chance
- Wooden Club: 80% base hit chance
- Gun bash: 65% base hit chance

With Melee skill 10: Combat Knife has 85% + (10 × 2%) = 100% → capped at 98%

### 2. Colonist Stacking Prevention
Colonists will not stack into the same cell when engaging in melee combat:
- Before attacking, system checks if another colonist is already in melee range of the target
- If another colonist is already engaging, the colonist will not attack and remains idle
- Prevents multiple colonists from clustering on the same enemy

### 3. Enemy Stacking Prevention
Only one enemy per cell can attack the same target:
- Each enemy checks if another enemy is already attacking the same colonist
- Only allows one enemy to attack a specific colonist at melee range
- Prevents unrealistic enemy stacking and overwhelming damage

### 4. Blunt Damage Mechanics

#### Damage Types
Melee weapons now have a `damageType` property:
- **'cut'**: Causes bleeding, normal armor effectiveness (Combat Knife)
- **'blunt'**: No bleeding, reduced armor effectiveness (Wooden Club)

#### Blunt Damage Features
1. **No Bleeding**: Blunt damage ('bruise' type) creates injuries with 0 bleeding
2. **Armor Penetration**: Blunt attacks ignore 70% of armor
   - Normal armor: 30% effectiveness against blunt
   - Example: 0.5 armor rating → only 0.15 effective against blunt (0.5 × 0.3)
3. **Stun Chance**: Blunt weapons can have a `stunChance` property
   - Wooden Club: 25% chance to stun on hit
   - Stun effect: Reduces enemy speed by 90% for 1.5 seconds
   - Stacks with existing stagger mechanics

### 5. Melee Weapon Definitions

#### Combat Knife
```typescript
{
  defName: 'Knife',
  damage: 15,
  range: 1,
  armorPenetration: 0.1,
  stoppingPower: 0.5,
  meleeHitChance: 0.85,
  damageType: 'cut'
}
```

#### Wooden Club (New)
```typescript
{
  defName: 'Club',
  damage: 12,
  range: 1,
  armorPenetration: 0.0,
  stoppingPower: 1.0, // Can stagger
  meleeHitChance: 0.80,
  damageType: 'blunt',
  stunChance: 0.25 // 25% chance to stun
}
```

## Implementation Details

### Files Modified
1. **src/data/itemDatabase.ts**
   - Added `meleeHitChance`, `damageType`, and `stunChance` properties to ItemDef
   - Updated Knife definition with melee stats
   - Added new Wooden Club weapon

2. **src/game/combat/pawnCombat.ts**
   - Implemented hit chance calculation for melee attacks
   - Added colonist stacking prevention check
   - Added damage type determination from weapon
   - Implemented stun chance for blunt weapons
   - Added hit chance for gun bash attacks

3. **src/ai/enemyFSM.ts**
   - Added enemy stacking prevention check
   - Implemented stun effect in enemy movement (90% speed reduction)

4. **src/game/Game.ts**
   - Modified `applyDamageToColonist` to reduce armor effectiveness against blunt damage
   - Blunt damage now only affected by 30% of armor rating

## Combat Mechanics

### Melee Attack Flow (Colonists)
1. Check if target is in melee range (1.3 tiles)
2. Check if another colonist is already engaging target (prevent stacking)
3. Check if colonist is stationary (required for melee)
4. Check if melee cooldown has elapsed
5. Calculate hit chance: `min(0.98, weaponHitChance + (meleeSkill × 0.02))`
6. Roll for hit/miss
7. If hit:
   - Determine damage type from weapon (cut/blunt)
   - Apply damage with appropriate type
   - If blunt weapon, roll for stun chance
   - Grant Melee XP
8. Set melee cooldown (0.8s)

### Melee Attack Flow (Enemies)
1. Check if target is in melee range
2. Check if another enemy is already attacking target (prevent stacking)
3. Check if enemy is stationary (required for melee)
4. Check if melee cooldown has elapsed
5. Apply damage with appropriate damage type
6. Set melee cooldown (1.0s)

### Armor vs Damage Type
- **Cut damage**: Full armor effectiveness
  - 0.5 armor = 50% damage reduction
- **Blunt damage**: 30% armor effectiveness
  - 0.5 armor = 15% damage reduction (0.5 × 0.3)
- **Other damage types**: Full armor effectiveness

### Stun Effect
- Applied only by blunt weapons with `stunChance` property
- Duration: 1.5 seconds
- Effect: 90% speed reduction (enemy moves at 10% speed)
- Separate from stagger effect (which reduces to 1/6th speed)

## Balance Considerations

### Weapon Roles
- **Combat Knife**: High damage, bleeding, good hit chance, bypasses some armor
- **Wooden Club**: Lower damage, no bleeding, can stagger and stun, very effective against armored targets

### Tactical Implications
1. **Blunt weapons are strong against armored enemies**: 70% armor penetration makes clubs effective vs heavily armored foes
2. **Cut weapons better against unarmored**: Higher damage and bleeding makes knives deadly against light enemies
3. **Stacking prevention encourages spreading out**: Players must position multiple colonists strategically
4. **Stun creates opportunities**: 25% stun chance can disrupt enemy advances and create tactical advantages

## Testing

To test melee combat improvements in the game:
1. Equip a colonist with a combat knife or wooden club
2. Draft the colonist and engage enemies
3. Observe:
   - Melee attacks can miss based on hit chance
   - Multiple colonists won't stack on same target
   - Blunt weapons stun enemies occasionally
   - Blunt weapons are more effective against armored colonists in friendly fire

## Future Enhancements
- Add more melee weapon types (sword, spear, mace)
- Implement reach weapons with extended melee range
- Add backstab/flanking mechanics for positioning bonuses
- Implement melee dodge/parry system
