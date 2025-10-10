# Cover Mechanics Visual Guide

## Cover Value Hierarchy

```
BEST COVER (75%)
    ┌─────────────┐
    │    WALL     │  ← Colonists lean out to fire
    │   ███████   │     Enemies can't fire through
    └─────────────┘     Best protection

GOOD COVER (50%)
    ╱╲╱╲╱╲╱╲╱╲
   ╱ STONE  ╲    ← Better than trees
  ╱  CHUNK   ╲      Substantial protection
 ╱            ╲     Enemies can use too
╱──────────────╲

BASIC COVER (30%)
      🌳🌲🌳        ← Natural cover
     TREES          Less effective
                    Still useful
```

## How Cover Works

### Scenario 1: Wall Cover (75%)
```
Colonist                     Enemy
   👤  ←── (leaning out)    
        ║ WALL ║             👹
        ║      ║        
        
Colonist fires with normal accuracy
Enemy behind wall: 25% accuracy (75% cover penalty)
```

### Scenario 2: Stone Chunk Cover (50%)
```
Colonist            Stone Chunk       Enemy
   👤  ──────────→    ╱╲╱╲╱╲        
                     ╱      ╲         👹
                    ╱ ROCK   ╲
                   ╱──────────╲

Shot accuracy: 50% of normal (50% cover penalty)
```

### Scenario 3: Tree Cover (30%)
```
Colonist              Tree         Enemy
   👤  ──────────→    🌲🌲       
                       ║║            👹
                       ║║
                      
Shot accuracy: 70% of normal (30% cover penalty)
```

### Scenario 4: Multiple Cover (Best wins)
```
Colonist        Tree    Stone Chunk    Enemy
   👤  ──────→  🌲   ──→  ╱╲╱╲       
                ║        ╱    ╲         👹
                         ROCK

Uses highest cover value: 50% from stone chunk
(Tree's 30% is ignored)
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

Final accuracy formula:
```
accuracy = baseAccuracy × distanceFactor × (1 - coverValue)

Examples:
- Base 80%, no cover:    80% × 1.0 × (1-0)    = 80%
- Base 80%, tree cover:  80% × 1.0 × (1-0.3)  = 56%
- Base 80%, rock cover:  80% × 1.0 × (1-0.5)  = 40%
- Base 80%, wall cover:  80% × 1.0 × (1-0.75) = 20%
```

## Key Takeaways

✅ **Walls = Best** (75% cover, can't shoot through)
✅ **Rocks > Trees** (50% vs 30% cover)
✅ **Passive System** (cover works automatically)
✅ **Works Both Ways** (enemies can use your cover!)
✅ **Adjacent Required** (must be close to cover object)
✅ **Smart Seeking** (colonists find cover automatically)
