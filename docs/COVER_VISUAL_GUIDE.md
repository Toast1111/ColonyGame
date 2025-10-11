# Cover Mechanics Visual Guide

## Cover Value Hierarchy

```
HIGH COVER (Walls - 75% base)
    ┌─────────────┐
    │    WALL     │  ← Blocks line of sight
    │   ███████   │     Must lean out to fire
    └─────────────┘     Cannot shoot through

LOW COVER (Rocks - 50% base)
    ╱╲╱╲╱╲╱╲╱╲
   ╱ STONE  ╲    ← Can shoot over
  ╱  CHUNK   ╲      Partial protection
 ╱            ╲     Works from sides too
╱──────────────╲

LOW COVER (Trees - 30% base)
      🌳🌲🌳        ← Natural cover
     TREES          Can shoot over
                    Basic protection
```

## Directional Cover Effectiveness

Cover works best when facing the threat directly. Flanking reduces effectiveness:

```
FRONTAL ATTACK (0-15°) - 100% Effectiveness
    
         Enemy 👹
            ↓
            ↓
         ║WALL║
            👤 Colonist
         
Wall provides: 75% × 100% = 75% cover penalty


ANGLED ATTACK (27-40°) - 60% Effectiveness

    Enemy 👹
         ↘
          ↘
         ║WALL║
            👤 Colonist

Wall provides: 75% × 60% = 45% cover penalty


FLANKING ATTACK (>65°) - 0% Effectiveness

    Enemy 👹 → → → ║WALL║
                      👤 Colonist

Wall provides: 75% × 0% = 0% cover penalty
(No protection from side!)
```

### Angle Effectiveness Table

```
     0°        100% ███████████ Full protection
    15°         80% ████████▓▓  Very good
    27°         60% ██████▓▓▓▓  Good
    40°         40% ████▓▓▓▓▓▓  Reduced
    52°         20% ██▓▓▓▓▓▓▓▓  Minimal
    65°          0% ▓▓▓▓▓▓▓▓▓▓  None (flanked!)
```

## Distance-Based Effectiveness

Cover is less effective at close range:

```
POINT-BLANK (< 0.5 tiles) - 33.33% Effectiveness

    👹 ╱╲╱╲ 👤
Enemy right at cover: 50% × 33.33% = 16.7% cover


1 TILE AWAY - 66.666% Effectiveness

    👹  →  ╱╲╱╲ 👤
           1 tile
Cover: 50% × 66.666% = 33.3% cover


2+ TILES AWAY - 100% Effectiveness

    👹  → → →  ╱╲╱╲ 👤
               2+ tiles
Cover: 50% × 100% = 50% cover (full value)
```


## Multiple Cover Sources

Low cover pieces can combine when positioned between shooter and target:

```
DIAGONAL SHOT - Multiple Rocks

    Enemy 👹
         ↘
          ↘ ╱╲╱╲ Rock 1 (50% base, 60° angle = 20% effective)
           ↘  ↘
            ↘  ↘ ╱╲╱╲ Rock 2 (50% base, 30° angle = 45% effective)
             ↘   ↘
              ↘   👤 Colonist

Primary (Rock 2): 45% × 100% (distance) = 45%
Secondary (Rock 1): 20% × 100% × 0.2 = 4%
Total Cover: 49% penalty
```

## Tactical Examples

### Scenario 1: Optimal Wall Defense (75% Cover)

```
Enemy 👹
   ↓ Frontal attack (0-15° angle)
   ↓ 3 tiles away (100% distance)
   ↓
║WALL║
   👤 Colonist

Effective Cover: 75% × 100% × 100% = 75%
Enemy Accuracy: 25% of normal
```

### Scenario 2: Flanked Wall (0% Cover)

```
Enemy 👹 → → → → ║WALL║
                    👤 Colonist
                    
Attack from side (70° angle = 0% directional)
Effective Cover: 75% × 0% = 0%
Enemy Accuracy: 100% of normal (no protection!)
```

### Scenario 3: Rock Cover at Point-Blank (16.7% Cover)

```
    👹 Enemy at point-blank (0.3 tiles)
     ↓ Frontal attack (10° angle = 100%)
    ╱╲╱╲ Rock cover
     👤 Colonist

Effective Cover: 50% × 100% × 33.33% = 16.7%
Enemy Accuracy: 83.3% of normal
```

