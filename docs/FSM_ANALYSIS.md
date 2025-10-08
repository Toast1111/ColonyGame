# FSM (Finite State Machine) Analysis

**Date:** October 8, 2025  
**Files Analyzed:**
- `/workspaces/ColonyGame/src/game/colonist_systems/colonistFSM.ts` (1763 lines)
- `/workspaces/ColonyGame/src/ai/enemyFSM.ts` (319 lines)

---

## Executive Summary

Your FSM implementation is **excellent** with sophisticated features including:
- ✅ **Priority-based state transitions** with hysteresis
- ✅ **Soft-lock system** to prevent state thrashing
- ✅ **Door interaction system** with queuing
- ✅ **Health system integration** with downed states
- ✅ **Pathfinding integration** with region optimization
- ✅ **Graceful overlap handling** with timers
- ✅ **Medical system integration** with patient/doctor states
- ✅ **Cooking workflow** multi-step state machine

**Overall Quality: 9.5/10** 🌟

---

## Colonist FSM Architecture

### State Priority System

States are prioritized to prevent low-priority actions from interrupting critical needs:

```typescript
Priority Hierarchy (highest to lowest):
100 - flee         (imminent danger)
 98 - waitingAtDoor (door interaction)
 96 - beingTreated (receiving medical care)
 95 - doctoring    (providing medical care)
 90 - heal         (self-treatment)
 80 - sleep        (actual sleeping)
 75 - goToSleep    (traveling to bed)
 65 - eat          (consuming food)
 45 - storingBread (completing cooking job)
 42 - cooking      (preparing food)
 40 - build/chop/mine/harvest (work tasks)
 35 - resting      (passive recovery)
 25 - move         (general movement)
 15 - idle         (doing nothing)
 10 - seekTask     (looking for work)
```

### State Transition Logic

**Soft-Lock System** prevents rapid state flipping:
- Non-critical states are blocked during soft-lock timers
- Critical states (flee, heal, sleep at night) bypass locks
- Locks expire after set durations per state type

**Hysteresis** prevents flip-flopping:
- Danger detection: Enter flee at 140px, exit at 180px
- Uses `lastDanger` tracking to maintain awareness

### Core States Breakdown

#### 1. **downed** - Incapacitated State
- **Trigger:** Consciousness < 25%, blood level < 25%, or severe injury (>85% severity)
- **Behavior:** Colonist becomes immobile, needs rescue/medical attention
- **Recovery:** Automatically exits when consciousness & blood recover
- **Integration:** Fully integrated with health system

#### 2. **flee** - Danger Avoidance
- **Trigger:** Enemy within 140px (hysteresis: exit at 180px)
- **Behavior:** Pathfinding to HQ/safe building
- **Priority:** Highest (100) - interrupts all other states
- **Smart:** Remembers last danger for smoother fleeing

#### 3. **beingTreated** - Medical Patient
- **Trigger:** Doctor initiates treatment via medical system
- **Behavior:** Colonist stays still while being treated
- **Priority:** Very high (96)
- **Duration:** Medical system controls completion
- **Integration:** Uses `medicalSystem` and `medicalWorkGiver`

#### 4. **doctoring** - Medical Provider
- **Trigger:** Medical job assigned via work priority system
- **Behavior:** Multi-step process:
  1. Pathfind to patient
  2. Perform treatment (skill-based)
  3. Grant medical XP
  4. Complete job
- **Priority:** High (95)
- **Skills:** Uses medicine skill level for treatment quality
- **Timeout:** 30 seconds safety timeout

#### 5. **sleep** / **goToSleep** - Rest Management
- **Trigger:** Fatigue > 66% or nighttime
- **Behavior:** 
  - `goToSleep`: Pathfind to bed/house
  - `sleep`: Passive fatigue reduction (-8/sec)
- **Reservation System:** Beds are reserved to prevent conflicts
- **Personality:** Affected by `fatigueRate` stat

#### 6. **eat** - Food Consumption
- **Trigger:** Hunger > 66%
- **Behavior:** Consume bread or food, reduce hunger by 30-50
- **Priority:** High (65) - interrupts work
- **Personality:** Affected by `hungerRate` stat

#### 7. **cooking** / **storingBread** - Multi-Step Food Production
- **Workflow:**
  1. Pick up 5 wheat from global resources
  2. Move to stove
  3. Put wheat in stove (starts cooking timer)
  4. Wait while cooking (10 seconds with skill modifier)
  5. Receive 3 bread from 5 wheat
  6. Move to pantry
  7. Store bread in pantry
- **Skills:** Cooking skill affects speed (skillWorkSpeedMultiplier)
- **XP:** Grants cooking XP during and after completion
- **Timeout:** 30 second safety timeout

#### 8. **build** / **chop** / **mine** / **harvest** - Work States
- **Assignment:** Via `pickTask()` work priority system
- **Pathfinding:** Uses A* navigation with region optimization
- **Collision:** Checks building collisions before movement
- **Skills:** Each grants appropriate skill XP
- **Timeouts:** 15 second safety timeout for stuck detection
- **Reservation:** Targets are reserved via `assignedTargets` WeakSet

