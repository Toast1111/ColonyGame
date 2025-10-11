# Weapon Stats Comparison Chart

## Quick Reference Table

| Weapon | Damage | Range | Burst | Aim | Cooldown | AP | SP | Optimal DPS |
|--------|--------|-------|-------|-----|----------|----|----|-------------|
| **Pistol** | 12 | 25 | 1 | 0.4s | 0.5s | 15% | 0.8 | 13.33 |
| **Rifle** | 15 | 45 | 3 | 0.6s | 0.7s | 25% | 1.2 ✓ | 32.14 |
| **Sniper** | 35 | 60 | 1 | 1.2s | 1.5s | 50% | 2.0 ✓ | 12.96 |
| **SMG** | 8 | 20 | 5 | 0.3s | 0.4s | 10% | 0.7 | 36.36 |
| **Knife** | 15 | 1 | 1 | 0.2s | 0.6s | 10% | 0.5 | 18.75 |

✓ = Can stagger (SP >= 1)

## Accuracy by Range

### Touch Range (3 tiles)
```
Pistol:  ████████████████████ 95%
Rifle:   ██████████████ 70%
Sniper:  ██████ 30%
SMG:     ████████████████████ 98%
```

### Short Range (12 tiles)
```
Pistol:  ████████████████ 80%
Rifle:   ██████████████████ 88%
Sniper:  ██████████████ 70%
SMG:     ███████████████ 75%
```

### Medium Range (25 tiles)
```
Pistol:  ███████████ 55%
Rifle:   ███████████████ 75%
Sniper:  ██████████████████ 92%
SMG:     █████████ 45%
```

### Long Range (40 tiles)
```
Pistol:  ███████ 35%
Rifle:   ██████████ 50%
Sniper:  ███████████████████ 95%
SMG:     ████ 20%
```

## DPS at Different Ranges

### Touch (3 tiles)
```
SMG:     35.63 ████████████████████████████████████
Rifle:   22.50 ████████████████████████
Pistol:  12.67 █████████████
Sniper:   3.89 ████
```

### Short (12 tiles)
```
SMG:     27.27 ███████████████████████████
Rifle:   28.28 ████████████████████████████
Pistol:  10.66 ███████████
Sniper:   9.07 █████████
```

### Medium (25 tiles)
```
Rifle:   24.11 ████████████████████████
SMG:     16.36 ████████████████
Sniper:  11.92 ████████████
Pistol:   7.33 ███████
```

### Long (40 tiles)
```
Rifle:   16.07 ████████████████
Sniper:  12.31 ████████████
Pistol:   4.67 █████
SMG:      7.27 ███████
```

## Weapon Roles & Tactics

### 🔫 Pistol - Reliable Backup
- **Best at**: All-around performance
- **Strengths**: Balanced stats, quick aim time
- **Weaknesses**: Low DPS, cannot stagger
- **Use case**: Secondary weapon, emergency defense

### 🔫 Assault Rifle - Main Battle Weapon
- **Best at**: Medium range (25 tiles)
- **Strengths**: High burst DPS, can stagger, versatile
- **Weaknesses**: Longer aim time, moderate AP
- **Use case**: Primary combat weapon, general purpose

### 🎯 Sniper Rifle - Precision Eliminator
- **Best at**: Long range (40+ tiles)
- **Strengths**: Highest single-shot damage, best AP, strong stagger
- **Weaknesses**: Very slow fire rate, poor at close range
- **Use case**: Eliminate priority targets, support from distance

### 🔫 SMG - Close Quarters Dominator
- **Best at**: Touch/short range (3-12 tiles)
- **Strengths**: Highest DPS up close, very fast fire rate
- **Weaknesses**: Poor accuracy at distance, low AP
- **Use case**: Building clearing, point defense, rush tactics

### 🔪 Combat Knife - Melee Last Resort
- **Best at**: Extreme close range (1 tile)
- **Strengths**: Very fast aim, always available
- **Weaknesses**: No range, cannot stagger, low DPS
- **Use case**: Emergency melee, stealth kills

## Armor Penetration Examples

