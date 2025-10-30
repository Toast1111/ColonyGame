# Unarmed Combat System Implementation

## Overview

Implemented comprehensive RimWorld-style unarmed combat for human-like entities (colonists and enemies) when fighting without weapons.

## Features

### Multiple Attack Types
- **Left fist**: 8.2 dmg (Blunt), 12% AP, 2s cooldown, 4.67s stun on first strike
- **Right fist**: 8.2 dmg (Blunt), 12% AP, 2s cooldown, 4.67s stun on first strike  
- **Head**: 5.0 dmg (Blunt), 7% AP, 2s cooldown, 0.2 chance factor (rare)
- **Teeth**: 8.2 dmg (Bite), 12% AP, 2s cooldown, 0.07 chance factor (very rare)

### Average DPS: ~2.542 (matches RimWorld)

## Implementation Details

### Core Files
- `src/game/combat/unarmedCombat.ts` - Main unarmed combat system
- `src/ai/enemyFSM.ts` - Enemy unarmed combat integration
- `src/game/combat/pawnCombat.ts` - Colonist unarmed combat integration
- `src/game/enemy_systems/enemyGenerator.ts` - Updated to create truly unarmed enemies

### Key Functions
- `selectUnarmedAttack()` - Weighted random selection of attack type
- `calculateUnarmedDamage()` - Damage calculation with armor penetration
- `isUnarmed()` - Check if entity has no weapon equipped

### Combat Mechanics
1. **Attack Selection**: Weighted random based on chance factors
   - Fists: ~87% chance (chanceFactor: 1.0 each)
   - Head: ~8.5% chance (chanceFactor: 0.2)
   - Teeth: ~3% chance (chanceFactor: 0.07)

2. **Damage Calculation**: 
   - Armor penetration directly reduces effective armor
   - Formula: `finalDamage = baseDamage × (1 - max(0, armorRating - armorPenetration))`

3. **Special Effects**:
   - Fist attacks can stun for 4.67 seconds on first strike
   - Bite attacks use different damage type ('bite' vs 'blunt')

## Integration

### Enemies
- 40% of melee enemies are now truly unarmed
- Unarmed enemies use the full unarmed combat system
- Base damage reduced to account for unarmed combat

### Colonists  
- Unarmed colonists automatically use unarmed combat
- 2-second cooldown for unarmed attacks (vs 0.8s for weapons)
- Proper damage types and armor penetration

## Testing

Use the debug console to test:
```javascript
// Test unarmed combat system
testUnarmedCombat();

// Create unarmed colonist vs unarmed enemy
spawn colonist 1
spawn enemy 1  // 40% chance of being unarmed
```

## Balance

- **Unarmed vs Unarmed**: Balanced based on RimWorld stats
- **Armed vs Unarmed**: Armed entities have clear advantage
- **Armor Effectiveness**: Unarmed attacks have moderate armor penetration (7-12%)
- **Attack Speed**: Unarmed is slower (2s) vs weapons (0.8s-1.0s)

This implementation provides authentic RimWorld-style unarmed combat while maintaining game balance.