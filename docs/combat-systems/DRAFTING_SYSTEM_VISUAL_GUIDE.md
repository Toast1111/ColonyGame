# Drafting System - Visual Guide

## UI Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    COLONIST CONTEXT MENU                     │
│  (Right-click on colonist)                                   │
│                                                              │
│  ┌────────────┐                                             │
│  │   Draft    │ ← Click to draft colonist                   │
│  │    🎯      │                                              │
│  └────────────┘                                             │
│                                                              │
│  (When drafted, menu shows:)                                │
│  ┌────────────┐                                             │
│  │  Undraft   │ ← Click to undraft                          │
│  │    ⚔️       │                                              │
│  └────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
```

## Draft State Flow

```
┌──────────────┐
│   UNDRAFTED  │ (Normal AI)
│   COLONIST   │
└──────┬───────┘
       │
       │ Right-click → Draft
       ↓
┌──────────────┐      ┌─────────────────────────────────┐
│   DRAFTED    │      │  Visual Indicator:              │
│   COLONIST   │ ───→ │  Green Shield above colonist    │
└──────┬───────┘      └─────────────────────────────────┘
       │
       │ Priority: 99 (overrides work/sleep)
       │
       ├─── Auto-engages enemies in range
       │
       ├─── Can receive orders:
       │    ├─ Right-click enemy → Assign target
       │    └─ Right-click ground → Move to position
       │
       │ Right-click → Undraft
       ↓
┌──────────────┐
│   UNDRAFTED  │ (Returns to AI)
│   COLONIST   │
└──────────────┘
```

## Combat Behavior

### Ranged Combat Flow
```
┌─────────────┐
│   DRAFTED   │
│  (Ranged)   │
└──────┬──────┘
       │
       ├─→ Enemy in range? ──No──→ [Idle/Move]
       │         │
       │        Yes
       │         ↓
       ├─→ Line of sight? ──No──→ [Can't shoot - wall blocking]
       │         │
       │        Yes
       │         ↓
       ├─→ Moving? ──Yes──→ [Reset warmup, can't shoot]
       │      │
       │      No (Stationary)
       │      ↓
       ├─→ Warmup complete? ──No──→ [Aiming...]
       │         │
       │        Yes
       │         ↓
       └─→ [FIRE!] → Bullet → Enemy
                │
                ↓
           Cooldown → Repeat
```

### Melee Combat Flow
```
┌─────────────┐
│   DRAFTED   │
│   (Melee)   │
└──────┬──────┘
       │
       ├─→ Enemy adjacent? ──No──→ [Move to enemy]
       │         │
       │        Yes (Within 1.3 tiles)
       │         ↓
       ├─→ Moving? ──Yes──→ [Stop to attack]
       │      │
       │      No (Stationary)
       │      ↓
       ├─→ Cooldown ready? ──No──→ [Waiting...]
       │         │
       │        Yes
       │         ↓
       └─→ [STRIKE!] → Damage → Enemy
                │
                ↓
           0.8s cooldown → Repeat
```

## Order System

### Target Assignment
```
Player Actions:
1. Left-click drafted colonist (select)
2. Right-click on enemy (assign target)

Result:
┌──────────────┐       ┌──────────────┐
│   COLONIST   │- - - >│    ENEMY     │
│  (Drafted)   │ Red   │  (Target)    │
└──────────────┘ Line  └──────────────┘
                          ↑
                     Red Crosshair
```

### Movement Order
```
Player Actions:
1. Left-click drafted colonist (select)
2. Right-click on ground (move order)

Result:
┌──────────────┐       ┌──────────────┐
│   COLONIST   │------>│   Position   │
│  (Drafted)   │ Path  │   (Green X)  │
└──────────────┘       └──────────────┘

Colonist moves to position, engaging enemies along the way
```

## Visual Indicators

### Draft Status
```
     🛡️  ← Green shield
    (👤)  ← Colonist sprite
```

### Target Assignment
```
┌──────────────┐
│   COLONIST   │────────┐
└──────────────┘        │ Red dashed line
                        │
                        ↓
                   ┌─────────┐
                   │  ENEMY  │ ← Red crosshair
                   └─────────┘
```

### Movement Order
```
┌──────────────┐
│   COLONIST   │─────────>  ╳  ← Green X marker
└──────────────┘  Moving    ⭕  ← Green circle
```

## State Priority Chart

```
Priority Level         State           Description
─────────────────────────────────────────────────────────
    100               Flee            Danger detected
    ↑                  │
   99                Drafted          Player control ← NEW
    │                  │
   98              WaitingAtDoor      Door blocking
    │                  │
   96              BeingTreated       Medical patient
    │                  │
   95               Doctoring          Medical work
    │                  │
   90                 Heal             Low health
    │                  │
   80                Sleep             In bed
    │                  │
   65                 Eat              Hunger
    │                  │
   40            Work (build/chop)     Tasks
    │                  │
   10               SeekTask           Idle
    ↓                  │
```

## Combat System Integration

### Weapon Stats Used
```
┌─────────────────────────────────────┐
│         WEAPON PROPERTIES           │
├─────────────────────────────────────┤
│ Range (px)     → Max firing distance│
│ Damage         → Bullet damage      │
│ Accuracy       → Hit chance         │
│ Warmup (s)     → Aim time          │
│ Burst          → Shots per trigger  │
│ Cooldown (s)   → Time between bursts│
│ Speed (px/s)   → Bullet velocity    │
└─────────────────────────────────────┘
                 │
                 ↓
         Used by combat system
         when colonist drafted
```

### Line of Fire System
```
Colonist ──────────────> Enemy
    │                      │
    └─ Ray cast check ─────┘
             │
             ↓
    ┌─────────────────┐
    │ Wall detected?  │
    └────────┬────────┘
             │
        ┌────┴────┐
       Yes       No
        │         │
        ↓         ↓
    [Blocked]  [Shoot!]
```

## Example Scenarios

### Scenario 1: Basic Defense
```
1. Enemy approaches base
2. Player drafts colonist with rifle
3. Colonist auto-engages enemy
4. Enemy dies
5. Player undrafts colonist
6. Colonist returns to work
```

### Scenario 2: Targeted Attack
```
1. Multiple enemies approach
2. Player drafts 3 colonists
3. Player assigns each a different target
4. Colonists focus fire on assigned enemies
5. All targets eliminated
6. Undraft all colonists
```

### Scenario 3: Cover Fighting
```
1. Enemy wave incoming
2. Draft colonist
3. Right-click position behind wall
4. Colonist moves to cover
5. Engages enemies from safety
6. Wall blocks enemy fire
7. Colonist survives with cover advantage
```

### Scenario 4: Kiting
```
1. Strong enemy approaches
2. Draft colonist with pistol
3. Right-click ground (away from enemy)
4. Colonist shoots while retreating
5. Maintains distance from enemy
6. Enemy dies before reaching colonist
```
