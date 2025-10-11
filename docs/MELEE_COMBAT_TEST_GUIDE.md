# Melee Combat Test Guide

## Quick Test Scenarios

### Test 1: Melee Hit Chance
**Objective**: Verify that melee attacks can miss based on hit chance and skill level

**Steps**:
1. Start a new game or load existing save
2. Select a colonist and check their Melee skill level
3. Open debug console (press ` or ~)
4. Give the colonist a combat knife: `game.colonists[0].inventory.equipment.weapon = game.itemDatabase.createItem('Knife')`
5. Draft the colonist and engage an enemy
6. Observe combat log - you should see some misses (especially at low Melee skill)

**Expected Results**:
- Colonist with Melee 0: ~85% hit chance (knife base) - should miss ~15% of attacks
- Colonist with Melee 10: ~100% hit chance (capped at 98%) - should rarely miss
- Miss messages should appear occasionally in the combat log

### Test 2: Colonist Stacking Prevention
**Objective**: Verify that multiple colonists won't stack on the same enemy

**Steps**:
1. Start a game with at least 2 colonists
2. Draft both colonists
3. Order them to attack the same enemy
4. Observe their behavior

**Expected Results**:
- First colonist to reach melee range will engage
- Second colonist should NOT stack on top of first colonist
- Second colonist will remain idle or find another target
- Only one colonist should be in melee range of any single enemy at a time

### Test 3: Enemy Stacking Prevention
**Objective**: Verify that only one enemy attacks each colonist

**Steps**:
1. Spawn multiple enemies near a single colonist
2. Let the enemies approach
3. Observe which enemies attack

**Expected Results**:
- Only one enemy should be attacking each colonist at melee range
- Other enemies should move to find other targets or wait
- No multiple enemies stacked on the same colonist

### Test 4: Blunt Damage - No Bleeding
**Objective**: Verify that blunt weapons don't cause bleeding

**Steps**:
1. Give a colonist a wooden club: `game.colonists[0].inventory.equipment.weapon = game.itemDatabase.createItem('Club')`
2. Have the colonist attack an enemy
3. Check the colonist's health panel after being hit

**Expected Results**:
- Blunt damage creates "Bruise" injuries
- Bruise injuries show 0 bleeding
- No blood loss over time from blunt attacks

### Test 5: Blunt Damage - Stun Effect
**Objective**: Verify that blunt weapons can stun enemies

**Steps**:
1. Give a colonist a wooden club
2. Draft the colonist and attack an enemy
3. Watch the enemy's movement after being hit

**Expected Results**:
- Approximately 25% of hits should trigger stun effect
- Stunned enemies move at ~10% normal speed (very slow)
- Stun effect lasts 1.5 seconds
- Enemy should visibly slow down when stunned

### Test 6: Blunt Damage vs Armor
**Objective**: Verify that armor is less effective against blunt damage

**Steps**:
1. Give colonist A tactical armor: `game.colonists[0].inventory.equipment.armor = game.itemDatabase.createItem('TacticalArmor')`
2. Give colonist B a wooden club
3. Draft B and have them attack A (friendly fire test)
4. Compare damage to a cutting weapon attack

**Expected Results**:
- Tactical armor normally provides 50% damage reduction
- Against blunt damage: only 15% reduction (0.5 × 0.3 = 0.15)
- Blunt weapon should do more damage than expected against armored targets
- Cut weapons should do less damage against same armored target

### Test 7: Gun Bash Hit Chance
**Objective**: Verify that gun bash has lower hit chance than melee weapons

**Steps**:
1. Give a colonist a rifle (ranged weapon)
2. Draft the colonist and move them very close to an enemy (within 1 tile)
3. Observe the melee attacks (gun bash)

**Expected Results**:
- Gun bash base hit chance is 65% (lower than knife's 85%)
- More misses compared to dedicated melee weapons
- Still benefits from Melee skill (+2% per level)

## Debug Commands

### Spawn Test Enemies
```javascript
// Spawn a single enemy
game.enemies.push({
  x: game.colonists[0].x + 100,
  y: game.colonists[0].y,
  r: 12,
  hp: 50,
  speed: 40,
  dmg: 10,
  color: 'red',
  target: null
});

// Spawn 3 enemies near a colonist
for (let i = 0; i < 3; i++) {
  game.enemies.push({
    x: game.colonists[0].x + 50 + i * 30,
    y: game.colonists[0].y + 50,
    r: 12,
    hp: 50,
    speed: 40,
    dmg: 10,
    color: 'red',
    target: null
  });
}
```

### Give Weapons
```javascript
// Combat Knife (cutting)
game.colonists[0].inventory.equipment.weapon = game.itemDatabase.createItem('Knife');

// Wooden Club (blunt)
game.colonists[0].inventory.equipment.weapon = game.itemDatabase.createItem('Club');

// Rifle (for gun bash test)
game.colonists[0].inventory.equipment.weapon = game.itemDatabase.createItem('Rifle');
```

### Give Armor
```javascript
// Tactical armor (50% protection)
game.colonists[0].inventory.equipment.armor = game.itemDatabase.createItem('TacticalArmor');

// Flak vest (30% protection)
game.colonists[0].inventory.equipment.armor = game.itemDatabase.createItem('FlakVest');
```

### Set Melee Skill
```javascript
// Set Melee skill to 0 (low hit chance)
game.colonists[0].skills.Melee.level = 0;
game.colonists[0].skills.Melee.xp = 0;

// Set Melee skill to 10 (high hit chance)
game.colonists[0].skills.Melee.level = 10;
game.colonists[0].skills.Melee.xp = 0;

// Set Melee skill to 20 (master)
game.colonists[0].skills.Melee.level = 20;
game.colonists[0].skills.Melee.xp = 0;
```

### Check Hit Chance
```javascript
// Check current weapon stats
const weapon = game.colonists[0].inventory?.equipment?.weapon;
if (weapon) {
  const def = game.itemDatabase.getItemDef(weapon.defName);
  console.log('Weapon:', def.label);
  console.log('Base Hit Chance:', def.meleeHitChance);
  console.log('Damage Type:', def.damageType);
  console.log('Stun Chance:', def.stunChance);
}

// Check colonist melee skill
const skill = game.colonists[0].skills?.Melee;
console.log('Melee Skill:', skill?.level || 0);
```

## Visual Indicators

### What to Look For
1. **Miss Animation**: Colonist swings but no damage numbers appear
2. **Stun Effect**: Enemy moves very slowly (crawling)
3. **No Bleeding**: Health panel shows injuries without bleeding stat
4. **Stacking**: Multiple colonists/enemies should NOT overlap on same target

### Combat Log Messages
- "Missed melee attack" (implied by no damage message)
- "Enemy stunned!" (if implemented in UI)
- Body part damage messages should show damage type (bruise vs cut)

## Expected Behavior Summary

| Scenario | Expected Outcome |
|----------|-----------------|
| Low Melee skill (0-5) | ~15-25% miss rate with knife |
| High Melee skill (15+) | <5% miss rate with knife |
| Gun bash | ~35% miss rate at skill 0 |
| 2 colonists vs 1 enemy | Only 1 colonist engages |
| 3 enemies vs 1 colonist | Only 1 enemy attacks |
| Club hits enemy | 25% chance of stun (slow movement) |
| Club vs 50% armor | Only 15% damage reduction |
| Knife vs 50% armor | Full 50% damage reduction |
| Blunt injury | No bleeding |
| Cut injury | Bleeding present |

## Troubleshooting

### Colonists Not Attacking
- Check if they're drafted (press D)
- Check if another colonist is already in range
- Check if they have a weapon equipped

### Stun Not Working
- Only blunt weapons with `stunChance` property can stun
- 25% chance means ~1 in 4 hits will stun
- Watch enemy movement speed (should be very slow)

### Armor Not Reducing Damage
- Check colonist has armor equipped: `game.colonists[0].inventory?.equipment?.armor`
- Verify armor rating: `game.itemDatabase.getItemDef('TacticalArmor').armorRating`
- Remember blunt damage only uses 30% of armor rating
