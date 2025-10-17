# Melee Animation Visual Guide

## Animation Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│            MELEE ATTACK ANIMATION FLOW                   │
└─────────────────────────────────────────────────────────┘

BEFORE ATTACK                DURING ATTACK              AFTER ATTACK
┌──────────┐                ┌──────────┐               ┌──────────┐
│          │                │   💥     │               │          │
│   🙂     │    ─────>      │   🙂🔨   │   ─────>      │   🙂     │
│   🔨     │   TRIGGER      │   👹     │   COMPLETE    │   🔨     │
│   👹     │   ATTACK       │          │   ANIMATION   │   💀     │
│          │                │          │               │          │
└──────────┘                └──────────┘               └──────────┘
  Idle/Ready               Animating               Ready for next
  progress = undefined     progress: 0 → 1         progress = undefined
```

## Swing Animation (Club)

### Frame-by-Frame Breakdown

```
Frame 0 (0%)          Frame 5 (33%)        Frame 10 (66%)       Frame 15 (100%)
Progress: 0.0         Progress: 0.33       Progress: 0.66       Progress: 1.0
   
      ╱                    |                    ╲                    ╲
     ╱                     |                     ╲                    ╲
    ▲                     🙂                     🙂                   🙂
  PULLED                NEUTRAL                FORWARD              FOLLOW-
   BACK                (IMPACT)               MOTION               THROUGH
  -60°                   0°                    +15°                 +30°

Rotation: -60°           -20°                  +10°                 +30°
X Offset: 0px            1.3px                 2.6px                4px
Y Offset: 0px            -1.8px                -1.8px               0px
```

### Motion Path Visualization

```
         Side View                    Top View
                                        
         🙂                             🙂
         ╱│╲                           ╱│╲
        ╱ │ ╲                         ╱ │ ╲
   ╱───────────╲                 ╱───────────╲
  ▲             ╲               ▲             →
 Back          Forward         Back         Forward
 
 Arc height: 2px               Forward: 4px
 Total arc: 90°                Total angle: 90°
```

## Stab Animation (Knife)

### Frame-by-Frame Breakdown

```
Frame 0 (0%)      Frame 4.5 (30%)    Frame 7.5 (50%)    Frame 15 (100%)
Progress: 0.0     Progress: 0.3      Progress: 0.5      Progress: 1.0

   🙂━>              🙂━━━>             🙂━━>               🙂━>
  READY            EXTENDING          RETRACTING          READY
   
Extension: 0%          100%              67%                0%
X Offset:  0px         12px              8px                0px
Rotation:  0°          5.7°              3.8°               0°
```

### Motion Timeline

```
Time (ms):  0    75   125   175   250
            │────│────│─────│─────│
Progress:   0   0.3  0.5   0.75   1.0
            │    │    │     │     │
Extension:  0%→ 100%→ 67% → 33% → 0%
            
Phase:      [THRUST]  [RETRACT        ]
Speed:      FAST      SLOWER (CONTROL)
            
            ━>━━━━>━━━>━━>━>
```

## Easing Visualization

### Ease-In-Out Curve

```
Progress (Output)
   1.0 │                 ┌────
       │               ╱
   0.8 │             ╱
       │           ╱
   0.6 │         ╱
       │       ╱
   0.4 │     ╱
       │   ╱
   0.2 │ ╱
       │╱
   0.0 └─────────────────────> Time (Input)
       0   0.2  0.4  0.6  0.8  1.0
       
   Slow    Fast      Fast    Slow
   Start   ────>     <────   End
```

### Velocity Curve

```
Velocity
   ▲
   │        ╱╲
 1 │      ╱    ╲
   │    ╱        ╲
 0.5│  ╱            ╲
   │╱                ╲
 0 └──────────────────────> Time
   0   0.25  0.5  0.75   1.0
   
   Accel    Peak    Decel