#### 9. **waitingAtDoor** - Door Interaction
- **Trigger:** Door blocks path during movement
- **Behavior:**
  - Request door to open
  - Wait for door state change
  - Resume previous task when passable
- **Priority:** Very high (98)
- **Timeout:** 10 seconds max wait
- **Integration:** Uses door system functions

#### 10. **seekTask** - Idle Work Seeking
- **Behavior:** Calls `game.pickTask()` to get new assignment
- **Transition:** Immediately transitions to assigned task state
- **Priority:** Lowest (10)
- **Fallback:** Goes to `idle` if no tasks available

---

## Enemy FSM Architecture

### Core Behavior Loop

```typescript
1. Target Selection (closest colonist or HQ)
2. Pathfinding (A* with region optimization)
3. Movement (along path or direct with collision)
4. Door Handling (attack doors in the way)
5. Combat (melee attacks with cooldown)
```

### Smart Pathfinding

**Path Caching:**
- Only recalculates when target moves >48px
- Uses `pathGoal` to track target position
- Repath timer: 1.5-2.5 seconds

**Stuck Detection:**
- Tracks `stuckTimer` when not making progress
- Clears path after 0.75 seconds stuck
- Forces repath to find alternate route

### Door Interaction

**Attack Behavior:**
- Detects doors blocking path
- Switches to attack mode
- Deals damage every 1 second (melee cooldown)
- Destroys door to continue

### Combat System

**Melee Attacks:**
- Cooldown: 1.0 seconds per swing
- Must be stationary to attack (movement check)
- Damage types based on enemy color:
  - Red/Orange → burn
  - Green/Brown → bite
  - High damage (>15) → cut
  - Default → bruise

**Armor Integration:**
- Calls `game.applyDamageToColonist()` for armor-aware damage
- Fallback to direct HP reduction if method unavailable

**Building Attacks:**
- Point-in-rectangle collision detection
- HQ destruction triggers `game.lose()`
- Other buildings evict colonists and are removed

---

## Advanced Features

### 1. Health System Integration

**Colonist Health Updates (every frame):**
```typescript
- Update bleeding/infection progression
- Heal injuries over time
- Update health stats (consciousness, blood, mobility, manipulation)
- Sync legacy HP with new health system
- Apply pain/consciousness penalties to performance
```

**Performance Penalties:**
- Movement: `fatigueSlow * mobility * (1 - pain * 0.3)`
- Work speed: `manipulation * (1 - pain * 0.2) * consciousness`

**Auto Medical Seeking:**
- Triggers when: bleeding >25%, injury >70% severity, or infected
- Sets `needsMedical` flag for medical work giver
- Ignores if already in medical pipeline

### 2. Needs Progression System

**Hunger:**
- Increases faster when working (0.25/sec) vs resting (0.1-0.15/sec)
- Personality modifier via `hungerRate` stat
- Starvation damage at 95+ hunger (2 HP/sec)

**Fatigue:**
- Rises when active (0.8/sec working, 0.3/sec idle)
- Falls when inside or resting (-8/sec)
- Personality modifier via `fatigueRate` stat
- Affects movement speed (80% at >66%, 90% at >33%)

**Passive Healing:**
- Very slow heal (0.8 HP/sec) when not hungry and not working
- Infirmary aura healing (3 HP/sec within 140px range)

### 3. Universal Stuck Detection

**checkAndRescueStuckColonist():**
- Monitors colonist movement every frame
- Tracks time spent without progress
- Teleports to safe position after threshold
- Clears task/target and forces seekTask
- Prevents permanent stuck situations

### 4. Graceful Overlap System

**Personal Space with Grace Period:**
- Personal space radius: colonist.r + other.r + 8
- **1-second grace period** before separation kicks in
- Tracks overlap time per colonist pair
- Gentle push strength (30% of overlap)
- Ignores overlaps when inside buildings
- Skips separation during active work (mining/chopping)

### 5. Speed Multiplier System

**Path Bonuses:**
- Checks if colonist is on path tile
- Applies `speedBonus` from path building
- Default 1.0x, paths typically 1.3-1.5x

**Fatigue Penalty:**
- 80% speed at >66% fatigue
- 90% speed at >33% fatigue
- Combined with health penalties

### 6. Door Queue System

**Collision Avoidance:**
- Detects doors 3 tiles away (96px)
- Requests door to open
- Sets `waitingForDoor` and `doorWaitStart`
- Transitions to `waitingAtDoor` state
- Resumes previous task when passable

### 7. Work Skill Integration

**Skill-Based Performance:**
- Cooking: affects cooking speed
- Medicine: affects treatment quality
- Construction, Mining, Planting: affect work speed
- XP granted during work actions
- Bonus XP on task completion

---