### Against Flak Vest (30% armor)
```
Sniper:  50% AP → 0% effective armor → 100% damage (35 dmg)
Rifle:   25% AP → 5% effective armor  →  95% damage (14 dmg)
Pistol:  15% AP → 15% effective armor →  85% damage (10 dmg)
SMG:     10% AP → 20% effective armor →  80% damage (6 dmg)
Knife:   10% AP → 20% effective armor →  80% damage (12 dmg)
```

### Against Tactical Armor (50% armor)
```
Sniper:  50% AP → 0% effective armor  → 100% damage (35 dmg)
Rifle:   25% AP → 25% effective armor →  75% damage (11 dmg)
Pistol:  15% AP → 35% effective armor →  65% damage (8 dmg)
SMG:     10% AP → 40% effective armor →  60% damage (5 dmg)
Knife:   10% AP → 40% effective armor →  60% damage (9 dmg)
```

## Stopping Power Effects

### Weapons That Can Stagger (SP >= 1)
- **Sniper Rifle** (SP 2.0): 🟢 Strong stagger - Most reliable
- **Assault Rifle** (SP 1.2): 🟢 Moderate stagger - Consistent

### Weapons That Cannot Stagger (SP < 1)
- **Pistol** (SP 0.8): 🔴 No stagger
- **SMG** (SP 0.7): 🔴 No stagger
- **Knife** (SP 0.5): 🔴 No stagger

### Stagger Effect
When hit by weapon with SP >= 1:
- **Duration**: 1.58 seconds (95 ticks @ 60fps)
- **Speed reduction**: To 1/6th of normal speed
- **Tactical value**: 
  - Prevents enemy advances
  - Creates escape opportunities
  - Disrupts enemy attacks
  - Allows repositioning

## Combat Strategy Guide

### Loadout Recommendations

**Defensive Setup** (Base defense)
- Primary: Rifle (versatile, can stagger)
- Secondary: Pistol (backup, reliable)
- Why: Rifle handles most threats, pistol for emergencies

**Sniper Support** (Long range)
- Primary: Sniper (precision elimination)
- Secondary: SMG (close protection)
- Why: Sniper picks off threats, SMG protects if rushed

**Assault Squad** (Offensive)
- Primary: Rifle (main combat)
- Secondary: SMG (building clearing)
- Why: Rifle for approach, SMG for room-to-room

**Stealth/Scout** (Infiltration)
- Primary: Pistol (quiet, reliable)
- Melee: Knife (silent takedowns)
- Why: Low profile, backup options

### Range Management

**Optimal Engagement Distances**
```
SMG:      ←3-12 tiles→     [Best DPS zone]
Pistol:   ←──12-25 tiles──→ [Balanced zone]
Rifle:    ←───12-35 tiles───→ [Effective zone]
Sniper:       ←──────30-60 tiles──────→ [Sweet spot]
```

### Armor Counters

**Against Lightly Armored (0-20%)**
- Any weapon effective
- SMG maximizes DPS
- Pistol for efficiency

**Against Medium Armor (20-40%)**
- Rifle recommended (25% AP)
- Sniper for high-value targets
- Avoid SMG/Pistol

**Against Heavy Armor (40%+)**
- **Sniper only** (50% AP penetrates all)
- Rifle partially effective
- Other weapons severely reduced

## Technical Implementation Notes

### DPS Calculation Formula
```
Optimal DPS = (damage × burstCount) / (aimTime + (burstCount - 1) × 0.1 + cooldownTime)

Example (Rifle):
= (15 × 3) / (0.6 + (3-1) × 0.1 + 0.7)
= 45 / (0.6 + 0.2 + 0.7)
= 45 / 1.5
= 30 DPS
```

### Accuracy Interpolation
```
At 17.5 tiles (between short=12 and medium=25):
- t = (17.5 - 12) / (25 - 12) = 5.5 / 13 = 0.423
- Rifle: 88% + 0.423 × (75% - 88%) = 82.5%
```

### Effective Damage After Armor
```
effectiveArmor = max(0, armorRating - armorPenetration)
damageDealt = damage × (1 - effectiveArmor)

Example: Rifle vs Flak Vest
= 15 × (1 - max(0, 0.30 - 0.25))
= 15 × (1 - 0.05)
= 14.25 ≈ 14 damage
```