### Scenario 4: Optimal Rock Defense (50% Cover)

```
Enemy 👹
   ↓ Frontal attack (10° angle = 100%)
   ↓ 3 tiles away (100% distance)
   ↓
 ╱╲╱╲ Rock
   👤 Colonist

Effective Cover: 50% × 100% × 100% = 50%
Enemy Accuracy: 50% of normal
```

## Cover Detection Zones

Cover is only applied when objects are in the **last 25% of shot path**:

```
Shooter                                Target
  👤 ────────────────────────────────→ 👹
     ←──── 75% ────→←─── 25% ───→
                     ↑
                COVER ZONE
            (Objects here provide cover)
```

## Cover Seeking Behavior

When enemies approach, colonists automatically seek cover:

```
BEFORE:                    AFTER:
👹 approaching            👹 approaching
                              ↓
👤 exposed     →→→     ║  👤  (behind wall)
                       ║
                     
Colonist evaluates:
1. Find nearby cover (walls, rocks, trees)
2. Calculate positions around cover
3. Score by cover value (70%) + distance (30%)
4. Move to best position
```

## Enemy Using Defensive Lines

The drawback: enemies can use your defenses!

```
YOUR DEFENSE:              ENEMY ADVANCES:
   👤                          👹  ║  (using your wall!)
   ║ WALL ║                       ║
        
   👤                          👤  ←── harder to hit!
                               (enemy has 75% cover)
```

## Cover Adjacency

Objects must be **adjacent** to provide full cover:

```
TOO FAR (no cover):
👤 ──→ ... [gap] ... ║WALL║  👹

ADJACENT (full cover):
👤 ──→  ║WALL║  👹
        (within range)

DISTANCE THRESHOLDS:
- Walls: 40px (adjacent), 20px (partial)
- Rocks: 35px (adjacent), 20px (partial)
- Trees: 30px (adjacent), 18px (partial)
```

## Accuracy Calculation

Final accuracy formula with new system:
```
effectiveCover = baseCover × directionalMultiplier × distanceMultiplier
accuracy = baseAccuracy × distanceFactor × (1 - effectiveCover)

Examples with 80% base accuracy:

Scenario 1: Wall, frontal, 3 tiles away
- Cover: 75% × 100% × 100% = 75%
- Accuracy: 80% × 1.0 × (1-0.75) = 20%

Scenario 2: Wall, flanked (70° angle)
- Cover: 75% × 0% × 100% = 0%
- Accuracy: 80% × 1.0 × (1-0) = 80%

Scenario 3: Rock, frontal, point-blank
- Cover: 50% × 100% × 33.33% = 16.7%
- Accuracy: 80% × 1.0 × (1-0.167) = 66.6%

Scenario 4: Rock, frontal, 3 tiles
- Cover: 50% × 100% × 100% = 50%
- Accuracy: 80% × 1.0 × (1-0.5) = 40%

Scenario 5: Tree, angled (35°), 2 tiles
- Cover: 30% × 60% × 100% = 18%
- Accuracy: 80% × 1.0 × (1-0.18) = 65.6%
```

## Key Tactical Insights

### For Defenders 🛡️
```
✅ Position to face threats (0-15° angle)
✅ Keep distance from enemies (2+ tiles for full cover)
✅ Use walls for maximum protection (75% base)
✅ Layer multiple low cover for diagonal defense
```

### For Attackers ⚔️
```
✅ Flank enemies (>65° angle negates cover)
✅ Close distance for point-blank (reduces cover to 33%)
✅ Focus fire on poorly positioned targets
✅ Avoid frontal assaults on well-defended positions
```

## Key Takeaways

✅ **Directional System** - Cover effectiveness: 100% frontal → 0% flanked (>65°)
✅ **Distance Matters** - Cover effectiveness: 33% point-blank → 100% at 2+ tiles  
✅ **High vs Low Cover** - Walls block LoS (75%), rocks/trees shootable (30-50%)
✅ **Multiple Sources** - Low cover can combine (primary + 20% of secondary)
✅ **Tactical Depth** - Positioning and angles now crucial for combat
✅ **Works Both Ways** - Enemies use same system (can use your cover!)