## Potential Issues & Recommendations

### ✅ Issues Fixed

#### 1. ~~Duplicate `case 'heal':` (Lines 541 & 700)~~ - **FIXED**
**Location:** colonistFSM.ts, lines 700-721 (removed)

**Issue:** The `heal` state appeared twice in the switch statement. The second one at line 700 was unreachable dead code.

**Impact:** Low - first case handled the state, second was dead code

**Fix Applied:** Removed the duplicate case, kept only the first implementation at line 541

---

### 🟡 Minor Recommendations

#### 2. Cooking Timeout May Be Too Short
**Location:** colonistFSM.ts, `cooking` case

**Issue:** 30-second timeout might trigger for slow colonists with low cooking skill + delays

**Recommendation:** Consider increasing to 45-60 seconds or making it skill-dependent

#### 3. Enemy Path Recalculation Could Be More Efficient
**Location:** enemyFSM.ts, `ensureEnemyPath()`

**Current:** Recalculates every 1.5-2.5 seconds
**Recommendation:** Only recalculate when:
- Target moves >GOAL_REPATH_EPS (already done ✓)
- Path becomes invalid (already done ✓)
- Consider increasing interval slightly for performance

### ✅ Strengths

1. **Excellent Priority System** - Prevents illogical behavior
2. **Robust Stuck Detection** - No permanent stuck states
3. **Graceful State Transitions** - Soft-lock prevents thrashing
4. **Complete Health Integration** - Downed, medical, pain penalties
5. **Smart Door Handling** - Both colonists and enemies
6. **Skill-Based Gameplay** - Work quality tied to skills
7. **Multi-Step Workflows** - Cooking system is sophisticated
8. **Performance Conscious** - Pathfinding optimization, timers

---

## State Transition Diagram

```
                    ┌─────────────┐
                    │  seekTask   │ (Priority: 10)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐  ┌────────┐  ┌──────────┐
         │  chop  │  │  mine  │  │  build   │ (Priority: 40)
         └────────┘  └────────┘  └──────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
    ┌─────────────┐  ┌────────┐  ┌─────────────┐
    │   cooking   │  │ harvest│  │ doctoring   │ (Priority: 42-95)
    └─────────────┘  └────────┘  └─────────────┘
              │
    ┌─────────┴────────┐
    ▼                  ▼
┌──────────────┐  ┌─────────┐
│storingBread │  │   eat   │ (Priority: 45-65)
└──────────────┘  └─────────┘

    CRITICAL STATES (Override all work):
    ┌────────┐ ┌──────────┐ ┌────────────┐
    │  flee  │ │  downed  │ │beingTreated│ (Priority: 96-100)
    └────────┘ └──────────┘ └────────────┘
         │           │             │
         └───────────┼─────────────┘
                     ▼
            ┌────────────────┐
            │  goToSleep     │ (Priority: 75)
            └────────┬───────┘
                     ▼
            ┌────────────────┐
            │     sleep      │ (Priority: 80)
            └────────────────┘
```

---

## Code Quality Metrics

| Metric | Score | Notes |
|--------|-------|-------|
| **Architecture** | 9.5/10 | Excellent state machine design |
| **Integration** | 9.5/10 | Health, skills, pathfinding all connected |
| **Robustness** | 9.0/10 | Good stuck detection, timeouts |
| **Performance** | 9.0/10 | Path caching, efficient collision checks |
| **Maintainability** | 8.5/10 | Well-commented, some duplicate code |
| **Flexibility** | 9.5/10 | Easy to add new states |
| **RimWorld Authenticity** | 10/10 | Captures RimWorld's feel perfectly |

**Overall: 9.5/10** 🏆

---

## Testing Recommendations

### Test Case 1: State Priority Enforcement
1. Set colonist hunger to 70%
2. Assign build task
3. Spawn enemy nearby
4. **Expected:** flee (100) > eat (65) > build (40)

### Test Case 2: Medical Pipeline
1. Injure colonist (>70% severity)
2. Assign another colonist as doctor
3. **Expected:** Patient enters beingTreated, doctor enters doctoring

### Test Case 3: Cooking Workflow
1. Ensure 5+ wheat available
2. Wait for colonist to pick cooking task
3. **Expected:** cooking → storingBread → seekTask

### Test Case 4: Door Interaction
1. Build door blocking path to resource
2. Assign chop/mine task
3. **Expected:** build → waitingAtDoor → build (resumes)

### Test Case 5: Stuck Recovery
1. Force colonist into impossible position
2. Wait 3 seconds
3. **Expected:** Teleport to safe position, state → seekTask

---

## Conclusion

Your FSM implementation is **production-ready** and demonstrates advanced game AI concepts. The integration of health, skills, pathfinding, and work priorities creates emergent gameplay that feels authentic to RimWorld.

The only issue found (duplicate `heal` case) is minor and doesn't affect functionality. The system is robust, performant, and maintainable.

**Status:** ✅ Excellent - No critical changes needed
