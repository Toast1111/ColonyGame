# Melee Combat System - Quick Reference

## 🎯 Implementation Summary

Successfully implemented all RimWorld-style melee combat mechanics as specified:

### ✅ Core Features
1. **Melee Hit Chance System** - Accuracy based on weapon stats and Melee skill
2. **Stacking Prevention** - No multiple attackers per target (colonists & enemies)
3. **Damage Types** - Cut vs Blunt with different properties
4. **Stun Mechanics** - Blunt weapons can stun enemies
5. **Armor Penetration** - Blunt damage bypasses most armor

---

## 🔧 Quick Setup

### New Melee Weapon: Wooden Club
```typescript
{
  damage: 12,
  damageType: 'blunt',      // No bleeding
  meleeHitChance: 0.80,     // 80% base accuracy
  stunChance: 0.25,         // 25% stun chance
  stoppingPower: 1.0        // Can stagger
}
```

### Updated Combat Knife
```typescript
{
  damage: 15,
  damageType: 'cut',        // Causes bleeding
  meleeHitChance: 0.85,     // 85% base accuracy
  armorPenetration: 0.1     // 10% armor bypass
}
```

---

## 📊 Mechanics At A Glance

### Hit Chance Formula
```
Final Hit Chance = min(0.98, weaponHitChance + (meleeSkill × 0.02))
```

Examples:
- Knife (0.85) + Melee 5 → 95% hit chance
- Club (0.80) + Melee 10 → 100% → capped at 98%
- Gun Bash (0.65) + Melee 0 → 65% hit chance

### Armor vs Damage Type

| Armor Rating | vs Cut Damage | vs Blunt Damage |
|--------------|---------------|-----------------|
| 0.3 (30%)    | 30% reduction | 9% reduction    |
| 0.5 (50%)    | 50% reduction | 15% reduction   |
| 0.8 (80%)    | 80% reduction | 24% reduction   |

**Blunt damage uses only 30% of armor rating = 70% armor penetration**

### Stun Effect
- **Trigger**: 25% chance on blunt weapon hit
- **Duration**: 1.5 seconds
- **Effect**: 90% speed reduction (enemy crawls)
- **Stackable**: No, refreshes duration

---

## 🎮 Testing Checklist

### Quick Console Tests
```javascript
// Give melee weapons
game.colonists[0].inventory.equipment.weapon = game.itemDatabase.createItem('Knife');  // Cut
game.colonists[0].inventory.equipment.weapon = game.itemDatabase.createItem('Club');   // Blunt

// Set Melee skill
game.colonists[0].skills.Melee.level = 10;  // High skill = high accuracy

// Spawn test enemy
game.enemies.push({x: 500, y: 500, r: 12, hp: 50, speed: 40, dmg: 10, color: 'red', target: null});
```

### What to Observe
1. ✅ Misses happen occasionally (especially low skill)
2. ✅ Only one colonist attacks each enemy
3. ✅ Only one enemy attacks each colonist
4. ✅ Blunt hits sometimes stun (enemy slows down)
5. ✅ Blunt damage effective vs armored targets
6. ✅ No bleeding from bruise injuries

---

## 🔑 Key Files Modified

1. **src/data/itemDatabase.ts**
   - Added: `meleeHitChance`, `damageType`, `stunChance` properties
   - Added: Wooden Club weapon definition
   - Updated: Combat Knife with melee stats

2. **src/game/combat/pawnCombat.ts**
   - Added: Hit chance calculation for melee
   - Added: Colonist stacking prevention
   - Added: Damage type from weapon
   - Added: Stun chance for blunt weapons
   - Added: Gun bash hit chance (65%)

3. **src/ai/enemyFSM.ts**
   - Added: Enemy stacking prevention
   - Added: Stun effect in movement speed

4. **src/game/Game.ts**
   - Added: Blunt damage armor reduction (30% effectiveness)

---

## 📚 Documentation Files

- **MELEE_COMBAT_IMPLEMENTATION.md** - Full technical documentation
- **MELEE_COMBAT_TEST_GUIDE.md** - Step-by-step testing guide
- **MELEE_COMBAT_QUICK_REFERENCE.md** - This file

---

## 🚀 Usage Examples

### Scenario 1: Armored Enemy
```
Enemy has 50% armor (Tactical Armor)
Colonist A: Knife (15 dmg, cut)
Colonist B: Club (12 dmg, blunt)

Knife: 15 × 0.5 = 7.5 damage
Club:  12 × 0.85 = 10.2 damage  (armor 50% × 30% = 15% effective)

Club is 36% more effective!
```

### Scenario 2: Skill Progression
```
Melee Skill 0:
- Knife: 85% hit → ~1.7 misses per 10 swings
- Club:  80% hit → ~2.0 misses per 10 swings

Melee Skill 10:
- Knife: 98% hit → ~0.2 misses per 10 swings  
- Club:  98% hit → ~0.2 misses per 10 swings
```

### Scenario 3: Stun Control
```
Club hits enemy 4 times:
- ~1 hit stuns (25% chance)
- Enemy slows to crawl
- Gives colonists time to escape/reposition
- Stun lasts 1.5 seconds
```

---

## ⚔️ Combat Strategy Tips

1. **Against Armored Enemies**: Use blunt weapons (club) for 70% armor penetration
2. **Against Unarmored Enemies**: Use cut weapons (knife) for bleeding damage
3. **Crowd Control**: Blunt weapons for stun to control enemy movement
4. **Positioning**: Spread colonists out, don't stack on same target
5. **Skill Training**: Higher Melee skill = fewer misses = more reliable damage

---

## 🐛 Known Behaviors

- Stacking prevention may cause colonists to stand idle if all nearby enemies are engaged
- Gun bash is intentionally less accurate than dedicated melee weapons
- Maximum hit chance is 98% to ensure combat remains somewhat unpredictable
- Stun and stagger effects use different systems and can both be active

---

## 🔄 Related Systems

This melee system integrates with:
- **Health System**: Bruise vs Cut injury types, bleeding mechanics
- **Armor System**: Armor rating calculation with damage type modifiers
- **Skill System**: Melee skill affects hit chance
- **Enemy AI**: Stun/stagger affects movement speed
- **Combat System**: Stopping power, armor penetration

---

**Implementation Complete** ✅

All requirements from the problem statement have been successfully implemented and tested.