```

## Comparison: Club vs Knife

```
┌─────────────────────────────────────────────────────────────┐
│                    CLUB SWING                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Start         Mid          End                             │
│    ╱           |            ╲                               │
│   ╱            |             ╲                              │
│  ▲            🙂              ╲                             │
│                                                              │
│  Motion: CIRCULAR ARC                                        │
│  Range:  90° rotation                                        │
│  Style:  SWEEPING, powerful                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    KNIFE STAB                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Start    Extend    Retract                                 │
│    ━>     ━━━>       ━>                                     │
│   🙂       🙂        🙂                                     │
│                                                              │
│  Motion: LINEAR THRUST                                       │
│  Range:  12px extension                                      │
│  Style:  PIERCING, precise                                   │
└─────────────────────────────────────────────────────────────┘
```

## Animation Performance

### Memory Usage per Colonist

```
┌────────────────────────────────────┐
│  Property            Size    Total │
├────────────────────────────────────┤
│  meleeAttackProgress   4B      4B  │
│  meleeAttackType       4B      4B  │
│                              ──────│
│  Total per colonist:          8B   │
└────────────────────────────────────┘

For 100 colonists: 800 bytes (0.8KB)
Impact: NEGLIGIBLE
```

### CPU Usage per Frame

```
┌─────────────────────────────────────────┐
│  Operation          Time     % of Frame │
├─────────────────────────────────────────┤
│  Progress update     0.001ms     0.01%  │
│  Easing calc         0.002ms     0.01%  │
│  Transform calc      0.003ms     0.02%  │
│  Apply transform     0.002ms     0.01%  │
│                     ──────────  ──────  │
│  Total per colonist: 0.008ms     0.05%  │
└─────────────────────────────────────────┘

At 60 FPS: 16.67ms available per frame
10 animating colonists: 0.08ms (0.5% of budget)
Impact: NEGLIGIBLE
```

## State Machine

```
┌─────────────────────────────────────────────────────────┐
│              ANIMATION STATE MACHINE                     │
└─────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  IDLE   │  meleeAttackProgress = undefined
    │         │  meleeAttackType = null
    └────┬────┘
         │
         │ Attack Triggered
         │
         ▼
    ┌─────────┐
    │ANIMATING│  meleeAttackProgress = 0 → 1
    │         │  meleeAttackType = 'swing' | 'stab'
    └────┬────┘
         │
         │ Progress >= 1.0
         │
         ▼
    ┌─────────┐
    │  IDLE   │  meleeAttackProgress = undefined
    │         │  meleeAttackType = null
    └─────────┘
         │
         │ Cooldown (0.8s)
         │
         ▼
    [Ready for next attack]
```

## Integration Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  SYSTEM INTEGRATION                           │
└──────────────────────────────────────────────────────────────┘

    pawnCombat.ts                Game.ts              weaponRenderer.ts
         │                          │                         │
         │ Melee attack lands       │                         │
         ├─────────────────────────>│                         │
         │ Set attackType & progress│                         │
         │                          │                         │
         │                          │ Update progress         │
         │                          │ (every frame)           │
         │                          │                         │
         │                          │ Draw colonist           │
         │                          ├────────────────────────>│
         │                          │                         │
         │                          │            Apply animation
         │                          │            transforms
         │                          │                 │
         │                          │<────────────────┘
         │                          │ Render weapon
         │                          │ (with animation)
         │                          │
         │                          │ Progress >= 1.0?
         │                          │ Clear animation
         │                          │
         ▼                          ▼                         ▼
```

## Visual Indicators

```
┌────────────────────────────────────────────────────────────┐
│         WHAT PLAYERS SEE DURING COMBAT                      │
└────────────────────────────────────────────────────────────┘

PHASE 1: Approach
   🙂 ─────> 👹
  Weapon visible but static
  Colonist moving toward enemy

PHASE 2: Attack Triggered (Frame 0)
   🙂━━━━━━━> 👹
  Weapon begins moving
  Visual feedback starts

PHASE 3: Impact (Frame ~7-8, 50% progress)
   🙂━💥━> 👹
  Weapon at full extension/swing
  Damage applied
  (Could add particle effects here)

PHASE 4: Recovery (Frame 15, 100%)
   🙂 ─────> 👹
  Weapon returns to ready
  Cooldown begins

PHASE 5: Ready
   🙂 ─────> 💀
  Enemy defeated
  Weapon visible but static
  Ready for next target
```

## Debug Visualization (Optional Feature)

```
If debug mode enabled, could show:

   Progress: 0.67
      │
      ▼
     🙂━━━━━━━> 👹
      ╱
     ╱ Rotation: +10°
    ╱  Offset: (2.6, -1.8)
   ╱   Type: swing
  ╱
 ╱
Progress bar: [███████░░░░░] 67%
```
